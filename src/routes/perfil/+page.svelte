<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { enhance } from '$app/forms';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { lookupGeoLocation, lookupGeoLocationWithDetails } from '$lib/services/geo';
	import { toast } from 'svelte-sonner';
	import { MapPin, Loader2, Save, Palette, RotateCcw, Sparkles, Check } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		COLOR_PRESETS,
		getUserStyle,
		saveUserStyle,
		clearUserStyle,
		getStoredSystemStyle
	} from '$lib/services/theme';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const profile = $derived(data.profile);
	const paises = $derived(data.paises);
	const adquisiciones = $derived(data.adquisiciones);

	let nombreCompleto = $state('');
	let razonSocial = $state('');
	let direccion1 = $state('');
	let direccion2 = $state('');
	let paisId = $state('');
	let codigoPostal = $state('');
	let ciudad = $state('');
	let estado = $state('');
	let municipio = $state('');
	let numeroCelular = $state('');
	let telefono = $state('');
	let tipoAdquisicionId = $state('');
	let referencia = $state('');
	let cedula = $state('');

	const isVenezuela = $derived.by(() => {
		const p = paises.find((pa) => String(pa.id) === String(paisId));
		return p?.codigo_iso2 === 'VE';
	});

	let searchingGeo = $state(false);

	$effect(() => {
		if (profile) {
			nombreCompleto = profile.nombre_completo || '';
			razonSocial = profile.razon_social || '';
			direccion1 = profile.direccion_1 || '';
			direccion2 = profile.direccion_2 || '';
			paisId = profile.pais_id ? String(profile.pais_id) : '';
			codigoPostal = profile.codigo_postal || '';
			ciudad = profile.ciudad || '';
			estado = profile.estado || '';
			municipio = profile.municipio || '';
			numeroCelular = profile.numero_celular || '';
			telefono = profile.telefono || '';
			tipoAdquisicionId = profile.tipo_adquisicion_id ? String(profile.tipo_adquisicion_id) : '';
			referencia = profile.referencia || '';
			cedula = profile.cedula || '';
		}
	});

	// Mostrar toasts al recibir resultado de la acción del servidor
	$effect(() => {
		if (form?.success) {
			toast.success('Perfil actualizado correctamente');
		} else if (form?.message) {
			toast.error('Error al guardar', { description: form.message });
		}
	});

	async function handleGeoSearch() {
		if (!codigoPostal.trim()) {
			toast.error('Ingresa un código postal primero');
			return;
		}

		const selectedPais = paises.find((p) => String(p.id) === paisId);
		const iso2 = selectedPais ? selectedPais.codigo_iso2 : 'US';
		const paisNombre = selectedPais ? selectedPais.nombre : '';

		searchingGeo = true;
		const { result, message } = await lookupGeoLocationWithDetails(iso2, codigoPostal, paisNombre);
		searchingGeo = false;

		if (result && (result.ciudad || result.estado || result.municipio)) {
			if (result.ciudad) ciudad = result.ciudad;
			if (result.estado) estado = result.estado;
			if (result.municipio) municipio = result.municipio;
			toast.success('Ubicación encontrada automáticamente por API');
		} else {
			toast.info(message || 'No se encontró ubicación automática para ese código postal. Puedes capturar los datos manualmente.');
		}
	}

	// Gestión de tema personalizado por usuario (credenciales específicas)
	let useSystemTheme = $state(true);
	let userColorPrimary = $state('oklch(0.205 0 0)');
	let userColorPrimaryFg = $state('oklch(0.985 0 0)');
	let userSidebarTheme = $state('default');
	let userBorderRadius = $state('0.625rem');

	$effect(() => {
		if (profile?.id) {
			const existingUserStyle = getUserStyle(profile.id);
			if (existingUserStyle && existingUserStyle.is_custom) {
				useSystemTheme = false;
				userColorPrimary = existingUserStyle.color_primary;
				userColorPrimaryFg = existingUserStyle.color_primary_foreground;
				userSidebarTheme = existingUserStyle.sidebar_theme;
				userBorderRadius = existingUserStyle.border_radius;
			} else {
				useSystemTheme = true;
				const sys = getStoredSystemStyle();
				if (sys) {
					userColorPrimary = sys.color_primary;
					userColorPrimaryFg = sys.color_primary_foreground;
					userSidebarTheme = sys.sidebar_theme;
					userBorderRadius = sys.border_radius;
				}
			}
		}
	});

	function handleApplyUserPreset(preset: (typeof COLOR_PRESETS)[0]) {
		userColorPrimary = preset.primary;
		userColorPrimaryFg = preset.fg;
	}

	function handleSaveUserTheme() {
		if (!profile?.id) return;
		if (useSystemTheme) {
			clearUserStyle(profile.id);
			toast.success('Se ha restablecido al estilo general del sistema');
		} else {
			saveUserStyle(profile.id, {
				color_primary: userColorPrimary,
				color_primary_foreground: userColorPrimaryFg,
				sidebar_theme: userSidebarTheme,
				border_radius: userBorderRadius
			});
			toast.success('Estilo personal guardado correctamente para tu cuenta');
		}
	}

	function handleResetToSystem() {
		if (!profile?.id) return;
		useSystemTheme = true;
		clearUserStyle(profile.id);
		const sys = getStoredSystemStyle();
		if (sys) {
			userColorPrimary = sys.color_primary;
			userColorPrimaryFg = sys.color_primary_foreground;
			userSidebarTheme = sys.sidebar_theme;
			userBorderRadius = sys.border_radius;
		}
		toast.info('Estilo restablecido al predeterminado del sistema');
	}
