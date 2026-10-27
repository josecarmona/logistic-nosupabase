<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { toast } from 'svelte-sonner';
	import { Search, Plus, Edit, Eye, Power, Tag, Sparkles, Package } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { TipoTarifa } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tiposTarifa = $derived(data.tiposTarifa || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search;
	});

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createTipoTarifa'
					? 'Tipo de tarifa creado exitosamente'
					: form.action === 'updateTipoTarifa'
						? 'Tipo de tarifa actualizado exitosamente'
						: 'Estado de tipo de tarifa actualizado'
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
	let selectedTipo = $state<TipoTarifa | null>(null);

	// Estado del formulario
	let formId = $state('');
	let formNombre = $state('');
	let formPromocion = $state(false);
	let formNumeroProductos = $state(1);

	function handleSearch(e: Event) {
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
		formNombre = '';
		formPromocion = false;
		formNumeroProductos = 1;
		isCreateOpen = true;
	}

	function openEdit(t: TipoTarifa) {
		selectedTipo = t;
		formId = String(t.id);
		formNombre = t.nombre;
		formPromocion = t.promocion;
		formNumeroProductos = t.numero_productos || 1;
		isEditOpen = true;
	}

	function openDetail(t: TipoTarifa) {
		selectedTipo = t;
		isDetailOpen = true;
	}
</script>

