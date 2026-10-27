<script lang="ts">
	import { supabaseBrowser } from '$lib/supabaseBrowser';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { translateSupabaseError } from '$lib/utils/errors';
	import { page } from '$app/stores';
	import {
		UserPlus,
		Mail,
		Lock,
		UserCheck,
		ArrowRight,
		Loader2,
		ShieldCheck,
		Globe,
		Plane
	} from '@lucide/svelte';
	import { getStoredSystemStyle } from '$lib/services/theme';

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

	let email = $state('');
	let nombreCompleto = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (password.length < 6) {
			toast.error('La contraseña debe tener al menos 6 caracteres');
			return;
		}

		if (password !== confirmPassword) {
			toast.error('Las contraseñas no coinciden');
			return;
		}

		loading = true;
		const client = supabaseBrowser;
		if (!client) return;

		const cleanEmail = email.trim().toLowerCase();
		const cleanNombre = nombreCompleto.trim().toUpperCase();

		const { data, error } = await client.auth.signUp({
			email: cleanEmail,
			password,
			options: {
				data: {
					full_name: cleanNombre
				}
			}
		});

		loading = false;
		if (error) {
			toast.error('Error al registrar usuario', { description: translateSupabaseError(error) });
			return;
		}

		// Si se creó el usuario en auth, actualizar el perfil con el nombre completo en mayúsculas
		if (data.user) {
			await (client as any)
				.from('profiles')
				.update({
					nombre_completo: cleanNombre,
					email: cleanEmail
				})
				.eq('user_id', data.user.id);
		}

		toast.success('Cuenta creada exitosamente. Iniciando sesión…');
		await invalidateAll();
		goto('/ventas/historial');
	}
</script>

<svelte:head>
	<title>Registro de Cliente | {configuracion?.nombre_empresa || 'Gestión Logística'}</title>
</svelte:head>

<div class="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-8 bg-background relative overflow-hidden">
	<!-- Fondo decorativo sutil -->
	<div class="absolute inset-0 bg-radial from-primary/5 via-transparent to-transparent pointer-events-none"></div>

	<div class="w-full max-w-lg space-y-6 relative z-10">
		<!-- Encabezado con Logo -->
		<div class="text-center space-y-2">
			<div class="flex justify-center mb-1">
				{#if configuracion?.logo_url}
					<img
						src={configuracion.logo_url}
						alt={configuracion.nombre_empresa || 'Logo'}
						class="max-h-14 max-w-[200px] object-contain"
					/>
				{:else}
					<div class="p-3 rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-md inline-flex items-center gap-2">
						<Plane class="w-5 h-5" />
						<span>{configuracion?.nombre_empresa || 'LOGÍSTICA'}</span>
					</div>
				{/if}
			</div>

			<h1 class="text-2xl font-black tracking-tight text-foreground">
				Crear Cuenta de Cliente
			</h1>
			<p class="text-xs text-muted-foreground max-w-sm mx-auto">
				Regístrate para solicitar envíos, consultar tus cotizaciones y dar seguimiento a tus paquetes internacionales.
			</p>
		</div>

		<!-- Tarjeta de Registro -->
		<Card class="border shadow-lg bg-card/80 backdrop-blur-sm">
			<CardContent class="p-6 sm:p-8 space-y-5">
				<form onsubmit={submit} class="space-y-4">
					<div class="space-y-1.5">
						<Label for="nombre" class="text-xs font-bold text-foreground">Nombre Completo *</Label>
						<div class="relative">
							<UserCheck class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
							<InputUppercase
								id="nombre"
								placeholder="JUAN PÉREZ"
								required
								bind:value={nombreCompleto}
								class="pl-9 h-10 text-xs bg-background"
							/>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="email" class="text-xs font-bold text-foreground">Correo Electrónico *</Label>
						<div class="relative">
							<Mail class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
							<Input
								id="email"
								type="email"
								placeholder="correo@ejemplo.com"
								required
								bind:value={email}
								autocomplete="email"
								class="pl-9 h-10 text-xs bg-background"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<Label for="password" class="text-xs font-bold text-foreground">Contraseña *</Label>
							<div class="relative">
								<Lock class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
								<Input
									id="password"
									type="password"
									placeholder="Mínimo 6 caract."
									required
									bind:value={password}
									autocomplete="new-password"
									class="pl-9 h-10 text-xs bg-background"
								/>
							</div>
						</div>

						<div class="space-y-1.5">
							<Label for="confirmPassword" class="text-xs font-bold text-foreground">Confirmar Contraseña *</Label>
							<div class="relative">
								<Lock class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
								<Input
									id="confirmPassword"
									type="password"
									placeholder="Repite contraseña"
									required
									bind:value={confirmPassword}
									autocomplete="new-password"
									class="pl-9 h-10 text-xs bg-background"
								/>
							</div>
						</div>
					</div>

					<Button
						type="submit"
						class="w-full h-10 text-xs font-bold tracking-wide shadow-md gap-2 mt-3"
						disabled={loading}
					>
						{#if loading}
							<Loader2 class="w-4 h-4 animate-spin" />
							<span>Creando cuenta de cliente...</span>
						{:else}
							<span>Crear Mi Cuenta</span>
							<ArrowRight class="w-4 h-4" />
						{/if}
					</Button>
				</form>

				<div class="pt-3 border-t text-center space-y-1">
					<p class="text-xs text-muted-foreground">
						¿Ya tienes una cuenta registrada?
					</p>
					<Button
						variant="ghost"
						href="/login"
						class="text-xs font-bold text-primary hover:underline hover:bg-transparent"
					>
						Iniciar Sesión
					</Button>
				</div>
			</CardContent>
		</Card>

		<div class="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
			<ShieldCheck class="w-3.5 h-3.5 text-emerald-600" /> Plataforma Segura para Envíos Internacionales
		</div>
	</div>
</div>
