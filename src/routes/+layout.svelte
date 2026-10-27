<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { navigating, page } from '$app/stores';
	import { Loader2 } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { syncTheme, setActiveUser, getStoredSystemStyle, type ThemeStyle } from '$lib/services/theme';
	import type { ConfiguracionGeneral } from '$lib/types/database';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let isSubmittingForm = $state(false);
	let sidebarCollapsed = $state(false);
	let mobileMenuOpen = $state(false);
	let localTheme = $state<ThemeStyle | null>(null);

	// Determinar si es una ruta limpia de autenticación (sin navbar ni sidebar)
	const isAuthRoute = $derived(
		$page.url.pathname === '/login' ||
		$page.url.pathname === '/register' ||
		$page.url.pathname.startsWith('/auth')
	);

	// Estado reactivo de actividad en el servidor (navegaciones SvelteKit + envíos de formularios)
	const isBusy = $derived(!!$navigating || isSubmittingForm);

	$effect(() => {
		if (isBusy) {
			document.documentElement.classList.add('is-navigating');
			document.body.classList.add('is-navigating');
		} else {
			document.documentElement.classList.remove('is-navigating');
			document.body.classList.remove('is-navigating');
		}
	});

	// Sincronización en caliente y persistencia de temas del sistema y del usuario
	$effect(() => {
		localTheme = syncTheme(data.configuracion, data.user);
		setActiveUser(data.user);
	});

	// Configuración efectiva combinando servidor con respaldo local (evita vacíos antes de autenticación)
	const effectiveConfig = $derived.by(() => {
		if (data.configuracion) return data.configuracion;
		const cached = localTheme || getStoredSystemStyle();
		if (cached) {
			return {
				id: 1,
				nombre_empresa: cached.nombre_empresa || 'LOGISTIC SYSTEM',
				eslogan: cached.eslogan || null,
				logo_url: cached.logo_url || null,
				logo_dark_url: cached.logo_dark_url || null,
				favicon_url: cached.favicon_url || null,
				color_primary: cached.color_primary,
				color_primary_foreground: cached.color_primary_foreground,
				color_accent: cached.color_accent,
				color_accent_foreground: cached.color_accent_foreground,
				sidebar_theme: cached.sidebar_theme,
				border_radius: cached.border_radius,
				moneda_nombre: 'Dólares Americanos',
				moneda_simbolo: '$',
				moneda_iso: 'USD',
				created_at: '',
				updated_at: ''
			} as ConfiguracionGeneral;
		}
		return null;
	});

	function handleGlobalSubmit() {
		isSubmittingForm = true;
		setTimeout(() => {
			isSubmittingForm = false;
		}, 3000);
	}

	function toggleSidebarCollapse() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function openMobileMenu() {
		mobileMenuOpen = true;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<svelte:window onsubmit={handleGlobalSubmit} />

<svelte:head>
	<link rel="icon" href={effectiveConfig?.favicon_url || favicon} />
	<title>{effectiveConfig?.nombre_empresa || 'LOGISTIC APP'}</title>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1, viewport-fit=cover"
	/>
</svelte:head>

<!-- Indicador de Carga Global: Barra Superior y Badge Flotante con Spinner Giratorio -->
{#if isBusy}
	<div class="fixed top-0 left-0 right-0 z-[9999] h-1 bg-primary/20 overflow-hidden pointer-events-none">
		<div class="h-full bg-primary animate-pulse w-full origin-left transition-all duration-300"></div>
	</div>

	<div
		class="fixed top-4 right-4 z-[9999] flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-full shadow-lg text-xs font-semibold animate-in fade-in zoom-in duration-200 pointer-events-none"
	>
		<Loader2 class="w-4 h-4 animate-spin text-primary-foreground" />
		<span>Procesando...</span>
	</div>
{/if}

{#if isAuthRoute}
	<!-- Layout Limpio para Autenticación (Login, Registro) sin Sidebar ni Header -->
	<div class="min-h-screen bg-background text-foreground flex flex-col justify-center">
		<main class="w-full flex-1 flex flex-col justify-center">
			{@render children()}
		</main>
	</div>
{:else}
	<!-- Layout Completo con Sidebar y Header para la Aplicación -->
	<div class="min-h-screen bg-background text-foreground flex flex-col">
		<Sidebar
			user={data.user}
			roles={data.roles || []}
			configuracion={effectiveConfig}
			collapsed={sidebarCollapsed}
			mobileOpen={mobileMenuOpen}
			onToggleCollapse={toggleSidebarCollapse}
			onCloseMobile={closeMobileMenu}
		/>

		<div
			class={`flex-1 flex flex-col transition-all duration-300 ${
				sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
			}`}
		>
			<Header
				user={data.user}
				roles={data.roles || []}
				configuracion={effectiveConfig}
				collapsed={sidebarCollapsed}
				onToggleCollapse={toggleSidebarCollapse}
				onOpenMobile={openMobileMenu}
			/>

			<main class="flex-1">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

<Toaster position="top-right" richColors duration={3000} closeButton />
