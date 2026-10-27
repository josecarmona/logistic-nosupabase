// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database, Perfil } from '$lib/types/database';
import type { PermissionGuard } from '$lib/server/permissions';

declare global {
	namespace App {
		// Locals del lado del servidor, disponibles en load/actions.
		interface Locals {
			supabase: SupabaseClient<Database>;
			session: Session | null;
			// Perfil del usuario logueado (null si no tiene perfil todavía).
			user: Perfil | null;
			// Guard de permisos del usuario.
			guard: PermissionGuard | null;
		}

		// Datos añadidos a cada página.
		interface PageData {
			session: Session | null;
			user: Perfil | null;
		}

		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Re-export de tipos usados en el frontend
export type { Perfil };