<svelte:head>
	<title>Maestro de Tipos de Tarifa | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
	<!-- Encabezado de la página -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<Tag class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Maestro de Tipos de Tarifa</h1>
				<p class="text-xs text-muted-foreground">
					Configuración de categorías de tarifas, promociones y volúmenes de productos.
				</p>
			</div>
		</div>

		<Button onclick={openCreate} class="gap-2">
			<Plus class="w-4 h-4" /> Nuevo Tipo de Tarifa
		</Button>
	</div>

	<!-- Controles de Búsqueda y Tabla -->
	<Card>
		<CardHeader class="pb-3">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<CardTitle class="text-base font-semibold">Listado de Tipos de Tarifa</CardTitle>
				<form onsubmit={handleSearch} class="flex w-full sm:w-80 items-center gap-2">
					<div class="relative w-full">
						<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Buscar tipo de tarifa..."
							class="pl-8"
							bind:value={searchInput}
						/>
					</div>
					<Button type="submit" variant="secondary" size="sm">Buscar</Button>
				</form>
			</div>
		</CardHeader>
		<CardContent class="p-0 sm:p-6 pt-0">
			<!-- Vista Móvil (Tarjetas) -->
			<div class="block sm:hidden divide-y">
				{#if tiposTarifa.length === 0}
					<div class="p-6 text-center text-sm text-muted-foreground">
						No se encontraron tipos de tarifa registrados.
					</div>
				{:else}
					{#each tiposTarifa as t (t.id)}
						<div class={`p-4 space-y-3 ${!t.activo ? 'opacity-60 bg-muted/20' : ''}`}>
							<div class="flex items-start justify-between gap-2">
								<div>
									<h3 class="font-bold uppercase text-sm">{t.nombre}</h3>
									<div class="flex items-center gap-1.5 mt-1 flex-wrap">
										{#if t.promocion}
											<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
												<Sparkles class="w-3 h-3" /> PROMOCIÓN
											</Badge>
										{:else}
											<Badge variant="secondary" class="text-[10px] font-medium text-muted-foreground">
												ESTÁNDAR
											</Badge>
										{/if}
										<Badge variant="outline" class="text-[10px] font-mono text-primary bg-primary/5">
											📦 {t.numero_productos} PROD.
										</Badge>
									</div>
								</div>
								<StatusBadge activo={t.activo} />
							</div>

							<div class="flex items-center justify-end gap-1 border-t pt-2 text-xs">
								<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openDetail(t)}>
									<Eye class="w-3.5 h-3.5" />
								</Button>
								<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openEdit(t)}>
									<Edit class="w-3.5 h-3.5" />
								</Button>
								<form method="POST" action="?/toggleActiveTipoTarifa" use:enhance class="inline">
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

			<!-- Vista Escritorio (Tabla) -->
			<div class="hidden sm:block border rounded-lg overflow-hidden">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nombre del Tipo</th>
							<th class="p-3">Promoción</th>
							<th class="p-3 text-center">Nº Productos Involucrados</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if tiposTarifa.length === 0}
							<tr>
								<td colspan="5" class="p-6 text-center text-muted-foreground">
									No se encontraron tipos de tarifa registrados.
								</td>
							</tr>
						{:else}
							{#each tiposTarifa as t (t.id)}
								<tr class={`hover:bg-muted/40 transition-colors ${!t.activo ? 'text-muted-foreground opacity-60 bg-muted/20' : ''}`}>
									<td class="p-3 font-semibold uppercase">{t.nombre}</td>
									<td class="p-3">
										{#if t.promocion}
											<Badge variant="outline" class="text-xs font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
												<Sparkles class="w-3.5 h-3.5" /> PROMOCIÓN
											</Badge>
										{:else}
											<Badge variant="secondary" class="text-xs font-medium text-muted-foreground">
												NO (REGULAR)
											</Badge>
										{/if}
									</td>
									<td class="p-3 text-center font-mono font-bold">
										<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5">
											{t.numero_productos} {t.numero_productos === 1 ? 'Producto' : 'Productos'}
										</Badge>
									</td>
									<td class="p-3">
										<StatusBadge activo={t.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Detalle" onclick={() => openDetail(t)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Tipo" onclick={() => openEdit(t)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveTipoTarifa" use:enhance class="inline">
												<input type="hidden" name="id" value={t.id} />
												<input type="hidden" name="activo" value={String(t.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={t.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={t.activo ? 'Desactivar tipo' : 'Activar tipo'}
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

<!-- Modal: Crear Tipo de Tarifa -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Tag class="w-5 h-5 text-primary" /> Crear Nuevo Tipo de Tarifa
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createTipoTarifa" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="c_nombre">Nombre del Tipo de Tarifa *</Label>
					<InputUppercase id="c_nombre" name="nombre" required bind:value={formNombre} placeholder="EJ. PROMOCIÓN BLACK FRIDAY" />
				</div>

				<div class="space-y-2">
					<Label for="c_num_prod">Número de Productos Involucrados *</Label>
					<Input id="c_num_prod" name="numero_productos" type="number" min="1" step="1" required bind:value={formNumeroProductos} />
					<p class="text-[11px] text-muted-foreground">
						Permite aplicar el cálculo de la tarifa a 1 o varios productos en volumen (por defecto 1).
					</p>
				</div>

				<div class="p-3 border rounded-lg bg-card flex items-center justify-between gap-3">
					<div class="space-y-0.5">
						<Label for="c_promocion" class="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
							<Sparkles class="w-4 h-4 text-amber-500" /> ¿Es Promoción?
						</Label>
						<p class="text-[11px] text-muted-foreground">
							{formPromocion ? 'El tipo de tarifa se activará con la bandera de Promoción.' : 'Tarifa en categoría regular / estándar.'}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input type="hidden" name="promocion" value={formPromocion ? 'true' : 'false'} />
						<Checkbox id="c_promocion" bind:checked={formPromocion} />
					</div>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Tipo</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Tipo de Tarifa -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Tipo de Tarifa
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateTipoTarifa" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<Label for="edit_nombre">Nombre del Tipo de Tarifa *</Label>
					<InputUppercase id="edit_nombre" name="nombre" required bind:value={formNombre} />
				</div>

				<div class="space-y-2">
					<Label for="edit_num_prod">Número de Productos Involucrados *</Label>
					<Input id="edit_num_prod" name="numero_productos" type="number" min="1" step="1" required bind:value={formNumeroProductos} />
				</div>

				<div class="p-3 border rounded-lg bg-card flex items-center justify-between gap-3">
					<div class="space-y-0.5">
						<Label for="edit_promocion" class="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
							<Sparkles class="w-4 h-4 text-amber-500" /> ¿Es Promoción?
						</Label>
						<p class="text-[11px] text-muted-foreground">
							{formPromocion ? 'El tipo de tarifa se activará con la bandera de Promoción.' : 'Tarifa en categoría regular / estándar.'}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input type="hidden" name="promocion" value={formPromocion ? 'true' : 'false'} />
						<Checkbox id="edit_promocion" bind:checked={formPromocion} />
					</div>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Actualizar Tipo</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Tipo de Tarifa -->
{#if isDetailOpen && selectedTipo}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Detalle del Tipo de Tarifa</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedTipo.activo} />
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Nombre:</span>
					<span class="font-bold uppercase text-base">{selectedTipo.nombre}</span>
				</div>

				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-xs text-muted-foreground">Categoría Promocional:</span>
					{#if selectedTipo.promocion}
						<Badge variant="outline" class="text-xs font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
							<Sparkles class="w-3.5 h-3.5" /> PROMOCIONAL
						</Badge>
					{:else}
						<Badge variant="secondary" class="text-xs font-medium text-muted-foreground">
							REGULAR / ESTÁNDAR
						</Badge>
					{/if}
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Número de Productos Involucrados:</span>
					<Badge variant="outline" class="font-mono text-sm font-bold text-primary bg-primary/5 mt-1">
						📦 {selectedTipo.numero_productos} {selectedTipo.numero_productos === 1 ? 'Producto' : 'Productos'}
					</Badge>
				</div>

				<div class="text-xs text-muted-foreground pt-1">
					<span>Creado el: {new Date(selectedTipo.created_at).toLocaleString('es-ES')}</span>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
