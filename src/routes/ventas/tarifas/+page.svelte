<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { toast } from 'svelte-sonner';
	import { DollarSign, Plus, Edit, Eye, Power, Tag, Globe, MapPin, Box, Sparkles, Filter, Download } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { TarifaWithRelations } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tarifas = $derived(data.tarifas || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);

	const tiposTarifa = $derived(data.tiposTarifa || []);
	const paises = $derived(data.paises || []);
	const zonas = $derived(data.zonas || []);
	const productos = $derived(data.productos || []);

	// Filtros
	let selectedTipoTarifaFilter = $state('');
	let selectedPaisFilter = $state('');
	let selectedZonaFilter = $state('');
	let selectedProductoFilter = $state('');
	let selectedTipoCalculoFilter = $state('');

	$effect(() => {
		selectedTipoTarifaFilter = data.tipoTarifaFilter || '';
		selectedPaisFilter = data.paisFilter || '';
		selectedZonaFilter = data.zonaFilter || '';
		selectedProductoFilter = data.productoFilter || '';
		selectedTipoCalculoFilter = data.tipoCalculoFilter || '';
	});

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createTarifa'
					? 'Tarifa creada exitosamente'
					: form.action === 'updateTarifa'
						? 'Tarifa actualizada exitosamente'
						: 'Estado de tarifa actualizado'
			);
			tick().then(() => {
				isCreateOpen = false;
				isEditOpen = false;
			});
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	// Modales
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDetailOpen = $state(false);
	let selectedTarifa = $state<TarifaWithRelations | null>(null);

	// Formulario
	let formId = $state('');
	let formTipoTarifaId = $state('');
	let formPaisId = $state('');
	let formZonaId = $state('');
	let formProductoId = $state('');
	let formTipoCalculo = $state<'unica' | 'peso'>('unica');
	let formPrecio = $state(0);
	let formDescripcion = $state('');

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedTipoTarifaFilter) params.set('tipo_tarifa_id', selectedTipoTarifaFilter);
		if (selectedPaisFilter) params.set('pais_id', selectedPaisFilter);
		if (selectedZonaFilter) params.set('zona_id', selectedZonaFilter);
		if (selectedProductoFilter) params.set('producto_id', selectedProductoFilter);
		if (selectedTipoCalculoFilter) params.set('tipo_calculo', selectedTipoCalculoFilter);
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function resetFilters() {
		selectedTipoTarifaFilter = '';
		selectedPaisFilter = '';
		selectedZonaFilter = '';
		selectedProductoFilter = '';
		selectedTipoCalculoFilter = '';
		goto(`?page=1`);
	}

	function handlePageChange(newPage: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', String(newPage));
		goto(`?${params.toString()}`);
	}

	function openCreate() {
		formId = '';
		formTipoTarifaId = tiposTarifa.length > 0 ? String(tiposTarifa[0].id) : '';
		formPaisId = paises.length > 0 ? String(paises[0].id) : '';
		formZonaId = zonas.length > 0 ? String(zonas[0].id) : '';
		formProductoId = productos.length > 0 ? String(productos[0].id) : '';
		formTipoCalculo = 'unica';
		formPrecio = 0;
		formDescripcion = '';
		isCreateOpen = true;
	}

	function openEdit(t: TarifaWithRelations) {
		selectedTarifa = t;
		formId = String(t.id);
		formTipoTarifaId = String(t.tipo_tarifa_id);
		formPaisId = String(t.pais_id);
		formZonaId = String(t.zona_id);
		formProductoId = String(t.producto_id);
		formTipoCalculo = (t.tipo_calculo || (t.es_por_peso ? 'peso' : 'unica')) as 'unica' | 'peso';
		formPrecio = t.precio;
		formDescripcion = t.descripcion || '';
		isEditOpen = true;
	}

	function openDetail(t: TarifaWithRelations) {
		selectedTarifa = t;
		isDetailOpen = true;
	}

	// Exportar Tarifas a CSV
	function exportToCSV() {
		if (!tarifas || tarifas.length === 0) {
			toast.error('No hay tarifas para exportar');
			return;
		}

		const headers = [
			'ID',
			'Tipo Tarifa',
			'Es Promoción',
			'Nº Productos Involucrados',
			'Modalidad de Cálculo',
			'País Destino',
			'Código País',
			'Zona Logística',
			'Código Producto',
			'Descripción Producto',
			'Precio Final',
			'Estado',
			'Observaciones'
		];

		const rows = tarifas.map((t) => [
			t.id,
			`"${(t.tipo_tarifa?.nombre || '').replace(/"/g, '""')}"`,
			t.tipo_tarifa?.promocion ? 'SÍ' : 'NO',
			t.tipo_tarifa?.numero_productos || 1,
			t.tipo_calculo === 'peso' || t.es_por_peso ? 'POR PESO REPORTADO' : 'TARIFA ÚNICA',
			`"${(t.pais?.nombre || '').replace(/"/g, '""')}"`,
			`"${t.pais?.codigo_iso2 || ''}"`,
			`"${(t.zona?.nombre || '').replace(/"/g, '""')}"`,
			`"${t.producto?.codigo || ''}"`,
			`"${(t.producto?.descripcion || '').replace(/"/g, '""')}"`,
			t.precio,
			t.activo ? 'ACTIVO' : 'INACTIVO',
			`"${(t.descripcion || '').replace(/"/g, '""')}"`
		].join(','));

		const csvContent = [headers.join(','), ...rows].join('\n');
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `tarifas_ventas_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success('Listado de tarifas exportado a CSV');
	}
</script>

<svelte:head>
	<title>Gestión de Tarifas de Ventas | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<DollarSign class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Tarifas de Ventas</h1>
				<p class="text-xs text-muted-foreground">
					Asignación de precios y promociones por combinación de Tipo de Tarifa, País, Zona y Producto.
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			<Button onclick={exportToCSV} variant="outline" class="gap-2">
				<Download class="w-4 h-4" /> Exportar CSV
			</Button>
			<Button onclick={openCreate} class="gap-2">
				<Plus class="w-4 h-4" /> Nueva Tarifa
			</Button>
		</div>
	</div>

	<!-- Barra de Filtros Multicriterio -->
	<Card class="bg-card/50 border">
		<CardContent class="p-4 space-y-3">
			<div class="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
				<Filter class="w-3.5 h-3.5 text-primary" /> Filtrar Tarifas:
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
				<div>
					<Label class="text-xs mb-1 block text-muted-foreground">Tipo de Tarifa</Label>
					<select
						bind:value={selectedTipoTarifaFilter}
						onchange={applyFilters}
						class="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs uppercase"
					>
						<option value="">TODOS LOS TIPOS</option>
						{#each tiposTarifa as tt}
							<option value={String(tt.id)}>{tt.nombre.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<div>
					<Label class="text-xs mb-1 block text-muted-foreground">Modalidad</Label>
					<select
						bind:value={selectedTipoCalculoFilter}
						onchange={applyFilters}
						class="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs uppercase"
					>
						<option value="">TODAS LAS MODALIDADES</option>
						<option value="unica">TARIFA ÚNICA (CAJA COMPLETA)</option>
						<option value="peso">POR PESO REPORTADO ($/LB)</option>
					</select>
				</div>

				<div>
					<Label class="text-xs mb-1 block text-muted-foreground">País de Destino</Label>
					<select
						bind:value={selectedPaisFilter}
						onchange={applyFilters}
						class="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs uppercase"
					>
						<option value="">TODOS LOS PAÍSES</option>
						{#each paises as p}
							<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<div>
					<Label class="text-xs mb-1 block text-muted-foreground">Zona Logística</Label>
					<select
						bind:value={selectedZonaFilter}
						onchange={applyFilters}
						class="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs uppercase"
					>
						<option value="">TODAS LAS ZONAS</option>
						{#each zonas as z}
							<option value={String(z.id)}>{z.nombre.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<div>
					<Label class="text-xs mb-1 block text-muted-foreground">Producto</Label>
					<select
						bind:value={selectedProductoFilter}
						onchange={applyFilters}
						class="w-full h-9 px-2.5 rounded-md border border-input bg-background text-xs uppercase"
					>
						<option value="">TODOS LOS PRODUCTOS</option>
						{#each productos as prod}
							<option value={String(prod.id)}>[{prod.codigo}] {prod.descripcion.toUpperCase()}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if selectedTipoTarifaFilter || selectedTipoCalculoFilter || selectedPaisFilter || selectedZonaFilter || selectedProductoFilter}
				<div class="flex items-center justify-end pt-1">
					<Button variant="ghost" size="sm" onclick={resetFilters} class="text-xs text-muted-foreground hover:text-destructive">
						Limpiar Filtros
					</Button>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Listado de Tarifas -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base font-semibold">Listado de Tarifas Configuradas</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6 pt-0">
			<!-- Tarjetas Móvil -->
			<div class="block sm:hidden divide-y">
				{#if tarifas.length === 0}
					<div class="p-6 text-center text-sm text-muted-foreground">
						No se encontraron tarifas configuradas para esta búsqueda.
					</div>
				{:else}
					{#each tarifas as t (t.id)}
						<div class={`p-4 space-y-3 ${!t.activo ? 'opacity-60 bg-muted/20' : ''}`}>
							<div class="flex items-start justify-between gap-2">
								<div>
									<div class="flex items-center gap-1.5 flex-wrap">
										<Badge variant="outline" class="text-xs font-bold text-primary border-primary/30 bg-primary/5">
											{t.tipo_tarifa?.nombre || 'TARIFA'}
										</Badge>
										{#if t.tipo_tarifa?.promocion}
											<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
												<Sparkles class="w-3 h-3" /> PROMOCIÓN
											</Badge>
										{/if}
									</div>

									<h3 class="font-bold uppercase text-sm mt-1">
										[{t.producto?.codigo}] {t.producto?.descripcion}
									</h3>

									<div class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
										<span class="flex items-center gap-1">
											<Globe class="w-3.5 h-3.5 text-primary" /> {t.pais?.nombre || 'S/P'}
										</span>
										<span class="flex items-center gap-1">
											<MapPin class="w-3.5 h-3.5 text-primary" /> {t.zona?.nombre || 'S/Z'}
										</span>
									</div>
								</div>

								<div class="text-right">
									<span class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block font-mono">
										${t.precio.toFixed(2)}
									</span>
									{#if t.tipo_calculo === 'peso' || t.es_por_peso}
										<span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">/ LB (PESO)</span>
									{:else}
										<span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">ÚNICA</span>
									{/if}
									<StatusBadge activo={t.activo} />
								</div>
							</div>

							<div class="flex items-center justify-end gap-1 border-t pt-2 text-xs">
								<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openDetail(t)}>
									<Eye class="w-3.5 h-3.5" />
								</Button>
								<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openEdit(t)}>
									<Edit class="w-3.5 h-3.5" />
								</Button>
								<form method="POST" action="?/toggleActiveTarifa" use:enhance class="inline">
									<input type="hidden" name="id" value={t.id} />
									<input type="hidden" name="activo" value={String(t.activo)} />
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										class={`h-8 w-8 ${t.activo ? 'text-destructive' : 'text-emerald-600'}`}
									>
										<Power class="w-3.5 h-3.5" />
									</Button>
								</form>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Tabla Desktop -->
			<div class="hidden sm:block border rounded-lg overflow-hidden">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
						<tr>
							<th class="p-3">Producto</th>
							<th class="p-3">Tipo de Tarifa</th>
							<th class="p-3">País Destino</th>
							<th class="p-3">Zona Logística</th>
							<th class="p-3 text-right">Precio Final</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if tarifas.length === 0}
							<tr>
								<td colspan="7" class="p-6 text-center text-muted-foreground">
									No se encontraron tarifas configuradas para esta búsqueda.
								</td>
							</tr>
						{:else}
							{#each tarifas as t (t.id)}
								<tr class={`hover:bg-muted/40 transition-colors ${!t.activo ? 'text-muted-foreground opacity-60 bg-muted/20' : ''}`}>
									<td class="p-3">
										<span class="font-mono font-bold text-xs text-primary block">[{t.producto?.codigo}]</span>
										<span class="font-semibold uppercase text-xs">{t.producto?.descripcion}</span>
									</td>
									<td class="p-3">
										<div class="flex items-center gap-1.5 flex-wrap">
											<Badge variant="outline" class="text-xs font-bold text-primary border-primary/30 bg-primary/5">
												{t.tipo_tarifa?.nombre || 'TARIFA'}
											</Badge>
											{#if t.tipo_tarifa?.promocion}
												<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
													<Sparkles class="w-3 h-3" /> PROMOCIÓN
												</Badge>
											{/if}
										</div>
									</td>
									<td class="p-3 font-semibold uppercase text-xs">
										<span class="flex items-center gap-1.5">
											<Globe class="w-3.5 h-3.5 text-muted-foreground" />
											{t.pais?.nombre || '-'}
										</span>
									</td>
									<td class="p-3 font-semibold uppercase text-xs">
										<span class="flex items-center gap-1.5">
											<MapPin class="w-3.5 h-3.5 text-muted-foreground" />
											{t.zona?.nombre || '-'}
										</span>
									</td>
									<td class="p-3 text-right">
										<div class="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
											${t.precio.toFixed(2)}
										</div>
										{#if t.tipo_calculo === 'peso' || t.es_por_peso}
											<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10">
												POR PESO ($/LB)
											</Badge>
										{:else}
											<Badge variant="outline" class="text-[10px] font-bold text-muted-foreground border-muted/50 bg-muted/20">
												TARIFA ÚNICA
											</Badge>
										{/if}
									</td>
									<td class="p-3">
										<StatusBadge activo={t.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Detalle" onclick={() => openDetail(t)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Tarifa" onclick={() => openEdit(t)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveTarifa" use:enhance class="inline">
												<input type="hidden" name="id" value={t.id} />
												<input type="hidden" name="activo" value={String(t.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={t.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={t.activo ? 'Desactivar tarifa' : 'Activar tarifa'}
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

			<div class="mt-4">
				<PaginationControl {currentPage} {totalPages} {totalItems} onPageChange={handlePageChange} />
			</div>
		</CardContent>
	</Card>
</div>

<!-- Modal: Crear Tarifa -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-lg">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<DollarSign class="w-5 h-5 text-primary" /> Registrar Nueva Tarifa de Venta
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createTarifa" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="c_producto">Producto *</Label>
					<select
						id="c_producto"
						name="producto_id"
						required
						bind:value={formProductoId}
						class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
					>
						{#each productos as prod}
							<option value={String(prod.id)}>[{prod.codigo}] {prod.descripcion.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="c_tipo_tarifa">Tipo de Tarifa *</Label>
						<select
							id="c_tipo_tarifa"
							name="tipo_tarifa_id"
							required
							bind:value={formTipoTarifaId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
						>
							{#each tiposTarifa as tt}
								<option value={String(tt.id)}>{tt.nombre.toUpperCase()}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="c_tipo_calculo">Modalidad de Cálculo *</Label>
						<select
							id="c_tipo_calculo"
							name="tipo_calculo"
							required
							bind:value={formTipoCalculo}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase font-semibold"
						>
							<option value="unica">TARIFA ÚNICA (CAJA COMPLETA)</option>
							<option value="peso">POR PESO REPORTADO ($/LB)</option>
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="c_precio">
						{formTipoCalculo === 'peso' ? 'Precio por Peso ($ por Libra) *' : 'Precio Final de Venta ($ Fijo por Caja) *'}
					</Label>
					<Input id="c_precio" name="precio" type="number" step="0.01" min="0" required bind:value={formPrecio} />
					<p class="text-[11px] text-muted-foreground">
						{formTipoCalculo === 'peso'
							? 'En la venta, el precio base de la caja se calculará multiplicando este valor por el peso reportado.'
							: 'En la venta, se aplicará este valor como monto base fijo por la caja completa sin considerar el peso.'}
					</p>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="c_pais">País de Destino *</Label>
						<select
							id="c_pais"
							name="pais_id"
							required
							bind:value={formPaisId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
						>
							{#each paises as p}
								<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="c_zona">Zona Logística *</Label>
						<select
							id="c_zona"
							name="zona_id"
							required
							bind:value={formZonaId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
						>
							{#each zonas as z}
								<option value={String(z.id)}>{z.nombre.toUpperCase()}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="c_desc">Descripción u Observaciones (Opcional)</Label>
					<InputUppercase id="c_desc" name="descripcion" bind:value={formDescripcion} placeholder="EJ. TARIFA ESPECIAL DE LANZAMIENTO" />
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Tarifa</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Tarifa -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-lg">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Tarifa de Venta
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateTarifa" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<Label for="edit_producto">Producto *</Label>
					<select
						id="edit_producto"
						name="producto_id"
						required
						bind:value={formProductoId}
						class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
					>
						{#each productos as prod}
							<option value={String(prod.id)}>[{prod.codigo}] {prod.descripcion.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="edit_tipo_tarifa">Tipo de Tarifa *</Label>
						<select
							id="edit_tipo_tarifa"
							name="tipo_tarifa_id"
							required
							bind:value={formTipoTarifaId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
						>
							{#each tiposTarifa as tt}
								<option value={String(tt.id)}>{tt.nombre.toUpperCase()}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="edit_tipo_calculo">Modalidad de Cálculo *</Label>
						<select
							id="edit_tipo_calculo"
							name="tipo_calculo"
							required
							bind:value={formTipoCalculo}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase font-semibold"
						>
							<option value="unica">TARIFA ÚNICA (CAJA COMPLETA)</option>
							<option value="peso">POR PESO REPORTADO ($/LB)</option>
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="edit_precio">
						{formTipoCalculo === 'peso' ? 'Precio por Peso ($ por Libra) *' : 'Precio Final de Venta ($ Fijo por Caja) *'}
					</Label>
					<Input id="edit_precio" name="precio" type="number" step="0.01" min="0" required bind:value={formPrecio} />
					<p class="text-[11px] text-muted-foreground">
						{formTipoCalculo === 'peso'
							? 'En la venta, el precio base de la caja se calculará multiplicando este valor por el peso reportado.'
							: 'En la venta, se aplicará este valor como monto base fijo por la caja completa sin considerar el peso.'}
					</p>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="edit_pais">País de Destino *</Label>
						<select
							id="edit_pais"
							name="pais_id"
							required
							bind:value={formPaisId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
						>
							{#each paises as p}
								<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="edit_zona">Zona Logística *</Label>
						<select
							id="edit_zona"
							name="zona_id"
							required
							bind:value={formZonaId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase"
						>
							{#each zonas as z}
								<option value={String(z.id)}>{z.nombre.toUpperCase()}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="edit_desc">Descripción u Observaciones (Opcional)</Label>
					<InputUppercase id="edit_desc" name="descripcion" bind:value={formDescripcion} />
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Actualizar Tarifa</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Tarifa -->
{#if isDetailOpen && selectedTarifa}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Detalle de la Tarifa de Venta</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedTarifa.activo} />
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Producto:</span>
					<span class="font-bold text-primary font-mono block text-xs">[{selectedTarifa.producto?.codigo}]</span>
					<span class="font-bold uppercase text-base block">{selectedTarifa.producto?.descripcion}</span>
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Tipo de Tarifa:</span>
					<div class="flex items-center gap-1">
						<Badge variant="outline" class="text-xs font-bold text-primary border-primary/30 bg-primary/5">
							{selectedTarifa.tipo_tarifa?.nombre || '-'}
						</Badge>
						{#if selectedTarifa.tipo_tarifa?.promocion}
							<Badge variant="outline" class="text-xs font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
								<Sparkles class="w-3 h-3" /> PROMOCIÓN
							</Badge>
						{/if}
					</div>
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Modalidad de Cálculo:</span>
					{#if selectedTarifa.tipo_calculo === 'peso' || selectedTarifa.es_por_peso}
						<Badge variant="outline" class="text-xs font-bold text-amber-600 border-amber-500/30 bg-amber-500/10">
							POR PESO REPORTADO ($/LB)
						</Badge>
					{:else}
						<Badge variant="outline" class="text-xs font-bold text-muted-foreground border-muted/50 bg-muted/20">
							TARIFA ÚNICA (CAJA COMPLETA)
						</Badge>
					{/if}
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">País de Destino:</span>
					<span class="font-bold uppercase">{selectedTarifa.pais?.nombre} ({selectedTarifa.pais?.codigo_iso2})</span>
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Zona Logística:</span>
					<span class="font-bold uppercase">{selectedTarifa.zona?.nombre}</span>
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">
						{selectedTarifa.tipo_calculo === 'peso' || selectedTarifa.es_por_peso ? 'Precio Unitario ($ / LB):' : 'Precio Fijo por Caja:'}
					</span>
					<span class="font-mono font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
						${selectedTarifa.precio.toFixed(2)}
						{#if selectedTarifa.tipo_calculo === 'peso' || selectedTarifa.es_por_peso}
							<span class="text-xs text-muted-foreground font-normal">/ lb</span>
						{/if}
					</span>
				</div>

				{#if selectedTarifa.descripcion}
					<div class="border-b pb-2">
						<span class="text-xs text-muted-foreground block">Observaciones:</span>
						<span class="uppercase text-xs font-medium">{selectedTarifa.descripcion}</span>
					</div>
				{/if}

				<div class="text-xs text-muted-foreground pt-1">
					<span>Registrado el: {new Date(selectedTarifa.created_at).toLocaleString('es-ES')}</span>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
