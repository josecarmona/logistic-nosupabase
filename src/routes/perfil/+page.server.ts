import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireProfile } from '$lib/server/auth';
import type { Pais, TipoAdquisicion } from '$lib/types/database';

export const load: PageServerLoad = async ({ locals }) => {
	const profile = await requireProfile(locals);

	const { data: paises } = await locals.supabase
		.from('paises')
		.select('*')
		.order('nombre', { ascending: true });

	const { data: adquisiciones } = await locals.supabase
		.from('tipo_adquisiciones')
		.select('*')
		.order('nombre', { ascending: true });

	return {
		profile,
		paises: (paises || []) as Pais[],
		adquisiciones: (adquisiciones || []) as TipoAdquisicion[]
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		const profile = await requireProfile(locals);
		const formData = await request.formData();

		const nombre_completo = (formData.get('nombre_completo') as string || '').trim().toUpperCase();
		const razon_social = (formData.get('razon_social') as string || '').trim().toUpperCase();
		const direccion_1 = (formData.get('direccion_1') as string || '').trim().toUpperCase();
		const direccion_2 = (formData.get('direccion_2') as string || '').trim().toUpperCase();
		const pais_id_raw = formData.get('pais_id') as string;
		const codigo_postal = (formData.get('codigo_postal') as string || '').trim().toUpperCase();
		const ciudad = (formData.get('ciudad') as string || '').trim().toUpperCase();
		const estado = (formData.get('estado') as string || '').trim().toUpperCase();
		const municipio = (formData.get('municipio') as string || '').trim().toUpperCase();
		const numero_celular = (formData.get('numero_celular') as string || '').trim();
		const telefono = (formData.get('telefono') as string || '').trim();
		const tipo_adquisicion_id_raw = formData.get('tipo_adquisicion_id') as string;
		const referencia = (formData.get('referencia') as string || '').trim().toUpperCase();
		const cedula = (formData.get('cedula') as string || '').trim().toUpperCase();

		if (!nombre_completo) {
			return fail(400, { message: 'El nombre completo es obligatorio' });
		}

		const pais_id = pais_id_raw ? parseInt(pais_id_raw, 10) : null;
		const tipo_adquisicion_id = tipo_adquisicion_id_raw ? parseInt(tipo_adquisicion_id_raw, 10) : null;

		const { error: updateErr } = await locals.supabase
			.from('profiles')
			.update({
				nombre_completo,
				razon_social: razon_social || null,
				direccion_1: direccion_1 || null,
				direccion_2: direccion_2 || null,
				pais_id,
				codigo_postal: codigo_postal || null,
				ciudad: ciudad || null,
				estado: estado || null,
				municipio: municipio || null,
				numero_celular: numero_celular || null,
				telefono: telefono || null,
				tipo_adquisicion_id,
				referencia: referencia || null,
				cedula: cedula || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', profile.id);

		if (updateErr) {
			return fail(500, { message: `Error al actualizar perfil: ${updateErr.message}` });
		}

		return { success: true };
	}
};
