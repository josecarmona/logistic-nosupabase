<script lang="ts">
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
	import { Search, Plus, Edit, ShieldCheck, Power, Eye, CheckSquare } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { MaestroRol, Permiso } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const roles = $derived(data.roles || []);
	const permisos = $derived(data.permisos || []);
	const rolPermisos = $derived(data.rolPermisos || []);
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
	let isPermisosOpen = $state(false);
	let selectedRole = $state<MaestroRol | null>(null);

	// Estado formulario rol
	let formRoleId = $state<number | null>(null);
	let formNombre = $state('');
	let formDescripcion = $state('');

	// Permisos seleccionados para el rol actual
	let selectedPermisoIds = $state<number[]>([]);

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'create'
					? 'Rol creado correctamente'
					: form.action === 'update'
						? 'Rol actualizado'
						: form.action === 'updatePermissions'
							? 'Permisos actualizados'
							: 'Estado del rol actualizado'
			);
			isCreateOpen = false;
			isEditOpen = false;
			isPermisosOpen = false;
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
		formRoleId = null;
		formNombre = '';
		formDescripcion = '';
		isCreateOpen = true;
	}

	function openEdit(role: MaestroRol) {
		selectedRole = role;
		formRoleId = role.id;
		formNombre = role.nombre;
		formDescripcion = role.descripcion || '';
		isEditOpen = true;
	}

	function openPermisos(role: MaestroRol) {
		selectedRole = role;
		formRoleId = role.id;

		// Extraer los ids de permisos asignados a este rol
		selectedPermisoIds = rolPermisos
			.filter((rp) => rp.rol_id === role.id)
			.map((rp) => rp.permiso_id);

		isPermisosOpen = true;
	}

	function togglePermisoCheck(permisoId: number) {
		if (selectedPermisoIds.includes(permisoId)) {
			selectedPermisoIds = selectedPermisoIds.filter((id) => id !== permisoId);
		} else {
			selectedPermisoIds = [...selectedPermisoIds, permisoId];
		}
	}

	// Agrupar permisos por tipo
	const permisosPorTipo = $derived.by(() => {
		const groups: Record<string, Permiso[]> = {
			data: [],
			menu: [],
			form: [],
			accion: []
		};
		permisos.forEach((p) => {
			if (!groups[p.tipo]) groups[p.tipo] = [];
			groups[p.tipo].push(p);
		});
		return groups;
	});

	const tipoLabels: Record<string, string> = {
		data: 'Permisos sobre Datos (Lectura / Escritura / Borrado)',
		menu: 'Opciones de Menú',
		form: 'Registros de Formularios',
		accion: 'Acciones sobre Formularios'
	};
</script>

