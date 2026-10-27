<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import {
		Truck,
		Plus,
		Search,
		Edit,
		CheckCircle2,
		Power,
		Globe,
		Sparkles,
		MapPin,
		Trash2
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { Proveedor } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const proveedores = $derived(data.proveedores || []);
	const paises = $derived(data.paises || []);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search || '';
	});

	let isModalOpen = $state(false);
	let editingProveedor = $state<Proveedor | null>(null);

	let formNombre = $state('');
	let formTieneApi = $state(false);
	let formDireccion = $state('');
	let formPaisesIds = $state<number[]>([]);
	let formDirecciones = $state<Array<{ titulo: string; direccion: string; ciudad: string; estado: string; telefono: string; es_principal: boolean }>>([]);

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		goto(`?${params.toString()}`);
	}

	function openCreateModal() {
		editingProveedor = null;
		formNombre = '';
		formTieneApi = false;
		formDireccion = '';
		formDirecciones = [{ titulo: 'Sede Principal', direccion: '', ciudad: '', estado: '', telefono: '', es_principal: true }];
		formPaisesIds = paises.map((p) => p.id); // Seleccionar todos por defecto
		isModalOpen = true;
	}

	function openEditModal(p: Proveedor) {
		editingProveedor = p;
		formNombre = p.nombre;
		formTieneApi = p.tiene_api;
		formDireccion = p.direccion || '';
		if (p.direcciones && p.direcciones.length > 0) {
			formDirecciones = p.direcciones.map((d) => ({
				titulo: d.titulo || 'Sucursal',
				direccion: d.direccion,
				ciudad: d.ciudad || '',
				estado: d.estado || '',
				telefono: d.telefono || '',
				es_principal: !!d.es_principal
			}));
		} else if (p.direccion) {
			formDirecciones = [{ titulo: 'Sede Principal', direccion: p.direccion, ciudad: '', estado: '', telefono: '', es_principal: true }];
		} else {
			formDirecciones = [{ titulo: 'Sede Principal', direccion: '', ciudad: '', estado: '', telefono: '', es_principal: true }];
		}
		formPaisesIds = (p.paises_atendidos || []).map((pa) => pa.id);
		isModalOpen = true;
	}

	function addDireccion() {
		formDirecciones = [
			...formDirecciones,
			{ titulo: `Sucursal ${formDirecciones.length + 1}`, direccion: '', ciudad: '', estado: '', telefono: '', es_principal: formDirecciones.length === 0 }
		];
	}

	function removeDireccion(index: number) {
		if (formDirecciones.length <= 1) return;
		const wasPrincipal = formDirecciones[index].es_principal;
		formDirecciones = formDirecciones.filter((_, i) => i !== index);
		if (wasPrincipal && formDirecciones.length > 0) {
			formDirecciones[0].es_principal = true;
		}
	}

	function setPrincipalDireccion(index: number) {
		formDirecciones = formDirecciones.map((d, i) => ({
			...d,
			es_principal: i === index
		}));
		formDireccion = formDirecciones[index].direccion;
	}

	function togglePaisSelection(id: number) {
		if (formPaisesIds.includes(id)) {
			formPaisesIds = formPaisesIds.filter((pId) => pId !== id);
		} else {
			formPaisesIds = [...formPaisesIds, id];
		}
	}

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createProveedor'
					? 'Proveedor creado exitosamente'
					: form.action === 'updateProveedor'
						? 'Proveedor actualizado exitosamente'
						: 'Estado del proveedor actualizado'
			);
			isModalOpen = false;
		} else if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Maestro de Proveedores | Administración Logística</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
	<!-- Encabezado Principal -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<Truck class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Maestro de Proveedores de Transporte</h1>
				<p class="text-xs text-muted-foreground">
					Catálogo de empresas transportistas, indicación de API, países atendidos y dirección de oficinas.
				</p>
			</div>
		</div>

		<Button onclick={openCreateModal} class="gap-2 font-bold">
			<Plus class="w-4 h-4" /> Nuevo Proveedor
		</Button>
	</div>

	<!-- Filtro de Búsqueda -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex items-center gap-3">
				<div class="relative flex-1">
					<Search class="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
					<Input
						placeholder="Buscar proveedor por nombre..."
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

	<!-- Tabla de Proveedores -->
	<Card>
		<CardContent class="p-0 overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase">
						<th class="p-3">Nombre del Proveedor</th>
						<th class="p-3 text-center">Integración API</th>
						<th class="p-3">Países Atendidos (Cobertura)</th>
						<th class="p-3">Dirección Almacenada (Maestro)</th>
						<th class="p-3">Estado</th>
						<th class="p-3 text-right">Acciones</th>
					</tr>
				</thead>
				<tbody class="divide-y text-xs">
					{#if proveedores.length === 0}
						<tr>
							<td colspan="6" class="p-6 text-center text-muted-foreground">
								No se encontraron proveedores registrados en el sistema.
							</td>
						</tr>
					{:else}
						{#each proveedores as p (p.id)}
							<tr class={`hover:bg-muted/40 transition-colors ${!p.activo ? 'opacity-60 bg-muted/20' : ''}`}>
								<td class="p-3 font-semibold uppercase">{p.nombre}</td>
								<td class="p-3 text-center">
									{#if p.tiene_api}
										<Badge class="bg-blue-500/10 text-blue-700 border-blue-500/30 gap-1 uppercase text-[10px] font-extrabold">
											<Sparkles class="w-3 h-3 text-blue-600" /> TIENE API
										</Badge>
									{:else}
										<Badge variant="outline" class="text-muted-foreground text-[10px] uppercase font-bold">
											SIN API
										</Badge>
									{/if}
								</td>
								<td class="p-3">
									<div class="flex flex-wrap gap-1">
										{#if p.paises_atendidos && p.paises_atendidos.length > 0}
											{#each p.paises_atendidos as pa}
												<Badge variant="secondary" class="text-[9px] font-mono font-bold uppercase">
													{pa.codigo_iso3 || pa.nombre}
												</Badge>
											{/each}
										{:else}
											<span class="text-[10px] text-muted-foreground italic">Sin cobertura asignada</span>
										{/if}
									</div>
								</td>
								<td class="p-3 max-w-xs">
									{#if p.direcciones && p.direcciones.length > 1}
										<div class="flex items-center gap-1.5 mb-1">
											<Badge variant="outline" class="text-[9px] font-bold bg-primary/10 text-primary border-primary/30">
												<MapPin class="w-2.5 h-2.5 mr-0.5" /> {p.direcciones.length} Direcciones
											</Badge>
										</div>
									{/if}
									<p class="text-xs text-muted-foreground truncate" title={p.direccion || ''}>
										{p.direccion || 'Sin dirección registrada'}
									</p>
								</td>
								<td class="p-3">
									<Badge
										variant={p.activo ? 'default' : 'outline'}
										class="uppercase text-[10px] font-bold"
									>
										{p.activo ? 'ACTIVO' : 'INACTIVO'}
									</Badge>
								</td>
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<Button variant="ghost" size="icon" onclick={() => openEditModal(p)} title="Editar Proveedor">
											<Edit class="w-4 h-4" />
										</Button>
										<form method="POST" action="?/toggleActiveProveedor" use:enhance class="inline">
											<input type="hidden" name="id" value={p.id} />
											<input type="hidden" name="activo" value={String(p.activo)} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												class={p.activo ? 'text-amber-600 hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'}
												title={p.activo ? 'Desactivar Proveedor (Soft Delete)' : 'Activar Proveedor'}
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

<!-- MODAL CREAR / EDITAR PROVEEDOR -->
<Dialog bind:open={isModalOpen}>
	<DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle class="text-base font-bold flex items-center gap-2">
				<Truck class="w-5 h-5 text-primary" />
				{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
			</DialogTitle>
		</DialogHeader>

		<form
			method="POST"
			action={editingProveedor ? '?/updateProveedor' : '?/createProveedor'}
			use:enhance
			class="space-y-4 pt-2 text-xs"
		>
			{#if editingProveedor}
				<input type="hidden" name="id" value={editingProveedor.id} />
			{/if}

			<div class="space-y-1.5">
				<Label for="p_nombre" class="text-xs font-bold">Nombre del Proveedor *</Label>
				<Input
					id="p_nombre"
					name="nombre"
					required
					bind:value={formNombre}
					placeholder="EJ: MRW EXPRESS / TEALCA / ZOOM"
					class="text-xs uppercase font-medium"
				/>
			</div>

			<div class="flex items-center gap-2 border p-3 rounded-lg bg-muted/20">
				<input
					type="checkbox"
					id="p_tiene_api"
					name="tiene_api"
					value="true"
					bind:checked={formTieneApi}
					class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
				/>
				<Label for="p_tiene_api" class="text-xs font-bold cursor-pointer">
					¿El Proveedor cuenta con integración API?
				</Label>
			</div>

			<!-- Selección de Países a los que presta servicio -->
			<div class="space-y-1.5 border p-3 rounded-lg bg-slate-50">
				<Label class="text-xs font-bold flex items-center gap-1 text-primary">
					<Globe class="w-3.5 h-3.5" /> Países a los que Presta Servicio (Cobertura):
				</Label>
				<div class="grid grid-cols-2 gap-2 pt-1">
					{#each paises as pa}
						<label class="flex items-center gap-2 p-1.5 border rounded bg-background cursor-pointer hover:bg-muted/40 transition-colors">
							<input
								type="checkbox"
								name="paises_ids"
								value={pa.id}
								checked={formPaisesIds.includes(pa.id)}
								onchange={() => togglePaisSelection(pa.id)}
								class="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
							/>
							<span class="font-semibold text-[11px] uppercase">
								{pa.nombre} ({pa.codigo_iso3})
							</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Múltiples Direcciones del Proveedor (Punto 4) -->
			<div class="space-y-2.5 pt-2 border-t">
				<div class="flex items-center justify-between">
					<Label class="text-xs font-bold flex items-center gap-1.5 text-primary">
						<MapPin class="w-3.5 h-3.5" /> Direcciones / Sucursales ({formDirecciones.length}):
					</Label>
					<Button type="button" variant="outline" size="sm" onclick={addDireccion} class="h-7 text-[11px] gap-1">
						<Plus class="w-3 h-3" /> Agregar Dirección
					</Button>
				</div>
				<input type="hidden" name="direcciones" value={JSON.stringify(formDirecciones)} />
				<input type="hidden" name="direccion" value={formDireccion} />

				<div class="space-y-2.5 max-h-56 overflow-y-auto pr-1">
					{#each formDirecciones as dir, idx}
						<div class={`p-2.5 rounded-lg border text-xs space-y-2 transition-all ${
							dir.es_principal ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border'
						}`}>
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 flex-1">
									<Input
										placeholder="Sucursal (ej. Sede Central, Almacén Este)"
										bind:value={dir.titulo}
										class="h-7 text-xs font-bold bg-background"
									/>
									{#if dir.es_principal}
										<Badge class="bg-primary text-primary-foreground text-[10px] shrink-0">
											Principal
										</Badge>
									{:else}
										<button
											type="button"
											onclick={() => setPrincipalDireccion(idx)}
											class="text-[10px] text-muted-foreground hover:text-primary font-bold shrink-0 underline"
										>
											Marcar Principal
										</button>
									{/if}
								</div>
								{#if formDirecciones.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => removeDireccion(idx)}
										class="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
										title="Eliminar dirección"
									>
										<Trash2 class="w-3.5 h-3.5" />
									</Button>
								{/if}
							</div>

							<textarea
								bind:value={dir.direccion}
								oninput={() => { if (dir.es_principal) formDireccion = dir.direccion; }}
								rows="2"
								placeholder="Dirección física completa de esta oficina o agencia..."
								class="w-full rounded-md border bg-background p-2 text-xs focus:ring-1 focus:ring-primary"
								required
							></textarea>

							<div class="grid grid-cols-3 gap-2">
								<Input placeholder="Ciudad" bind:value={dir.ciudad} class="h-7 text-xs bg-background uppercase" />
								<Input placeholder="Estado" bind:value={dir.estado} class="h-7 text-xs bg-background uppercase" />
								<Input placeholder="Teléfono" bind:value={dir.telefono} class="h-7 text-xs bg-background" />
							</div>
						</div>
					{/each}
				</div>
			</div>

			<DialogFooter class="pt-2">
				<Button type="button" variant="outline" onclick={() => (isModalOpen = false)} class="text-xs">
					Cancelar
				</Button>
				<Button type="submit" class="text-xs gap-1.5 font-bold">
					<CheckCircle2 class="w-4 h-4" />
					{editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