</script>

<svelte:head>
	<title>Mi Perfil - Sistema Logística</title>
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<Card>
		<CardHeader>
			<CardTitle class="text-2xl font-bold">Mi Perfil de Usuario</CardTitle>
			<CardDescription>
				Consulta y actualiza tus datos de contacto, dirección y ubicación geográfica.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/update" use:enhance class="space-y-6">
				<!-- Datos de cuenta -->
				<div class="space-y-4">
					<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
						Datos de Cuenta
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="email">Correo Electrónico</Label>
							<Input id="email" value={profile.email} disabled class="bg-muted" />
						</div>

						<div class="space-y-2">
							<Label for="nombre_completo">Nombre Completo *</Label>
							<InputUppercase
								id="nombre_completo"
								name="nombre_completo"
								required
								bind:value={nombreCompleto}
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="razon_social">Razón Social</Label>
						<InputUppercase
							id="razon_social"
							name="razon_social"
							placeholder="EMPRESA S.A. DE C.V."
							bind:value={razonSocial}
						/>
					</div>
				</div>

				<!-- Ubicación y Dirección con Geolocalización -->
				<div class="space-y-4">
					<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
						Dirección y Ubicación
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="direccion_1">Dirección Línea 1</Label>
							<InputUppercase
								id="direccion_1"
								name="direccion_1"
								placeholder="CALLE PRINCIPAL #123"
								bind:value={direccion1}
							/>
						</div>

						<div class="space-y-2">
							<Label for="direccion_2">Dirección Línea 2</Label>
							<InputUppercase
								id="direccion_2"
								name="direccion_2"
								placeholder="COLONIA O PISO"
								bind:value={direccion2}
							/>
						</div>
					</div>

					<!-- País y CP (se solicitan primero para la búsqueda automática) -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-muted/30 p-4 rounded-lg border">
						<div class="space-y-2 sm:col-span-1">
							<Label for="pais_id">País</Label>
							<select
								id="pais_id"
								name="pais_id"
								bind:value={paisId}
								class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring uppercase"
							>
								<option value="">-- SELECCIONAR --</option>
								{#each paises as p}
									<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2 sm:col-span-1">
							<Label for="codigo_postal">Código Postal</Label>
							<InputUppercase
								id="codigo_postal"
								name="codigo_postal"
								placeholder="CP 12345"
								bind:value={codigoPostal}
							/>
						</div>

						<div class="sm:col-span-1">
							<Button
								type="button"
								variant="secondary"
								class="w-full gap-2"
								onclick={handleGeoSearch}
								disabled={searchingGeo}
							>
								{#if searchingGeo}
									<Loader2 class="w-4 h-4 animate-spin" /> Buscando…
								{:else}
									<MapPin class="w-4 h-4 text-primary" /> Auto-Ubicar
								{/if}
							</Button>
						</div>
					</div>

					{#if isVenezuela}
						<div class="space-y-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
							<Label for="cedula" class="text-xs font-bold text-amber-700 dark:text-amber-400">
								Cédula de Identidad / RIF (Venezuela) *
							</Label>
							<InputUppercase
								id="cedula"
								name="cedula"
								placeholder="EJ. V-12345678 O J-123456789"
								required
								bind:value={cedula}
							/>
						</div>
					{/if}

					<!-- Ciudad, Estado, Municipio (Auto o Fallback manual) -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div class="space-y-2">
							<Label for="ciudad">Ciudad</Label>
							<InputUppercase
								id="ciudad"
								name="ciudad"
								placeholder="CIUDAD"
								bind:value={ciudad}
							/>
						</div>

						<div class="space-y-2">
							<Label for="estado">Estado / Departamento</Label>
							<InputUppercase
								id="estado"
								name="estado"
								placeholder="ESTADO"
								bind:value={estado}
							/>
						</div>

						<div class="space-y-2">
							<Label for="municipio">Municipio / Condado</Label>
							<InputUppercase
								id="municipio"
								name="municipio"
								placeholder="MUNICIPIO"
								bind:value={municipio}
							/>
						</div>
					</div>
				</div>

				<!-- Contacto y Adquisición -->
				<div class="space-y-4">
					<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
						Contacto y Referencias
					</h3>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="numero_celular">Número Celular</Label>
							<Input
								id="numero_celular"
								name="numero_celular"
								type="tel"
								placeholder="+52 555 123 4567"
								bind:value={numeroCelular}
							/>
						</div>

						<div class="space-y-2">
							<Label for="telefono">Teléfono Fijo</Label>
							<Input
								id="telefono"
								name="telefono"
								type="tel"
								placeholder="555 123 4567"
								bind:value={telefono}
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="tipo_adquisicion_id">Tipo de Adquisición</Label>
							<select
								id="tipo_adquisicion_id"
								name="tipo_adquisicion_id"
								bind:value={tipoAdquisicionId}
								class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring uppercase"
							>
								<option value="">-- SELECCIONAR --</option>
								{#each adquisiciones as adq}
									<option value={String(adq.id)}>{adq.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<Label for="referencia">Referencia / Notas</Label>
							<InputUppercase
								id="referencia"
								name="referencia"
								placeholder="REFERIDO POR..."
								bind:value={referencia}
							/>
						</div>
					</div>
				</div>

				<div class="pt-4 flex justify-end">
					<Button type="submit" class="w-full sm:w-auto gap-2">
						<Save class="w-4 h-4" /> Guardar Cambios
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<!-- Card: Preferencia de Estilo y Tema Personal -->
	<Card class="mt-6 border shadow-sm">
		<CardHeader>
			<div class="flex items-center justify-between flex-wrap gap-2">
				<CardTitle class="text-xl font-bold flex items-center gap-2">
					<Palette class="w-5 h-5 text-primary" /> Estilo y Tema de mi Cuenta
				</CardTitle>
				<Badge variant={useSystemTheme ? 'outline' : 'default'} class="text-xs uppercase font-bold">
					{useSystemTheme ? 'Estilo del Sistema (Global)' : 'Estilo Personalizado'}
				</Badge>
			</div>
			<CardDescription class="text-xs">
				El sistema utiliza por defecto el estilo y colores corporativos globales guardados localmente. Puedes personalizar tus propios colores para cuando inicies sesión con tus credenciales.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<!-- Selector de Modo: Sistema vs Personalizado -->
			<div class="flex flex-col sm:flex-row gap-3 p-3 bg-muted/40 rounded-lg border">
				<button
					type="button"
					onclick={() => (useSystemTheme = true)}
					class={`flex-1 p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
						useSystemTheme
							? 'bg-background border-primary shadow-sm ring-1 ring-primary text-foreground'
							: 'bg-transparent border-transparent hover:bg-muted text-muted-foreground'
					}`}
				>
					<div>
						<div class="font-bold text-xs">Estilo Predeterminado del Sistema</div>
						<div class="text-[11px] text-muted-foreground">Usa el tema, colores y logos globales configurados por la empresa.</div>
					</div>
					{#if useSystemTheme}
						<Check class="w-4 h-4 text-primary shrink-0 ml-2" />
					{/if}
				</button>

				<button
					type="button"
					onclick={() => (useSystemTheme = false)}
					class={`flex-1 p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
						!useSystemTheme
							? 'bg-background border-primary shadow-sm ring-1 ring-primary text-foreground'
							: 'bg-transparent border-transparent hover:bg-muted text-muted-foreground'
					}`}
				>
					<div>
						<div class="font-bold text-xs">Estilo Personalizado (Mis Credenciales)</div>
						<div class="text-[11px] text-muted-foreground">Define tus propios colores primarios y estilo de menú lateral.</div>
					</div>
					{#if !useSystemTheme}
						<Check class="w-4 h-4 text-primary shrink-0 ml-2" />
					{/if}
				</button>
			</div>

			{#if !useSystemTheme}
				<!-- Selector de Presets -->
				<div class="space-y-3 pt-2">
					<Label class="text-xs font-bold block">Paletas Recomendadas para tu Usuario:</Label>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{#each COLOR_PRESETS as preset}
							<button
								type="button"
								onclick={() => handleApplyUserPreset(preset)}
								class="p-2.5 rounded-lg border text-left flex items-center gap-2 hover:bg-accent transition-all group"
							>
								<span class="w-4 h-4 rounded-full border shrink-0 shadow-sm" style={`background-color: ${preset.primary};`}></span>
								<span class="text-xs font-semibold truncate group-hover:text-primary">{preset.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Configuración Manual de Colores y Sidebar -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
					<div class="space-y-1.5">
						<Label class="text-xs">Color Primario Personal</Label>
						<div class="flex items-center gap-2">
							<Input bind:value={userColorPrimary} class="font-mono text-xs" />
							<span class="w-8 h-8 rounded border shrink-0 shadow-sm" style={`background-color: ${userColorPrimary};`}></span>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs">Texto sobre Primario</Label>
						<div class="flex items-center gap-2">
							<Input bind:value={userColorPrimaryFg} class="font-mono text-xs" />
							<span class="w-8 h-8 rounded border shrink-0 shadow-sm" style={`background-color: ${userColorPrimaryFg};`}></span>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs">Tema del Menú Lateral</Label>
						<select bind:value={userSidebarTheme} class="w-full h-9 px-2.5 rounded-md border text-xs font-medium uppercase bg-background">
							<option value="default">CLARO ESTÁNDAR (BLANCO)</option>
							<option value="dark">MODO OSCURO (NEGRO ELEGANTE)</option>
							<option value="primary">COLOR PRIMARIO DE MI TEMA</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs">Radio de Bordes</Label>
						<select bind:value={userBorderRadius} class="w-full h-9 px-2.5 rounded-md border text-xs font-medium uppercase bg-background">
							<option value="0rem">RECTO (0px)</option>
							<option value="0.3rem">SUAVE (4px / 0.3rem)</option>
							<option value="0.625rem">ESTÁNDAR (10px / 0.625rem)</option>
							<option value="0.85rem">REDONDEADO PRO (14px / 0.85rem)</option>
						</select>
					</div>
				</div>

				<!-- Previsualización -->
				<div class="p-3 bg-muted/20 border border-dashed rounded-lg space-y-2">
					<div class="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
						<Sparkles class="w-3.5 h-3.5 text-primary" /> Vista Previa con tu Tema Personal
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<button
							type="button"
							class="px-3 py-1.5 text-xs font-bold rounded shadow-sm"
							style={`background-color: ${userColorPrimary}; color: ${userColorPrimaryFg}; border-radius: ${userBorderRadius};`}
						>
							Botón Personal
						</button>
						<span
							class="px-2.5 py-1 text-xs font-extrabold rounded-full uppercase tracking-wider"
							style={`background-color: ${userColorPrimary}; color: ${userColorPrimaryFg};`}
						>
							MI PERFIL
						</span>
					</div>
				</div>
			{/if}

			<!-- Botones de Acción -->
			<div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={handleResetToSystem}
					class="gap-1.5 text-xs w-full sm:w-auto"
				>
					<RotateCcw class="w-3.5 h-3.5" /> Restablecer al Tema del Sistema
				</Button>

				<Button
					type="button"
					size="sm"
					onclick={handleSaveUserTheme}
					class="gap-1.5 text-xs w-full sm:w-auto"
				>
					<Save class="w-3.5 h-3.5" /> Guardar Preferencias de Estilo
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
