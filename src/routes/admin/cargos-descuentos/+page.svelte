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
	import { toast } from 'svelte-sonner';
	import { Sparkles, Plus, Edit, Power } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { CargoDescuento } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const cargosDescuentos = $derived(data.cargosDescuentos || []);
	let searchInput = $state('');

	$effect(() => {
		searchInput = data.search;
	});

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createCargoDescuento'
					? 'Cargo/Descuento creado exitosamente'
					: form.action === 'updateCargoDescuento'
						? 'Cargo/Descuento actualizado'
						: 'Estado actualizado'
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
	let selectedItem = $state<CargoDescuento | null>(null);

	let formId = $state('');
	let formNombre = $state('');
	let formTipo = $state<'cargo' | 'descuento'>('cargo');
	let formMontoDefecto = $state(0);
	let formEsPorcentaje = $state(false);

	function openCreate() {
		formId = '';
		formNombre = '';
		formTipo = 'cargo';
		formMontoDefecto = 0;
		formEsPorcentaje = false;
		isCreateOpen = true;
	}

	function openEdit(item: CargoDescuento) {
		selectedItem = item;
		formId = String(item.id);
		formNombre = item.nombre;
		formTipo = item.tipo;
		formMontoDefecto = item.monto_defecto;
		formEsPorcentaje = item.es_porcentaje;
		isEditOpen = true;
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Maestro de Cargos y Descuentos | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<Sparkles class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Maestro de Cargos y Descuentos</h1>
				<p class="text-xs text-muted-foreground">
					Catálogo de recargos adicionales y bonificaciones aplicables en el módulo de ventas.
				</p>
			</div>
		</div>

		<Button onclick={openCreate} class="gap-2">
			<Plus class="w-4 h-4" /> Nuevo Cargo / Descuento
		</Button>
	</div>

	<!-- Búsqueda -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex gap-2">
				<Input
					placeholder="BUSCAR CARGO O DESCUENTO..."
					bind:value={searchInput}
					class="uppercase text-xs"
				/>
				<Button type="submit" variant="secondary">Buscar</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Tabla -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base font-semibold">Cargos Adicionales y Descuentos Registrados</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6 pt-0">
			<div class="border rounded-lg overflow-hidden">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nombre</th>
							<th class="p-3">Clasificación</th>
							<th class="p-3 text-right">Monto Defecto</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if cargosDescuentos.length === 0}
							<tr>
								<td colspan="5" class="p-6 text-center text-muted-foreground">
									No se encontraron cargos ni descuentos registrados.
								</td>
							</tr>
						{:else}
							{#each cargosDescuentos as item (item.id)}
								<tr class={`hover:bg-muted/40 transition-colors ${!item.activo ? 'opacity-60 bg-muted/20' : ''}`}>
									<td class="p-3 font-bold uppercase text-xs">
										{item.nombre}
									</td>
									<td class="p-3">
										<div class="flex items-center gap-1.5 flex-wrap">
											<Badge variant={item.tipo === 'cargo' ? 'default' : 'destructive'} class="text-[10px] uppercase font-bold">
												{item.tipo === 'cargo' ? '+ CARGO' : '- DESCUENTO'}
											</Badge>
											{#if item.es_porcentaje}
												<Badge variant="outline" class="text-[9px] font-bold text-indigo-600 border-indigo-400/40 bg-indigo-500/10">
													% DEL BASE
												</Badge>
											{:else}
												<Badge variant="secondary" class="text-[9px] font-medium text-muted-foreground">
													$ FIJO
												</Badge>
											{/if}
										</div>
									</td>
									<td class="p-3 text-right font-mono font-bold text-sm">
										{#if item.es_porcentaje}
											<span class="text-indigo-600 dark:text-indigo-400 font-extrabold">{item.monto_defecto}%</span>
										{:else}
											${item.monto_defecto.toFixed(2)}
										{/if}
									</td>
									<td class="p-3">
										<StatusBadge activo={item.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Editar" onclick={() => openEdit(item)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveCargoDescuento" use:enhance class="inline">
												<input type="hidden" name="id" value={item.id} />
												<input type="hidden" name="activo" value={String(item.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={item.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={item.activo ? 'Desactivar' : 'Activar'}
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
		</CardContent>
	</Card>
</div>

<!-- Modal Crear -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Sparkles class="w-5 h-5 text-primary" /> Registrar Cargo o Descuento
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createCargoDescuento" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="c_nombre">Nombre del Concepto *</Label>
					<InputUppercase id="c_nombre" name="nombre" required bind:value={formNombre} placeholder="EJ. EMBALAJE ESPECIAL" />
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="c_tipo">Tipo *</Label>
						<select id="c_tipo" name="tipo" bind:value={formTipo} class="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm uppercase">
							<option value="cargo">CARGO (+)</option>
							<option value="descuento">DESCUENTO (-)</option>
						</select>
					</div>

					<div class="space-y-2">
						<Label for="c_modalidad">Modalidad *</Label>
						<select
							id="c_modalidad"
							name="es_porcentaje"
							value={formEsPorcentaje ? 'true' : 'false'}
							onchange={(e) => (formEsPorcentaje = e.currentTarget.value === 'true')}
							class="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm"
						>
							<option value="false">Monto Fijo ($)</option>
							<option value="true">Porcentaje (% del base)</option>
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="c_monto">{formEsPorcentaje ? 'Porcentaje sobre Valor Base (%) *' : 'Monto Fijo por Defecto ($) *'}</Label>
					<Input id="c_monto" name="monto_defecto" type="number" step="0.01" min="0" required bind:value={formMontoDefecto} />
					<p class="text-[11px] text-muted-foreground">
						{formEsPorcentaje ? 'Este porcentaje se aplicará directamente sobre el valor base de la venta.' : 'Monto fijo en USD a sumar o restar.'}
					</p>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal Editar -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Cargo o Descuento
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateCargoDescuento" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<Label for="edit_nombre">Nombre del Concepto *</Label>
					<InputUppercase id="edit_nombre" name="nombre" required bind:value={formNombre} />
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-2">
						<Label for="edit_tipo">Tipo *</Label>
						<select id="edit_tipo" name="tipo" bind:value={formTipo} class="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm uppercase">
							<option value="cargo">CARGO (+)</option>
							<option value="descuento">DESCUENTO (-)</option>
						</select>
					</div>

					<div class="space-y-2">
						<Label for="edit_modalidad">Modalidad *</Label>
						<select
							id="edit_modalidad"
							name="es_porcentaje"
							value={formEsPorcentaje ? 'true' : 'false'}
							onchange={(e) => (formEsPorcentaje = e.currentTarget.value === 'true')}
							class="w-full h-10 px-3 py-2 rounded-md border bg-background text-sm"
						>
							<option value="false">Monto Fijo ($)</option>
							<option value="true">Porcentaje (% del base)</option>
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="edit_monto">{formEsPorcentaje ? 'Porcentaje sobre Valor Base (%) *' : 'Monto Fijo por Defecto ($) *'}</Label>
					<Input id="edit_monto" name="monto_defecto" type="number" step="0.01" min="0" required bind:value={formMontoDefecto} />
					<p class="text-[11px] text-muted-foreground">
						{formEsPorcentaje ? 'Este porcentaje se aplicará directamente sobre el valor base de la venta.' : 'Monto fijo en USD a sumar o restar.'}
					</p>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Actualizar</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
