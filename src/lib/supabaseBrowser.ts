// Cliente de Supabase del lado del navegador.
// Se crea una única instancia reutilizada por toda la aplicación.

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Database } from '$lib/types/database';

// Se crea una única instancia del cliente del navegador.
export const supabaseBrowser = isBrowser()
	? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
	: null;
