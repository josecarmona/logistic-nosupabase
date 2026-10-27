<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { enhance } from '$app/forms';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { toast } from 'svelte-sonner';
	import { Plus, Search, Scale, Box, Package, Edit, Power, Settings, Layers } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { UnidadMedida, GrupoUnidadMedida } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const unidades = $derived(data.unidades || []);
	const grupos = $derived(data.grupos || []);

	let searchQuery = $state('');
	let selectedGrupoFilter = $state<string>('todos');
	let currentPage = $state(1);
	const itemsPerPage = 8;

	// Estado para modales de Unidades
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);

	let formId = $state(0);
	let formCodigo = $state('');
	let formNombre = $state('');
	let formGrupoId = $state<string>('');

	// Estado para modales de Grupos
	let isGruposModalOpen = $state(false);
	let isGrupoFormOpen = $state(false);

	let grupoFormId = $state(0);
	let grupoFormCodigo = $state('');
	let grupoFormNombre = $state('');
	let grupoFormDescripcion = $state('');

	// Filtrado y paginación
	const filteredUnidades = $derived(
		unidades.filter((u) => {
			const matchesGrupo =
				selectedGrupoFilter === 'todos' || String(u.grupo_id) === String(selectedGrupoFilter);
			const q = searchQuery.trim().toUpperCase();
			const matchesQuery = !q || u.codigo.includes(q) || u.nombre.includes(q);
			return matchesGrupo && matchesQuery;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filteredUnidades.length / itemsPerPage)));
	const paginatedUnidades = $derived(
		filteredUnidades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	$effect(() => {
		if (searchQuery || selectedGrupoFilter) {
			currentPage = 1;
		}
	});

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'create'
					? 'Unidad de medida creada correctamente'
					: form.action === 'update'
						? 'Unidad de medida actualizada'
						: form.action === 'createGrupo'
							? 'Grupo de unidad de medida registrado'
							: form.action === 'updateGrupo'
								? 'Grupo de unidad de medida actualizado'
								: 'Estado actualizado correctamente'
			);
			isCreateOpen = false;
			isEditOpen = false;
			isGrupoFormOpen = false;
		} else if (form?.message) {
			toast.error('Error', { description: form.message });
		}
	});

	function openCreate() {
		formCodigo = '';
		formNombre = '';
		formGrupoId = grupos.length > 0 ? String(grupos[0].id) : '';
		isCreateOpen = true;
	}

	function openEdit(u: UnidadMedida) {
		formId = u.id;
		formCodigo = u.codigo;
		formNombre = u.nombre;
		formGrupoId = u.grupo_id ? String(u.grupo_id) : grupos.length > 0 ? String(grupos[0].id) : '';
		isEditOpen = true;
	}

	function openCreateGrupo() {
		grupoFormId = 0;
		grupoFormCodigo = '';
		grupoFormNombre = '';
		grupoFormDescripcion = '';
		isGrupoFormOpen = true;
	}

	function openEditGrupo(g: GrupoUnidadMedida) {
		grupoFormId = g.id;
		grupoFormCodigo = g.codigo;
		grupoFormNombre = g.nombre;
		grupoFormDescripcion = g.descripcion || '';
		isGrupoFormOpen = true;
	}
</script>

