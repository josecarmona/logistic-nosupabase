// Utilidad para traducir y formatear errores de Supabase Auth y Base de Datos al español.

/**
 * Traduce mensajes de error provenientes de Supabase Auth / PostgreSQL a español comprensible.
 */
export function translateSupabaseError(err: any): string {
	if (!err) return 'Ocurrió un error inesperado.';

	const rawMessage = typeof err === 'string' ? err : err.message || err.error_description || '';
	const clean = rawMessage.toLowerCase();

	if (clean.includes('invalid login credentials') || clean.includes('invalid_credentials')) {
		return 'Correo electrónico o contraseña incorrectos.';
	}
	if (clean.includes('email rate limit exceeded') || clean.includes('rate limit')) {
		return 'Se ha superado el límite de envío de correos. Por favor, intente más tarde o desactive la confirmación por email en desarrollo.';
	}
	if (clean.includes('user already registered') || clean.includes('already exists')) {
		return 'Ya existe un usuario registrado con este correo electrónico.';
	}
	if (clean.includes('password should be at least')) {
		return 'La contraseña debe tener al menos 6 caracteres.';
	}
	if (clean.includes('email not confirmed')) {
		return 'El correo electrónico no ha sido confirmado aún.';
	}
	if (clean.includes('token has expired') || clean.includes('invalid token')) {
		return 'El enlace o token de verificación ha expirado o es inválido.';
	}
	if (clean.includes('row-level security') || clean.includes('rls')) {
		return 'No tiene permisos suficientes para realizar esta operación.';
	}
	if (clean.includes('unique constraint') || clean.includes('duplicate key')) {
		return 'Ya existe un registro con esta información en el sistema.';
	}
	if (clean.includes('signup requires a valid password')) {
		return 'Se requiere una contraseña válida para el registro.';
	}

	// Si hay un mensaje explicativo, devolverlo o usar genérico
	return rawMessage || 'Ocurrió un error al procesar la solicitud. Por favor intente nuevamente.';
}
