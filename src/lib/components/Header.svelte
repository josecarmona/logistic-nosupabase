<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Menu, LogOut, PanelLeftClose, PanelLeft, User } from '@lucide/svelte';
	import type { Perfil, ConfiguracionGeneral } from '$lib/types/database';
	import { setActiveUser } from '$lib/services/theme';

	let {
		user,
		roles,
		configuracion = null,
		collapsed = false,
		onToggleCollapse,
		onOpenMobile
	}: {
		user: Perfil | null;
		roles: string[];
		configuracion?: ConfiguracionGeneral | null;
		collapsed?: boolean;
		onToggleCollapse?: () => void;
		onOpenMobile?: () => void;
	} = $props();

	const isAdmin = $derived(roles.includes('admin'));
	const userEmail = $derived(user?.email || '');
	const userName = $derived(user?.nombre_completo || userEmail);
	const currentRole = $derived(roles[0] || 'cliente');
</script>

<header class="sticky top-0 z-30 h-16 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
	<div class="h-full flex items-center justify-between px-4">
		<!-- Lado Izquierdo: Botón Menú Móvil + Logo + Toggle Desktop -->
		<div class="flex items-center gap-3">
			<!-- Botón Hamburguesa Móvil -->
			<button
				type="button"
				class="inline-flex md:hidden items-center justify-center p-2 rounded-lg text-foreground hover:bg-accent focus:outline-none"
				onclick={onOpenMobile}
				aria-label="Abrir menú de navegación"
			>
				<Menu class="w-5 h-5" />
			</button>

			<!-- Botón Toggle Sidebar Desktop -->
			<button
				type="button"
				class="hidden md:inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
				onclick={onToggleCollapse}
				title={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
				aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
			>
				{#if collapsed}
					<PanelLeft class="w-5 h-5" />
				{:else}
					<PanelLeftClose class="w-5 h-5" />
				{/if}
			</button>

			<!-- Logo (Visible cuando el sidebar está colapsado o en móvil) -->
			<a href="/" class="flex items-center gap-2 font-bold text-base tracking-wider md:hidden">
				{#if configuracion?.logo_url}
					<img src={configuracion.logo_url} alt="Logo" class="h-7 w-auto max-w-[120px] object-contain" />
				{:else}
					<span class="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-black">
						{configuracion?.nombre_empresa ? configuracion.nombre_empresa.slice(0, 3).toUpperCase() : 'LOG'}
					</span>
				{/if}
				<span class="text-xs uppercase">{configuracion?.nombre_empresa || 'LOGÍSTICA'}</span>
			</a>
		</div>

		<!-- Lado Derecho: Usuario + Badge Rol + Salir -->
		<div class="flex items-center gap-3">
			{#if user}
				<div class="flex items-center gap-2 text-xs">
					<div class="hidden sm:flex flex-col items-end">
						<span class="font-bold text-foreground leading-tight">{userName}</span>
						<span class="text-[10px] text-muted-foreground">{userEmail}</span>
					</div>
					<Badge variant={isAdmin ? 'default' : 'secondary'} class="uppercase text-[10px] px-2 py-0.5 font-bold">
						{currentRole}
					</Badge>
				</div>

				<form action="/logout" method="POST" onsubmit={() => setActiveUser(null)}>
					<Button type="submit" variant="ghost" size="sm" class="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
						<LogOut class="w-4 h-4" />
						<span class="hidden sm:inline">Salir</span>
					</Button>
				</form>
			{:else}
				<Button variant="ghost" size="sm" href="/login">Iniciar Sesión</Button>
				<Button size="sm" href="/register">Registrarse</Button>
			{/if}
		</div>
	</div>
</header>
