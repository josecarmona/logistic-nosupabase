<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Menu, X, User, Users, Shield, LogOut, Home, Settings, Store, Package, DollarSign } from '@lucide/svelte';
	import type { Perfil } from '$lib/types/database';
	import { setActiveUser } from '$lib/services/theme';

	let { user, roles }: { user: Perfil | null; roles: string[] } = $props();

	let mobileMenuOpen = $state(false);

	const isAdmin = $derived(roles.includes('admin'));
	const isGerente = $derived(roles.includes('gerente'));
	const isVentasAllowed = $derived(isAdmin || isGerente);
	const userEmail = $derived(user?.email || '');
	const userName = $derived(user?.nombre_completo || userEmail);
	const currentRole = $derived(roles[0] || 'cliente');

	function toggleMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-16 items-center justify-between px-4 mx-auto">
		<div class="flex items-center gap-4">
			<a href="/" class="flex items-center space-x-2 font-bold text-lg tracking-wider" onclick={closeMenu}>
				<span class="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-extrabold">LOG</span>
				<span>LOGÍSTICA</span>
			</a>

			<nav class="hidden md:flex items-center space-x-4 text-sm font-medium ml-6">
				<a href="/" class="transition-colors hover:text-primary flex items-center gap-1">
					<Home class="w-4 h-4" /> Inicio
				</a>
				{#if user}
					<a href="/clientes" class="transition-colors hover:text-primary flex items-center gap-1">
						<Users class="w-4 h-4" /> Clientes
					</a>
					<a href="/tiendas" class="transition-colors hover:text-primary flex items-center gap-1">
						<Store class="w-4 h-4" /> Tiendas
					</a>
					<a href="/productos" class="transition-colors hover:text-primary flex items-center gap-1">
						<Package class="w-4 h-4" /> Productos
					</a>
					{#if isVentasAllowed}
						<a href="/ventas/tarifas" class="transition-colors hover:text-primary flex items-center gap-1">
							<DollarSign class="w-4 h-4" /> Ventas
						</a>
					{/if}
					<a href="/perfil" class="transition-colors hover:text-primary flex items-center gap-1">
						<User class="w-4 h-4" /> Mi Perfil
					</a>
					{#if isAdmin}
						<a href="/admin" class="transition-colors hover:text-primary flex items-center gap-1">
							<Shield class="w-4 h-4" /> Administración
						</a>
					{/if}
				{/if}
			</nav>
		</div>

		<!-- Actions on Desktop -->
		<div class="hidden md:flex items-center gap-3">
			{#if user}
				<div class="flex items-center gap-2 text-xs">
					<span class="font-semibold">{userName}</span>
					<Badge variant={isAdmin ? "default" : "secondary"} class="uppercase text-[10px]">
						{currentRole}
					</Badge>
				</div>
				<form action="/logout" method="POST" onsubmit={() => setActiveUser(null)}>
					<Button type="submit" variant="ghost" size="sm" class="gap-1">
						<LogOut class="w-4 h-4" /> Salir
					</Button>
				</form>
			{:else}
				<Button variant="ghost" size="sm" href="/login">Iniciar Sesión</Button>
				<Button size="sm" href="/register">Registrarse</Button>
			{/if}
		</div>

		<!-- Mobile Hamburger Button -->
		<button
			type="button"
			class="inline-flex md:hidden items-center justify-center p-2 rounded-md text-foreground hover:bg-accent focus:outline-none"
			onclick={toggleMenu}
			aria-label="Abrir menú principal"
		>
			{#if mobileMenuOpen}
				<X class="w-6 h-6" />
			{:else}
				<Menu class="w-6 h-6" />
			{/if}
		</button>
	</div>

	<!-- Mobile Dropdown Menu -->
	{#if mobileMenuOpen}
		<div class="md:hidden border-b bg-background px-4 pb-4 pt-2 space-y-3">
			<nav class="flex flex-col space-y-2 text-sm font-medium">
				<a
					href="/"
					class="flex items-center gap-2 p-2 rounded hover:bg-accent"
					onclick={closeMenu}
				>
					<Home class="w-4 h-4" /> Inicio
				</a>
				{#if user}
					<a
						href="/clientes"
						class="flex items-center gap-2 p-2 rounded hover:bg-accent"
						onclick={closeMenu}
					>
						<Users class="w-4 h-4" /> Clientes
					</a>
					<a
						href="/tiendas"
						class="flex items-center gap-2 p-2 rounded hover:bg-accent"
						onclick={closeMenu}
					>
						<Store class="w-4 h-4" /> Tiendas
					</a>
					<a
						href="/productos"
						class="flex items-center gap-2 p-2 rounded hover:bg-accent"
						onclick={closeMenu}
					>
						<Package class="w-4 h-4" /> Productos
					</a>
					{#if isVentasAllowed}
						<a
							href="/ventas/tarifas"
							class="flex items-center gap-2 p-2 rounded hover:bg-accent"
							onclick={closeMenu}
						>
							<DollarSign class="w-4 h-4" /> Ventas (Tarifas)
						</a>
					{/if}
					<a
						href="/perfil"
						class="flex items-center gap-2 p-2 rounded hover:bg-accent"
						onclick={closeMenu}
					>
						<User class="w-4 h-4" /> Mi Perfil
					</a>
					{#if isAdmin}
						<a
							href="/admin"
							class="flex items-center gap-2 p-2 rounded hover:bg-accent"
							onclick={closeMenu}
						>
							<Shield class="w-4 h-4" /> Administración
						</a>
					{/if}
				{/if}
			</nav>

			<div class="pt-2 border-t flex flex-col gap-2">
				{#if user}
					<div class="flex items-center justify-between py-1">
						<div class="flex flex-col">
							<span class="text-xs font-semibold">{userName}</span>
							<span class="text-[10px] text-muted-foreground">{userEmail}</span>
						</div>
						<Badge variant={isAdmin ? "default" : "secondary"} class="uppercase text-[10px]">
							{currentRole}
						</Badge>
					</div>
					<form action="/logout" method="POST" class="w-full" onsubmit={() => setActiveUser(null)}>
						<Button type="submit" variant="outline" size="sm" class="w-full gap-2 justify-center">
							<LogOut class="w-4 h-4" /> Cerrar Sesión
						</Button>
					</form>
				{:else}
					<div class="grid grid-cols-2 gap-2">
						<Button variant="outline" size="sm" href="/login" onclick={closeMenu}>Iniciar Sesión</Button>
						<Button size="sm" href="/register" onclick={closeMenu}>Registrarse</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</header>
