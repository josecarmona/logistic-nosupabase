import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { ConfiguracionGeneral } from '$lib/types/database';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw redirect(303, '/login');

	const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
	if (!roles.includes('admin')) throw redirect(303, '/');

	const { data: configuracion, error } = await locals.supabase
		.from('configuracion_general')
		.select('*')
		.eq('id', 1)
		.maybeSingle();

	if (error) {
		console.error('Error cargando configuración:', error);
	}

	return {
		configuracion: (configuracion || null) as ConfiguracionGeneral | null
	};
};

export const actions: Actions = {
	updateBranding: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'No tienes permisos de administrador' });

		const formData = await request.formData();
		const nombre_empresa = (formData.get('nombre_empresa') as string || '').trim().toUpperCase();
		const eslogan = (formData.get('eslogan') as string || '').trim();
		const identificacion_fiscal = (formData.get('identificacion_fiscal') as string || '').trim().toUpperCase();
		const direccion_empresa = (formData.get('direccion_empresa') as string || '').trim().toUpperCase();
		const telefono_empresa = (formData.get('telefono_empresa') as string || '').trim();
		const email_empresa = (formData.get('email_empresa') as string || '').trim().toLowerCase();

		if (!nombre_empresa) {
			return fail(400, { message: 'El nombre de la empresa es obligatorio' });
		}

		const { error } = await locals.supabase
			.from('configuracion_general')
			.upsert({
				id: 1,
				nombre_empresa,
				eslogan: eslogan || null,
				identificacion_fiscal: identificacion_fiscal || null,
				direccion_empresa: direccion_empresa || null,
				telefono_empresa: telefono_empresa || null,
				email_empresa: email_empresa || null,
				updated_at: new Date().toISOString()
			});

		if (error) {
			return fail(500, { message: `Error al guardar los datos de empresa: ${error.message}` });
		}

		return { success: true, action: 'updateBranding' };
	},

	updateColors: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'No tienes permisos de administrador' });

		const formData = await request.formData();
		const color_primary = (formData.get('color_primary') as string || '').trim();
		const color_primary_foreground = (formData.get('color_primary_foreground') as string || '').trim();
		const color_accent = (formData.get('color_accent') as string || '').trim();
		const color_accent_foreground = (formData.get('color_accent_foreground') as string || '').trim();
		const sidebar_theme = (formData.get('sidebar_theme') as string || 'default').trim();
		const border_radius = (formData.get('border_radius') as string || '0.625rem').trim();

		if (!color_primary) {
			return fail(400, { message: 'El color primario es obligatorio' });
		}

		const { error } = await locals.supabase
			.from('configuracion_general')
			.upsert({
				id: 1,
				color_primary,
				color_primary_foreground,
				color_accent,
				color_accent_foreground,
				sidebar_theme,
				border_radius,
				updated_at: new Date().toISOString()
			});

		if (error) {
			return fail(500, { message: `Error al actualizar los colores: ${error.message}` });
		}

		return { success: true, action: 'updateColors' };
	},

	uploadMedia: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'No tienes permisos de administrador' });

		const formData = await request.formData();
		const file = formData.get('file') as File;
		const mediaType = formData.get('type') as 'logo' | 'logo_dark' | 'favicon';

		if (!file || file.size === 0) {
			return fail(400, { message: 'Por favor selecciona un archivo de imagen válido' });
		}

		const ext = file.name.split('.').pop() || 'png';
		const fileName = `${mediaType}_${Date.now()}.${ext}`;

		const { error: uploadErr } = await locals.supabase.storage
			.from('branding')
			.upload(fileName, file, { upsert: true });

		if (uploadErr) {
			return fail(500, { message: `Error al subir la imagen a Supabase Storage: ${uploadErr.message}` });
		}

		const { data: publicUrlData } = locals.supabase.storage
			.from('branding')
			.getPublicUrl(fileName);

		const publicUrl = publicUrlData.publicUrl;

		const fieldMapping: Record<string, string> = {
			logo: 'logo_url',
			logo_dark: 'logo_dark_url',
			favicon: 'favicon_url'
		};

		const { error: updErr } = await locals.supabase
			.from('configuracion_general')
			.upsert({
				id: 1,
				[fieldMapping[mediaType]]: publicUrl,
				updated_at: new Date().toISOString()
			});

		if (updErr) {
			return fail(500, { message: `Error al guardar la URL de la imagen: ${updErr.message}` });
		}

		return { success: true, action: 'uploadMedia', mediaType, publicUrl };
	},

	removeMedia: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'No tienes permisos de administrador' });

		const formData = await request.formData();
		const mediaType = formData.get('type') as 'logo' | 'logo_dark' | 'favicon';

		const fieldMapping: Record<string, string> = {
			logo: 'logo_url',
			logo_dark: 'logo_dark_url',
			favicon: 'favicon_url'
		};

		const { error } = await locals.supabase
			.from('configuracion_general')
			.upsert({
				id: 1,
				[fieldMapping[mediaType]]: null,
				updated_at: new Date().toISOString()
			});

		if (error) {
			return fail(500, { message: `Error al remover la imagen: ${error.message}` });
		}

		return { success: true, action: 'removeMedia', mediaType };
	},

	updateOperational: async ({ request, locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'No tienes permisos de administrador' });

		const formData = await request.formData();
		const moneda_nombre = (formData.get('moneda_nombre') as string || 'Dólares Americanos').trim();
		const moneda_simbolo = (formData.get('moneda_simbolo') as string || '$').trim();
		const moneda_iso = (formData.get('moneda_iso') as string || 'USD').trim().toUpperCase();
		const pie_pagina_ticket = (formData.get('pie_pagina_ticket') as string || '').trim();
		const terminos_condiciones = (formData.get('terminos_condiciones') as string || '').trim();

		const { error } = await locals.supabase
			.from('configuracion_general')
			.upsert({
				id: 1,
				moneda_nombre,
				moneda_simbolo,
				moneda_iso,
				pie_pagina_ticket: pie_pagina_ticket || null,
				terminos_condiciones: terminos_condiciones || null,
				updated_at: new Date().toISOString()
			});

		if (error) {
			return fail(500, { message: `Error al actualizar la configuración operativa: ${error.message}` });
		}

		return { success: true, action: 'updateOperational' };
	},

	resetColors: async ({ locals }) => {
		const roles = locals.user ? await getRolesForUser(locals, locals.user) : [];
		if (!roles.includes('admin')) return fail(403, { message: 'No tienes permisos de administrador' });

		const { error } = await locals.supabase
			.from('configuracion_general')
			.upsert({
				id: 1,
				color_primary: 'oklch(0.205 0 0)',
				color_primary_foreground: 'oklch(0.985 0 0)',
				color_accent: 'oklch(0.97 0 0)',
				color_accent_foreground: 'oklch(0.205 0 0)',
				sidebar_theme: 'default',
				border_radius: '0.625rem',
				updated_at: new Date().toISOString()
			});

		if (error) {
			return fail(500, { message: `Error al restablecer colores: ${error.message}` });
		}

		return { success: true, action: 'resetColors' };
	}
};
