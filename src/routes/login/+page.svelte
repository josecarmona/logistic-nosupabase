<script lang="ts">
	import { supabaseBrowser } from '$lib/supabaseBrowser';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { translateSupabaseError } from '$lib/utils/errors';
	import { page } from '$app/stores';
	import {
		Globe,
		Plane,
		PackageCheck,
		ShieldCheck,
		Lock,
		Mail,
		User,
		ArrowRight,
		Loader2,
		Sparkles,
		CheckCircle2,
		Truck
	} from '@lucide/svelte';

	import { getStoredSystemStyle, applyStyleToDOM } from '$lib/services/theme';

	let localSystemTheme = $state(getStoredSystemStyle());

	const configuracion = $derived($page.data?.configuracion || (localSystemTheme ? {
		id: 1,
		nombre_empresa: localSystemTheme.nombre_empresa || 'LOGÍSTICA GLOBAL',
		logo_url: localSystemTheme.logo_url || null,
		logo_dark_url: localSystemTheme.logo_dark_url || null,
		favicon_url: localSystemTheme.favicon_url || null,
		eslogan: localSystemTheme.eslogan || 'Soluciones de transporte y logística integral',
		telefono_empresa: null,
		email_empresa: null,
		color_primary: localSystemTheme.color_primary,
		color_primary_foreground: localSystemTheme.color_primary_foreground,
		color_accent: localSystemTheme.color_accent,
		color_accent_foreground: localSystemTheme.color_accent_foreground,
		sidebar_theme: localSystemTheme.sidebar_theme,
		border_radius: localSystemTheme.border_radius,
		moneda_nombre: 'Dólares Americanos',
		moneda_simbolo: '$',
		moneda_iso: 'USD',
		identificacion_fiscal: null,
		direccion_empresa: null,
		pie_pagina_ticket: null,
		terminos_condiciones: null,
		created_at: '',
		updated_at: ''
	} : null));

	let identificador = $state('');
	let password = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		const client = supabaseBrowser;
		if (!client) return;

		let targetEmail = identificador.trim().toLowerCase();

		// Si el usuario no ingresó un correo directo con '@', resolver vía RPC
		if (!targetEmail.includes('@')) {
			try {
				const { data: resolvedEmail, error: rpcError } = await client.rpc('obtener_email_login', {
					p_identificador: identificador.trim()
				});

				if (rpcError || !resolvedEmail) {
					loading = false;
					toast.error('Credenciales incorrectas', {
						description: 'No se encontró ninguna cuenta asociada a este código o teléfono.'
					});
					return;
				}
				targetEmail = String(resolvedEmail).trim().toLowerCase();
			} catch (e) {
				loading = false;
				toast.error('Error al resolver identificador', {
					description: 'Intenta ingresando tu correo directamente.'
				});
				return;
			}
		}

		const { data: authResult, error } = await client.auth.signInWithPassword({
			email: targetEmail,
			password
		});

		loading = false;
		if (error) {
			toast.error('Error al iniciar sesión', { description: translateSupabaseError(error) });
			return;
		}

		// Si el usuario autenticado tiene un tema propio configurado, aplicarlo de inmediato
		if (authResult?.user) {
			localStorage.setItem('logistic_current_user_id', authResult.user.id);
			const userStyleRaw = localStorage.getItem('logistic_user_style_' + authResult.user.id);
			if (userStyleRaw) {
				try {
					applyStyleToDOM(JSON.parse(userStyleRaw));
				} catch (e) {}
			}
		}

		toast.success('Sesión iniciada correctamente');
		await invalidateAll();
		goto('/');
	}
</script>

<svelte:head>
	<title>Iniciar Sesión | {configuracion?.nombre_empresa || 'Gestión de Envíos Internacionales'}</title>
</svelte:head>

