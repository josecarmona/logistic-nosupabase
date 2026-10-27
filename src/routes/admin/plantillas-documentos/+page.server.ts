import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { PlantillaDocumento } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	if (!roles.includes('admin') && !roles.includes('gerente')) {
		throw redirect(303, '/');
	}

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('plantillas_documentos')
		.select('*')
		.order('nombre', { ascending: true });

	if (search) {
		query = query.ilike('nombre', `%${search}%`);
	}

	const { data: plantillas, error } = await query;

	if (error) {
		console.error('Error al cargar plantillas de documentos:', error);
	}

	return {
		plantillas: (plantillas || []) as PlantillaDocumento[],
		search
	};
};

export const actions: Actions = {
	createPlantilla: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin') && !roles.includes('gerente')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim();
		const tipo = (formData.get('tipo') as string || 'guia') as any;
		const encabezado_titulo = (formData.get('encabezado_titulo') as string || '').trim();
		const contenido_html = (formData.get('contenido_html') as string || '').trim();
		const recomendaciones_aduana = (formData.get('recomendaciones_aduana') as string || '').trim();
		const roles_permitidos = formData.getAll('roles_permitidos') as string[];
		const paper_size = (formData.get('paper_size') as string || 'letter') as any;
		const orientation = (formData.get('orientation') as string || 'portrait') as any;
		const es_default = formData.get('es_default') === 'true';

		if (!nombre || !contenido_html) {
			return fail(400, { message: 'El nombre y el contenido HTML de la plantilla son obligatorios' });
		}

		if (es_default) {
			await locals.supabase
				.from('plantillas_documentos')
				.update({ es_default: false })
				.eq('tipo', tipo);
		}

		const { error } = await locals.supabase.from('plantillas_documentos').insert({
			nombre,
			tipo,
			encabezado_titulo: encabezado_titulo || null,
			contenido_html,
			recomendaciones_aduana: recomendaciones_aduana || null,
			roles_permitidos: roles_permitidos.length > 0 ? roles_permitidos : ['admin', 'gerente', 'operador'],
			paper_size,
			orientation,
			es_default,
			activo: true
		});

		if (error) {
			return fail(500, { message: `Error al crear plantilla: ${error.message}` });
		}

		return { success: true, action: 'createPlantilla' };
	},

	updatePlantilla: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin') && !roles.includes('gerente')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim();
		const tipo = (formData.get('tipo') as string || 'guia') as any;
		const encabezado_titulo = (formData.get('encabezado_titulo') as string || '').trim();
		const contenido_html = (formData.get('contenido_html') as string || '').trim();
		const recomendaciones_aduana = (formData.get('recomendaciones_aduana') as string || '').trim();
		const roles_permitidos = formData.getAll('roles_permitidos') as string[];
		const paper_size = (formData.get('paper_size') as string || 'letter') as any;
		const orientation = (formData.get('orientation') as string || 'portrait') as any;
		const es_default = formData.get('es_default') === 'true';

		if (!id || !nombre || !contenido_html) {
			return fail(400, { message: 'ID, nombre y contenido HTML son obligatorios' });
		}

		if (es_default) {
			await locals.supabase
				.from('plantillas_documentos')
				.update({ es_default: false })
				.eq('tipo', tipo);
		}

		const { error } = await locals.supabase
			.from('plantillas_documentos')
			.update({
				nombre,
				tipo,
				encabezado_titulo: encabezado_titulo || null,
				contenido_html,
				recomendaciones_aduana: recomendaciones_aduana || null,
				roles_permitidos: roles_permitidos.length > 0 ? roles_permitidos : ['admin', 'gerente', 'operador'],
				paper_size,
				orientation,
				es_default,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al actualizar plantilla: ${error.message}` });
		}

		return { success: true, action: 'updatePlantilla' };
	},

	toggleActivePlantilla: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin') && !roles.includes('gerente')) return fail(403, { message: 'Acceso no autorizado' });

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const activoCurrent = formData.get('activo') === 'true';

		if (!id) return fail(400, { message: 'ID no proporcionado' });

		const { error } = await locals.supabase
			.from('plantillas_documentos')
			.update({
				activo: !activoCurrent,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			return fail(500, { message: `Error al cambiar estado de plantilla: ${error.message}` });
		}

		return { success: true, action: 'toggleActivePlantilla' };
	}
};