<svelte:head>
	<title>Maestro de Unidades de Medida - Administración</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Unidades de Medida</h1>
			<p class="text-sm text-muted-foreground">
				Catálogo de unidades de medida y sus respectivos grupos organizacionales.
			</p>
		</div>
		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Button variant="outline" onclick={() => (isGruposModalOpen = true)} class="gap-2 flex-1 sm:flex-none">
				<Settings class="w-4 h-4" /> Gestionar Grupos
			</Button>
			<Button onclick={openCreate} class="gap-2 flex-1 sm:flex-none">
				<Plus class="w-4 h-4" /> Nueva Unidad
			</Button>
		</div>
	</div>

	<!-- Filtros de búsqueda y grupo -->
	<Card>
		<CardContent class="p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
			<div class="relative flex-1">
				<Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
				<InputUppercase
					placeholder="BUSCAR POR CÓDIGO O NOMBRE…"
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>
			<div class="flex items-center gap-2">
				<Label for="grupoFilter" class="text-xs uppercase text-muted-foreground whitespace-nowrap">Filtrar por Grupo:</Label>
				<select
					id="grupoFilter"
					bind:value={selectedGrupoFilter}
					class="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="todos">TODOS LOS GRUPOS</option>
					{#each grupos as g}
						<option value={String(g.id)}>{g.nombre.toUpperCase()}</option>
					{/each}
				</select>
			</div>
		</CardContent>
	</Card>

	<!-- Listado Mobile (Cards) y Desktop (Tabla) -->
	<div class="space-y-4">
		<!-- Vista Móvil: Tarjetas apiladas -->
		<div class="grid grid-cols-1 gap-3 sm:hidden">
			{#each paginatedUnidades as u (u.id)}
				<div
					class={`p-4 rounded-lg border bg-card transition-all ${
						!u.activo ? 'bg-muted/40 text-muted-foreground opacity-60' : ''
					}`}
				>
					<div class="flex items-start justify-between">
						<div>
							<span class="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary/10 text-primary mb-1">
								{u.codigo}
							</span>
							<h3 class={`font-bold uppercase ${!u.activo ? 'line-through' : ''}`}>{u.nombre}</h3>
						</div>
						<StatusBadge activo={u.activo} />
					</div>

					<div class="mt-3 flex items-center justify-between pt-2 border-t text-xs">
						<span class="inline-flex items-center gap-1 font-semibold uppercase text-muted-foreground">
							<Layers class="w-3.5 h-3.5 text-primary" /> {u.grupo?.nombre || 'S/G'}
						</span>

						<div class="flex items-center gap-2">
							<Button variant="ghost" size="sm" onclick={() => openEdit(u)} class="h-8 px-2">
								<Edit class="w-3.5 h-3.5 mr-1" /> Editar
							</Button>

							<form method="POST" action="?/toggleActive" use:enhance class="inline">
								<input type="hidden" name="id" value={u.id} />
								<input type="hidden" name="activo" value={String(u.activo)} />
								<Button
									type="submit"
									variant="outline"
									size="sm"
									class={`h-8 px-2 ${u.activo ? 'text-destructive' : 'text-emerald-600'}`}
								>
									<Power class="w-3.5 h-3.5 mr-1" /> {u.activo ? 'Desactivar' : 'Activar'}
								</Button>
							</form>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground border rounded-lg bg-card">
					No se encontraron unidades de medida.
				</div>
			{/each}
		</div>

		<!-- Vista Escritorio: Tabla tradicional -->
		<div class="hidden sm:block border rounded-lg overflow-hidden bg-card">
			<div class="overflow-x-auto">
				<table class="w-full text-sm text-left">
					<thead class="bg-muted/50 text-xs uppercase font-semibold text-muted-foreground border-b">
						<tr>
							<th class="px-4 py-3">Código</th>
							<th class="px-4 py-3">Nombre de la Unidad</th>
							<th class="px-4 py-3">Grupo de Unidad</th>
							<th class="px-4 py-3">Estado</th>
							<th class="px-4 py-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each paginatedUnidades as u (u.id)}
							<tr class={`hover:bg-muted/30 transition-colors ${!u.activo ? 'bg-muted/30 opacity-60' : ''}`}>
								<td class="px-4 py-3 font-mono font-bold">{u.codigo}</td>
								<td class={`px-4 py-3 font-semibold uppercase ${!u.activo ? 'line-through text-muted-foreground' : ''}`}>
									{u.nombre}
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase bg-muted text-foreground">
										<Layers class="w-3.5 h-3.5 text-primary" /> {u.grupo?.nombre || 'S/G'}
									</span>
								</td>
								<td class="px-4 py-3">
									<StatusBadge activo={u.activo} />
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-2">
										<Button variant="ghost" size="sm" onclick={() => openEdit(u)} class="gap-1">
											<Edit class="w-3.5 h-3.5" /> Editar
										</Button>

										<form method="POST" action="?/toggleActive" use:enhance class="inline">
											<input type="hidden" name="id" value={u.id} />
											<input type="hidden" name="activo" value={String(u.activo)} />
											<Button
												type="submit"
												variant="outline"
												size="sm"
												class={`gap-1 ${u.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600 hover:bg-emerald-500/10'}`}
											>
												<Power class="w-3.5 h-3.5" /> {u.activo ? 'Desactivar' : 'Activar'}
											</Button>
										</form>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="text-center py-8 text-muted-foreground">
									No se encontraron unidades de medida.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<PaginationControl
			{currentPage}
			{totalPages}
			totalItems={filteredUnidades.length}
			onPageChange={(page) => (currentPage = page)}
		/>
	</div>
</div>

<!-- Modal: Crear Unidad de Medida -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Nueva Unidad de Medida</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/create" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="create_codigo">Código de la Unidad *</Label>
					<InputUppercase
						id="create_codigo"
						name="codigo"
						placeholder="EJ. KG, LB, M3, CM"
						required
						bind:value={formCodigo}
					/>
				</div>

				<div class="space-y-2">
					<Label for="create_nombre">Nombre Completo *</Label>
					<InputUppercase
						id="create_nombre"
						name="nombre"
						placeholder="EJ. KILOGRAMO"
						required
						bind:value={formNombre}
					/>
				</div>

				<div class="space-y-2">
					<Label for="create_grupo">Grupo de Unidad de Medida *</Label>
					<select
						id="create_grupo"
						name="grupo_id"
						bind:value={formGrupoId}
						required
						class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background uppercase focus:outline-none focus:ring-2 focus:ring-ring"
					>
						{#each grupos as g}
							<option value={String(g.id)}>{g.nombre.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar Unidad</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Unidad de Medida -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Editar Unidad de Medida</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/update" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<Label for="edit_codigo">Código de la Unidad *</Label>
					<InputUppercase
						id="edit_codigo"
						name="codigo"
						required
						bind:value={formCodigo}
					/>
				</div>

				<div class="space-y-2">
					<Label for="edit_nombre">Nombre Completo *</Label>
					<InputUppercase
						id="edit_nombre"
						name="nombre"
						required
						bind:value={formNombre}
					/>
				</div>

				<div class="space-y-2">
					<Label for="edit_grupo">Grupo de Unidad de Medida *</Label>
					<select
						id="edit_grupo"
						name="grupo_id"
						bind:value={formGrupoId}
						required
						class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background uppercase focus:outline-none focus:ring-2 focus:ring-ring"
					>
						{#each grupos as g}
							<option value={String(g.id)}>{g.nombre.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Actualizar Unidad</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Maestro de Grupos de Unidades de Medida -->
{#if isGruposModalOpen}
	<Dialog bind:open={isGruposModalOpen}>
		<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Settings class="w-5 h-5 text-primary" /> Maestro de Grupos de Unidades de Medida
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2">
				<div class="flex items-center justify-between">
					<p class="text-xs text-muted-foreground">
						Administra las categorías principales de unidades de medida (ej. Peso, Volumen, Cantidad, Longitud).
					</p>
					<Button size="sm" onclick={openCreateGrupo} class="gap-1 text-xs">
						<Plus class="w-3.5 h-3.5" /> Nuevo Grupo
					</Button>
				</div>

				<div class="border rounded-lg overflow-hidden bg-card">
					<table class="w-full text-left text-xs">
						<thead class="bg-muted/50 font-semibold uppercase tracking-wider text-muted-foreground border-b">
							<tr>
								<th class="p-2.5">Código</th>
								<th class="p-2.5">Nombre</th>
								<th class="p-2.5">Descripción</th>
								<th class="p-2.5">Estado</th>
								<th class="p-2.5 text-right">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each grupos as g (g.id)}
								<tr class={!g.activo ? 'opacity-60 bg-muted/20' : ''}>
									<td class="p-2.5 font-mono font-bold text-primary">{g.codigo}</td>
									<td class="p-2.5 font-semibold uppercase">{g.nombre}</td>
									<td class="p-2.5 text-muted-foreground uppercase">{g.descripcion || '-'}</td>
									<td class="p-2.5">
										<StatusBadge activo={g.activo} />
									</td>
									<td class="p-2.5 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => openEditGrupo(g)}>
												<Edit class="w-3.5 h-3.5" />
											</Button>
											<form method="POST" action="?/toggleActiveGrupo" use:enhance class="inline">
												<input type="hidden" name="id" value={g.id} />
												<input type="hidden" name="activo" value={String(g.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={`h-7 w-7 ${g.activo ? 'text-destructive' : 'text-emerald-600'}`}
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
				<Button variant="outline" onclick={() => (isGruposModalOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal Secundario: Crear / Editar Grupo -->
{#if isGrupoFormOpen}
	<Dialog bind:open={isGrupoFormOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-lg font-bold">
					{grupoFormId ? 'Editar Grupo de Unidad' : 'Nuevo Grupo de Unidad'}
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action={grupoFormId ? '?/updateGrupo' : '?/createGrupo'} use:enhance class="space-y-4 py-2">
				{#if grupoFormId}
					<input type="hidden" name="id" value={grupoFormId} />
				{/if}

				<div class="space-y-2">
					<Label for="g_codigo">Código del Grupo *</Label>
					<InputUppercase id="g_codigo" name="codigo" required bind:value={grupoFormCodigo} placeholder="EJ. LONGITUD" />
				</div>

				<div class="space-y-2">
					<Label for="g_nombre">Nombre del Grupo *</Label>
					<InputUppercase id="g_nombre" name="nombre" required bind:value={grupoFormNombre} placeholder="EJ. LONGITUD Y DISTANCIA" />
				</div>

				<div class="space-y-2">
					<Label for="g_desc">Descripción</Label>
					<InputUppercase id="g_desc" name="descripcion" bind:value={grupoFormDescripcion} placeholder="EJ. UNIDADES DE MEDIDA DE DISTANCIA" />
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isGrupoFormOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar Grupo</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
