// Servicio centralizado de gestión y persistencia local de temas y estilos visuales.
// Permite que el estilo del sistema se almacene localmente (localStorage) y se aplique
// de inmediato al iniciar la app, respetando estilos personalizados por credenciales de usuario.

import type { ConfiguracionGeneral, Perfil } from '$lib/types/database';

export interface ThemeStyle {
	color_primary: string;
	color_primary_foreground: string;
	color_accent: string;
	color_accent_foreground: string;
	sidebar_theme: 'default' | 'dark' | 'primary' | string;
	border_radius: string;
	nombre_empresa?: string;
	logo_url?: string | null;
	logo_dark_url?: string | null;
	favicon_url?: string | null;
	eslogan?: string | null;
	is_custom?: boolean;
}

export const DEFAULT_THEME: ThemeStyle = {
	color_primary: 'oklch(0.205 0 0)',
	color_primary_foreground: 'oklch(0.985 0 0)',
	color_accent: 'oklch(0.97 0 0)',
	color_accent_foreground: 'oklch(0.205 0 0)',
	sidebar_theme: 'default',
	border_radius: '0.625rem',
	nombre_empresa: 'LOGISTIC SYSTEM'
};

export const COLOR_PRESETS = [
	{ name: 'Negro Elegante', primary: 'oklch(0.205 0 0)', fg: 'oklch(0.985 0 0)' },
	{ name: 'Azul Corporativo', primary: 'oklch(0.488 0.243 264.376)', fg: 'oklch(0.985 0 0)' },
	{ name: 'Verde Esmeralda', primary: 'oklch(0.527 0.154 150.069)', fg: 'oklch(0.985 0 0)' },
	{ name: 'Púrpura Logístico', primary: 'oklch(0.491 0.27 292.581)', fg: 'oklch(0.985 0 0)' },
	{ name: 'Naranja Express', primary: 'oklch(0.592 0.229 37.768)', fg: 'oklch(0.985 0 0)' },
	{ name: 'Rojo Carmesí', primary: 'oklch(0.505 0.213 27.518)', fg: 'oklch(0.985 0 0)' }
];

export const SYSTEM_STYLE_KEY = 'logistic_system_style';
export const CURRENT_USER_ID_KEY = 'logistic_current_user_id';
export const USER_STYLE_PREFIX = 'logistic_user_style_';

/**
 * Aplica las variables CSS del estilo en el documento (:root / html)
 */
export function applyStyleToDOM(style: Partial<ThemeStyle>) {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;

	if (style.color_primary) {
		root.style.setProperty('--primary', style.color_primary);
	}
	if (style.color_primary_foreground) {
		root.style.setProperty('--primary-foreground', style.color_primary_foreground);
	}
	if (style.color_accent) {
		root.style.setProperty('--accent', style.color_accent);
	}
	if (style.color_accent_foreground) {
		root.style.setProperty('--accent-foreground', style.color_accent_foreground);
	}
	if (style.border_radius) {
		root.style.setProperty('--radius', style.border_radius);
	}

	if (style.sidebar_theme === 'dark') {
		root.style.setProperty('--sidebar', 'oklch(0.16 0 0)');
		root.style.setProperty('--sidebar-foreground', 'oklch(0.985 0 0)');
		root.style.setProperty('--sidebar-border', 'oklch(0.24 0 0)');
	} else if (style.sidebar_theme === 'primary' && style.color_primary) {
		root.style.setProperty('--sidebar', style.color_primary);
		root.style.setProperty('--sidebar-foreground', style.color_primary_foreground || 'oklch(0.985 0 0)');
		root.style.removeProperty('--sidebar-border');
	} else {
		root.style.removeProperty('--sidebar');
		root.style.removeProperty('--sidebar-foreground');
		root.style.removeProperty('--sidebar-border');
	}
}

/**
 * Obtiene el estilo general del sistema almacenado localmente
 */
export function getStoredSystemStyle(): ThemeStyle | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(SYSTEM_STYLE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as ThemeStyle;
	} catch (e) {
		return null;
	}
}

/**
 * Guarda el estilo del sistema en localStorage y lo aplica si no hay un estilo de usuario activo
 */
