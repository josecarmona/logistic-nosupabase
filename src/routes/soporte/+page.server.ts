import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TicketSoporte } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	const isStaff = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador');
	const isAdminOrGerente = roles.includes('admin') || roles.includes('gerente');

	const tipoFilter = url.searchParams.get('tipo') || 'todos';
	const estatusFilter = url.searchParams.get('estatus') || 'todos';
	const search = (url.searchParams.get('search') || '').trim();

	let tickets: TicketSoporte[] = [];

	try {
		let query = locals.supabase
			.from('tickets_soporte')
			.select(`
				*,
				usuario_reporta:profiles!usuario_reporta_id(id, nombre_completo, email, codigo),
				asignado_a:profiles!asignado_a_id(id, nombre_completo, email)
			`)
			.order('created_at', { ascending: false });

		if (!isAdminOrGerente && locals.user) {
			query = query.eq('usuario_reporta_id', locals.user.id);
		}

		if (tipoFilter && tipoFilter !== 'todos') {
			query = query.eq('tipo', tipoFilter);
		}

		if (estatusFilter && estatusFilter !== 'todos') {
			query = query.eq('estatus', estatusFilter);
		}

		if (search) {
			query = query.or(`codigo.ilike.%${search}%,titulo.ilike.%${search}%,descripcion.ilike.%${search}%`);
		}

		const { data, error: tErr } = await query;
		if (!tErr && data) {
			tickets = data as TicketSoporte[];
		}
	} catch (err) {
		console.warn('Error consultando tickets_soporte:', err);
	}

	// Cargar usuarios administradores y gerentes para asignación
	let staffUsers: any[] = [];
	if (isAdminOrGerente) {
		const { data: su } = await locals.supabase
			.from('profiles')
			.select('id, nombre_completo, email')
			.eq('activo', true)
			.order('nombre_completo');
		staffUsers = su || [];
	}

	return {
		tickets,
		staffUsers,
		filters: {
			tipo: tipoFilter,
			estatus: estatusFilter,
			search
		},
		isAdminOrGerente,
		isStaff,
		userRole: roles[0] || 'operador'
	};
};

export const actions: Actions = {
	createTicket: async ({ request, locals }) => {
		if (!locals.session || !locals.user) return fail(401, { message: 'No autenticado' });

		const formData = await request.formData();
		const tipo = (formData.get('tipo') as string || 'falla').toLowerCase();
		const titulo = (formData.get('titulo') as string || '').trim();
		const descripcion = (formData.get('descripcion') as string || '').trim();
		const modulo_afectado = (formData.get('modulo_afectado') as string || 'general').toLowerCase();
		const prioridad = (formData.get('prioridad') as string || 'media').toLowerCase();
		const captura_url = (formData.get('captura_url') as string || '').trim();

		if (!titulo || !descripcion) {
			return fail(400, { message: 'El título y la descripción detallada son obligatorios' });
		}

		// Conteo para código de ticket secuencial si el trigger no estuviera activo
		let codigoTicket = '';
		try {
			const { count } = await locals.supabase.from('tickets_soporte').select('id', { count: 'exact', head: true });
			codigoTicket = `TCK-${String((count || 0) + 1).padStart(6, '0')}`;
		} catch {
			codigoTicket = `TCK-${Date.now().toString().slice(-6)}`;
		}

		const { error: insErr } = await locals.supabase
			.from('tickets_soporte')
			.insert({
				codigo: codigoTicket,
				tipo,
				titulo,
				descripcion,
				modulo_afectado,
				prioridad,
				estatus: 'abierto',
				usuario_reporta_id: locals.user.id,
				captura_url: captura_url || null
			});

		if (insErr) {
			return fail(500, { message: `Error al registrar ticket: ${insErr.message}` });
		}

		return { success: true, action: 'createTicket', message: 'Reporte registrado con éxito' };
	},

	updateTicketStatus: async ({ request, locals }) => {
		if (!locals.session || !locals.user) return fail(401, { message: 'No autenticado' });

		const roles = await getRolesForUser(locals, locals.user);
		if (!roles.includes('admin') && !roles.includes('gerente')) {
			return fail(403, { message: 'Solo administradores o gerentes pueden actualizar el estado de los tickets' });
		}

		const formData = await request.formData();
		const ticketIdRaw = formData.get('id') as string;
		const estatus = (formData.get('estatus') as string || '').toLowerCase();
		const asignado_a_id = (formData.get('asignado_a_id') as string || '').trim() || null;
		const respuesta_soporte = (formData.get('respuesta_soporte') as string || '').trim();

		if (!ticketIdRaw || !estatus) {
			return fail(400, { message: 'ID y estado son requeridos' });
		}

		const ticketId = parseInt(ticketIdRaw, 10);
		const updateData: Record<string, any> = {
			estatus,
			asignado_a_id,
			respuesta_soporte: respuesta_soporte || null,
			updated_at: new Date().toISOString()
		};

		if (estatus === 'resuelto' || estatus === 'cerrado') {
			updateData.fecha_resolucion = new Date().toISOString();
		}

		const { error: updErr } = await locals.supabase
			.from('tickets_soporte')
			.update(updateData)
			.eq('id', ticketId);

		if (updErr) {
			return fail(500, { message: `Error al actualizar ticket: ${updErr.message}` });
		}

		return { success: true, action: 'updateTicketStatus', message: 'Estado del ticket actualizado' };
	}
};