<div class="min-h-screen w-full flex flex-col lg:flex-row bg-background relative overflow-hidden">
	<!-- Columna Izquierda: Banner Visual Logístico Internacional (Visible en Pantallas Medianas/Grandes) -->
	<div class="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/95 via-primary/85 to-primary/75 text-primary-foreground p-12 flex-col justify-between overflow-hidden">
		<!-- Elementos Gráficos de Fondo / Patrón Decorativo de Rutas -->
		<div class="absolute inset-0 opacity-10 pointer-events-none">
			<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
						<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="1" />
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#grid-pattern)" />
			</svg>
		</div>

		<!-- Curvas de Rutas Globales SVG -->
		<div class="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
		<div class="absolute -left-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

		<!-- Top: Identidad de Marca / Logo -->
		<div class="relative z-10 flex items-center gap-3">
			{#if configuracion?.logo_url || configuracion?.logo_dark_url}
				<img
					src={configuracion.logo_url || configuracion.logo_dark_url}
					alt={configuracion.nombre_empresa || 'Logo'}
					class="max-h-12 max-w-[200px] object-contain drop-shadow-sm"
				/>
			{:else}
				<div class="w-10 h-10 rounded-xl bg-white text-primary font-black flex items-center justify-center text-lg shadow-lg">
					LOG
				</div>
				<span class="font-extrabold text-xl tracking-tight">
					{configuracion?.nombre_empresa || 'LOGÍSTICA GLOBAL'}
				</span>
			{/if}
		</div>

		<!-- Centro: Mensaje de Valor y Capacidades Logísticas -->
		<div class="relative z-10 max-w-lg space-y-6">
			<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/20">
				<Globe class="w-4 h-4" /> Red Global de Despacho & Exportación
			</div>

			<h2 class="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
				Tu carga y envíos internacionales, conectados de extremo a extremo.
			</h2>

			<p class="text-sm text-primary-foreground/90 leading-relaxed">
				Cotización automatizada de tarifas, generación oficial de guías con QR, control aduanero y trazabilidad logística para tus operaciones comerciales.
			</p>

			<!-- Puntos Clave de Confianza -->
			<div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/20 text-xs">
				<div class="flex items-center gap-2">
					<div class="p-1.5 rounded-lg bg-white/15">
						<Plane class="w-4 h-4" />
					</div>
					<span>Rutas Aéreas y Marítimas</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="p-1.5 rounded-lg bg-white/15">
						<ShieldCheck class="w-4 h-4" />
					</div>
					<span>Cobertura de Seguro</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="p-1.5 rounded-lg bg-white/15">
						<Truck class="w-4 h-4" />
					</div>
					<span>Entrega Domicilio / Tienda</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="p-1.5 rounded-lg bg-white/15">
						<PackageCheck class="w-4 h-4" />
					</div>
					<span>Trazabilidad en Tiempo Real</span>
				</div>
			</div>
		</div>

		<!-- Bottom: Eslogan Corporativo / Copyright -->
		<div class="relative z-10 text-xs text-primary-foreground/75 flex items-center justify-between">
			<span>{configuracion?.eslogan || 'Soluciones de transporte y logística integral'}</span>
			<span>© {new Date().getFullYear()}</span>
		</div>
	</div>

	<!-- Columna Derecha: Formulario de Ingreso Moderno y Limpio -->
	<div class="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 relative">
		<!-- Fondo decorativo sutil -->
		<div class="absolute inset-0 bg-radial from-primary/5 via-transparent to-transparent pointer-events-none"></div>

		<div class="w-full max-w-md space-y-8 relative z-10">
			<!-- Encabezado de la Tarjeta de Ingreso con Logo Centrado -->
			<div class="text-center space-y-3">
				<div class="flex justify-center mb-2">
					{#if configuracion?.logo_url}
						<img
							src={configuracion.logo_url}
							alt={configuracion.nombre_empresa || 'Logo'}
							class="max-h-16 max-w-[220px] object-contain"
						/>
					{:else}
						<div class="p-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-lg inline-flex items-center gap-2">
							<Plane class="w-6 h-6" />
							<span>{configuracion?.nombre_empresa || 'LOGÍSTICA'}</span>
						</div>
					{/if}
				</div>

				<h1 class="text-2xl font-black tracking-tight text-foreground">
					Iniciar Sesión
				</h1>
				<p class="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
					Ingresa tus credenciales para acceder a la plataforma de gestión logística.
				</p>
			</div>

			<!-- Tarjeta del Formulario -->
			<Card class="border shadow-lg bg-card/80 backdrop-blur-sm">
				<CardContent class="p-6 sm:p-8 space-y-6">
					<form onsubmit={submit} class="space-y-4">
						<!-- Identificador de Acceso: Correo, Código o Teléfono -->
						<div class="space-y-1.5">
							<Label for="identificador" class="text-xs font-bold text-foreground">
								Correo, Código o Teléfono
							</Label>
							<div class="relative">
								<User class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
								<Input
									id="identificador"
									type="text"
									placeholder="correo@ejemplo.com, C000075 o celular"
									required
									bind:value={identificador}
									autocomplete="username"
									class="pl-9 h-10 text-xs bg-background"
								/>
							</div>
						</div>

						<!-- Contraseña -->
						<div class="space-y-1.5">
							<div class="flex items-center justify-between">
								<Label for="password" class="text-xs font-bold text-foreground">
									Contraseña
								</Label>
							</div>
							<div class="relative">
								<Lock class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
								<Input
									id="password"
									type="password"
									placeholder="••••••••••••"
									required
									bind:value={password}
									autocomplete="current-password"
									class="pl-9 h-10 text-xs bg-background"
								/>
							</div>
						</div>

						<!-- Botón de Ingreso Principal -->
						<Button
							type="submit"
							class="w-full h-10 text-xs font-bold tracking-wide shadow-md gap-2 mt-2"
							disabled={loading}
						>
							{#if loading}
								<Loader2 class="w-4 h-4 animate-spin" />
								<span>Ingresando al sistema...</span>
							{:else}
								<span>Acceder a la Plataforma</span>
								<ArrowRight class="w-4 h-4" />
							{/if}
						</Button>
					</form>

					<!-- Enlace de Registro de Cuenta Nueva -->
					<div class="pt-4 border-t text-center space-y-2">
						<p class="text-xs text-muted-foreground">
							¿Aún no tienes una cuenta de cliente?
						</p>
						<Button
							variant="outline"
							href="/register"
							class="w-full h-9 text-xs font-semibold gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary"
						>
							<Sparkles class="w-3.5 h-3.5 text-primary" /> Crear Cuenta de Cliente
						</Button>
					</div>
				</CardContent>
			</Card>

			<!-- Pie Informativo de Seguridad y Soporte -->
			<div class="text-center space-y-1">
				<div class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
					<ShieldCheck class="w-3.5 h-3.5 text-emerald-600" /> Conexión Segura cifrada SSL
				</div>
				{#if configuracion?.telefono_empresa || configuracion?.email_empresa}
					<p class="text-[10px] text-muted-foreground">
						Soporte: {configuracion?.telefono_empresa || ''} {configuracion?.email_empresa ? `• ${configuracion.email_empresa}` : ''}
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