export function saveSystemStyle(config: Partial<ConfiguracionGeneral> | Partial<ThemeStyle>): ThemeStyle {
	const current = getStoredSystemStyle() || DEFAULT_THEME;

	const updated: ThemeStyle = {
		...current,
		color_primary: config.color_primary || current.color_primary,
		color_primary_foreground: config.color_primary_foreground || current.color_primary_foreground,
		color_accent: config.color_accent || current.color_accent,
		color_accent_foreground: config.color_accent_foreground || current.color_accent_foreground,
		sidebar_theme: config.sidebar_theme || current.sidebar_theme,
		border_radius: config.border_radius || current.border_radius,
		nombre_empresa: config.nombre_empresa || current.nombre_empresa,
		logo_url: config.logo_url !== undefined ? config.logo_url : current.logo_url,
		logo_dark_url: config.logo_dark_url !== undefined ? config.logo_dark_url : current.logo_dark_url,
		favicon_url: config.favicon_url !== undefined ? config.favicon_url : current.favicon_url,
		eslogan: config.eslogan !== undefined ? config.eslogan : current.eslogan
	};

	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem(SYSTEM_STYLE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.error('Error guardando estilo del sistema en localStorage:', e);
		}

		// Si el usuario actual no tiene un tema personalizado propio, aplicar el del sistema de inmediato
		const currentUserId = localStorage.getItem(CURRENT_USER_ID_KEY);
		const userStyle = currentUserId ? getUserStyle(currentUserId) : null;
		if (!userStyle) {
			applyStyleToDOM(updated);
		}
	}

	return updated;
}

/**
 * Obtiene el estilo personalizado de un usuario por su identificador (credenciales)
 */
export function getUserStyle(userId: string): ThemeStyle | null {
	if (typeof window === 'undefined' || !userId) return null;
	try {
		const raw = localStorage.getItem(USER_STYLE_PREFIX + userId);
		if (!raw) return null;
		return JSON.parse(raw) as ThemeStyle;
	} catch (e) {
		return null;
	}
}

/**
 * Guarda un estilo personalizado para el usuario actual
 */
export function saveUserStyle(userId: string, style: Partial<ThemeStyle> | null): ThemeStyle | null {
	if (typeof window === 'undefined' || !userId) return null;

	const userKey = USER_STYLE_PREFIX + userId;

	if (!style) {
		// Quitar personalización para volver al estilo del sistema
		try {
			localStorage.removeItem(userKey);
		} catch (e) {}

		const systemStyle = getStoredSystemStyle() || DEFAULT_THEME;
		applyStyleToDOM(systemStyle);
		return null;
	}

	const base = getStoredSystemStyle() || DEFAULT_THEME;
	const fullUserStyle: ThemeStyle = {
		...base,
		...style,
		is_custom: true
	};

	try {
		localStorage.setItem(userKey, JSON.stringify(fullUserStyle));
		localStorage.setItem(CURRENT_USER_ID_KEY, userId);
	} catch (e) {
		console.error('Error guardando estilo de usuario en localStorage:', e);
	}

	applyStyleToDOM(fullUserStyle);
	return fullUserStyle;
}

/**
 * Elimina la personalización del usuario y restablece el estilo general del sistema
 */
export function clearUserStyle(userId: string) {
	saveUserStyle(userId, null);
}

/**
 * Actualiza la referencia del usuario activo (al iniciar sesión o cerrar sesión)
 * y aplica el estilo correspondiente (el de dicho usuario o el del sistema si no tiene propio)
 */
export function setActiveUser(user: Perfil | null): ThemeStyle {
	const systemStyle = getStoredSystemStyle() || DEFAULT_THEME;

	if (typeof window === 'undefined') return systemStyle;

	if (!user?.id) {
		try {
			localStorage.removeItem(CURRENT_USER_ID_KEY);
		} catch (e) {}
		applyStyleToDOM(systemStyle);
		return systemStyle;
	}

	try {
		localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
	} catch (e) {}

	const userStyle = getUserStyle(user.id);
	if (userStyle) {
		applyStyleToDOM(userStyle);
		return userStyle;
	}

	// Usuario sin estilo personalizado: aplica el del sistema
	applyStyleToDOM(systemStyle);
	return systemStyle;
}

/**
 * Sincroniza en caliente la configuración del servidor y el usuario logueado
 */
export function syncTheme(config: ConfiguracionGeneral | null, user: Perfil | null): ThemeStyle {
	let activeStyle = getStoredSystemStyle() || DEFAULT_THEME;

	// Si vino configuración del servidor, actualizar la caché local del sistema
	if (config) {
		activeStyle = saveSystemStyle(config);
	}

	// Si hay usuario logueado, verificar si tiene estilos propios
	if (user?.id) {
		const userStyle = getUserStyle(user.id);
		if (userStyle) {
			applyStyleToDOM(userStyle);
			return userStyle;
		}
	}

	applyStyleToDOM(activeStyle);
	return activeStyle;
}
