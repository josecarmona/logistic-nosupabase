<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import {
		Palette,
		Image as ImageIcon,
		Building2,
		Settings,
		Upload,
		Trash2,
		RotateCcw,
		CheckCircle2,
		Sparkles,
		DollarSign,
		FileText,
		Globe,
		HelpCircle
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const cfg = $derived(data.configuracion);

	let activeTab = $state<'apariencia' | 'logos' | 'empresa' | 'operaciones'>('apariencia');

	// Presets de colores precargados
	const COLOR_PRESETS = [
		{ name: 'Negro Elegante', primary: 'oklch(0.205 0 0)', fg: 'oklch(0.985 0 0)' },
		{ name: 'Azul Corporativo', primary: 'oklch(0.488 0.243 264.376)', fg: 'oklch(0.985 0 0)' },
		{ name: 'Verde Esmeralda', primary: 'oklch(0.527 0.154 150.069)', fg: 'oklch(0.985 0 0)' },
		{ name: 'Púrpura Logístico', primary: 'oklch(0.491 0.27 292.581)', fg: 'oklch(0.985 0 0)' },
		{ name: 'Naranja Express', primary: 'oklch(0.592 0.229 37.768)', fg: 'oklch(0.985 0 0)' },
		{ name: 'Rojo Carmesí', primary: 'oklch(0.505 0.213 27.518)', fg: 'oklch(0.985 0 0)' }
	];

	// Formulario de Colores y Apariencia
	let colorPrimary = $state('oklch(0.205 0 0)');
	let colorPrimaryFg = $state('oklch(0.985 0 0)');
	let colorAccent = $state('oklch(0.97 0 0)');
	let colorAccentFg = $state('oklch(0.205 0 0)');
	let sidebarTheme = $state('default');
	let borderRadius = $state('0.625rem');

	// Sincronizar estado cuando se carga o guarda
	$effect(() => {
		if (cfg) {
			colorPrimary = cfg.color_primary;
			colorPrimaryFg = cfg.color_primary_foreground;
			colorAccent = cfg.color_accent;
			colorAccentFg = cfg.color_accent_foreground;
			sidebarTheme = cfg.sidebar_theme;
			borderRadius = cfg.border_radius;
		}
	});

	function applyPreset(preset: (typeof COLOR_PRESETS)[0]) {
		colorPrimary = preset.primary;
		colorPrimaryFg = preset.fg;
	}

	import { invalidateAll } from '$app/navigation';
	import { saveSystemStyle } from '$lib/services/theme';

	$effect(() => {
		if (form?.success) {
			toast.success('Configuración actualizada exitosamente');
			// Actualizar inmediatamente en el almacenamiento local del navegador
			saveSystemStyle({
				color_primary: colorPrimary,
				color_primary_foreground: colorPrimaryFg,
				color_accent: colorAccent,
				color_accent_foreground: colorAccentFg,
				sidebar_theme: sidebarTheme,
				border_radius: borderRadius,
				nombre_empresa: cfg?.nombre_empresa,
				logo_url: cfg?.logo_url,
				logo_dark_url: cfg?.logo_dark_url,
				favicon_url: cfg?.favicon_url
			});
			invalidateAll();
		} else if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Configuración General y Personalización Visual | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
				<Settings class="w-6 h-6 text-primary" /> Configuración General del Sistema
			</h1>
			<p class="text-xs text-muted-foreground">
				Personalización visual (Logos, Colores, Temas), datos de empresa y parámetros operativos.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<form method="POST" action="?/resetColors" use:enhance>
				<Button type="submit" variant="outline" size="sm" class="gap-1.5 text-xs">
					<RotateCcw class="w-3.5 h-3.5" /> Restablecer Colores
				</Button>
			</form>
		</div>
	</div>

	<!-- Pestañas de Navegación del Panel de Configuración -->
	<div class="flex flex-wrap gap-2 border-b pb-2">
		<button
			type="button"
			onclick={() => (activeTab = 'apariencia')}
			class={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
				activeTab === 'apariencia'
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'
			}`}
		>
			<Palette class="w-4 h-4" /> Apariencia y Colores
		</button>

		<button
			type="button"
			onclick={() => (activeTab = 'logos')}
			class={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
				activeTab === 'logos'
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'
			}`}
		>
			<ImageIcon class="w-4 h-4" /> Logos y Marca
		</button>

		<button
			type="button"
			onclick={() => (activeTab = 'empresa')}
			class={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
				activeTab === 'empresa'
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'
			}`}
		>
			<Building2 class="w-4 h-4" /> Datos de Empresa
		</button>

		<button
			type="button"
			onclick={() => (activeTab = 'operaciones')}
			class={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
				activeTab === 'operaciones'
					? 'bg-primary text-primary-foreground shadow-sm'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'
			}`}
		>
			<DollarSign class="w-4 h-4" /> Formato y Documentos
		</button>
	</div>

	<!-- PESTAÑA 1: APARIENCIA Y COLORES DE LA UI -->
	{#if activeTab === 'apariencia'}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
			<!-- Formulario de Configuración de Colores -->
			<Card class="lg:col-span-7">
				<CardHeader class="pb-3">
					<CardTitle class="text-base font-semibold flex items-center gap-2">
						<Palette class="w-4 h-4 text-primary" /> Paleta de Colores de la Marca
					</CardTitle>
					<CardDescription class="text-xs">
						Selecciona presets precargados o define tus propias variables CSS de color.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Presets Rápidos -->
					<div class="space-y-2">
						<Label class="text-xs font-bold block">Presets de Colores Recomendados:</Label>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{#each COLOR_PRESETS as preset}
								<button
									type="button"
									onclick={() => applyPreset(preset)}
									class="p-2.5 rounded-lg border text-left flex items-center gap-2 hover:bg-accent transition-all group"
								>
									<span class="w-4 h-4 rounded-full border shrink-0 shadow-sm" style={`background-color: ${preset.primary};`}></span>
									<span class="text-xs font-semibold truncate group-hover:text-primary">{preset.name}</span>
								</button>
							{/each}
						</div>
					</div>

					<form method="POST" action="?/updateColors" use:enhance class="space-y-4 pt-4 border-t">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<Label class="text-xs">Color Primario (Primary)</Label>
								<div class="flex items-center gap-2">
									<Input name="color_primary" bind:value={colorPrimary} class="font-mono text-xs" />
									<span class="w-8 h-8 rounded border shrink-0 shadow-sm" style={`background-color: ${colorPrimary};`}></span>
								</div>
							</div>

							<div class="space-y-1.5">
								<Label class="text-xs">Texto sobre Color Primario</Label>
								<div class="flex items-center gap-2">
									<Input name="color_primary_foreground" bind:value={colorPrimaryFg} class="font-mono text-xs" />
									<span class="w-8 h-8 rounded border shrink-0 shadow-sm" style={`background-color: ${colorPrimaryFg};`}></span>
								</div>
							</div>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<Label class="text-xs">Tema del Menú Lateral (Sidebar)</Label>
								<select name="sidebar_theme" bind:value={sidebarTheme} class="w-full h-9 px-2.5 rounded-md border text-xs font-medium uppercase">
									<option value="default">CLARO ESTÁNDAR (BLANCO)</option>
									<option value="dark">MODO OSCURO (NEGRO ELEGANTE)</option>
									<option value="primary">COLOR PRIMARIO DE LA MARCA</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<Label class="text-xs">Radio de Bordes de la UI</Label>
								<select name="border_radius" bind:value={borderRadius} class="w-full h-9 px-2.5 rounded-md border text-xs font-medium uppercase">
									<option value="0rem">RECTO (0px)</option>
									<option value="0.3rem">SUAVE (4px / 0.3rem)</option>
									<option value="0.625rem">ESTÁNDAR (10px / 0.625rem)</option>
									<option value="0.85rem">REDONDEADO PRO (14px / 0.85rem)</option>
								</select>
							</div>
						</div>

						<input type="hidden" name="color_accent" value={colorAccent} />
						<input type="hidden" name="color_accent_foreground" value={colorAccentFg} />

						<Button type="submit" class="w-full gap-2">
							<CheckCircle2 class="w-4 h-4" /> Guardar Cambios de Apariencia
						</Button>
					</form>
				</CardContent>
			</Card>

			<!-- Previsualización en Tiempo Real (Live Preview) -->
			<Card class="lg:col-span-5 bg-muted/20 border-2 border-dashed">
				<CardHeader class="pb-3">
					<CardTitle class="text-sm font-bold flex items-center gap-2">
						<Sparkles class="w-4 h-4 text-primary" /> Vista Previa en Tiempo Real
					</CardTitle>
					<CardDescription class="text-xs">
						Así lucirán los botones, componentes e insignias del sistema con esta configuración.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<!-- Muestra de Botones -->
					<div class="space-y-2 p-3 rounded-lg border bg-card">
						<span class="text-xs font-bold text-muted-foreground block">Botones con Tema Personalizado:</span>
						<div class="flex flex-wrap gap-2">
							<button type="button" class="px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-all" style={`background-color: ${colorPrimary}; color: ${colorPrimaryFg}; border-radius: ${borderRadius};`}>
								Botón Primario
							</button>
							<button type="button" class="px-3 py-1.5 text-xs font-semibold rounded border transition-all" style={`border-radius: ${borderRadius};`}>
								Botón Secundario
							</button>
						</div>
					</div>

					<!-- Muestra de Insignias y Componentes -->
					<div class="space-y-2 p-3 rounded-lg border bg-card">
						<span class="text-xs font-bold text-muted-foreground block">Insignias y Tarjetas:</span>
						<div class="flex items-center gap-2">
							<span class="px-2.5 py-1 text-xs font-extrabold rounded-full uppercase tracking-wider" style={`background-color: ${colorPrimary}; color: ${colorPrimaryFg};`}>
								VEN-0000001
							</span>
							<Badge variant="outline" class="text-xs">REALIZADA</Badge>
						</div>
					</div>

					<!-- Muestra de Sidebar Theme -->
					<div class="space-y-2 p-3 rounded-lg border bg-card">
						<span class="text-xs font-bold text-muted-foreground block">Estilo del Menú Lateral:</span>
						<div class={`p-3 rounded-lg border text-xs font-bold flex items-center justify-between ${sidebarTheme === 'dark' ? 'bg-zinc-900 text-white border-zinc-800' : sidebarTheme === 'primary' ? 'text-white' : 'bg-background text-foreground'}`} style={sidebarTheme === 'primary' ? `background-color: ${colorPrimary}; color: ${colorPrimaryFg};` : ''}>
							<div class="flex items-center gap-2">
								<span class="w-5 h-5 rounded bg-primary text-primary-foreground font-black flex items-center justify-center text-[10px]">LOG</span>
								<span>LOGÍSTICA</span>
							</div>
							<Badge variant="outline" class="text-[10px]">Estilo: {sidebarTheme.toUpperCase()}</Badge>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}

	<!-- PESTAÑA 2: LOGOS Y MARCA DEL SISTEMA -->
	{#if activeTab === 'logos'}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Logo Principal -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base font-semibold">Logo Principal de la Aplicación</CardTitle>
					<CardDescription class="text-xs">Utilizado en la barra superior (Navbar), Sidebar y pantalla de Login (PNG, SVG, WEBP).</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4 text-xs">
					<div class="p-4 border rounded-lg bg-muted/40 min-h-32 flex flex-col items-center justify-center text-center gap-2">
						{#if cfg?.logo_url}
							<img src={cfg.logo_url} alt="Logo Principal" class="max-h-16 object-contain" />
						{:else}
							<div class="p-3 bg-primary text-primary-foreground font-black text-xl rounded-xl shadow">LOG</div>
							<span class="text-muted-foreground text-[11px]">No se ha subido un logo personalizado (Usando fallback).</span>
						{/if}
					</div>

					<form method="POST" action="?/uploadMedia" enctype="multipart/form-data" use:enhance class="space-y-2">
						<input type="hidden" name="type" value="logo" />
						<Input type="file" name="file" accept="image/*" required class="text-xs" />
						<Button type="submit" class="w-full gap-1.5 text-xs">
							<Upload class="w-3.5 h-3.5" /> Subir Logo Principal
						</Button>
					</form>

					{#if cfg?.logo_url}
						<form method="POST" action="?/removeMedia" use:enhance>
							<input type="hidden" name="type" value="logo" />
							<Button type="submit" variant="ghost" class="w-full text-xs text-destructive hover:bg-destructive/10 gap-1.5">
								<Trash2 class="w-3.5 h-3.5" /> Eliminar Logo
							</Button>
						</form>
					{/if}
				</CardContent>
			</Card>

			<!-- Isotipo / Favicon -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base font-semibold">Isotipo / Favicon</CardTitle>
					<CardDescription class="text-xs">Icono cuadrado utilizado en la pestaña del navegador y el Sidebar colapsado.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4 text-xs">
					<div class="p-4 border rounded-lg bg-muted/40 min-h-32 flex flex-col items-center justify-center text-center gap-2">
						{#if cfg?.favicon_url}
							<img src={cfg.favicon_url} alt="Favicon" class="w-12 h-12 object-contain" />
						{:else}
							<div class="w-10 h-10 bg-primary text-primary-foreground font-black text-sm rounded-lg flex items-center justify-center shadow">LOG</div>
							<span class="text-muted-foreground text-[11px]">No se ha subido un Favicon.</span>
						{/if}
					</div>

					<form method="POST" action="?/uploadMedia" enctype="multipart/form-data" use:enhance class="space-y-2">
						<input type="hidden" name="type" value="favicon" />
						<Input type="file" name="file" accept="image/*" required class="text-xs" />
						<Button type="submit" class="w-full gap-1.5 text-xs">
							<Upload class="w-3.5 h-3.5" /> Subir Favicon
						</Button>
					</form>

					{#if cfg?.favicon_url}
						<form method="POST" action="?/removeMedia" use:enhance>
							<input type="hidden" name="type" value="favicon" />
							<Button type="submit" variant="ghost" class="w-full text-xs text-destructive hover:bg-destructive/10 gap-1.5">
								<Trash2 class="w-3.5 h-3.5" /> Eliminar Favicon
							</Button>
						</form>
					{/if}
				</CardContent>
			</Card>

			<!-- Logo Modo Oscuro -->
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base font-semibold">Logo Modo Oscuro (Opcional)</CardTitle>
					<CardDescription class="text-xs">Versión adaptada con letras claras para fondos oscuros.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4 text-xs">
					<div class="p-4 border rounded-lg bg-zinc-900 min-h-32 flex flex-col items-center justify-center text-center gap-2">
						{#if cfg?.logo_dark_url}
							<img src={cfg.logo_dark_url} alt="Logo Dark Mode" class="max-h-16 object-contain" />
						{:else}
							<span class="text-zinc-400 text-[11px]">Mismo logo principal o sin configurar.</span>
						{/if}
					</div>

					<form method="POST" action="?/uploadMedia" enctype="multipart/form-data" use:enhance class="space-y-2">
						<input type="hidden" name="type" value="logo_dark" />
						<Input type="file" name="file" accept="image/*" required class="text-xs" />
						<Button type="submit" class="w-full gap-1.5 text-xs">
							<Upload class="w-3.5 h-3.5" /> Subir Logo Dark
						</Button>
					</form>

					{#if cfg?.logo_dark_url}
						<form method="POST" action="?/removeMedia" use:enhance>
							<input type="hidden" name="type" value="logo_dark" />
							<Button type="submit" variant="ghost" class="w-full text-xs text-destructive hover:bg-destructive/10 gap-1.5">
								<Trash2 class="w-3.5 h-3.5" /> Eliminar Logo Dark
							</Button>
						</form>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}

	<!-- PESTAÑA 3: DATOS DE LA EMPRESA -->
	{#if activeTab === 'empresa'}
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-base font-semibold flex items-center gap-2">
					<Building2 class="w-4 h-4 text-primary" /> Identidad Corporativa y Datos de Contacto
				</CardTitle>
				<CardDescription class="text-xs">
					Estos datos se muestran en los informes, comprobantes de recepción y ventas impresos.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" action="?/updateBranding" use:enhance class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<Label class="text-xs">Nombre Comercial de la Empresa / Marca *</Label>
							<InputUppercase name="nombre_empresa" required value={cfg?.nombre_empresa || ''} class="text-xs" />
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs">Eslogan / Subtítulo Corporativo</Label>
							<Input name="eslogan" value={cfg?.eslogan || ''} placeholder="Ej. Soluciones Logísticas Globales" class="text-xs" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="space-y-1.5">
							<Label class="text-xs">Identificación Fiscal / RIF / RFC</Label>
							<InputUppercase name="identificacion_fiscal" value={cfg?.identificacion_fiscal || ''} placeholder="Ej. J-12345678-9" class="text-xs" />
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs">Teléfono de Soporte / Atención</Label>
							<Input name="telefono_empresa" value={cfg?.telefono_empresa || ''} placeholder="+58 212-1234567" class="text-xs font-mono" />
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs">Correo Electrónico de Contacto</Label>
							<Input name="email_empresa" type="email" value={cfg?.email_empresa || ''} placeholder="contacto@empresa.com" class="text-xs lowercase" />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs">Dirección Física de la Casa Matriz</Label>
						<InputUppercase name="direccion_empresa" value={cfg?.direccion_empresa || ''} placeholder="AV. PRINCIPAL, CIUDAD..." class="text-xs" />
					</div>

					<Button type="submit" class="w-full gap-2">
						<CheckCircle2 class="w-4 h-4" /> Guardar Datos Corporativos
					</Button>
				</form>
			</CardContent>
		</Card>
	{/if}

	<!-- PESTAÑA 4: CONFIGURACIÓN OPERATIVA Y DOCUMENTOS -->
	{#if activeTab === 'operaciones'}
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-base font-semibold flex items-center gap-2">
					<DollarSign class="w-4 h-4 text-primary" /> Moneda Base y Formato de Documentos
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form method="POST" action="?/updateOperational" use:enhance class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="space-y-1.5">
							<Label class="text-xs">Nombre de Moneda Principal</Label>
							<Input name="moneda_nombre" value={cfg?.moneda_nombre || 'Dólares Americanos'} class="text-xs" />
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs">Símbolo Monetario</Label>
							<Input name="moneda_simbolo" value={cfg?.moneda_simbolo || '$'} class="text-xs font-bold" />
						</div>

						<div class="space-y-1.5">
							<Label class="text-xs">Código ISO Moneda (USD, VES, EUR)</Label>
							<InputUppercase name="moneda_iso" value={cfg?.moneda_iso || 'USD'} class="text-xs font-mono font-bold" />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs">Pie de Página de Tickets y Cotizaciones</Label>
						<Input name="pie_pagina_ticket" value={cfg?.pie_pagina_ticket || ''} placeholder="¡Gracias por preferir nuestros servicios!" class="text-xs" />
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs">Términos y Condiciones Generales por Defecto</Label>
						<textarea name="terminos_condiciones" rows="4" class="w-full p-2.5 rounded-md border text-xs leading-relaxed" placeholder="El cliente declara que el envío cumple con las regulaciones de transporte...">{cfg?.terminos_condiciones || ''}</textarea>
					</div>

					<Button type="submit" class="w-full gap-2">
						<CheckCircle2 class="w-4 h-4" /> Guardar Configuración Operativa
					</Button>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>
