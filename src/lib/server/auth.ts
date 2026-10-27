// Helpers de autenticación y acceso al perfil del usuario logueado.

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { Perfil, Database } from '$lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Obtiene el perfil del usuario autenticado a partir de un evento (load/action).
 * Devuelve null si no hay sesión.
 */
export async function getProfile(
	locals: App.Locals,
	supabase: App.Locals['supabase']
): Promise<Perfil | null> {
	const session = locals.session;
	if (!session?.user) return null;

	// Busca por user_id o por id principal
	const { data: byUser, error: err1 } = await supabase
		.from('profiles')
		.select('*')
		.or(`user_id.eq.${session.user.id},id.eq.${session.user.id}`)
		.maybeSingle();

	if (byUser) return byUser as Perfil;

	// Si no se encuentra, busca por email para vincular un perfil creado previamente sin auth user
	if (session.user.email) {
		const { data: byEmail } = await supabase
			.from('profiles')
			.select('*')
			.eq('email', session.user.email)
			.maybeSingle();

		const p = byEmail as Perfil | null;
		if (p) {
			const updated = { ...p, user_id: session.user.id };
			await supabase.from('profiles').update({ user_id: session.user.id }).eq('id', p.id);
			return updated as Perfil;
		}
	}

	// Fallback automático: Si por alguna razón la BD no tenía perfil creado (ej. trigger retrasado),
	// crea el perfil automáticamente para cumplir la regla "no usuario sin perfil".
	const { data: defaultRole } = await supabase
		.from('roles')
		.select('id')
		.eq('nombre', 'cliente')
		.maybeSingle();

	const defaultRolId = (defaultRole as { id: number } | null)?.id || null;

	const newProfileData = {
		user_id: session.user.id,
		email: session.user.email || '',
		nombre_completo: (
			(session.user.user_metadata?.full_name as string) ||
			(session.user.email ? session.user.email.split('@')[0] : '')
		).toUpperCase(),
		rol_id: defaultRolId,
		activo: true
	};

	const { data: created } = await supabase
		.from('profiles')
		.insert(newProfileData)
		.select('*')
		.maybeSingle();

	if (created) return created as Perfil;

	return null;
}

/**
 * Obtiene el perfil requiriendo que el usuario esté autenticado.
 * Lanza error 401 si no hay sesión.
 */
export async function requireProfile(locals: App.Locals): Promise<Perfil> {
	const profile = await getProfile(locals, locals.supabase);
	if (!profile) {
		throw error(401, 'No autenticado');
	}
	return profile;
}

/**
 * Obtiene los nombres de los roles del usuario a partir de su perfil.
 * Si el perfil no tiene rol, se asume 'cliente' (rol por defecto).
 */
export async function getRolesForUser(locals: App.Locals, profile: Perfil): Promise<string[]> {
	if (!profile.rol_id) return ['cliente'];

	const { data, error: dbError } = await locals.supabase
		.from('roles')
		.select('nombre')
		.eq('id', profile.rol_id)
		.eq('activo', true)
		.single();

	if (dbError || !data) return ['cliente'];
	return [(data as { nombre: string }).nombre];
}

/**
 * Helper que combina sesión + perfil + roles para el componente layout.
 */
export async function loadAuthData(locals: App.Locals) {
	const profile = await getProfile(locals, locals.supabase);
	const roles = profile ? await getRolesForUser(locals, profile) : [];
	return {
		user: profile,
		session: locals.session,
		roles
	};
}

import { createSupabaseAdminClient } from '$lib/server/supabase';

/**
 * Genera un correo virtual estándar para acceso al sistema cuando un cliente no tiene correo.
 */
export function generarCorreoVirtualCliente(codigo?: string | null, id?: string | null): string {
	const raw = (codigo || (id ? id.slice(0, 8) : 'cliente')).trim();
	const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
	return `${clean}@cliente.hhworldgroup.com`;
}

/**
 * Helper para sincronizar o crear usuario de autenticación en Supabase Auth y devolver user_id.
 */
export async function syncAuthUser(email: string, password?: string, fullName?: string): Promise<string | null> {
	if (!email) return null;
	try {
		const adminSupabase = createSupabaseAdminClient();
		const { data: usersData } = await adminSupabase.auth.admin.listUsers();
		const existingUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

		if (existingUser) {
			if (password && password.trim().length >= 6) {
				await adminSupabase.auth.admin.updateUserById(existingUser.id, {
					password: password.trim(),
					email_confirm: true,
					user_metadata: {
						...(existingUser.user_metadata || {}),
						full_name: fullName || existingUser.user_metadata?.full_name,
						password_visible: password.trim()
					}
				});
			}
			return existingUser.id;
		} else if (password && password.trim().length >= 6) {
			const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
				email: email.toLowerCase(),
				password: password.trim(),
				email_confirm: true,
				user_metadata: {
					full_name: fullName,
					password_visible: password.trim()
				}
			});
			if (created?.user) {
				return created.user.id;
			} else if (createErr) {
				console.error('Error al crear usuario auth:', createErr.message);
			}
		}
	} catch (e) {
		console.error('Error en syncAuthUser:', e);
	}
	return null;
}
