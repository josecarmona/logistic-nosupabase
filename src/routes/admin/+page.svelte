<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Users, Shield, Globe, Tag, Scale, ArrowRight, Boxes, Truck, FileText } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Panel Admin - Resumen</title>
</svelte:head>

<div class="space-y-6">
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Usuarios y Perfiles</CardTitle>
				<Users class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">CRUD de perfiles con roles asignables y soft delete.</p>
				<Button href="/admin/usuarios" variant="outline" size="sm" class="w-full justify-between">
					Ir a Usuarios <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Roles y Permisos</CardTitle>
				<Shield class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Administra los roles (admin, gerente, etc.) y matriz de permisos.</p>
				<Button href="/admin/roles" variant="outline" size="sm" class="w-full justify-between">
					Ir a Roles <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Maestro de Países</CardTitle>
				<Globe class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Gestión de países, ISO2/ISO3 y límite de peso.</p>
				<Button href="/admin/paises" variant="outline" size="sm" class="w-full justify-between">
					Ir a Países <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Tipos de Adquisición</CardTitle>
				<Tag class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Canales de captación (Web, Facebook, Instagram, etc.).</p>
				<Button href="/admin/adquisiciones" variant="outline" size="sm" class="w-full justify-between">
					Ir a Adquisiciones <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Unidades de Medida</CardTitle>
				<Scale class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Unidades de Peso, Volumen y Cantidad para la logística.</p>
				<Button href="/admin/unidades" variant="outline" size="sm" class="w-full justify-between">
					Ir a Unidades <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Tipos de Tarifa</CardTitle>
				<Tag class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Clasificación de tarifas, promociones y volúmenes.</p>
				<Button href="/admin/tipos-tarifa" variant="outline" size="sm" class="w-full justify-between">
					Ir a Tipos de Tarifa <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Conceptos de Pago</CardTitle>
				<Tag class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Métodos de cobro (Efectivo, Zelle, Pago Móvil, etc.) y referencias.</p>
				<Button href="/admin/conceptos-pago" variant="outline" size="sm" class="w-full justify-between">
					Ir a Conceptos Pago <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Cargos y Descuentos</CardTitle>
				<Tag class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Maestro de recargos adicionales y descuentos aplicables a ventas.</p>
				<Button href="/admin/cargos-descuentos" variant="outline" size="sm" class="w-full justify-between">
					Ir a Cargos / Descuentos <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Maestro de Artículos</CardTitle>
				<Boxes class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Catálogo de artículos predefinidos reutilizables en las ventas de envíos.</p>
				<Button href="/admin/articulos" variant="outline" size="sm" class="w-full justify-between">
					Ir a Artículos <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Maestro de Proveedores</CardTitle>
				<Truck class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Catálogo de empresas de transporte, bandera de API y dirección de oficinas.</p>
				<Button href="/admin/proveedores" variant="outline" size="sm" class="w-full justify-between">
					Ir a Proveedores <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-medium">Diseñador de Plantillas</CardTitle>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Maquetación de Guías con QR y Declaraciones de Aduana personalizadas.</p>
				<Button href="/admin/plantillas-documentos" variant="outline" size="sm" class="w-full justify-between">
					Ir a Plantillas <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>

		<Card class="border-primary/40 bg-primary/5">
			<CardHeader class="flex flex-row items-center justify-between pb-2">
				<CardTitle class="text-sm font-bold text-primary">Configuración y Apariencia</CardTitle>
				<Tag class="h-4 w-4 text-primary" />
			</CardHeader>
			<CardContent>
				<p class="text-xs text-muted-foreground mb-4">Personalización visual (Colores, Logos, Favicon) y datos corporativos.</p>
				<Button href="/admin/configuracion" size="sm" class="w-full justify-between font-bold">
					Configurar Sistema <ArrowRight class="w-3 h-3" />
				</Button>
			</CardContent>
		</Card>
	</div>
</div>