<svelte:head>
	<title>CRUD Roles y Permisos - Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Controles superiores -->
	<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
		<form onsubmit={handleSearch} class="flex w-full sm:w-auto items-center gap-2">
			<div class="relative w-full sm:w-80">
				<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por nombre de rol…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>

		<Button onclick={openCreate} class="w-full sm:w-auto gap-2">
			<Plus class="w-4 h-4" /> Nuevo Rol
		</Button>
	</div>

	<!-- Tabla de Roles -->
	<Card>
		<CardHeader class="pb-2">
			<CardTitle class="text-lg font-bold">Maestro de Roles de Usuarios</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nombre del Rol</th>
							<th class="p-3">Descripción</th>
							<th class="p-3">Permisos Asignados</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if roles.length === 0}
							<tr>
								<td colspan="5" class="p-6 text-center text-muted-foreground">
									No se encontraron roles en la base de datos.
								</td>
							</tr>
						{:else}
							{#each roles as r}
								{@const countPerms = rolPermisos.filter((rp) => rp.rol_id === r.id).length}
								<tr class="hover:bg-muted/40 transition-colors {r.activo ? '' : 'text-muted-foreground opacity-60 bg-muted/20'}">
									<td class="p-3 font-semibold uppercase">
										<Badge variant="outline" class="uppercase font-bold tracking-wide">
											{r.nombre}
										</Badge>
									</td>
									<td class="p-3 text-xs uppercase">
										{r.descripcion || 'SIN DESCRIPCIÓN'}
									</td>
									<td class="p-3">
										<Badge variant="secondary" class="text-xs">
											{countPerms} permisos
										</Badge>
									</td>
									<td class="p-3">
										<StatusBadge activo={r.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button
												variant="outline"
												size="sm"
												class="gap-1 text-xs"
												onclick={() => openPermisos(r)}
												title="Configurar permisos"
											>
												<ShieldCheck class="w-3.5 h-3.5 text-primary" /> Permisos
											</Button>
											<Button variant="ghost" size="icon" title="Editar Rol" onclick={() => openEdit(r)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveRole" use:enhance class="inline">
												<input type="hidden" name="id" value={r.id} />
												<input type="hidden" name="activo" value={String(r.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={r.activo ? "text-destructive hover:bg-destructive/10" : "text-emerald-600"}
													title={r.activo ? "Desactivar rol (Soft delete)" : "Activar rol"}
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

<!-- Modal: Crear Rol -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Crear Nuevo Rol</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createRole" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="role_nombre">Nombre del Rol *</Label>
					<Input
						id="role_nombre"
						name="nombre"
						placeholder="ej. operador"
						required
						bind:value={formNombre}
						class="lowercase"
					/>
					<p class="text-[11px] text-muted-foreground">Se sugiere usar nombres en minúsculas sin espacios (ej. admin, gerente).</p>
				</div>

				<div class="space-y-2">
					<Label for="role_desc">Descripción</Label>
					<InputUppercase
						id="role_desc"
						name="descripcion"
						placeholder="DESCRIPCIÓN DE RESPONSABILIDADES"
						bind:value={formDescripcion}
					/>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Crear Rol</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Rol -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Editar Rol</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateRole" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formRoleId} />

				<div class="space-y-2">
					<Label for="edit_role_nombre">Nombre del Rol *</Label>
					<Input
						id="edit_role_nombre"
						name="nombre"
						required
						bind:value={formNombre}
						class="lowercase"
					/>
				</div>

				<div class="space-y-2">
					<Label for="edit_role_desc">Descripción</Label>
					<InputUppercase
						id="edit_role_desc"
						name="descripcion"
						bind:value={formDescripcion}
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

<!-- Modal: Matriz de Permisos por Rol -->
{#if isPermisosOpen && selectedRole}
	<Dialog bind:open={isPermisosOpen}>
		<DialogContent class="max-w-3xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<ShieldCheck class="w-5 h-5 text-primary" />
					Permisos del Rol: <span class="uppercase text-primary font-extrabold">{selectedRole.nombre}</span>
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updatePermissions" use:enhance class="space-y-6 py-2">
				<input type="hidden" name="rol_id" value={selectedRole.id} />

				{#each Object.entries(permisosPorTipo) as [tipoKey, listPerms]}
					{#if listPerms.length > 0}
						<div class="space-y-3 border rounded-lg p-4 bg-muted/20">
							<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
								{tipoLabels[tipoKey] || tipoKey}
							</h4>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{#each listPerms as p}
									<label class="flex items-start gap-2.5 p-2 rounded hover:bg-muted/50 cursor-pointer text-xs border bg-background">
										<input
											type="checkbox"
											name="permisos"
											value={p.id}
											checked={selectedPermisoIds.includes(p.id)}
											onchange={() => togglePermisoCheck(p.id)}
											class="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
										/>
										<div class="flex flex-col">
											<span class="font-mono font-semibold text-foreground">{p.codigo}</span>
											<span class="text-muted-foreground">{p.descripcion}</span>
										</div>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				{/each}

				<DialogFooter class="pt-4 border-t">
					<Button type="button" variant="outline" onclick={() => (isPermisosOpen = false)}>Cancelar</Button>
					<Button type="submit" class="gap-2">
						<CheckSquare class="w-4 h-4" /> Guardar Permisos
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
