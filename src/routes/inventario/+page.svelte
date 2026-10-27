<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import {
		Boxes,
		Package,
		Plus,
		Search,
		TrendingUp,
		TrendingDown,
		AlertTriangle,
		AlertOctagon,
		SlidersHorizontal,
		RotateCcw,
		ArrowUpRight,
		ArrowDownRight,
		History,
		FileText,
		CheckCircle2,
		Layers
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { ProductoWithRelations } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const productos = $derived(data.productos || []);
	const allProductos = $derived(data.allProductos || []);
	const movimientos = $derived(data.movimientos || []);
	const kpis = $derived(data.kpis);
	const isAdmin = $derived(data.isAdmin || false);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search || '';
	});

	let activeTab = $state<'existencias' | 'kardex'>('existencias');

	// Modales
	let isAddStockOpen = $state(false);
	let isAdjustStockOpen = $state(false);

	// Formulario Adicionar Stock
	let addProductoId = $state('');
	let addCantidad = $state<number | string>('');
	let addReferencia = $state('');
	let addMotivo = $state('');

	// Formulario Ajustar Stock
	let adjProductoId = $state('');
	let adjNuevoStock = $state<number | string>('');
	let adjMotivo = $state('');

	const selectedAddProduct = $derived(
		allProductos.find((p) => String(p.id) === String(addProductoId)) || null
	);

	const selectedAdjProduct = $derived(
		allProductos.find((p) => String(p.id) === String(adjProductoId)) || null
	);

	$effect(() => {
		if (form?.success) {
			toast.success('Operación exitosa', { description: form.message });
			isAddStockOpen = false;
			isAdjustStockOpen = false;
			addCantidad = '';
			addReferencia = '';
			addMotivo = '';
			adjNuevoStock = '';
			adjMotivo = '';
		} else if (form?.message) {
			toast.error('Error al actualizar inventario', { description: form.message });
		}
	});

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const params = new URLSearchParams(window.location.search);
		if (searchInput) params.set('search', searchInput);
		else params.delete('search');
		goto(`?${params.toString()}`);
	}

	function setFiltroStock(filtro: string) {
		const params = new URLSearchParams(window.location.search);
		if (filtro === 'todos') params.delete('filtro_stock');
		else params.set('filtro_stock', filtro);
		goto(`?${params.toString()}`);
	}

	function openAddStock(prod?: ProductoWithRelations) {
		if (prod) {
			addProductoId = String(prod.id);
		} else if (allProductos.length > 0 && !addProductoId) {
			addProductoId = String(allProductos[0].id);
		}
		addCantidad = '';
		addReferencia = '';
		addMotivo = '';
		isAddStockOpen = true;
	}

	function openAdjustStock(prod?: ProductoWithRelations) {
		if (prod) {
			adjProductoId = String(prod.id);
			adjNuevoStock = prod.stock ?? 0;
		} else if (allProductos.length > 0 && !adjProductoId) {
			adjProductoId = String(allProductos[0].id);
			adjNuevoStock = allProductos[0].stock ?? 0;
		}
		adjMotivo = '';
		isAdjustStockOpen = true;
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		return d.toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Control de Inventario | Gestión Logística</title>
</svelte:head>

<div class="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
	<!-- Encabezado Principal y Acciones -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
		<div>
			<div class="flex items-center gap-2">
				<div class="p-2 rounded-xl bg-primary/10 text-primary">
					<Boxes class="w-6 h-6" />
				</div>
				<div>
					<h1 class="text-2xl font-black tracking-tight text-foreground">
						Control de Inventario
					</h1>
					<p class="text-xs sm:text-sm text-muted-foreground">
						Supervisión de existencias físicas, ingresos de stock y kárdex de movimientos.
					</p>
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Button
				variant="outline"
				class="gap-1.5 flex-1 sm:flex-none border-primary/30 hover:bg-primary/5 text-primary text-xs"
				onclick={() => openAdjustStock()}
			>
				<SlidersHorizontal class="w-4 h-4" />
				<span>Ajustar Stock</span>
			</Button>

			<Button
				class="gap-1.5 flex-1 sm:flex-none text-xs font-bold shadow-sm"
				onclick={() => openAddStock()}
			>
				<Plus class="w-4 h-4" />
				<span>+ Adicionar Entrada</span>
			</Button>
		</div>
	</div>

	<!-- Tarjetas de Métricas KPI -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
		<!-- KPI 1: Total Productos -->
		<Card class="border bg-card shadow-xs">
			<CardContent class="p-4 flex items-center justify-between">
				<div>
					<p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
						Total Productos
					</p>
					<h3 class="text-2xl font-black mt-0.5">{kpis.totalProductos}</h3>
					<span class="text-[10px] text-muted-foreground">En catálogo</span>
				</div>
				<div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
					<Package class="w-5 h-5" />
				</div>
			</CardContent>
		</Card>

		<!-- KPI 2: Unidades en Stock -->
		<Card class="border bg-card shadow-xs">
			<CardContent class="p-4 flex items-center justify-between">
				<div>
					<p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
						Unidades en Stock
					</p>
					<h3 class="text-2xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
						{kpis.totalUnidades}
					</h3>
					<span class="text-[10px] text-muted-foreground">Existencias totales</span>
				</div>
				<div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
					<Boxes class="w-5 h-5" />
				</div>
			</CardContent>
		</Card>

		<!-- KPI 3: Stock Crítico / Bajo -->
		<Card
			class={`border shadow-xs cursor-pointer transition-all hover:border-amber-500/50 ${
				data.filtroStock === 'bajo' ? 'ring-2 ring-amber-500 bg-amber-500/5' : 'bg-card'
			}`}
			onclick={() => setFiltroStock(data.filtroStock === 'bajo' ? 'todos' : 'bajo')}
		>
			<CardContent class="p-4 flex items-center justify-between">
				<div>
					<p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
						Stock Bajo / Mínimo
					</p>
					<h3 class="text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-400">
						{kpis.bajoStock}
					</h3>
					<span class="text-[10px] text-muted-foreground">Requieren reposición</span>
				</div>
				<div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
					<AlertTriangle class="w-5 h-5" />
				</div>
			</CardContent>
		</Card>

		<!-- KPI 4: Productos Agotados -->
		<Card
			class={`border shadow-xs cursor-pointer transition-all hover:border-destructive/50 ${
				data.filtroStock === 'agotado' ? 'ring-2 ring-destructive bg-destructive/5' : 'bg-card'
			}`}
			onclick={() => setFiltroStock(data.filtroStock === 'agotado' ? 'todos' : 'agotado')}
		>
			<CardContent class="p-4 flex items-center justify-between">
				<div>
					<p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
						Sin Existencia
					</p>
					<h3 class="text-2xl font-black mt-0.5 text-destructive">
						{kpis.agotados}
					</h3>
					<span class="text-[10px] text-muted-foreground">Stock 0 o negativo</span>
				</div>
				<div class="p-2.5 rounded-xl bg-destructive/10 text-destructive">
					<AlertOctagon class="w-5 h-5" />
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Pestañas de Navegación del Módulo -->
	<div class="flex items-center gap-2 border-b">
		<button
			type="button"
			class={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
				activeTab === 'existencias'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'
			}`}
			onclick={() => (activeTab = 'existencias')}
		>
			<Layers class="w-4 h-4" />
			<span>Existencias de Productos ({productos.length})</span>
		</button>

		<button
			type="button"
			class={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
				activeTab === 'kardex'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'
			}`}
			onclick={() => (activeTab = 'kardex')}
		>
			<History class="w-4 h-4" />
			<span>Kárdex / Movimientos Recientes ({movimientos.length})</span>
		</button>
	</div>

	<!-- Contenido Pestaña 1: Existencias de Productos -->
	{#if activeTab === 'existencias'}
		<div class="space-y-4">
			<!-- Barra de Filtros y Búsqueda -->
			<div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
				<!-- Filtro por Píldoras -->
				<div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
					<Button
						variant={data.filtroStock === 'todos' ? 'default' : 'outline'}
						size="sm"
						class="h-8 text-xs font-semibold rounded-lg"
						onclick={() => setFiltroStock('todos')}
					>
						Todos ({allProductos.length})
					</Button>
					<Button
						variant={data.filtroStock === 'bajo' ? 'default' : 'outline'}
						size="sm"
						class="h-8 text-xs font-semibold rounded-lg text-amber-600 border-amber-500/40"
						onclick={() => setFiltroStock('bajo')}
					>
						⚠️ Stock Bajo ({kpis.bajoStock})
					</Button>
					<Button
						variant={data.filtroStock === 'agotado' ? 'default' : 'outline'}
						size="sm"
						class="h-8 text-xs font-semibold rounded-lg text-destructive border-destructive/40"
						onclick={() => setFiltroStock('agotado')}
					>
						🛑 Agotados ({kpis.agotados})
					</Button>
				</div>

				<!-- Búsqueda rápida -->
				<form onsubmit={handleSearch} class="flex items-center gap-2 w-full sm:w-72">
					<div class="relative w-full">
						<Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Buscar código o nombre…"
							class="pl-8 h-9 text-xs"
							bind:value={searchInput}
						/>
					</div>
					<Button type="submit" variant="secondary" size="sm" class="h-9 px-3 text-xs">
						Buscar
					</Button>
				</form>
			</div>

			<!-- Tabla de Existencias (Escritorio) -->
			<div class="hidden md:block border rounded-lg overflow-hidden bg-card shadow-xs">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-muted/50 uppercase font-semibold text-muted-foreground tracking-wider border-b">
							<tr>
								<th class="p-3">Código</th>
								<th class="p-3">Descripción</th>
								<th class="p-3">Tipo</th>
								<th class="p-3 text-right">Costo Unit.</th>
								<th class="p-3 text-right">Stock Actual</th>
								<th class="p-3 text-right">Inv. Mínimo</th>
								<th class="p-3">Unidad</th>
								<th class="p-3 text-center">Estado Stock</th>
								<th class="p-3 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#if productos.length === 0}
								<tr>
									<td colspan="9" class="p-8 text-center text-muted-foreground">
										No se encontraron productos con los filtros seleccionados.
									</td>
								</tr>
							{:else}
								{#each productos as p (p.id)}
									<tr class="hover:bg-muted/40 transition-colors">
										<td class="p-3 font-mono font-bold">
											<Badge variant="outline" class="font-mono text-xs bg-primary/5 text-primary border-primary/20">
												{p.codigo}
											</Badge>
										</td>
										<td class="p-3 font-semibold uppercase">
											{p.descripcion}
										</td>
										<td class="p-3">
											<Badge variant="secondary" class="uppercase text-[11px] font-semibold">
												{p.tipo_producto?.nombre || 'S/N'}
											</Badge>
										</td>
										<td class="p-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
											${Number(p.costo || 0).toFixed(2)}
										</td>
										<td class="p-3 text-right font-mono text-sm font-black">
											{#if p.controla_inventario}
												<span
													class={`px-2 py-0.5 rounded-md ${
														(p.stock ?? 0) <= 0
															? 'bg-destructive/15 text-destructive'
															: (p.stock ?? 0) <= p.inventario_minimo
																? 'bg-amber-500/15 text-amber-600'
																: 'bg-emerald-500/15 text-emerald-600'
													}`}
												>
													{p.stock ?? 0}
												</span>
											{:else}
												<span class="text-muted-foreground italic text-xs">No controla</span>
											{/if}
										</td>
										<td class="p-3 text-right font-mono font-medium text-muted-foreground">
											{p.inventario_minimo || 0}
										</td>
										<td class="p-3 uppercase text-muted-foreground">
											{p.unidad_medida?.codigo || '-'}
										</td>
										<td class="p-3 text-center">
											{#if !p.controla_inventario}
												<Badge variant="outline" class="text-[10px] text-muted-foreground">
													Libre
												</Badge>
											{:else if (p.stock ?? 0) <= 0}
												<Badge variant="destructive" class="text-[10px] font-bold">
													AGOTADO
												</Badge>
											{:else if (p.stock ?? 0) <= p.inventario_minimo}
												<Badge class="text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
													STOCK BAJO
												</Badge>
											{:else}
												<Badge class="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
													DISPONIBLE
												</Badge>
											{/if}
										</td>
										<td class="p-3 text-right">
											<div class="flex items-center justify-end gap-1.5">
												<Button
													size="sm"
													variant="outline"
													class="h-7 px-2 text-[11px] gap-1 font-bold text-primary border-primary/30 hover:bg-primary/5"
													onclick={() => openAddStock(p)}
													title="Adicionar entrada de stock"
												>
													<Plus class="w-3 h-3" />
													<span>+ Entrada</span>
												</Button>
												<Button
													size="sm"
													variant="ghost"
													class="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
													onclick={() => openAdjustStock(p)}
													title="Ajustar stock físico"
												>
													Ajustar
												</Button>
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Vista Móvil (Tarjetas de Productos) -->
			<div class="grid grid-cols-1 gap-3 md:hidden">
				{#each productos as p (p.id)}
					<Card class="border shadow-xs bg-card p-3 space-y-2">
						<div class="flex items-start justify-between gap-2">
							<div>
								<span class="font-mono text-xs font-bold text-primary">{p.codigo}</span>
								<h4 class="font-bold uppercase text-xs text-foreground mt-0.5">{p.descripcion}</h4>
								<span class="text-[10px] text-muted-foreground uppercase">{p.tipo_producto?.nombre || ''}</span>
							</div>
							<div>
								{#if !p.controla_inventario}
									<Badge variant="outline" class="text-[10px]">Sin Control</Badge>
								{:else if (p.stock ?? 0) <= 0}
									<Badge variant="destructive" class="text-[10px]">Agotado</Badge>
								{:else if (p.stock ?? 0) <= p.inventario_minimo}
									<Badge class="text-[10px] bg-amber-500/15 text-amber-600">Stock Bajo</Badge>
								{:else}
									<Badge class="text-[10px] bg-emerald-500/15 text-emerald-600">Disponible</Badge>
								{/if}
							</div>
						</div>

						<div class="grid grid-cols-3 gap-2 border-t pt-2 text-[11px]">
							<div>
								<span class="text-[10px] text-muted-foreground block">Stock Actual:</span>
								<span class="font-black font-mono text-sm text-foreground">{p.stock ?? 0}</span>
							</div>
							<div>
								<span class="text-[10px] text-muted-foreground block">Inv. Mínimo:</span>
								<span class="font-mono text-muted-foreground">{p.inventario_minimo}</span>
							</div>
							<div>
								<span class="text-[10px] text-muted-foreground block">Costo:</span>
								<span class="font-mono font-semibold text-emerald-600">${Number(p.costo || 0).toFixed(2)}</span>
							</div>
						</div>

						<div class="flex items-center justify-end gap-2 border-t pt-2">
							<Button
								size="sm"
								variant="outline"
								class="h-7 text-xs font-bold text-primary border-primary/30"
								onclick={() => openAddStock(p)}
							>
								+ Entrada
							</Button>
							<Button
								size="sm"
								variant="ghost"
								class="h-7 text-xs"
								onclick={() => openAdjustStock(p)}
							>
								Ajustar
							</Button>
						</div>
					</Card>
				{:else}
					<div class="p-6 text-center text-muted-foreground border rounded-lg bg-card text-xs">
						No se encontraron productos.
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Contenido Pestaña 2: Kárdex / Movimientos de Inventario -->
	{#if activeTab === 'kardex'}
		<div class="space-y-4">
			<div class="border rounded-lg overflow-hidden bg-card shadow-xs">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-muted/50 uppercase font-semibold text-muted-foreground tracking-wider border-b">
							<tr>
								<th class="p-3">Fecha y Hora</th>
								<th class="p-3">Tipo Movimiento</th>
								<th class="p-3">Producto</th>
								<th class="p-3 text-right">Cantidad</th>
								<th class="p-3 text-center">Stock (Previo → Nuevo)</th>
								<th class="p-3">Referencia / Motivo</th>
								<th class="p-3">Responsable</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#if movimientos.length === 0}
								<tr>
									<td colspan="7" class="p-8 text-center text-muted-foreground">
										Aún no se registran movimientos en el historial de inventario.
									</td>
								</tr>
							{:else}
								{#each movimientos as m (m.id)}
									<tr class="hover:bg-muted/40 transition-colors">
										<td class="p-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
											{formatDate(m.created_at)}
										</td>
										<td class="p-3">
											{#if m.tipo_movimiento === 'entrada'}
												<Badge class="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 gap-1 text-[10px] font-bold">
													<ArrowUpRight class="w-3 h-3" /> ENTRADA
												</Badge>
											{:else if m.tipo_movimiento === 'salida'}
												<Badge variant="destructive" class="gap-1 text-[10px] font-bold">
													<ArrowDownRight class="w-3 h-3" /> SALIDA (VENTA)
												</Badge>
											{:else}
												<Badge class="bg-blue-500/15 text-blue-600 border border-blue-500/30 gap-1 text-[10px] font-bold">
													<RotateCcw class="w-3 h-3" /> AJUSTE
												</Badge>
											{/if}
										</td>
										<td class="p-3">
											<div class="font-bold text-foreground uppercase">
												{m.producto?.descripcion || `Producto #${m.producto_id}`}
											</div>
											<span class="font-mono text-[10px] text-muted-foreground">
												{m.producto?.codigo || ''}
											</span>
										</td>
										<td class="p-3 text-right font-mono font-bold text-sm">
											{#if m.tipo_movimiento === 'entrada'}
												<span class="text-emerald-600">+{m.cantidad}</span>
											{:else if m.tipo_movimiento === 'salida'}
												<span class="text-destructive">-{m.cantidad}</span>
											{:else}
												<span class="text-blue-600">{m.cantidad}</span>
											{/if}
										</td>
										<td class="p-3 text-center font-mono text-xs">
											<span class="text-muted-foreground">{m.stock_anterior}</span>
											<span class="mx-1 text-muted-foreground/60">→</span>
											<span class="font-bold text-foreground">{m.stock_nuevo}</span>
										</td>
										<td class="p-3 text-xs">
											<div class="font-semibold text-foreground uppercase">
												{m.referencia || '-'}
											</div>
											{#if m.motivo}
												<div class="text-[11px] text-muted-foreground italic">
													{m.motivo}
												</div>
											{/if}
										</td>
										<td class="p-3 text-[11px] text-muted-foreground">
											{m.operador?.nombre_completo || 'Sistema / Admin'}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Modal 1: Adicionar Inventario (Entrada de Stock) -->
<Dialog bind:open={isAddStockOpen}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2 text-base font-bold">
				<Plus class="w-4 h-4 text-primary" /> Adicionar Entrada de Stock
			</DialogTitle>
			<DialogDescription class="text-xs">
				Ingresa unidades al inventario de un producto y registra el movimiento de entrada.
			</DialogDescription>
		</DialogHeader>

		<form method="POST" action="?/adicionarStock" use:enhance class="space-y-4 py-2">
			<!-- Selector de Producto -->
			<div class="space-y-1.5">
				<Label for="add_prod" class="text-xs font-semibold">Producto *</Label>
				<select
					id="add_prod"
					name="producto_id"
					bind:value={addProductoId}
					required
					class="w-full h-9 px-3 rounded-md border text-xs uppercase bg-background"
				>
					<option value="">-- SELECCIONAR PRODUCTO --</option>
					{#each allProductos as p}
						<option value={String(p.id)}>
							[{p.codigo}] {p.descripcion} (Stock actual: {p.stock ?? 0})
						</option>
					{/each}
				</select>
			</div>

			<!-- Cantidad a Ingresar -->
			<div class="space-y-1.5">
				<Label for="add_cant" class="text-xs font-semibold">Cantidad a Ingresar *</Label>
				<Input
					id="add_cant"
					name="cantidad"
					type="number"
					step="0.01"
					min="0.01"
					placeholder="Ej. 10"
					required
					bind:value={addCantidad}
					class="h-9 text-xs"
				/>
				{#if selectedAddProduct}
					<span class="text-[11px] text-muted-foreground block">
						Stock proyectado: <strong class="text-emerald-600">
							{Number(selectedAddProduct.stock || 0) + (Number(addCantidad) || 0)}
						</strong> {selectedAddProduct.unidad_medida?.codigo || ''}
					</span>
				{/if}
			</div>

			<!-- Referencia (Factura / Orden de Compra / Guía) -->
			<div class="space-y-1.5">
				<Label for="add_ref" class="text-xs font-semibold">Documento de Referencia</Label>
				<InputUppercase
					id="add_ref"
					name="referencia"
					placeholder="EJ. FACTURA-1024 / COMPRA PROVEEDOR"
					bind:value={addReferencia}
					class="h-9 text-xs"
				/>
			</div>

			<!-- Motivo u Observaciones -->
			<div class="space-y-1.5">
				<Label for="add_mot" class="text-xs font-semibold">Motivo / Notas</Label>
				<InputUppercase
					id="add_mot"
					name="motivo"
					placeholder="EJ. RECEPCIÓN DE LOTE DE CAJAS"
					bind:value={addMotivo}
					class="h-9 text-xs"
				/>
			</div>

			<DialogFooter class="pt-2">
				<Button type="button" variant="outline" size="sm" onclick={() => (isAddStockOpen = false)}>
					Cancelar
				</Button>
				<Button type="submit" size="sm" class="gap-1 font-bold">
					<CheckCircle2 class="w-3.5 h-3.5" /> Registrar Entrada
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Modal 2: Ajuste de Inventario (Conteo Físico) -->
<Dialog bind:open={isAdjustStockOpen}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2 text-base font-bold">
				<SlidersHorizontal class="w-4 h-4 text-primary" /> Ajuste Físico de Stock
			</DialogTitle>
			<DialogDescription class="text-xs">
				Modifica directamente la existencia física de un producto para corregir mermas o conteos.
			</DialogDescription>
		</DialogHeader>

		<form method="POST" action="?/ajustarStock" use:enhance class="space-y-4 py-2">
			<!-- Selector de Producto -->
			<div class="space-y-1.5">
				<Label for="adj_prod" class="text-xs font-semibold">Producto *</Label>
				<select
					id="adj_prod"
					name="producto_id"
					bind:value={adjProductoId}
					required
					class="w-full h-9 px-3 rounded-md border text-xs uppercase bg-background"
				>
					<option value="">-- SELECCIONAR PRODUCTO --</option>
					{#each allProductos as p}
						<option value={String(p.id)}>
							[{p.codigo}] {p.descripcion} (Actual: {p.stock ?? 0})
						</option>
					{/each}
				</select>
			</div>

			<!-- Nuevo Stock Físico -->
			<div class="space-y-1.5">
				<Label for="adj_new" class="text-xs font-semibold">Nuevo Stock Físico *</Label>
				<Input
					id="adj_new"
					name="nuevo_stock"
					type="number"
					step="0.01"
					min="0"
					placeholder="0"
					required
					bind:value={adjNuevoStock}
					class="h-9 text-xs"
				/>
				{#if selectedAdjProduct}
					{@const diff = Number(adjNuevoStock) - Number(selectedAdjProduct.stock || 0)}
					<span class="text-[11px] text-muted-foreground block">
						Diferencia:
						<strong class={diff >= 0 ? 'text-emerald-600' : 'text-destructive'}>
							{diff >= 0 ? `+${diff}` : `${diff}`}
						</strong> {selectedAdjProduct.unidad_medida?.codigo || ''}
					</span>
				{/if}
			</div>

			<!-- Motivo del Ajuste -->
			<div class="space-y-1.5">
				<Label for="adj_mot" class="text-xs font-semibold">Motivo del Ajuste</Label>
				<InputUppercase
					id="adj_mot"
					name="motivo"
					placeholder="EJ. CONTEO FÍSICO / MERMA DE EMBALAJE"
					bind:value={adjMotivo}
					class="h-9 text-xs"
				/>
			</div>

			<DialogFooter class="pt-2">
				<Button type="button" variant="outline" size="sm" onclick={() => (isAdjustStockOpen = false)}>
					Cancelar
				</Button>
				<Button type="submit" size="sm" class="gap-1 font-bold">
					<CheckCircle2 class="w-3.5 h-3.5" /> Guardar Ajuste
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
