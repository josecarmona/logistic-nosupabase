<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { toast } from 'svelte-sonner';
	import { Search, Plus, Edit, Eye, Power, Tag } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { TipoAdquisicion } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const adquisiciones = $derived(data.adquisiciones || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search;
	});

	// Modales
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDetailOpen = $state(false);
	let selectedAdquisicion = $state<TipoAdquisicion | null>(null);

	// Estado formulario
	let formId = $state<number | null>(null);
	let formNombre = $state('');

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'create'
					? 'Tipo de adquisición creado'
					: form.action === 'update'
						? 'Tipo de adquisición actualizado'
						: 'Estado actualizado'
			);
			isCreateOpen = false;
			isEditOpen = false;
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
		formId = null;
		formNombre = '';
		isCreateOpen = true;
	}

	function openEdit(ad: TipoAdquisicion) {
		selectedAdquisicion = ad;
		formId = ad.id;
		formNombre = ad.nombre;
		isEditOpen = true;
	}

	function openDetail(ad: TipoAdquisicion) {
		selectedAdquisicion = ad;
		isDetailOpen = true;
	}
</script>

<svelte:head>
	<title>CRUD Tipos de Adquisición - Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Controles superiores -->
	<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
		<form onsubmit={handleSearch} class="flex w-full sm:w-auto items-center gap-2">
			<div class="relative w-full sm:w-80">
				<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por nombre de tipo…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>

		<Button onclick={openCreate} class="w-full sm:w-auto gap-2">
			<Plus class="w-4 h-4" /> Nuevo Tipo de Adquisición
		</Button>
	</div>

	<!-- Tabla de Tipos de Adquisición -->
	<Card>
		<CardHeader class="pb-2">
			<CardTitle class="text-lg font-bold">Maestro de Tipos de Adquisición</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nombre del Canal / Tipo</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if adquisiciones.length === 0}
							<tr>
								<td colspan="3" class="p-6 text-center text-muted-foreground">
									No se encontraron tipos de adquisición registrados.
								</td>
							</tr>
						{:else}
							{#each adquisiciones as ad}
								<tr class="hover:bg-muted/40 transition-colors {ad.activo ? '' : 'text-muted-foreground opacity-60 bg-muted/20'}">
									<td class="p-3 font-semibold uppercase flex items-center gap-2">
										<Tag class="w-4 h-4 text-muted-foreground" />
										<span>{ad.nombre}</span>
									</td>
									<td class="p-3">
										<StatusBadge activo={ad.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Detalle" onclick={() => openDetail(ad)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Tipo" onclick={() => openEdit(ad)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActive" use:enhance class="inline">
												<input type="hidden" name="id" value={ad.id} />
												<input type="hidden" name="activo" value={String(ad.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={ad.activo ? "text-destructive hover:bg-destructive/10" : "text-emerald-600"}
													title={ad.activo ? "Desactivar tipo (Soft Delete)" : "Activar tipo"}
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

			<PaginationControl
				{currentPage}
				{totalPages}
				{totalItems}
				onPageChange={handlePageChange}
			/>
		</CardContent>
	</Card>
</div>

<!-- Modal: Crear Tipo de Adquisición -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Crear Tipo de Adquisición</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/create" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="adq_nombre">Nombre del Canal / Tipo *</Label>
					<InputUppercase
						id="adq_nombre"
						name="nombre"
						placeholder="ej. FACEBOOK, WHATSAPP, WEB"
						required
						bind:value={formNombre}
					/>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Tipo</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Tipo de Adquisición -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Editar Tipo de Adquisición</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/update" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<Label for="edit_adq_nombre">Nombre del Canal / Tipo *</Label>
					<InputUppercase
						id="edit_adq_nombre"
						name="nombre"
						required
						bind:value={formNombre}
					/>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Cambios</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Tipo de Adquisición -->
{#if isDetailOpen && selectedAdquisicion}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Detalle del Tipo de Adquisición</DialogTitle>
			</DialogHeader>

			<div class="space-y-3 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedAdquisicion.activo} />
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Nombre del Tipo / Canal</span>
					<span class="font-bold text-base uppercase">{selectedAdquisicion.nombre}</span>
				</div>

				<div class="text-xs text-muted-foreground">
					<span>ID Registro: {selectedAdquisicion.id}</span>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
