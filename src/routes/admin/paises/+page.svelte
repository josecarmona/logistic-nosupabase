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
	import { Search, Plus, Edit, Eye, Power, Globe, Scale, Sparkles } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { Pais } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const paises = $derived(data.paises || []);
	const unidadesPeso = $derived(data.unidadesPeso || []);
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
	let selectedPais = $state<Pais | null>(null);

	// Estado formulario
	let formId = $state<number | null>(null);
	let formNombre = $state('');
	let formIso2 = $state('');
	let formIso3 = $state('');
	let formLimitePeso = $state(0);
	let formCapacidadMinima = $state(0);
	let formUnidadPesoId = $state('');

	const ISO_COUNTRY_DATA: Record<string, { iso2: string; iso3: string }> = {
		'ESTADOS UNIDOS': { iso2: 'US', iso3: 'USA' },
		'USA': { iso2: 'US', iso3: 'USA' },
		'UNITED STATES': { iso2: 'US', iso3: 'USA' },
		'MEXICO': { iso2: 'MX', iso3: 'MEX' },
		'MÉXICO': { iso2: 'MX', iso3: 'MEX' },
		'GUATEMALA': { iso2: 'GT', iso3: 'GTM' },
		'COLOMBIA': { iso2: 'CO', iso3: 'COL' },
		'EL SALVADOR': { iso2: 'SV', iso3: 'SLV' },
		'HONDURAS': { iso2: 'HN', iso3: 'HND' },
		'VENEZUELA': { iso2: 'VE', iso3: 'VEN' },
		'CUBA': { iso2: 'CU', iso3: 'CUB' },
		'NICARAGUA': { iso2: 'NI', iso3: 'NIC' },
		'ECUADOR': { iso2: 'EC', iso3: 'ECU' },
		'PANAMA': { iso2: 'PA', iso3: 'PAN' },
		'PANAMÁ': { iso2: 'PA', iso3: 'PAN' },
		'CHILE': { iso2: 'CL', iso3: 'CHL' },
		'ARGENTINA': { iso2: 'AR', iso3: 'ARG' },
		'PERU': { iso2: 'PE', iso3: 'PER' },
		'PERÚ': { iso2: 'PE', iso3: 'PER' },
		'BOLIVIA': { iso2: 'BO', iso3: 'BOL' },
		'BRASIL': { iso2: 'BR', iso3: 'BRA' },
		'BRAZIL': { iso2: 'BR', iso3: 'BRA' },
		'CANADA': { iso2: 'CA', iso3: 'CAN' },
		'CANADÁ': { iso2: 'CA', iso3: 'CAN' },
		'COSTA RICA': { iso2: 'CR', iso3: 'CRI' },
		'REPUBLICA DOMINICANA': { iso2: 'DO', iso3: 'DOM' },
		'REPÚBLICA DOMINICANA': { iso2: 'DO', iso3: 'DOM' },
		'URUGUAY': { iso2: 'UY', iso3: 'URY' },
		'PARAGUAY': { iso2: 'PY', iso3: 'PRY' },
		'ESPAÑA': { iso2: 'ES', iso3: 'ESP' },
		'ESPANA': { iso2: 'ES', iso3: 'ESP' },
		'SPAIN': { iso2: 'ES', iso3: 'ESP' },
		'ITALIA': { iso2: 'IT', iso3: 'ITA' },
		'ITALY': { iso2: 'IT', iso3: 'ITA' },
		'FRANCIA': { iso2: 'FR', iso3: 'FRA' },
		'FRANCE': { iso2: 'FR', iso3: 'FRA' },
		'ALEMANIA': { iso2: 'DE', iso3: 'DEU' },
		'GERMANY': { iso2: 'DE', iso3: 'DEU' },
		'REINO UNIDO': { iso2: 'GB', iso3: 'GBR' },
		'PORTUGAL': { iso2: 'PT', iso3: 'PRT' },
		'CHINA': { iso2: 'CN', iso3: 'CHN' },
		'JAPON': { iso2: 'JP', iso3: 'JPN' },
		'JAPÓN': { iso2: 'JP', iso3: 'JPN' }
	};

	function autoLookupIsoCodes() {
		const clean = (formNombre || '').trim().toUpperCase();
		if (!clean) {
			toast.info('Ingresa primero el nombre del país a consultar');
			return;
		}

		if (ISO_COUNTRY_DATA[clean]) {
			formIso2 = ISO_COUNTRY_DATA[clean].iso2;
			formIso3 = ISO_COUNTRY_DATA[clean].iso3;
			toast.success(`Códigos encontrados: ${formIso2} / ${formIso3}`);
		} else {
			// Búsqueda parcial
			const matchKey = Object.keys(ISO_COUNTRY_DATA).find((k) => k.includes(clean) || clean.includes(k));
			if (matchKey) {
				formIso2 = ISO_COUNTRY_DATA[matchKey].iso2;
				formIso3 = ISO_COUNTRY_DATA[matchKey].iso3;
				toast.success(`Códigos encontrados para ${matchKey}: ${formIso2} / ${formIso3}`);
			} else {
				toast.info('No se encontró coincidencia automática. Puedes ingresar los códigos manualmente.');
			}
		}
	}

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'create'
					? 'País creado correctamente'
					: form.action === 'update'
						? 'País actualizado'
						: 'Estado del país actualizado'
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
		formIso2 = '';
		formIso3 = '';
		formLimitePeso = 0;
		formCapacidadMinima = 0;
		formUnidadPesoId = unidadesPeso.length > 0 ? String(unidadesPeso[0].id) : '';
		isCreateOpen = true;
	}

	function openEdit(p: Pais) {
		selectedPais = p;
		formId = p.id;
		formNombre = p.nombre;
		formIso2 = p.codigo_iso2;
		formIso3 = p.codigo_iso3;
		formLimitePeso = p.limite_peso;
		formCapacidadMinima = p.capacidad_minima || 0;
		formUnidadPesoId = p.unidad_peso_id ? String(p.unidad_peso_id) : '';
		isEditOpen = true;
	}

	function openDetail(p: Pais) {
		selectedPais = p;
		isDetailOpen = true;
	}

	function getUnitCode(p: Pais): string {
		return p.unidad_peso?.codigo || 'KG';
	}
