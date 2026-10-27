<script lang="ts">
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Home,
		Users,
		Store,
		Package,
		DollarSign,
		User,
		Shield,
		Tag,
		Globe,
		Scale,
		ChevronRight,
		ChevronLeft,
		X,
		Sparkles,
		FileText,
		Settings,
		Boxes,
		Truck,
		LifeBuoy
	} from '@lucide/svelte';
	import type { Perfil, ConfiguracionGeneral } from '$lib/types/database';

	let {
		user,
		roles,
		configuracion = null,
		collapsed = false,
		mobileOpen = false,
		onToggleCollapse,
		onCloseMobile
	}: {
		user: Perfil | null;
		roles: string[];
		configuracion?: ConfiguracionGeneral | null;
		collapsed?: boolean;
		mobileOpen?: boolean;
		onToggleCollapse?: () => void;
		onCloseMobile?: () => void;
	} = $props();

	const isAdmin = $derived(roles.includes('admin'));
	const isGerente = $derived(roles.includes('gerente'));
	const isOperador = $derived(roles.includes('operador'));
	const isClienteOnly = $derived(roles.includes('cliente') && !isAdmin && !isGerente && !isOperador);
	const isStaff = $derived(isAdmin || isGerente || isOperador);
	const isVentasAllowed = $derived(isStaff || isClienteOnly);

	const currentPath = $derived(page.url.pathname);

	function isActive(path: string, exact = false) {
		if (exact) return currentPath === path;
		return currentPath === path || (path !== '/' && currentPath.startsWith(path));
	}
</script>

