<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import {
		Boxes,
		Plus,
		Search,
		Edit,
		CheckCircle2,
		Power
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { Articulo } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const articulos = $derived(data.articulos || []);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search || '';
	});

	let isModalOpen = $state(false);
	let editingArticulo = $state<Articulo | null>(null);

	let formNombre = $state('');

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		goto(`?${params.toString()}`);
	}

	function openCreateModal() {
		editingArticulo = null;
		formNombre = '';
		isModalOpen = true;
	}

	function openEditModal(a: Articulo) {
		editingArticulo = a;
		formNombre = a.nombre;
		isModalOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createArticulo'
					? 'Artículo creado exitosamente'
					: form.action === 'updateArticulo'
						? 'Artículo actualizado exitosamente'
						: 'Estado del artículo actualizado'
			);
			isModalOpen = false;
		} else if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Maestro de Artículos | Administración Logística</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
	<!-- Encabezado Principal -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<Boxes class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Maestro de Artículos</h1>
				<p class="text-xs text-muted-foreground">
					Gestión del catálogo maestro de artículos predefinidos para la selección e ingreso en ventas de envíos.
				</p>
			</div>
		</div>

		<Button onclick={openCreateModal} class="gap-2">
			<Plus class="w-4 h-4" /> Nuevo Artículo
		</Button>
	</div>

	<!-- Filtro de Búsqueda -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex items-center gap-3">
				<div class="relative flex-1">
					<Search class="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
					<Input
						placeholder="Buscar artículo por nombre..."
						bind:value={searchInput}
						class="pl-9 text-xs uppercase"
					/>
				</div>
				<Button type="submit" variant="secondary" size="sm" class="text-xs">
					Buscar
				</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Tabla de Artículos -->
	<Card>
		<CardContent class="p-0 overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase">
						<th class="p-3">Nombre del Artículo</th>
						<th class="p-3">Estado</th>
						<th class="p-3 text-right">Acciones</th>
					</tr>
				</thead>
				<tbody class="divide-y text-xs">
					{#if articulos.length === 0}
						<tr>
							<td colspan="3" class="p-6 text-center text-muted-foreground">
								No se encontraron artículos registrados en el sistema.
							</td>
						</tr>
					{:else}
						{#each articulos as a (a.id)}
							<tr class={`hover:bg-muted/40 transition-colors ${!a.activo ? 'opacity-60 bg-muted/20' : ''}`}>
								<td class="p-3 font-semibold uppercase">{a.nombre}</td>
								<td class="p-3">
									<Badge
										variant={a.activo ? 'default' : 'outline'}
										class="uppercase text-[10px] font-bold"
									>
										{a.activo ? 'ACTIVO' : 'INACTIVO'}
									</Badge>
								</td>
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<Button variant="ghost" size="icon" onclick={() => openEditModal(a)} title="Editar Artículo">
											<Edit class="w-4 h-4" />
										</Button>
										<form method="POST" action="?/toggleActiveArticulo" use:enhance class="inline">
											<input type="hidden" name="id" value={a.id} />
											<input type="hidden" name="activo" value={String(a.activo)} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												class={a.activo ? 'text-amber-600 hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'}
												title={a.activo ? 'Desactivar Artículo (Soft Delete)' : 'Activar Artículo'}
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
		</CardContent>
	</Card>
</div>

<!-- MODAL CREAR / EDITAR ARTÍCULO -->
<Dialog bind:open={isModalOpen}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="text-base font-bold flex items-center gap-2">
				<Boxes class="w-5 h-5 text-primary" />
				{editingArticulo ? 'Editar Artículo' : 'Nuevo Artículo'}
			</DialogTitle>
		</DialogHeader>

		<form
			method="POST"
			action={editingArticulo ? '?/updateArticulo' : '?/createArticulo'}
			use:enhance
			class="space-y-4 pt-2"
		>
			{#if editingArticulo}
				<input type="hidden" name="id" value={editingArticulo.id} />
			{/if}

			<div class="space-y-1.5">
				<Label for="a_nombre" class="text-xs font-bold">Nombre del Artículo *</Label>
				<Input
					id="a_nombre"
					name="nombre"
					required
					bind:value={formNombre}
					placeholder="EJ: ROPA PERSONAL / CALZADO"
					class="text-xs uppercase font-medium"
				/>
			</div>

			<DialogFooter class="pt-4">
				<Button type="button" variant="outline" onclick={() => (isModalOpen = false)} class="text-xs">
					Cancelar
				</Button>
				<Button type="submit" class="text-xs gap-1.5 font-bold">
					<CheckCircle2 class="w-4 h-4" />
					{editingArticulo ? 'Guardar Cambios' : 'Crear Artículo'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
