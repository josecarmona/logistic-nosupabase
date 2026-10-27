<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { toast } from 'svelte-sonner';
	import {
		Package,
		Box,
		Plus,
		Search,
		Edit,
		Eye,
		Power,
		Download,
		Settings,
		Layers,
		Trash2,
		Tag,
		FileText,
		DollarSign,
		Boxes,
		Ruler,
		ShieldCheck
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { ProductoWithRelations, TipoProducto, UnidadMedida, AtributoDefinicion } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const productos = $derived(data.productos || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);
	const tiposProducto = $derived(data.tiposProducto || []);
	const unidadesMedida = $derived(data.unidadesMedida || []);
	const isAdmin = $derived(data.isAdmin || false);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search;
	});

	function getUnidadMedidaLabel(unidadId?: number | null): string {
		if (!unidadId) return '';
		const um = unidadesMedida.find((u) => Number(u.id) === Number(unidadId));
		return um ? um.codigo.toUpperCase() : '';
	}

	interface PesoVolInfo {
		peso: string;
		unidad: 'KG' | 'LB';
		divisor: number;
		dimUnit: 'CM' | 'IN';
	}

	function getVolumetricWeightInfo(
		atributosValores?: Record<string, string> | null,
		atributosDefs?: AtributoDefinicion[] | null,
		mainUnidadMedidaId?: number | string | null
	): PesoVolInfo | null {
		if (!atributosValores) return null;
		const entries = Object.entries(atributosValores);

		const largoKey = entries.find(([k]) => k.toUpperCase() === 'LARGO' || k.toUpperCase().includes('LARGO'))?.[0];
		const anchoKey = entries.find(([k]) => k.toUpperCase() === 'ANCHO' || k.toUpperCase().includes('ANCHO'))?.[0];
		const altoKey = entries.find(([k]) => k.toUpperCase() === 'ALTO' || k.toUpperCase().includes('ALTO'))?.[0];

		if (!largoKey || !anchoKey || !altoKey) return null;

		const rawLargoStr = String(atributosValores[largoKey] || '');
		const rawAnchoStr = String(atributosValores[anchoKey] || '');
		const rawAltoStr = String(atributosValores[altoKey] || '');

		const largo = parseFloat(rawLargoStr);
		const ancho = parseFloat(rawAnchoStr);
		const alto = parseFloat(rawAltoStr);

		if (isNaN(largo) || isNaN(ancho) || isNaN(alto) || largo <= 0 || ancho <= 0 || alto <= 0) {
			return null;
		}

		let isImperialInches = false;

		// 1. Comprobar si los valores escritos contienen "IN", "INCH", "PULG" o '"' (ej. 10IN, 10 IN, 10")
		const allValuesStr = `${rawLargoStr} ${rawAnchoStr} ${rawAltoStr}`.toUpperCase();
		if (
			allValuesStr.includes('IN') ||
			allValuesStr.includes('PULG') ||
			allValuesStr.includes('INCH') ||
			allValuesStr.includes('"')
		) {
			isImperialInches = true;
		}

		// 2. Comprobar si las definiciones de los atributos (LARGO, ANCHO, ALTO) usan la unidad IN
		if (!isImperialInches && atributosDefs && Array.isArray(atributosDefs)) {
			for (const def of atributosDefs) {
				if (
					def.unidad_medida_id &&
					(def.nombre.toUpperCase().includes('LARGO') ||
						def.nombre.toUpperCase().includes('ANCHO') ||
						def.nombre.toUpperCase().includes('ALTO'))
				) {
					const um = unidadesMedida.find((u) => Number(u.id) === Number(def.unidad_medida_id));
					if (
						um &&
						(um.codigo.toUpperCase() === 'IN' ||
							um.codigo.toUpperCase() === 'PULG' ||
							um.nombre.toUpperCase().includes('PULGADA') ||
							um.nombre.toUpperCase().includes('INCH'))
					) {
						isImperialInches = true;
						break;
					}
				}
			}
		}

		// 3. Comprobar si la Unidad de Medida Principal del producto o seleccionada es IN / LB / PULG
		if (!isImperialInches && mainUnidadMedidaId) {
			const mainUm = unidadesMedida.find((u) => Number(u.id) === Number(mainUnidadMedidaId));
			if (
				mainUm &&
				(mainUm.codigo.toUpperCase() === 'IN' ||
					mainUm.codigo.toUpperCase() === 'LB' ||
					mainUm.codigo.toUpperCase() === 'PULG' ||
					mainUm.nombre.toUpperCase().includes('PULGADA') ||
					mainUm.nombre.toUpperCase().includes('INCH'))
			) {
				isImperialInches = true;
			}
		}

		// 4. Comprobar si los nombres de las claves contienen (IN) o PULG
		if (!isImperialInches) {
			const keysStr = `${largoKey} ${anchoKey} ${altoKey}`.toUpperCase();
			if (keysStr.includes('INCH') || keysStr.includes('PULG') || keysStr.includes('(IN)')) {
				isImperialInches = true;
			}
		}

		const divisor = isImperialInches ? 139 : 5000;
		const unidad = isImperialInches ? 'LB' : 'KG';
		const dimUnit = isImperialInches ? 'IN' : 'CM';
		const peso = ((largo * ancho * alto) / divisor).toFixed(2);

		return { peso, unidad, divisor, dimUnit };
	}

	function getPesoVolumetrico(p: ProductoWithRelations): string | null {
		const info = getVolumetricWeightInfo(p.atributos_valores, p.tipo_producto?.atributos, p.unidad_medida_id);
		if (info) {
			return `${info.peso} ${info.unidad}`;
		}
		return null;
	}

	function getPrecioVenta(p: ProductoWithRelations): number {
		return Number(p.precio_venta ?? p.atributos_valores?.__precio_venta ?? 0);
	}

	// Exportar Productos a CSV
	function exportToCSV() {
		if (!productos || productos.length === 0) {
			toast.error('No hay productos para exportar');
			return;
		}

		const headers = [
			'Código',
			'Descripción',
			'Tipo Producto',
			'Prefijo',
			'Costo',
			'Precio Venta',
			'Inv. Mínimo',
			'Carga Máxima (LB)',
			'Unidad Medida',
			'Estado',
			'Atributos'
		];

		const rows = productos.map((p) => {
			const attrsStr = p.atributos_valores
				? Object.entries(p.atributos_valores)
						.filter(([k]) => !k.startsWith('__'))
						.map(([k, v]) => `${k}: ${v}`)
						.join(' | ')
				: '';
			return [
				`"${p.codigo}"`,
				`"${p.descripcion.replace(/"/g, '""')}"`,
				`"${(p.tipo_producto?.nombre || '').replace(/"/g, '""')}"`,
				`"${p.tipo_producto?.prefijo || ''}"`,
				p.costo,
				getPrecioVenta(p),
				p.inventario_minimo,
				p.carga_maxima ?? 0,
				`"${p.unidad_medida?.codigo || ''}"`,
				p.activo ? 'ACTIVO' : 'INACTIVO',
				`"${attrsStr.replace(/"/g, '""')}"`
			].join(',');
		});

		const csvContent = [headers.join(','), ...rows].join('\n');
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `productos_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success('Listado de productos exportado a CSV');
	}

	// Modales de Productos
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDetailOpen = $state(false);
	let selectedProduct = $state<ProductoWithRelations | null>(null);

	// Estado del formulario de Producto
	let formId = $state('');
	let formDescripcion = $state('');
	let formTipoProductoId = $state('');
	let formCosto = $state(0);
	let formPrecioVenta = $state(0);
	let formInventarioMinimo = $state(0);
	let formStock = $state(0);
	let formUnidadMedidaId = $state('');
	let formAtributosValores = $state<Record<string, string>>({});
	let formControlaInventario = $state(true);
	let formRequiereSeguro = $state(false);
	let formPorcentajeSeguro = $state(0);
	let formCargaMaxima = $state(0);

	// Tipo de producto seleccionado actualmente para obtener la lista de atributos dinámicos
	const selectedTipoObj = $derived(
		tiposProducto.find((tp) => String(tp.id) === String(formTipoProductoId)) || null
	);

	// Cálculo reactivo del Peso Volumétrico (CM -> KG / 5000, IN -> LB / 139)
	const currentCalculatedPesoVolInfo = $derived.by(() => {
		return getVolumetricWeightInfo(formAtributosValores, selectedTipoObj?.atributos, formUnidadMedidaId);
	});

	$effect(() => {
		if (currentCalculatedPesoVolInfo !== null && formAtributosValores) {
			const pesoVolKey = Object.keys(formAtributosValores).find((k) => k.toUpperCase().includes('VOLUM'));
			if (pesoVolKey && formAtributosValores[pesoVolKey] !== currentCalculatedPesoVolInfo.peso) {
				formAtributosValores[pesoVolKey] = currentCalculatedPesoVolInfo.peso;
			}
		}
	});

	function onTipoProductoChange() {
		const tipo = tiposProducto.find((tp) => String(tp.id) === String(formTipoProductoId));
		if (tipo && tipo.atributos && Array.isArray(tipo.atributos)) {
			const newMap: Record<string, string> = {};
			for (const attr of tipo.atributos) {
				newMap[attr.nombre] = formAtributosValores[attr.nombre] || '';
			}
			formAtributosValores = newMap;
		} else {
			formAtributosValores = {};
		}
	}

	// Modales de Tipos de Producto (solo Admin)
	let isTiposModalOpen = $state(false);
	let isTipoFormOpen = $state(false);
	let selectedTipo = $state<TipoProducto | null>(null);

	// Formulario de Tipo de Producto
	let tipoFormId = $state('');
	let tipoFormNombre = $state('');
	let tipoFormPrefijo = $state('');
	let tipoFormDescripcion = $state('');
	let tipoFormAtributos = $state<AtributoDefinicion[]>([]);

	function addTipoAtributo() {
		tipoFormAtributos = [
			...tipoFormAtributos,
			{ nombre: '', tipo: 'texto', unidad_medida_id: null, requerido: false }
		];
	}

	function removeTipoAtributo(index: number) {
		tipoFormAtributos = tipoFormAtributos.filter((_, i) => i !== index);
	}

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createProduct'
					? 'Producto registrado correctamente'
					: form.action === 'updateProduct'
						? 'Producto actualizado correctamente'
						: form.action === 'createTipoProducto'
							? 'Tipo de producto registrado'
							: form.action === 'updateTipoProducto'
								? 'Tipo de producto actualizado'
								: 'Estado actualizado correctamente'
			);
			tick().then(() => {
				isCreateOpen = false;
				isEditOpen = false;
				isTipoFormOpen = false;
			});
		} else if (form?.message) {
			toast.error('Error', { description: form.message });
		}
	});

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handlePageChange(newPage: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', String(newPage));
		goto(`?${params.toString()}`);
	}

	function openCreate() {
		formId = '';
		formDescripcion = '';
		formTipoProductoId = tiposProducto.length > 0 ? String(tiposProducto[0].id) : '';
		formCosto = 0;
		formPrecioVenta = 0;
		formInventarioMinimo = 0;
		formStock = 0;
		formUnidadMedidaId = unidadesMedida.length > 0 ? String(unidadesMedida[0].id) : '';
		formAtributosValores = {};
		formControlaInventario = true;
		formRequiereSeguro = false;
		formPorcentajeSeguro = 0;
		formCargaMaxima = 0;
		onTipoProductoChange();
		isCreateOpen = true;
	}

	function openEdit(p: ProductoWithRelations) {
		selectedProduct = p;
		formId = String(p.id);
		formDescripcion = p.descripcion;
		formTipoProductoId = String(p.tipo_producto_id);
		formCosto = p.costo;
		formPrecioVenta = getPrecioVenta(p);
		formInventarioMinimo = p.inventario_minimo;
		formStock = p.stock ?? 0;
		formCargaMaxima = p.carga_maxima ?? 0;
		formUnidadMedidaId = p.unidad_medida_id ? String(p.unidad_medida_id) : '';
		formControlaInventario = p.controla_inventario ?? true;
		formRequiereSeguro = p.requiere_seguro ?? false;
		formPorcentajeSeguro = p.porcentaje_seguro ?? 0;

		const attrValues = p.atributos_valores ? { ...p.atributos_valores } : {};
		delete attrValues.__precio_venta;
		const tipo = tiposProducto.find((tp) => String(tp.id) === String(p.tipo_producto_id));
		if (tipo && tipo.atributos && Array.isArray(tipo.atributos)) {
			for (const attr of tipo.atributos) {
				if (attrValues[attr.nombre] === undefined) {
					attrValues[attr.nombre] = '';
				}
			}
		}
		formAtributosValores = attrValues;
		isEditOpen = true;
	}

	function openDetail(p: ProductoWithRelations) {
		selectedProduct = p;
		isDetailOpen = true;
	}

	function openCreateTipo() {
		tipoFormId = '';
		tipoFormNombre = '';
		tipoFormPrefijo = '';
		tipoFormDescripcion = '';
		tipoFormAtributos = [];
		isTipoFormOpen = true;
	}

	function openEditTipo(tp: TipoProducto) {
		selectedTipo = tp;
		tipoFormId = String(tp.id);
		tipoFormNombre = tp.nombre;
		tipoFormPrefijo = tp.prefijo;
		tipoFormDescripcion = tp.descripcion || '';
		tipoFormAtributos = tp.atributos ? JSON.parse(JSON.stringify(tp.atributos)) : [];
		isTipoFormOpen = true;
	}
</script>

<svelte:head>
	<title>Productos - Gestión de Inventario</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-6 space-y-6">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
		<div>
			<h1 class="text-2xl font-extrabold tracking-tight flex items-center gap-2">
				<Package class="w-6 h-6 text-primary" /> Catálogo de Productos
			</h1>
			<p class="text-sm text-muted-foreground">
				Gestión de productos, unidades de medida y codificación automática por Tipo de Producto (PREFIJO-000001).
			</p>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Button onclick={exportToCSV} variant="outline" class="gap-2 flex-1 sm:flex-none">
				<Download class="w-4 h-4" /> Exportar CSV
			</Button>

			{#if isAdmin}
				<Button onclick={() => (isTiposModalOpen = true)} variant="outline" class="gap-2 flex-1 sm:flex-none">
					<Settings class="w-4 h-4" /> Gestionar Tipo de Producto
				</Button>
			{/if}

			<Button onclick={openCreate} class="gap-2 flex-1 sm:flex-none">
				<Plus class="w-4 h-4" /> Nuevo Producto
			</Button>
		</div>
	</div>

	<!-- Controles de Búsqueda -->
	<div class="flex items-center justify-between gap-4">
		<form onsubmit={handleSearch} class="flex w-full sm:w-80 items-center gap-2">
			<div class="relative w-full">
				<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por código o descripción…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>
	</div>

	<!-- Tabla / Tarjetas de Productos -->
	<div class="space-y-4">
		<!-- Vista Móvil (Cards) -->
		<div class="grid grid-cols-1 gap-3 sm:hidden">
			{#each productos as p (p.id)}
				<div
					class={`p-4 rounded-lg border bg-card transition-all ${
						!p.activo ? 'bg-muted/40 text-muted-foreground opacity-60' : ''
					}`}
				>
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-1.5 mb-1">
								<Badge variant="outline" class="font-mono text-[10px] font-bold text-primary bg-primary/5">
									{p.codigo}
								</Badge>
								{#if p.tipo_producto}
									<Badge variant="secondary" class="uppercase text-[10px] font-semibold">
										{p.tipo_producto.nombre}
									</Badge>
								{/if}
								{#if getPesoVolumetrico(p)}
									<Badge variant="outline" class="font-mono text-[10px] font-bold text-primary border-primary/40 bg-primary/5">
										📦 {getPesoVolumetrico(p)}
									</Badge>
								{/if}
								{#if p.controla_inventario}
									<Badge variant="outline" class="text-[10px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
										STOCK ACTIVO
									</Badge>
								{:else}
									<Badge variant="secondary" class="text-[10px] font-medium text-muted-foreground">
										SIN STOCK
									</Badge>
								{/if}
								{#if p.requiere_seguro}
									<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10">
										🛡️ SEGURO {p.porcentaje_seguro}%
									</Badge>
								{/if}
								{#if p.carga_maxima && p.carga_maxima > 0}
									<Badge variant="outline" class="font-mono text-[10px] font-bold text-indigo-600 border-indigo-400/40 bg-indigo-500/10">
										⚖️ TOPE {p.carga_maxima} LB
									</Badge>
								{/if}
							</div>
							<h3 class={`font-bold uppercase ${!p.activo ? 'line-through' : ''}`}>
								{p.descripcion}
							</h3>
						</div>
						<StatusBadge activo={p.activo} />
					</div>

					<div class="mt-3 grid grid-cols-4 gap-2 text-xs border-t pt-2">
						<div>
							<span class="text-muted-foreground block text-[10px]">Costo:</span>
							<span class="font-semibold text-emerald-600 dark:text-emerald-400">
								${p.costo.toFixed(2)}
							</span>
						</div>
						<div>
							<span class="text-muted-foreground block text-[10px]">Precio Venta:</span>
							<span class="font-bold text-primary font-mono">
								${getPrecioVenta(p).toFixed(2)}
							</span>
						</div>
						<div>
							<span class="text-muted-foreground block text-[10px]">Stock Actual:</span>
							{#if p.controla_inventario}
								<span class={`font-bold font-mono ${
									(p.stock ?? 0) <= 0
										? 'text-destructive'
										: (p.stock ?? 0) <= p.inventario_minimo
											? 'text-amber-600'
											: 'text-emerald-600'
								}`}>
									{p.stock ?? 0} {p.unidad_medida?.codigo || ''}
								</span>
							{:else}
								<span class="text-muted-foreground italic text-[11px]">N/A</span>
							{/if}
						</div>
						<div>
							<span class="text-muted-foreground block text-[10px]">Inv. Mínimo:</span>
							<span class="font-semibold">
								{p.inventario_minimo} {p.unidad_medida?.codigo || ''}
							</span>
						</div>
					</div>

					<div class="mt-3 flex items-center justify-end gap-1 pt-2 border-t text-xs">
						<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openDetail(p)}>
							<Eye class="w-3.5 h-3.5" />
						</Button>
						<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openEdit(p)}>
							<Edit class="w-3.5 h-3.5" />
						</Button>
						<form method="POST" action="?/toggleActiveProduct" use:enhance class="inline">
							<input type="hidden" name="id" value={p.id} />
							<input type="hidden" name="activo" value={String(p.activo)} />
							<Button
								type="submit"
								variant="ghost"
								size="icon"
								class={`h-8 w-8 ${p.activo ? 'text-destructive' : 'text-emerald-600'}`}
							>
								<Power class="w-3.5 h-3.5" />
							</Button>
						</form>
					</div>
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground border rounded-lg bg-card">
					No se encontraron productos registrados.
				</div>
			{/each}
		</div>

		<!-- Vista Escritorio (Tabla) -->
		<div class="hidden sm:block border rounded-lg overflow-hidden bg-card">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Código</th>
							<th class="p-3">Descripción</th>
							<th class="p-3">Tipo de Producto</th>
							<th class="p-3 text-right">Costo</th>
							<th class="p-3 text-right">Precio Venta</th>
							<th class="p-3 text-right">Stock Actual</th>
							<th class="p-3 text-right">Inv. Mínimo</th>
							<th class="p-3">Unidad Medida</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if productos.length === 0}
							<tr>
								<td colspan="10" class="p-6 text-center text-muted-foreground">
									No se encontraron productos registrados.
								</td>
							</tr>
						{:else}
							{#each productos as p (p.id)}
								<tr
									class={`hover:bg-muted/40 transition-colors ${
										!p.activo ? 'text-muted-foreground opacity-60 bg-muted/20' : ''
									}`}
								>
									<td class="p-3 font-mono text-xs font-bold">
										<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5">
											{p.codigo}
										</Badge>
									</td>
									<td class="p-3 font-semibold uppercase">
										{p.descripcion}
									</td>
									<td class="p-3">
										<div class="flex items-center gap-1.5 flex-wrap">
											<Badge variant="secondary" class="uppercase text-xs font-semibold">
												{p.tipo_producto?.nombre || 'S/N'}
											</Badge>
											{#if getPesoVolumetrico(p)}
												<Badge variant="outline" class="font-mono text-[10px] font-bold text-primary border-primary/40 bg-primary/5">
													📦 {getPesoVolumetrico(p)}
												</Badge>
											{/if}
											{#if p.controla_inventario}
												<Badge variant="outline" class="text-[10px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
													STOCK ACTIVO
												</Badge>
											{:else}
												<Badge variant="secondary" class="text-[10px] font-medium text-muted-foreground">
													SIN STOCK
												</Badge>
											{/if}
											{#if p.requiere_seguro}
												<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10">
													🛡️ SEGURO {p.porcentaje_seguro}%
												</Badge>
											{/if}
											{#if p.carga_maxima && p.carga_maxima > 0}
												<Badge variant="outline" class="font-mono text-[10px] font-bold text-indigo-600 border-indigo-400/40 bg-indigo-500/10">
													⚖️ TOPE {p.carga_maxima} LB
												</Badge>
											{/if}
										</div>
									</td>
									<td class="p-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
										${p.costo.toFixed(2)}
									</td>
									<td class="p-3 text-right font-mono font-bold text-primary">
										${getPrecioVenta(p).toFixed(2)}
									</td>
									<td class="p-3 text-right font-mono">
										{#if p.controla_inventario}
											{#if (p.stock ?? 0) <= 0}
												<Badge variant="destructive" class="text-[10px] font-bold">
													{p.stock ?? 0} (Agotado)
												</Badge>
											{:else if (p.stock ?? 0) <= p.inventario_minimo}
												<Badge class="text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
													{p.stock ?? 0} (Bajo)
												</Badge>
											{:else}
												<Badge class="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
													{p.stock ?? 0}
												</Badge>
											{/if}
										{:else}
											<span class="text-xs text-muted-foreground italic">N/A</span>
										{/if}
									</td>
									<td class="p-3 text-right font-mono font-semibold">
										{p.inventario_minimo}
									</td>
									<td class="p-3 text-xs uppercase">
										{p.unidad_medida ? `${p.unidad_medida.nombre} (${p.unidad_medida.codigo})` : '-'}
									</td>
									<td class="p-3">
										<StatusBadge activo={p.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Detalle" onclick={() => openDetail(p)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Producto" onclick={() => openEdit(p)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveProduct" use:enhance class="inline">
												<input type="hidden" name="id" value={p.id} />
												<input type="hidden" name="activo" value={String(p.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={p.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={p.activo ? 'Desactivar producto' : 'Activar producto'}
												>
													<Power class="w-4 h-4" />
												</Button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Paginación -->
			<div class="p-4 border-t">
				<PaginationControl {currentPage} {totalPages} {totalItems} onPageChange={handlePageChange} />
			</div>
		</div>
	</div>
</div>

<!-- Modal: Crear Producto -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Package class="w-5 h-5 text-primary" /> Crear Nuevo Producto
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createProduct" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="atributos_valores" value={JSON.stringify(formAtributosValores)} />

				<div class="space-y-2">
					<Label for="c_tipo_prod">Tipo de Producto *</Label>
					<select
						id="c_tipo_prod"
						name="tipo_producto_id"
						required
						bind:value={formTipoProductoId}
						onchange={onTipoProductoChange}
						class="w-full h-10 px-3 rounded border text-sm uppercase bg-background"
					>
						{#each tiposProducto as tp}
							<option value={String(tp.id)}>
								{tp.nombre.toUpperCase()} (PREFIJO: {tp.prefijo})
							</option>
						{/each}
					</select>
					{#if selectedTipoObj}
						<p class="text-[11px] text-muted-foreground flex items-center gap-1">
							El código se generará automáticamente con el formato: <strong class="font-mono text-primary">{selectedTipoObj.prefijo}-000001</strong>
						</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="c_desc">Descripción del Producto *</Label>
					<InputUppercase id="c_desc" name="descripcion" required bind:value={formDescripcion} placeholder="EJ. LAPTOP GAMER 16GB" />
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
					<div class="space-y-2">
						<Label for="c_costo">Costo ($) *</Label>
						<Input id="c_costo" name="costo" type="number" step="0.01" min="0" required bind:value={formCosto} />
					</div>

					<div class="space-y-2">
						<Label for="c_precio_venta" class="text-primary font-bold">Precio Venta ($)</Label>
						<Input id="c_precio_venta" name="precio_venta" type="number" step="0.01" min="0" bind:value={formPrecioVenta} placeholder="0.00" />
					</div>

					<div class="space-y-2">
						<Label for="c_carga_max" class="flex items-center justify-between">
							<span>Carga Máx (LB)</span>
							<span class="text-[10px] text-muted-foreground font-normal">0 = País</span>
						</Label>
						<Input id="c_carga_max" name="carga_maxima" type="number" step="0.01" min="0" bind:value={formCargaMaxima} placeholder="0 = Límite país" />
					</div>

					<div class="space-y-2">
						<Label for="c_stock">Stock Inicial</Label>
						<Input id="c_stock" name="stock" type="number" step="0.01" min="0" bind:value={formStock} />
					</div>

					<div class="space-y-2">
						<Label for="c_inv">Inv. Mínimo *</Label>
						<Input id="c_inv" name="inventario_minimo" type="number" step="0.01" min="0" required bind:value={formInventarioMinimo} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="c_um">Unidad de Medida del Producto</Label>
					<select id="c_um" name="unidad_medida_id" bind:value={formUnidadMedidaId} class="w-full h-10 px-3 rounded border text-sm uppercase bg-background">
						<option value="">-- SELECCIONAR UNIDAD --</option>
						{#each unidadesMedida as um}
							<option value={String(um.id)}>
								{um.nombre.toUpperCase()} ({um.codigo.toUpperCase()})
							</option>
						{/each}
					</select>
				</div>

				<!-- Bandera de Control de Inventario -->
				<div class="p-3 border rounded-lg bg-card flex items-center justify-between gap-3">
					<div class="space-y-0.5">
						<Label for="c_ctrl_inv" class="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
							<Boxes class="w-4 h-4 text-primary" /> Control de Inventario
						</Label>
						<p class="text-[11px] text-muted-foreground">
							{formControlaInventario ? 'El producto requiere seguimiento de stock e inventario mínimo.' : 'El producto no requiere gestión de stock ni inventario.'}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input type="hidden" name="controla_inventario" value={formControlaInventario ? 'true' : 'false'} />
						<Checkbox id="c_ctrl_inv" bind:checked={formControlaInventario} />
					</div>
				</div>

				<!-- Bandera de Seguro de Producto y % Valor Declarado -->
				<div class="p-3 border rounded-lg bg-card space-y-3">
					<div class="flex items-center justify-between gap-3">
						<div class="space-y-0.5">
							<Label for="c_req_seguro" class="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
								<ShieldCheck class="w-4 h-4 text-primary" /> Requiere Seguro de Carga / Envío
							</Label>
							<p class="text-[11px] text-muted-foreground">
								{formRequiereSeguro ? 'El producto requiere seguro basado en su valor declarado.' : 'El producto no aplica póliza de seguro de envío.'}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<input type="hidden" name="requiere_seguro" value={formRequiereSeguro ? 'true' : 'false'} />
							<Checkbox id="c_req_seguro" bind:checked={formRequiereSeguro} />
						</div>
					</div>

					{#if formRequiereSeguro}
						<div class="space-y-1.5 pt-2 border-t">
							<Label for="c_pct_seguro" class="text-xs font-semibold text-primary flex items-center justify-between">
								<span>% del Valor Declarado para Seguro *</span>
								<Badge variant="outline" class="text-[10px] font-mono">EJ. 2.50%</Badge>
							</Label>
							<div class="relative">
								<Input
									id="c_pct_seguro"
									name="porcentaje_seguro"
									type="number"
									step="0.01"
									min="0"
									max="100"
									required={formRequiereSeguro}
									bind:value={formPorcentajeSeguro}
									placeholder="Ej. 2.50"
									class="pr-8"
								/>
								<span class="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Atributos Dinámicos del Tipo de Producto -->
				{#if selectedTipoObj && selectedTipoObj.atributos && selectedTipoObj.atributos.length > 0}
					<div class="space-y-3 p-3 border rounded-lg bg-muted/40">
						<span class="text-xs font-bold uppercase text-primary block">
							Atributos de {selectedTipoObj.nombre}:
						</span>
						{#each selectedTipoObj.atributos as attr}
							<div class="space-y-1">
								<Label class="text-xs font-semibold flex items-center justify-between">
									<span>
										{attr.nombre} {#if attr.requerido}<span class="text-destructive">*</span>{/if}
									</span>
									{#if attr.unidad_medida_id && getUnidadMedidaLabel(attr.unidad_medida_id)}
										<Badge variant="outline" class="text-[10px] font-mono text-primary bg-primary/5 uppercase">
											UM: {getUnidadMedidaLabel(attr.unidad_medida_id)}
										</Badge>
									{/if}
								</Label>
								<InputUppercase
									required={attr.requerido}
									placeholder={`Ingrese ${attr.nombre}`}
									bind:value={formAtributosValores[attr.nombre]}
								/>
							</div>
						{/each}

						{#if currentCalculatedPesoVolInfo}
							<div class="p-2.5 border border-primary/30 rounded-md bg-primary/10 flex items-center justify-between text-xs mt-2">
								<div class="flex items-center gap-1.5 font-bold text-primary uppercase">
									<Box class="w-4 h-4 text-primary" /> Peso Volumétrico ({currentCalculatedPesoVolInfo.dimUnit} &rarr; {currentCalculatedPesoVolInfo.unidad}):
								</div>
								<Badge class="font-mono text-xs font-extrabold bg-primary text-primary-foreground">
									{currentCalculatedPesoVolInfo.peso} {currentCalculatedPesoVolInfo.unidad}
								</Badge>
							</div>
						{/if}
					</div>
				{/if}

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar Producto</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Producto -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Producto
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateProduct" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />
				<input type="hidden" name="atributos_valores" value={JSON.stringify(formAtributosValores)} />

				<div class="space-y-2">
					<Label for="edit_tipo_prod">Tipo de Producto *</Label>
					<select
						id="edit_tipo_prod"
						name="tipo_producto_id"
						required
						bind:value={formTipoProductoId}
						onchange={onTipoProductoChange}
						class="w-full h-10 px-3 rounded border text-sm uppercase bg-background"
					>
						{#each tiposProducto as tp}
							<option value={String(tp.id)}>
								{tp.nombre.toUpperCase()} (PREFIJO: {tp.prefijo})
							</option>
						{/each}
					</select>
					{#if selectedTipoObj}
						<p class="text-[11px] text-amber-600 dark:text-amber-400">
							Si cambias el Tipo de Producto, el código se actualizará al prefijo del nuevo tipo.
						</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="edit_desc">Descripción del Producto *</Label>
					<InputUppercase id="edit_desc" name="descripcion" required bind:value={formDescripcion} />
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
					<div class="space-y-2">
						<Label for="edit_costo">Costo ($) *</Label>
						<Input id="edit_costo" name="costo" type="number" step="0.01" min="0" required bind:value={formCosto} />
					</div>

					<div class="space-y-2">
						<Label for="edit_precio_venta" class="text-primary font-bold">Precio Venta ($)</Label>
						<Input id="edit_precio_venta" name="precio_venta" type="number" step="0.01" min="0" bind:value={formPrecioVenta} placeholder="0.00" />
					</div>

					<div class="space-y-2">
						<Label for="edit_carga_max" class="flex items-center justify-between">
							<span>Carga Máx (LB)</span>
							<span class="text-[10px] text-muted-foreground font-normal">0 = País</span>
						</Label>
						<Input id="edit_carga_max" name="carga_maxima" type="number" step="0.01" min="0" bind:value={formCargaMaxima} placeholder="0 = Límite país" />
					</div>

					<div class="space-y-2">
						<Label for="edit_stock">Stock Actual</Label>
						<Input id="edit_stock" name="stock" type="number" step="0.01" min="0" bind:value={formStock} />
					</div>

					<div class="space-y-2">
						<Label for="edit_inv">Inv. Mínimo *</Label>
						<Input id="edit_inv" name="inventario_minimo" type="number" step="0.01" min="0" required bind:value={formInventarioMinimo} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="edit_um">Unidad de Medida del Producto</Label>
					<select id="edit_um" name="unidad_medida_id" bind:value={formUnidadMedidaId} class="w-full h-10 px-3 rounded border text-sm uppercase bg-background">
						<option value="">-- SELECCIONAR UNIDAD --</option>
						{#each unidadesMedida as um}
							<option value={String(um.id)}>
								{um.nombre.toUpperCase()} ({um.codigo.toUpperCase()})
							</option>
						{/each}
					</select>
				</div>

				<!-- Bandera de Control de Inventario -->
				<div class="p-3 border rounded-lg bg-card flex items-center justify-between gap-3">
					<div class="space-y-0.5">
						<Label for="edit_ctrl_inv" class="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
							<Boxes class="w-4 h-4 text-primary" /> Control de Inventario
						</Label>
						<p class="text-[11px] text-muted-foreground">
							{formControlaInventario ? 'El producto requiere seguimiento de stock e inventario mínimo.' : 'El producto no requiere gestión de stock ni inventario.'}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input type="hidden" name="controla_inventario" value={formControlaInventario ? 'true' : 'false'} />
						<Checkbox id="edit_ctrl_inv" bind:checked={formControlaInventario} />
					</div>
				</div>

				<!-- Bandera de Seguro de Producto y % Valor Declarado -->
				<div class="p-3 border rounded-lg bg-card space-y-3">
					<div class="flex items-center justify-between gap-3">
						<div class="space-y-0.5">
							<Label for="edit_req_seguro" class="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
								<ShieldCheck class="w-4 h-4 text-primary" /> Requiere Seguro de Carga / Envío
							</Label>
							<p class="text-[11px] text-muted-foreground">
								{formRequiereSeguro ? 'El producto requiere seguro basado en su valor declarado.' : 'El producto no aplica póliza de seguro de envío.'}
							</p>
						</div>
						<div class="flex items-center gap-2">
							<input type="hidden" name="requiere_seguro" value={formRequiereSeguro ? 'true' : 'false'} />
							<Checkbox id="edit_req_seguro" bind:checked={formRequiereSeguro} />
						</div>
					</div>

					{#if formRequiereSeguro}
						<div class="space-y-1.5 pt-2 border-t">
							<Label for="edit_pct_seguro" class="text-xs font-semibold text-primary flex items-center justify-between">
								<span>% del Valor Declarado para Seguro *</span>
								<Badge variant="outline" class="text-[10px] font-mono">EJ. 2.50%</Badge>
							</Label>
							<div class="relative">
								<Input
									id="edit_pct_seguro"
									name="porcentaje_seguro"
									type="number"
									step="0.01"
									min="0"
									max="100"
									required={formRequiereSeguro}
									bind:value={formPorcentajeSeguro}
									placeholder="Ej. 2.50"
									class="pr-8"
								/>
								<span class="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Atributos Dinámicos del Tipo de Producto -->
				{#if selectedTipoObj && selectedTipoObj.atributos && selectedTipoObj.atributos.length > 0}
					<div class="space-y-3 p-3 border rounded-lg bg-muted/40">
						<span class="text-xs font-bold uppercase text-primary block">
							Atributos de {selectedTipoObj.nombre}:
						</span>
						{#each selectedTipoObj.atributos as attr}
							<div class="space-y-1">
								<Label class="text-xs font-semibold flex items-center justify-between">
									<span>
										{attr.nombre} {#if attr.requerido}<span class="text-destructive">*</span>{/if}
									</span>
									{#if attr.unidad_medida_id && getUnidadMedidaLabel(attr.unidad_medida_id)}
										<Badge variant="outline" class="text-[10px] font-mono text-primary bg-primary/5 uppercase">
											UM: {getUnidadMedidaLabel(attr.unidad_medida_id)}
										</Badge>
									{/if}
								</Label>
								<InputUppercase
									required={attr.requerido}
									placeholder={`Ingrese ${attr.nombre}`}
									bind:value={formAtributosValores[attr.nombre]}
								/>
							</div>
						{/each}

						{#if currentCalculatedPesoVolInfo}
							<div class="p-2.5 border border-primary/30 rounded-md bg-primary/10 flex items-center justify-between text-xs mt-2">
								<div class="flex items-center gap-1.5 font-bold text-primary uppercase">
									<Box class="w-4 h-4 text-primary" /> Peso Volumétrico ({currentCalculatedPesoVolInfo.dimUnit} &rarr; {currentCalculatedPesoVolInfo.unidad}):
								</div>
								<Badge class="font-mono text-xs font-extrabold bg-primary text-primary-foreground">
									{currentCalculatedPesoVolInfo.peso} {currentCalculatedPesoVolInfo.unidad}
								</Badge>
							</div>
						{/if}
					</div>
				{/if}

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Actualizar Producto</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Producto -->
{#if isDetailOpen && selectedProduct}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Ficha de Producto</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedProduct.activo} />
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Código</span>
						<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5">
							{selectedProduct.codigo}
						</Badge>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Tipo de Producto</span>
						<Badge variant="secondary" class="uppercase text-xs font-semibold">
							{selectedProduct.tipo_producto?.nombre || '-'}
						</Badge>
					</div>
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Descripción</span>
					<span class="font-bold uppercase text-base">{selectedProduct.descripcion}</span>
				</div>

				<div class="grid grid-cols-3 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Costo</span>
						<span class="font-mono font-bold text-emerald-600 text-base">
							${selectedProduct.costo.toFixed(2)}
						</span>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Precio Venta</span>
						<span class="font-mono font-bold text-primary text-base">
							${getPrecioVenta(selectedProduct).toFixed(2)}
						</span>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Inventario Mínimo</span>
						<span class="font-mono font-semibold">
							{selectedProduct.inventario_minimo} {selectedProduct.unidad_medida?.codigo || ''}
						</span>
					</div>
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Unidad de Medida Principal</span>
					<span class="uppercase">
						{selectedProduct.unidad_medida ? `${selectedProduct.unidad_medida.nombre} (${selectedProduct.unidad_medida.codigo})` : 'N/A'}
					</span>
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Control de Inventario:</span>
					{#if selectedProduct.controla_inventario}
						<Badge variant="outline" class="text-xs font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
							ACTIVO (LLEVA CONTROL)
						</Badge>
					{:else}
						<Badge variant="secondary" class="text-xs font-medium text-muted-foreground">
							INACTIVO (SIN CONTROL)
						</Badge>
					{/if}
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Seguro de Carga:</span>
					{#if selectedProduct.requiere_seguro}
						<Badge variant="outline" class="text-xs font-bold text-amber-600 border-amber-500/30 bg-amber-500/10">
							REQUIERE SEGURO ({selectedProduct.porcentaje_seguro}%)
						</Badge>
					{:else}
						<Badge variant="secondary" class="text-xs font-medium text-muted-foreground">
							NO REQUIERE SEGURO
						</Badge>
					{/if}
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Capacidad Carga Máxima:</span>
					{#if selectedProduct.carga_maxima && selectedProduct.carga_maxima > 0}
						<Badge variant="outline" class="text-xs font-bold text-indigo-600 border-indigo-500/30 bg-indigo-500/10 font-mono">
							⚖️ {selectedProduct.carga_maxima} LB (SOBREESCRIBE TOPE PAÍS)
						</Badge>
					{:else}
						<Badge variant="secondary" class="text-xs font-medium text-muted-foreground font-mono">
							0.00 LB (USA TOPE DEL PAÍS)
						</Badge>
					{/if}
				</div>

				<!-- Atributos dinámicos guardados -->
				{#if selectedProduct.atributos_valores && Object.keys(selectedProduct.atributos_valores).filter((k) => !k.startsWith('__')).length > 0}
					<div class="space-y-2 pt-1">
						<span class="text-xs font-bold text-primary uppercase block">Atributos del Producto:</span>
						<div class="grid grid-cols-2 gap-2 bg-muted/30 p-2.5 rounded border text-xs">
							{#each Object.entries(selectedProduct.atributos_valores).filter(([k]) => !k.startsWith('__')) as [k, v]}
								{@const attrDef = selectedProduct.tipo_producto?.atributos?.find((a) => a.nombre === k)}
								{@const umCode = attrDef?.unidad_medida_id ? getUnidadMedidaLabel(attrDef.unidad_medida_id) : ''}
								<div>
									<span class="text-muted-foreground block text-[10px] uppercase">{k}:</span>
									<span class="font-semibold uppercase">{v || '-'} {#if umCode}<span class="text-primary font-mono text-[10px]">({umCode})</span>{/if}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if getPesoVolumetrico(selectedProduct)}
					<div class="p-3 border border-primary/30 rounded-lg bg-primary/10 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Box class="w-4 h-4 text-primary" />
							<span class="font-bold text-xs uppercase text-primary">Peso Volumétrico:</span>
						</div>
						<Badge class="font-mono text-xs font-extrabold bg-primary text-primary-foreground">
							{getPesoVolumetrico(selectedProduct)}
						</Badge>
					</div>
				{/if}
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Maestro de Tipos de Producto (Solo Admin) -->
{#if isTiposModalOpen && isAdmin}
	<Dialog bind:open={isTiposModalOpen}>
		<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Settings class="w-5 h-5 text-primary" /> Maestro de Tipos de Producto
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2">
				<div class="flex items-center justify-between">
					<p class="text-xs text-muted-foreground">
						Configura los tipos de producto, su prefijo de 3 letras (ej. ELE, ROP) y los atributos con sus unidades de medida.
					</p>
					<Button size="sm" onclick={openCreateTipo} class="gap-1 text-xs">
						<Plus class="w-3.5 h-3.5" /> Nuevo Tipo
					</Button>
				</div>

				<!-- Lista de Tipos de Producto -->
				<div class="border rounded-lg overflow-hidden bg-card">
					<table class="w-full text-left text-xs">
						<thead class="bg-muted/50 font-semibold uppercase tracking-wider text-muted-foreground border-b">
							<tr>
								<th class="p-2.5">Prefijo</th>
								<th class="p-2.5">Nombre</th>
								<th class="p-2.5">Atributos y Unidades</th>
								<th class="p-2.5">Estado</th>
								<th class="p-2.5 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each tiposProducto as tp (tp.id)}
								<tr class={!tp.activo ? 'opacity-60 bg-muted/20' : ''}>
									<td class="p-2.5 font-mono font-bold text-primary">{tp.prefijo}</td>
									<td class="p-2.5 font-semibold uppercase">{tp.nombre}</td>
									<td class="p-2.5">
										{#if tp.atributos && tp.atributos.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each tp.atributos as a}
													<Badge variant="outline" class="text-[10px]">
														{a.nombre}
														{#if a.unidad_medida_id && getUnidadMedidaLabel(a.unidad_medida_id)}
															<span class="font-mono text-primary ml-1 text-[9px]">({getUnidadMedidaLabel(a.unidad_medida_id)})</span>
														{/if}
													</Badge>
												{/each}
											</div>
										{:else}
											<span class="text-muted-foreground text-[10px]">Sin atributos</span>
										{/if}
									</td>
									<td class="p-2.5">
										<StatusBadge activo={tp.activo} />
									</td>
									<td class="p-2.5 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => openEditTipo(tp)}>
												<Edit class="w-3.5 h-3.5" />
											</Button>
											<form method="POST" action="?/toggleActiveTipoProducto" use:enhance class="inline">
												<input type="hidden" name="id" value={tp.id} />
												<input type="hidden" name="activo" value={String(tp.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={`h-7 w-7 ${tp.activo ? 'text-destructive' : 'text-emerald-600'}`}
												>
													<Power class="w-3.5 h-3.5" />
												</Button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isTiposModalOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal Secundario: Crear / Editar Tipo de Producto -->
{#if isTipoFormOpen && isAdmin}
	<Dialog bind:open={isTipoFormOpen}>
		<DialogContent class="max-w-xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-lg font-bold">
					{tipoFormId ? 'Editar Tipo de Producto' : 'Nuevo Tipo de Producto'}
				</DialogTitle>
			</DialogHeader>

			<form
				method="POST"
				action={tipoFormId ? '?/updateTipoProducto' : '?/createTipoProducto'}
				use:enhance
				class="space-y-4 py-2"
			>
				{#if tipoFormId}
					<input type="hidden" name="id" value={tipoFormId} />
				{/if}
				<input type="hidden" name="atributos" value={JSON.stringify(tipoFormAtributos)} />

				<div class="grid grid-cols-3 gap-3">
					<div class="col-span-2 space-y-2">
						<Label for="tp_nombre">Nombre del Tipo *</Label>
						<InputUppercase id="tp_nombre" name="nombre" required bind:value={tipoFormNombre} placeholder="EJ. ELECTRÓNICOS" />
					</div>

					<div class="space-y-2">
						<Label for="tp_prefijo">Prefijo (3L) *</Label>
						<InputUppercase
							id="tp_prefijo"
							name="prefijo"
							maxlength={3}
							required
							bind:value={tipoFormPrefijo}
							placeholder="ELE"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="tp_desc">Descripción</Label>
					<InputUppercase id="tp_desc" name="descripcion" bind:value={tipoFormDescripcion} />
				</div>

				<!-- Builder de Atributos con Selección de Unidad de Medida (Línea 140) -->
				<div class="space-y-3 border p-3 rounded-lg bg-muted/30">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold uppercase text-primary">Atributos y Unidades de Medida:</span>
						<Button type="button" variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={addTipoAtributo}>
							<Plus class="w-3 h-3" /> Agregar Atributo
						</Button>
					</div>

					{#each tipoFormAtributos as attr, i}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background p-2.5 rounded border items-end">
							<div class="space-y-1">
								<Label class="text-[10px] text-muted-foreground uppercase font-semibold">Nombre Atributo *</Label>
								<InputUppercase
									placeholder="EJ. PESO / TALLA"
									class="text-xs h-8"
									required
									bind:value={attr.nombre}
								/>
							</div>
							<div class="flex items-end gap-1">
								<div class="space-y-1 w-full">
									<Label class="text-[10px] text-muted-foreground uppercase font-semibold">Unidad de Medida (Opcional)</Label>
									<select
										bind:value={attr.unidad_medida_id}
										class="w-full h-8 px-2 rounded border text-xs uppercase bg-background"
									>
										<option value={null}>-- SIN UNIDAD --</option>
										{#each unidadesMedida as um}
											<option value={um.id}>{um.nombre.toUpperCase()} ({um.codigo.toUpperCase()})</option>
										{/each}
									</select>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="h-8 w-8 text-destructive shrink-0"
									onclick={() => removeTipoAtributo(i)}
								>
									<Trash2 class="w-3.5 h-3.5" />
								</Button>
							</div>
						</div>
					{:else}
						<p class="text-[11px] text-muted-foreground text-center py-2">
							No hay atributos definidos. Haz clic en "Agregar Atributo" para asociar características y unidades de medida.
						</p>
					{/each}
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isTipoFormOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar Tipo</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
