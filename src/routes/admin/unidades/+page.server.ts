import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { UnidadMedida, GrupoUnidadMedida } from '$lib/types/database';

export const load: PageServerLoad = async ({ locals }) => {
	// Cargar unidades de medida con su grupo relacionado
	const { data: unidades, error: errUnidades } = await locals.supabase
		.from('unidades_medida')
		.select('*, grupo:grupos_unidad_medida(id, codigo, nombre)')
		.order('nombre', { ascending: true });

	if (errUnidades) {
		console.error('Error al cargar unidades de medida:', errUnidades.message);
	}

	// Cargar el maestro de grupos de unidad de medida
	const { data: grupos, error: errGrupos } = await locals.supabase
		.from('grupos_unidad_medida')
		.select('*')
		.order('nombre', { ascending: true });

	if (errGrupos) {
		console.error('Error al cargar grupos de unidades de medida:', errGrupos.message);
	}

	return {
		unidades: (unidades || []) as UnidadMedida[],
		grupos: (grupos || []) as GrupoUnidadMedida[]
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const codigo = (formData.get('codigo') as string || '').trim().toUpperCase();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const grupo_id_raw = formData.get('grupo_id') as string;

		if (!codigo) {
			return fail(400, { message: 'El código de la unidad es obligatorio' });
		}
		if (!nombre) {
			return fail(400, { message: 'El nombre de la unidad es obligatorio' });
		}
		if (!grupo_id_raw) {
			return fail(400, { message: 'El grupo de unidad de medida es obligatorio' });
		}

		const grupo_id = parseInt(grupo_id_raw, 10);

		// Verificar que el código no exista
		const { data: existing } = await locals.supabase
			.from('unidades_medida')
			.select('id')
			.eq('codigo', codigo)
			.maybeSingle();

		if (existing) {
			return fail(400, { message: `Ya existe una unidad de medida con el código ${codigo}` });
		}

		const { error: insErr } = await locals.supabase.from('unidades_medida').insert({
			codigo,
			nombre,
			grupo_id,
			tipo: 'cantidad',
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al crear unidad de medida: ${insErr.message}` });
		}

		return { success: true, action: 'create' };
	},

	update: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const codigo = (formData.get('codigo') as string || '').trim().toUpperCase();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const grupo_id_raw = formData.get('grupo_id') as string;

		if (!idRaw) {
			return fail(400, { message: 'ID no proporcionado' });
		}
		if (!codigo) {
			return fail(400, { message: 'El código de la unidad es obligatorio' });
		}
		if (!nombre) {
			return fail(400, { message: 'El nombre de la unidad es obligatorio' });
		}
		if (!grupo_id_raw) {
			return fail(400, { message: 'El grupo de unidad de medida es obligatorio' });
		}

		const id = parseInt(idRaw, 10);
		const grupo_id = parseInt(grupo_id_raw, 10);

		// Verificar que no duplique código con otra unidad
		const { data: existing } = await locals.supabase
			.from('unidades_medida')
			.select('id')
			.eq('codigo', codigo)
			.neq('id', id)
			.maybeSingle();

		if (existing) {
			return fail(400, { message: `Ya existe otra unidad de medida con el código ${codigo}` });
		}

		const { error: updErr } = await locals.supabase
			.from('unidades_medida')
			.update({
				codigo,
				nombre,
				grupo_id,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar unidad de medida: ${updErr.message}` });
		}

		return { success: true, action: 'update' };
	},

	toggleActive: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!idRaw) return fail(400, { message: 'ID no proporcionado' });

		const id = parseInt(idRaw, 10);

		const { error: toggleErr } = await locals.supabase
			.from('unidades_medida')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActive' };
	},

	createGrupo: async ({ request, locals }) => {
		const formData = await request.formData();
		const codigo = (formData.get('codigo') as string || '').trim().toUpperCase();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!codigo) return fail(400, { message: 'El código del grupo es obligatorio' });
		if (!nombre) return fail(400, { message: 'El nombre del grupo es obligatorio' });

		const { data: existing } = await locals.supabase
			.from('grupos_unidad_medida')
			.select('id')
			.eq('codigo', codigo)
			.maybeSingle();

		if (existing) {
			return fail(400, { message: `Ya existe un grupo de unidad de medida con el código ${codigo}` });
		}

		const { error: insErr } = await locals.supabase.from('grupos_unidad_medida').insert({
			codigo,
			nombre,
			descripcion: descripcion || null,
			activo: true
		});

		if (insErr) {
			return fail(500, { message: `Error al crear grupo de unidad: ${insErr.message}` });
		}

		return { success: true, action: 'createGrupo' };
	},

	updateGrupo: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const codigo = (formData.get('codigo') as string || '').trim().toUpperCase();
		const nombre = (formData.get('nombre') as string || '').trim().toUpperCase();
		const descripcion = (formData.get('descripcion') as string || '').trim().toUpperCase();

		if (!idRaw) return fail(400, { message: 'ID no proporcionado' });
		if (!codigo) return fail(400, { message: 'El código del grupo es obligatorio' });
		if (!nombre) return fail(400, { message: 'El nombre del grupo es obligatorio' });

		const id = parseInt(idRaw, 10);

		const { data: existing } = await locals.supabase
			.from('grupos_unidad_medida')
			.select('id')
			.eq('codigo', codigo)
			.neq('id', id)
			.maybeSingle();

		if (existing) {
			return fail(400, { message: `Ya existe otro grupo con el código ${codigo}` });
		}

		const { error: updErr } = await locals.supabase
			.from('grupos_unidad_medida')
			.update({
				codigo,
				nombre,
				descripcion: descripcion || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updErr) {
			return fail(500, { message: `Error al actualizar grupo de unidad: ${updErr.message}` });
		}

		return { success: true, action: 'updateGrupo' };
	},

	toggleActiveGrupo: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id') as string;
		const currentActive = formData.get('activo') === 'true';

		if (!idRaw) return fail(400, { message: 'ID no proporcionado' });

		const id = parseInt(idRaw, 10);

		const { error: toggleErr } = await locals.supabase
			.from('grupos_unidad_medida')
			.update({
				activo: !currentActive,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (toggleErr) {
			return fail(500, { message: `Error al cambiar estado del grupo: ${toggleErr.message}` });
		}

		return { success: true, action: 'toggleActiveGrupo' };
	}
};
