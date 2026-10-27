import { loadAuthData } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import type { ConfiguracionGeneral } from '$lib/types/database';
import { createSupabaseAdminClient } from '$lib/server/supabase';

/**
 * Layout raíz: expone a todas las páginas la sesión, el perfil, los roles
 * y la configuración general del sistema (branding, temas, datos visuales).
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const authData = await loadAuthData(locals);

	let configuracion: ConfiguracionGeneral | null = null;

	const { data, error } = await locals.supabase
		.from('configuracion_general')
		.select('*')
		.eq('id', 1)
		.maybeSingle();

	if (data) {
		configuracion = data as ConfiguracionGeneral;
	} else {
		// Fallback para usuarios no autenticados (pantalla de login/registro o visitante inicial)
		// permitiendo que carguen los estilos y logotipos del sistema sin requerir sesión activa
		try {
			const adminSupabase = createSupabaseAdminClient();
			const { data: adminConfig } = await adminSupabase
				.from('configuracion_general')
				.select('*')
				.eq('id', 1)
				.maybeSingle();

			if (adminConfig) {
				configuracion = adminConfig as ConfiguracionGeneral;
			}
		} catch (err) {
			console.error('Error al cargar configuración general con admin client fallback:', err);
		}
	}

	return {
		...authData,
		configuracion
	};
};
