<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Users, Shield, Globe, Tag, Scale, LayoutDashboard, Boxes, Sparkles, Settings, CreditCard, Truck, FileText } from '@lucide/svelte';

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{ href: '/admin', label: 'Resumen', icon: LayoutDashboard },
		{ href: '/admin/usuarios', label: 'Usuarios y Perfiles', icon: Users },
		{ href: '/admin/roles', label: 'Roles y Permisos', icon: Shield },
		{ href: '/admin/paises', label: 'Países', icon: Globe },
		{ href: '/admin/adquisiciones', label: 'Tipos Adquisición', icon: Tag },
		{ href: '/admin/unidades', label: 'Unidades de Medida', icon: Scale },
		{ href: '/admin/tipos-tarifa', label: 'Tipos Tarifa', icon: Tag },
		{ href: '/admin/conceptos-pago', label: 'Conceptos Pago', icon: CreditCard },
		{ href: '/admin/cargos-descuentos', label: 'Cargos y Descuentos', icon: Sparkles },
		{ href: '/admin/articulos', label: 'Maestro Artículos', icon: Boxes },
		{ href: '/admin/proveedores', label: 'Proveedores', icon: Truck },
		{ href: '/admin/plantillas-documentos', label: 'Plantillas Documentos', icon: FileText },
		{ href: '/admin/configuracion', label: 'Configuración', icon: Settings }
	];

	function isActive(href: string): boolean {
		if (href === '/admin') {
			return page.url.pathname === '/admin';
		}
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-6 space-y-6">
	<!-- Admin Sub-Navigation Header -->
	<div class="border-b pb-4">
		<h1 class="text-2xl font-extrabold tracking-tight">Panel de Administración</h1>
		<p class="text-sm text-muted-foreground">
			Gestión centralizada de usuarios, seguridad y catálogos maestros de la aplicación.
		</p>

		<!-- Tabs / Sub-nav buttons -->
		<nav class="flex items-center gap-1 overflow-x-auto pt-4 scrollbar-none">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors {isActive(
						item.href
					)
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
				>
					<item.icon class="w-4 h-4" />
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>
	</div>

	<!-- Render page content -->
	{@render children()}
</div>
