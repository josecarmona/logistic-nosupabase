// Cliente de Supabase del lado del servidor.
// Usa las cookies de SvelteKit para mantener la sesión de forma segura.

import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Cookies } from '@sveltejs/kit';

/**
 * Cliente de Supabase del lado del servidor que sincroniza la sesión
 * con las cookies de SvelteKit. Debe usarse en hooks.server.ts y en los
 * load/actions del lado del servidor.
 */
export function createSupabaseServerClient(cookies: Cookies) {
	return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}

/**
 * Cliente de Supabase con la clave de servicio (service role).
 * Sólo debe usarse en el lado del servidor para operaciones de administración
 * (p. ej. crear/editar auth.users). Nunca debe exponerse al cliente.
 */
export function createSupabaseAdminClient() {
	return createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
