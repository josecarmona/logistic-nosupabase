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
	import { CreditCard, Plus, Edit, Power, Hash, CheckCircle2, XCircle, Percent } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { ConceptoPago } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const conceptos = $derived(data.conceptos || []);
	let searchInput = $state('');

	$effect(() => {
		searchInput = data.search;
	});

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createConceptoPago'
					? 'Concepto de pago registrado exitosamente'
					: form.action === 'updateConceptoPago'
						? 'Concepto de pago actualizado'
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
	let selectedConcepto = $state<ConceptoPago | null>(null);

	let formId = $state('');
	let formNombre = $state('');
	let formRequiereReferencia = $state(true);
	let formPorcentajeComision = $state(0);

	function openCreate() {
		formId = '';
		formNombre = '';
		formRequiereReferencia = true;
		formPorcentajeComision = 0;
		isCreateOpen = true;
	}

	function openEdit(c: ConceptoPago) {
		selectedConcepto = c;
		formId = String(c.id);
		formNombre = c.nombre;
		formRequiereReferencia = c.requiere_referencia;
		formPorcentajeComision = Number(c.porcentaje_comision || 0);
		isEditOpen = true;
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		goto(`?${params.toString()}`);
	}
</script>

<svelte:head>
	<title>Maestro de Conceptos de Pago | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<CreditCard class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Maestro de Conceptos de Pago</h1>
				<p class="text-xs text-muted-foreground">
					Catálogo de métodos y formas de pago habilitados para el procesamiento de ventas.
				</p>
			</div>
		</div>

		<Button onclick={openCreate} class="gap-2">
			<Plus class="w-4 h-4" /> Nuevo Concepto
		</Button>
	</div>

	<!-- Barra de Búsqueda -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex gap-2">
				<Input
					placeholder="BUSCAR CONCEPTO DE PAGO..."
					bind:value={searchInput}
					class="uppercase text-xs"
				/>
				<Button type="submit" variant="secondary">Buscar</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Tabla / Tarjetas de Conceptos de Pago -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-base font-semibold">Métodos de Pago Registrados</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6 pt-0">
			<div class="border rounded-lg overflow-hidden">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nombre del Método</th>
							<th class="p-3">Requiere Referencia (4-9 dígitos)</th>
							<th class="p-3">% Comisión Adicional</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if conceptos.length === 0}
							<tr>
								<td colspan="5" class="p-6 text-center text-muted-foreground">
									No se encontraron conceptos de pago registrados.
								</td>
							</tr>
						{:else}
							{#each conceptos as c (c.id)}
								<tr class={`hover:bg-muted/40 transition-colors ${!c.activo ? 'opacity-60 bg-muted/20' : ''}`}>
									<td class="p-3 font-bold uppercase text-xs">
										<div class="flex items-center gap-2">
											<CreditCard class="w-4 h-4 text-primary shrink-0" />
											<span>{c.nombre}</span>
										</div>
									</td>
									<td class="p-3">
										{#if c.requiere_referencia}
											<Badge variant="outline" class="text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1">
												<Hash class="w-3 h-3" /> SI (EXIGE REF. 4-9 DÍGITOS)
											</Badge>
										{:else}
											<Badge variant="outline" class="text-[10px] font-bold text-muted-foreground">
												NO REQUIERE REFERENCIA
											</Badge>
										{/if}
									</td>
									<td class="p-3">
										{#if Number(c.porcentaje_comision || 0) > 0}
											<Badge variant="outline" class="text-[10px] font-bold text-indigo-600 border-indigo-500/30 bg-indigo-500/10 gap-1">
												<Percent class="w-3 h-3" /> {Number(c.porcentaje_comision).toFixed(2)}% COMISIÓN
											</Badge>
										{:else}
											<span class="text-[10px] text-muted-foreground font-semibold">SIN COMISIÓN (0%)</span>
										{/if}
									</td>
									<td class="p-3">
										<StatusBadge activo={c.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Editar" onclick={() => openEdit(c)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveConceptoPago" use:enhance class="inline">
												<input type="hidden" name="id" value={c.id} />
												<input type="hidden" name="activo" value={String(c.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={c.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={c.activo ? 'Desactivar' : 'Activar'}
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

<!-- Modal: Crear Concepto de Pago -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<CreditCard class="w-5 h-5 text-primary" /> Registrar Nuevo Concepto de Pago
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createConceptoPago" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="c_nombre">Nombre del Método de Pago *</Label>
					<InputUppercase id="c_nombre" name="nombre" required bind:value={formNombre} placeholder="EJ. TARJETA DE CRÉDITO, PAGO MÓVIL, ZELLE" />
				</div>

				<div class="space-y-2">
					<Label for="c_comision">Porcentaje de Comisión (%)</Label>
					<Input
						id="c_comision"
						name="porcentaje_comision"
						type="number"
						step="0.01"
						min="0"
						max="100"
						bind:value={formPorcentajeComision}
						placeholder="0.00"
					/>
					<p class="text-[10px] text-muted-foreground">
						Si es mayor a 0, se aplicará automáticamente como recargo adicional al pagar con este método (ej. Tarjeta de Crédito).
					</p>
				</div>

				<div class="flex items-center gap-2 pt-2 border-t">
					<input
						type="checkbox"
						id="c_req_ref"
						name="requiere_referencia"
						value="true"
						bind:checked={formRequiereReferencia}
						class="w-4 h-4 rounded text-primary border-input focus:ring-ring"
					/>
					<Label for="c_req_ref" class="text-xs font-semibold cursor-pointer">
						¿Exige Referencia Bancaria / Operación (4 a 9 dígitos)?
					</Label>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Concepto</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Concepto de Pago -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Concepto de Pago
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateConceptoPago" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<Label for="edit_nombre">Nombre del Método de Pago *</Label>
					<InputUppercase id="edit_nombre" name="nombre" required bind:value={formNombre} />
				</div>

				<div class="space-y-2">
					<Label for="edit_comision">Porcentaje de Comisión (%)</Label>
					<Input
						id="edit_comision"
						name="porcentaje_comision"
						type="number"
						step="0.01"
						min="0"
						max="100"
						bind:value={formPorcentajeComision}
					/>
					<p class="text-[10px] text-muted-foreground">
						Si es mayor a 0, se aplicará automáticamente como recargo adicional al pagar con este método (ej. Tarjeta de Crédito).
					</p>
				</div>

				<div class="flex items-center gap-2 pt-2 border-t">
					<input
						type="checkbox"
						id="edit_req_ref"
						name="requiere_referencia"
						value="true"
						bind:checked={formRequiereReferencia}
						class="w-4 h-4 rounded text-primary border-input focus:ring-ring"
					/>
					<Label for="edit_req_ref" class="text-xs font-semibold cursor-pointer">
						¿Exige Referencia Bancaria / Operación (4 a 9 dígitos)?
					</Label>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Actualizar Concepto</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
