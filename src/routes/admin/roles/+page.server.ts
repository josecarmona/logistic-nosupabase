import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { MaestroRol, Permiso } from '$lib/types/database';

export const load: PageServerLoad = async ({ locals, url }) => {
	const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
	const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
	const pageSize = 10;

	const search = (url.searchParams.get('search') || '').trim();

	let query = locals.supabase
		.from('roles')
		.select('*', { count: 'exact' })
		.order('nombre', { ascending: true });

	if (search) {
		query = query.or(`nombre.ilike.%${search}%,descripcion.ilike.%${search}%`);
	}

	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	const { data: rolesData, count, error: err } = await query.range(from, to);

	// Cargar todos los permisos disponibles en el sistema
	const { data: permisos } = await locals.supabase
		.from('permisos')
		.select('*')
		.order('tipo', { ascending: true });

	// Cargar la tabla pivote de permisos por rol
	const { data: rolPermisos } = await locals.supabase.from('rol_permisos').select('*');

	const totalItems = count || 0;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	return {
		roles: (rolesData || []) as MaestroRol[],
		permisos: (permisos || []) as Permiso[],
		rolPermisos: (rolPermisos || []) as { rol_id: number; permiso_id: number }[],
		totalItems,
		totalPages,
		currentPage: page,
		search
	};
};

export const actions: Actions = {
	createRole: async ({ request, locals }) => {
		const formData = await request.formData();
		const nombre = (formData.get('nombre') as string || '').trim().toLowerCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!nombre) {
			return fail(400, { message: 'El nombre del rol es obligatorio' });
		}

		const { error: insErr } = await locals.supabase.from('roles').insert({
			nombre,
			descripcion: descripcion || null,
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al crear rol: ${insErr.message}` });
		}

		return { success: true, action: 'create' };
	},

	updateRole: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const nombre = (formData.get('nombre') as string || '').trim().toLowerCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!idRaw || !nombre) {
			return fail(400, { message: 'ID y nombre son obligatorios' });
		}

		const id = parseInt(idRaw, 10);

		const { error: updErr } = await locals.supabase
			.from('roles')
			.update({
				nombre,
				descripcion: descripcion || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar rol: ${updErr.message}` });
		}

		return { success: true, action: 'update' };
	},

	toggleActiveRole: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!idRaw) return fail(400, { message: 'ID de rol no especificado' });

		const id = parseInt(idRaw, 10);

		const { error: toggleErr } = await locals.supabase
			.from('roles')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del rol: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActive' };
	},

	updatePermissions: async ({ request, locals }) => {
		const formData = await request.formData();
		const rolIdRaw = formData.get('rol_id') as string;
		const selectedPermisoIds = formData.getAll('permisos').map((p) => parseInt(p as string, 10));

		if (!rolIdRaw) return fail(400, { message: 'ID de rol no especificado' });

		const rol_id = parseInt(rolIdRaw, 10);

		// Eliminar permisos existentes para este rol
		const { error: delErr } = await locals.supabase.from('rol_permisos').delete().eq('rol_id', rol_id);
		if (delErr) {
			return fail(500, { message: `Error al limpiar permisos anteriores: ${delErr.message}` });
		}

		// Insertar los nuevos permisos seleccionados
		if (selectedPermisoIds.length > 0) {
			const rowsToInsert = selectedPermisoIds.map((permiso_id) => ({
				rol_id,
				permiso_id
			}));

			const { error: insErr } = await locals.supabase.from('rol_permisos').insert(rowsToInsert);
			if (insErr) {
				return fail(500, { message: `Error al asignar nuevos permisos: ${insErr.message}` });
			}
		}

		return { success: true, action: 'updatePermissions' };
	}
};