</script>

<svelte:head>
	<title>CRUD Maestro de Países - Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Controles superiores -->
	<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
		<form onsubmit={handleSearch} class="flex w-full sm:w-auto items-center gap-2">
			<div class="relative w-full sm:w-80">
				<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por nombre o código ISO…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>

		<Button onclick={openCreate} class="w-full sm:w-auto gap-2">
			<Plus class="w-4 h-4" /> Nuevo País
		</Button>
	</div>

	<!-- Tabla de Países -->
	<Card>
		<CardHeader class="pb-2">
			<CardTitle class="text-lg font-bold">Maestro de Países</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nombre del País</th>
							<th class="p-3">ISO 2</th>
							<th class="p-3">ISO 3</th>
							<th class="p-3">Límite de Peso</th>
							<th class="p-3">Unidad de Peso</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if paises.length === 0}
							<tr>
								<td colspan="7" class="p-6 text-center text-muted-foreground">
									No se encontraron países registrados.
								</td>
							</tr>
						{:else}
							{#each paises as p}
								<tr class="hover:bg-muted/40 transition-colors {p.activo ? '' : 'text-muted-foreground opacity-60 bg-muted/20'}">
									<td class="p-3 font-semibold uppercase flex items-center gap-2">
										<Globe class="w-4 h-4 text-muted-foreground" />
										<span>{p.nombre}</span>
									</td>
									<td class="p-3">
										<Badge variant="outline" class="font-mono uppercase">{p.codigo_iso2}</Badge>
									</td>
									<td class="p-3">
										<Badge variant="outline" class="font-mono uppercase">{p.codigo_iso3}</Badge>
									</td>
									<td class="p-3 text-xs space-y-0.5">
										<div class="flex items-center gap-1 font-semibold">
											<span class="text-muted-foreground text-[10px] uppercase">Mín:</span>
											<span>{p.capacidad_minima ? `${p.capacidad_minima} ${getUnitCode(p)}` : '0 (Sin mín.)'}</span>
										</div>
										<div class="flex items-center gap-1 font-semibold">
											<span class="text-muted-foreground text-[10px] uppercase">Máx:</span>
											{#if p.limite_peso === 0}
												<span class="text-emerald-600 font-semibold dark:text-emerald-400">Sin límite</span>
											{:else}
												<span>{p.limite_peso} {getUnitCode(p)}</span>
											{/if}
										</div>
									</td>
									<td class="p-3 text-xs font-semibold">
										<span class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
											<Scale class="w-3.5 h-3.5" />
											{getUnitCode(p)}
										</span>
									</td>
									<td class="p-3">
										<StatusBadge activo={p.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Detalle" onclick={() => openDetail(p)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar País" onclick={() => openEdit(p)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveCountry" use:enhance class="inline">
												<input type="hidden" name="id" value={p.id} />
												<input type="hidden" name="activo" value={String(p.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={p.activo ? "text-destructive hover:bg-destructive/10" : "text-emerald-600"}
													title={p.activo ? "Desactivar país (Soft Delete)" : "Activar país"}
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

<!-- Modal: Crear País -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Crear Nuevo País</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createCountry" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="country_nombre">Nombre del País *</Label>
						<Button type="button" variant="ghost" size="sm" class="h-6 px-2 text-xs text-primary gap-1" onclick={autoLookupIsoCodes}>
							<Sparkles class="w-3 h-3" /> Buscar Códigos ISO
						</Button>
					</div>
					<InputUppercase
						id="country_nombre"
						name="nombre"
						placeholder="ej. ESTADOS UNIDOS"
						required
						list="paises_catalogo_list"
						bind:value={formNombre}
					/>
					<datalist id="paises_catalogo_list">
						{#each Object.keys(ISO_COUNTRY_DATA) as cName}
							<option value={cName}></option>
						{/each}
					</datalist>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="country_iso2">Código ISO 2 Letras *</Label>
						<InputUppercase
							id="country_iso2"
							name="codigo_iso2"
							placeholder="US"
							maxlength={2}
							required
							bind:value={formIso2}
						/>
					</div>

					<div class="space-y-2">
						<Label for="country_iso3">Código ISO 3 Letras *</Label>
						<InputUppercase
							id="country_iso3"
							name="codigo_iso3"
							placeholder="USA"
							maxlength={3}
							required
							bind:value={formIso3}
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div class="space-y-2">
						<Label for="country_minimo">Capacidad Mínima</Label>
						<Input
							id="country_minimo"
							name="capacidad_minima"
							type="number"
							step="0.01"
							min="0"
							bind:value={formCapacidadMinima}
							placeholder="0 = Sin mín."
						/>
					</div>

					<div class="space-y-2">
						<Label for="country_limite">Capacidad Máxima</Label>
						<Input
							id="country_limite"
							name="limite_peso"
							type="number"
							step="0.01"
							min="0"
							bind:value={formLimitePeso}
							placeholder="0 = Sin límite"
						/>
					</div>

					<div class="space-y-2">
						<Label for="country_unidad">Unidad de Peso</Label>
						<select
							id="country_unidad"
							name="unidad_peso_id"
							bind:value={formUnidadPesoId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">-- SELECCIONAR --</option>
							{#each unidadesPeso as u}
								<option value={String(u.id)}>{u.nombre.toUpperCase()} ({u.codigo})</option>
							{/each}
						</select>
					</div>
				</div>
				<p class="text-[11px] text-muted-foreground">La capacidad mínima y máxima definen el rango de peso aceptado (0 = sin restricción).</p>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar País</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar País -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Editar País</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateCountry" use:enhance class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="edit_country_nombre">Nombre del País *</Label>
						<Button type="button" variant="ghost" size="sm" class="h-6 px-2 text-xs text-primary gap-1" onclick={autoLookupIsoCodes}>
							<Sparkles class="w-3 h-3" /> Buscar Códigos ISO
						</Button>
					</div>
					<InputUppercase
						id="edit_country_nombre"
						name="nombre"
						required
						list="paises_catalogo_list"
						bind:value={formNombre}
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="edit_country_iso2">Código ISO 2 Letras *</Label>
						<InputUppercase
							id="edit_country_iso2"
							name="codigo_iso2"
							maxlength={2}
							required
							bind:value={formIso2}
						/>
					</div>

					<div class="space-y-2">
						<Label for="edit_country_iso3">Código ISO 3 Letras *</Label>
						<InputUppercase
							id="edit_country_iso3"
							name="codigo_iso3"
							maxlength={3}
							required
							bind:value={formIso3}
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div class="space-y-2">
						<Label for="edit_country_minimo">Capacidad Mínima</Label>
						<Input
							id="edit_country_minimo"
							name="capacidad_minima"
							type="number"
							step="0.01"
							min="0"
							bind:value={formCapacidadMinima}
							placeholder="0 = Sin mín."
						/>
					</div>

					<div class="space-y-2">
						<Label for="edit_country_limite">Capacidad Máxima</Label>
						<Input
							id="edit_country_limite"
							name="limite_peso"
							type="number"
							step="0.01"
							min="0"
							bind:value={formLimitePeso}
							placeholder="0 = Sin límite"
						/>
					</div>

					<div class="space-y-2">
						<Label for="edit_country_unidad">Unidad de Peso</Label>
						<select
							id="edit_country_unidad"
							name="unidad_peso_id"
							bind:value={formUnidadPesoId}
							class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="">-- SELECCIONAR --</option>
							{#each unidadesPeso as u}
								<option value={String(u.id)}>{u.nombre.toUpperCase()} ({u.codigo})</option>
							{/each}
						</select>
					</div>
				</div>
				<p class="text-[11px] text-muted-foreground">La capacidad mínima y máxima definen el rango de peso aceptado (0 = sin restricción).</p>
				<p class="text-[11px] text-muted-foreground">Deja el límite de peso en 0 para indicar que NO HAY LÍMITE.</p>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Cambios</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de País -->
{#if isDetailOpen && selectedPais}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Detalle del País</DialogTitle>
			</DialogHeader>

			<div class="space-y-3 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedPais.activo} />
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Nombre Oficial</span>
					<span class="font-bold text-base uppercase">{selectedPais.nombre}</span>
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Código ISO 2</span>
						<Badge variant="outline" class="font-mono text-xs">{selectedPais.codigo_iso2}</Badge>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Código ISO 3</span>
						<Badge variant="outline" class="font-mono text-xs">{selectedPais.codigo_iso3}</Badge>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Unidad de Peso Oficial</span>
						<span class="font-bold text-blue-600 dark:text-blue-400">{getUnitCode(selectedPais)}</span>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Límite de Peso Autorizado</span>
						{#if selectedPais.limite_peso === 0}
							<span class="font-semibold text-emerald-600 dark:text-emerald-400">SIN LÍMITE (0)</span>
						{:else}
							<span class="font-bold">{selectedPais.limite_peso} {getUnitCode(selectedPais)}</span>
						{/if}
					</div>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