<!-- Backdrop overlay for mobile drawer -->
{#if mobileOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
		onclick={onCloseMobile}
		aria-label="Cerrar menú lateral"
	></button>
{/if}

<!-- Sidebar Container -->
<aside
	class={`
		fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r bg-card text-card-foreground transition-all duration-300 ease-in-out
		${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
		${collapsed ? 'md:w-16' : 'md:w-64'}
	`}
>
	<!-- Header del Sidebar (Logo + Toggle desktop + Botón cerrar móvil) -->
	<div class="h-16 flex items-center justify-between px-3 border-b shrink-0">
		<a href="/" class="flex items-center gap-2 overflow-hidden max-w-full" onclick={onCloseMobile}>
			{#if configuracion?.logo_url}
				<img src={configuracion.logo_url} alt={configuracion.nombre_empresa || 'Logo'} class="h-8 w-auto max-w-[130px] object-contain shrink-0" />
			{:else}
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-sm">
					{configuracion?.nombre_empresa ? configuracion.nombre_empresa.slice(0, 3).toUpperCase() : 'LOG'}
				</div>
			{/if}
			{#if !collapsed || mobileOpen}
				<span class="font-extrabold text-xs tracking-wider truncate uppercase">
					{configuracion?.nombre_empresa || 'LOGÍSTICA'}
				</span>
			{/if}
		</a>

		<!-- Botón cerrar en móvil -->
		<button
			type="button"
			class="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
			onclick={onCloseMobile}
			aria-label="Cerrar menú"
		>
			<X class="w-5 h-5" />
		</button>

		<!-- Botón colapsar/expander en escritorio -->
		<button
			type="button"
			class="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
			onclick={onToggleCollapse}
			title={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
			aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
		>
			{#if collapsed}
				<ChevronRight class="w-4 h-4" />
			{:else}
				<ChevronLeft class="w-4 h-4" />
			{/if}
		</button>
	</div>

	<!-- Lista de Enlaces Navegables -->
	<div class="flex-1 overflow-y-auto px-2.5 py-4 space-y-6 scrollbar-thin">
		<!-- Grupo 1: Navegación Principal -->
		<div class="space-y-1">
			{#if !collapsed || mobileOpen}
				<p class="px-2 text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">
					Principal
				</p>
			{/if}

			{#if isStaff}
				<a
					href="/"
					onclick={onCloseMobile}
					title="Inicio"
					class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
						isActive('/', true)
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
				>
					<Home class="w-4 h-4 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Inicio</span>
					{/if}
				</a>
			{/if}

			{#if user}
				{#if isStaff}
					<a
						href="/clientes"
						onclick={onCloseMobile}
						title="Clientes"
						class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
							isActive('/clientes')
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'
						} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
					>
						<Users class="w-4 h-4 shrink-0" />
						{#if !collapsed || mobileOpen}
							<span class="truncate">Clientes</span>
						{/if}
					</a>

					<a
						href="/tiendas"
						onclick={onCloseMobile}
						title="Tiendas"
						class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
							isActive('/tiendas')
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'
						} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
					>
						<Store class="w-4 h-4 shrink-0" />
						{#if !collapsed || mobileOpen}
							<span class="truncate">Tiendas</span>
						{/if}
					</a>

					<a
						href="/productos"
						onclick={onCloseMobile}
						title="Productos"
						class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
							isActive('/productos')
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'
						} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
					>
						<Package class="w-4 h-4 shrink-0" />
						{#if !collapsed || mobileOpen}
							<span class="truncate">Productos</span>
						{/if}
					</a>

					<a
						href="/inventario"
						onclick={onCloseMobile}
						title="Inventario"
						class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
							isActive('/inventario')
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'
						} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
					>
						<Boxes class="w-4 h-4 shrink-0 text-amber-500" />
						{#if !collapsed || mobileOpen}
							<span class="truncate">Inventario</span>
						{/if}
					</a>
				{/if}

				{#if isVentasAllowed}
					<a
						href="/ventas"
						onclick={onCloseMobile}
						title={isClienteOnly ? 'Cotizar Envío (Borrador)' : 'Operación de Ventas'}
						class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
							isActive('/ventas', true)
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'
						} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
					>
						<DollarSign class="w-4 h-4 shrink-0 text-emerald-500" />
						{#if !collapsed || mobileOpen}
							<span class="truncate">{isClienteOnly ? 'Cotizar Envío (Borrador)' : 'Operación Ventas'}</span>
						{/if}
					</a>

					<a
						href="/ventas/historial"
						onclick={onCloseMobile}
						title={isClienteOnly ? 'Mis Envíos (Borradores)' : 'Historial de Ventas'}
						class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
							isActive('/ventas/historial')
								? 'bg-primary/10 text-primary font-bold'
								: 'text-muted-foreground hover:bg-accent hover:text-foreground'
						} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
					>
						<FileText class="w-3.5 h-3.5 shrink-0" />
						{#if !collapsed || mobileOpen}
							<span class="truncate">{isClienteOnly ? 'Mis Envíos' : 'Historial Ventas'}</span>
						{/if}
					</a>

					{#if isStaff}
						<a
							href="/ventas/tarifas"
							onclick={onCloseMobile}
							title="Tarifas de Ventas"
							class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
								isActive('/ventas/tarifas')
									? 'bg-primary/10 text-primary font-bold'
									: 'text-muted-foreground hover:bg-accent hover:text-foreground'
							} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
						>
							<Tag class="w-3.5 h-3.5 shrink-0" />
							{#if !collapsed || mobileOpen}
								<span class="truncate">Tarifas Ventas</span>
							{/if}
						</a>
					{/if}
				{/if}

				<a
					href="/perfil"
					onclick={onCloseMobile}
					title="Mi Perfil"
					class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
						isActive('/perfil')
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
				>
					<User class="w-4 h-4 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Mi Perfil</span>
					{/if}
				</a>

				<a
					href="/soporte"
					onclick={onCloseMobile}
					title="Reporte de Fallas / Requerimientos"
					class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
						isActive('/soporte')
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
				>
					<LifeBuoy class="w-4 h-4 shrink-0 text-amber-500" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Fallas y Requerimientos</span>
					{/if}
				</a>
			{/if}
		</div>

		<!-- Grupo 2: Módulo de Administración (Solo Administradores) -->
		{#if isAdmin}
			<div class="space-y-1 pt-2 border-t">
				{#if !collapsed || mobileOpen}
					<p class="px-2 text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">
						Administración
					</p>
				{/if}

				<a
					href="/admin"
					onclick={onCloseMobile}
					title="Resumen Admin"
					class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
						isActive('/admin', true)
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : ''}`}
				>
					<Shield class="w-4 h-4 shrink-0 text-amber-500" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Resumen Admin</span>
					{/if}
				</a>

				<a
					href="/admin/usuarios"
					onclick={onCloseMobile}
					title="Usuarios"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/usuarios')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Users class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Usuarios</span>
					{/if}
				</a>

				<a
					href="/admin/roles"
					onclick={onCloseMobile}
					title="Roles y Permisos"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/roles')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Shield class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Roles y Permisos</span>
					{/if}
				</a>

				<a
					href="/admin/paises"
					onclick={onCloseMobile}
					title="Países"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/paises')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Globe class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Países</span>
					{/if}
				</a>

				<a
					href="/admin/adquisiciones"
					onclick={onCloseMobile}
					title="Tipos de Adquisición"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/adquisiciones')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Tag class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Adquisiciones</span>
					{/if}
				</a>

				<a
					href="/admin/unidades"
					onclick={onCloseMobile}
					title="Unidades de Medida"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/unidades')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Scale class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Unidades Medida</span>
					{/if}
				</a>

				<a
					href="/admin/tipos-tarifa"
					onclick={onCloseMobile}
					title="Tipos de Tarifa"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/tipos-tarifa')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Tag class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Tipos de Tarifa</span>
					{/if}
				</a>

				<a
					href="/admin/conceptos-pago"
					onclick={onCloseMobile}
					title="Conceptos de Pago"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/conceptos-pago')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Tag class="w-3.5 h-3.5 shrink-0" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Conceptos Pago</span>
					{/if}
				</a>

				<a
					href="/admin/cargos-descuentos"
					onclick={onCloseMobile}
					title="Cargos y Descuentos"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/cargos-descuentos')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Sparkles class="w-3.5 h-3.5 shrink-0 text-amber-500" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Cargos / Descuentos</span>
					{/if}
				</a>

				<a
					href="/admin/articulos"
					onclick={onCloseMobile}
					title="Maestro de Artículos"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/articulos')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Boxes class="w-3.5 h-3.5 shrink-0 text-primary" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Maestro Artículos</span>
					{/if}
				</a>

				<a
					href="/admin/proveedores"
					onclick={onCloseMobile}
					title="Maestro de Proveedores"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/proveedores')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Truck class="w-3.5 h-3.5 shrink-0 text-primary" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Maestro Proveedores</span>
					{/if}
				</a>

				<a
					href="/admin/plantillas-documentos"
					onclick={onCloseMobile}
					title="Plantillas de Documentos"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/plantillas-documentos')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<FileText class="w-3.5 h-3.5 shrink-0 text-primary" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Plantillas Documentos</span>
					{/if}
				</a>

				<a
					href="/admin/configuracion"
					onclick={onCloseMobile}
					title="Configuración y Apariencia"
					class={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
						isActive('/admin/configuracion')
							? 'bg-primary/10 text-primary font-bold'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					} ${collapsed && !mobileOpen ? 'justify-center px-0' : 'pl-6'}`}
				>
					<Settings class="w-3.5 h-3.5 shrink-0 text-primary" />
					{#if !collapsed || mobileOpen}
						<span class="truncate">Configuración Sistema</span>
					{/if}
				</a>
			</div>
		{/if}
	</div>
</aside>
