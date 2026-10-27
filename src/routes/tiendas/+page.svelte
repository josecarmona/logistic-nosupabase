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
	import { lookupGeoLocation, lookupGeoLocationWithDetails } from '$lib/services/geo';
	import { toast } from 'svelte-sonner';
	import {
		Search,
		Plus,
		Edit,
		Eye,
		Power,
		MapPin,
		Loader2,
		Store,
		Building2,
		Mail,
		Phone,
		Smartphone,
		Globe,
		Map,
		Layers,
		Download,
		Settings,
		User,
		Info
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { TiendaWithRelations, Zona } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tiendas = $derived(data.tiendas || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);
	const supervisores = $derived(data.supervisores || []);
	const paises = $derived(data.paises || []);
	const zonas = $derived(data.zonas || []);
	const configCodigo = $derived(data.configCodigo);
	const isAdmin = $derived(data.isAdmin || false);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search;
	});

	// Modales Tiendas
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDetailOpen = $state(false);
	let selectedTienda = $state<TiendaWithRelations | null>(null);

	// Modal Configuración de Código (Solo Admin)
	let isConfigCodigoOpen = $state(false);
	let cfgPrefijo = $state('');
	let cfgSufijo = $state('');
	let cfgLongitud = $state(6);

	$effect(() => {
		if (configCodigo) {
			cfgPrefijo = configCodigo.prefijo || '';
			cfgSufijo = configCodigo.sufijo || '';
			cfgLongitud = configCodigo.longitud_numero || 6;
		}
	});

	const previewCodigoTienda = $derived(() => {
		const p = cfgPrefijo.trim().toUpperCase();
		const s = cfgSufijo.trim().toUpperCase();
		const len = Math.max(1, Math.min(12, cfgLongitud || 6));
		const numStr = '1'.padStart(len, '0');
		if (p && s) return `${p}-${numStr}-${s}`;
		if (p && !s) return `${p}-${numStr}`;
		if (!p && s) return `${numStr}-${s}`;
		return numStr;
	});

	// Modales y estado Zonas (Solo Admin)
	let isZonasOpen = $state(false);
	let isZoneCreateOpen = $state(false);
	let isZoneEditOpen = $state(false);
	let isZoneDetailOpen = $state(false);
	let selectedZone = $state<Zona | null>(null);
	let zoneSearchInput = $state('');

	// Zonas filtradas alfabéticamente
	const filteredZonas = $derived(
		zonas
			.filter(
				(z) =>
					!zoneSearchInput ||
					z.nombre.toLowerCase().includes(zoneSearchInput.toLowerCase()) ||
					(z.descripcion && z.descripcion.toLowerCase().includes(zoneSearchInput.toLowerCase()))
			)
			.sort((a, b) => a.nombre.localeCompare(b.nombre))
	);

	// Formulario Tiendas
	let formId = $state('');
	let formNumeroOficina = $state('');
	let formNombre = $state('');
	let formSupervisorId = $state('');
	let formEmail = $state('');
	let formTelefono = $state('');
	let formCelular = $state('');
	let formCalle = $state('');
	let formOtraDireccion = $state('');
	let formPaisId = $state('');
	let formCodigoPostal = $state('');
	let formEstado = $state('');
	let formCiudad = $state('');
	let formMunicipio = $state('');
	let formZonaId = $state('');

	// Formulario Zonas
	let zoneId = $state('');
	let zoneNombre = $state('');
	let zoneDescripcion = $state('');

	let searchingGeo = $state(false);

	$effect(() => {
		if (form?.success) {
			if (form.action === 'updateConfigCodigoTienda') {
				toast.success(`Configuración actualizada correctamente. Se reconstruyeron ${form.updatedCount ?? 0} tiendas.`);
				isConfigCodigoOpen = false;
			} else {
				toast.success(
					form.action === 'createTienda'
						? 'Tienda creada correctamente'
						: form.action === 'updateTienda'
							? 'Tienda actualizada correctamente'
							: form.action === 'toggleActiveTienda'
								? 'Estado de tienda actualizado'
								: form.action === 'createZone'
									? 'Zona creada correctamente'
									: form.action === 'updateZone'
										? 'Zona actualizada correctamente'
										: 'Estado de zona actualizado'
				);
				isCreateOpen = false;
				isEditOpen = false;
				isZoneCreateOpen = false;
				isZoneEditOpen = false;
			}
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
		formId = '';
		formNumeroOficina = '';
		formNombre = '';
		formSupervisorId = '';
		formEmail = '';
		formTelefono = '';
		formCelular = '';
		formCalle = '';
		formOtraDireccion = '';
		formPaisId = paises.length > 0 ? String(paises[0].id) : '';
		formCodigoPostal = '';
		formEstado = '';
		formCiudad = '';
		formMunicipio = '';
		formZonaId = zonas.length > 0 ? String(zonas[0].id) : '';
		isCreateOpen = true;
	}

	function openEdit(t: TiendaWithRelations) {
		selectedTienda = t;
		formId = String(t.id);
		formNumeroOficina = t.numero_oficina;
		formNombre = t.nombre;
		formSupervisorId = t.supervisor_id || '';
		formEmail = t.email || '';
		formTelefono = t.telefono || '';
		formCelular = t.celular || '';
		formCalle = t.calle || '';
		formOtraDireccion = t.otra_direccion || '';
		formPaisId = t.pais_id ? String(t.pais_id) : '';
		formCodigoPostal = t.codigo_postal || '';
		formEstado = t.estado || '';
		formCiudad = t.ciudad || '';
		formMunicipio = t.municipio || '';
		formZonaId = t.zona_id ? String(t.zona_id) : '';
		isEditOpen = true;
	}

	function openDetail(t: TiendaWithRelations) {
		selectedTienda = t;
		isDetailOpen = true;
	}

	async function handleGeoSearch() {
		if (!formCodigoPostal) {
			toast.error('Atención', { description: 'Ingresa un Código Postal para buscar' });
			return;
		}

		let countryCode = 'US';
		let countryName = 'United States';
		if (formPaisId) {
			const p = paises.find((item) => String(item.id) === String(formPaisId));
			if (p?.codigo_iso2) countryCode = p.codigo_iso2;
			if (p?.nombre) countryName = p.nombre;
		}

		searchingGeo = true;
		try {
			const { result, message } = await lookupGeoLocationWithDetails(countryCode, formCodigoPostal, countryName);
			if (result && (result.ciudad || result.estado || result.municipio)) {
				if (result.ciudad) formCiudad = result.ciudad.toUpperCase();
				if (result.estado) formEstado = result.estado.toUpperCase();
				if (result.municipio) formMunicipio = result.municipio.toUpperCase();
				toast.success('Ubicación obtenida automáticamente');
			} else {
				toast.info(message || 'No se encontró ubicación automática', {
					description: message ? undefined : 'Por favor ingresa los datos manualmente.'
				});
			}
		} catch (e) {
			toast.error('Error al consultar geolocalización');
		} finally {
			searchingGeo = false;
		}
	}

	// Funciones Maestro de Zonas
	function openZoneCreate() {
		zoneId = '';
		zoneNombre = '';
		zoneDescripcion = '';
		isZoneCreateOpen = true;
	}

	function openZoneEdit(z: Zona) {
		selectedZone = z;
		zoneId = String(z.id);
		zoneNombre = z.nombre;
		zoneDescripcion = z.descripcion || '';
		isZoneEditOpen = true;
	}

	function openZoneDetail(z: Zona) {
		selectedZone = z;
		isZoneDetailOpen = true;
	}

	// Exportar Tiendas a CSV
	function exportToCSV() {
		if (!tiendas || tiendas.length === 0) {
			toast.error('No hay tiendas para exportar');
			return;
		}

		const columns = [
			{ key: 'numero_oficina', label: 'Nº Oficina' },
			{ key: 'nombre', label: 'Nombre Tienda' },
			{ key: 'email', label: 'Email' },
			{ key: 'telefono', label: 'Teléfono' },
			{ key: 'celular', label: 'Celular' },
			{ key: 'calle', label: 'Calle' },
			{ key: 'codigo_postal', label: 'CP' },
			{ key: 'ciudad', label: 'Ciudad' },
			{ key: 'estado', label: 'Estado' },
			{ key: 'municipio', label: 'Municipio' }
		];

		const rows = tiendas.map((t) => ({
			numero_oficina: t.numero_oficina,
			nombre: t.nombre,
			email: t.email || '',
			telefono: t.telefono || '',
			celular: t.celular || '',
			calle: t.calle || '',
			codigo_postal: t.codigo_postal || '',
			ciudad: t.ciudad || '',
			estado: t.estado || '',
			municipio: t.municipio || ''
		}));

		const headers = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
		const csvRows = rows.map((row: any) =>
			columns.map((c) => `"${String(row[c.key]).replace(/"/g, '""')}"`).join(',')
		);

		const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...csvRows].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Tiendas_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success('Listado de tiendas descargado en CSV');
	}
</script>

<svelte:head>
	<title>Sección Tiendas - Gestión de Sucursales</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-6 space-y-6">
	<!-- Encabezado Homologado -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
		<div>
			<h1 class="text-2xl font-extrabold tracking-tight flex items-center gap-2">
				<Store class="w-6 h-6 text-primary" /> Maestro de Tiendas
			</h1>
			<p class="text-sm text-muted-foreground">
				Listado de sucursales y oficinas registradas con supervisores y zonas asignadas.
			</p>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Button onclick={exportToCSV} variant="outline" class="gap-2 flex-1 sm:flex-none">
				<Download class="w-4 h-4" /> Exportar CSV
			</Button>

			{#if isAdmin}
				<Button onclick={() => (isConfigCodigoOpen = true)} variant="outline" class="gap-2 flex-1 sm:flex-none">
					<Layers class="w-4 h-4 text-primary" /> Configurar Código
				</Button>

				<Button onclick={() => (isZonasOpen = true)} variant="outline" class="gap-2 flex-1 sm:flex-none">
					<Settings class="w-4 h-4 text-primary" /> Gestionar Zonas
				</Button>
			{/if}

			<Button onclick={openCreate} class="gap-2 flex-1 sm:flex-none">
				<Plus class="w-4 h-4" /> Nueva Tienda
			</Button>
		</div>
	</div>

	<!-- Controles de Búsqueda -->
	<div class="flex items-center justify-between gap-4">
		<form onsubmit={handleSearch} class="flex w-full sm:w-80 items-center gap-2">
			<div class="relative w-full">
				<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por oficina, nombre o ciudad…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>
	</div>

	<!-- Listado Mobile (Cards) y Desktop (Tabla) -->
	<div class="space-y-4">
		<!-- Vista Móvil: Tarjetas Apiladas (Homologado con Clientes) -->
		<div class="grid grid-cols-1 gap-3 sm:hidden">
			{#each tiendas as t (t.id)}
				<div
					class={`p-4 rounded-lg border bg-card transition-all ${
						!t.activo ? 'bg-muted/40 text-muted-foreground opacity-60' : ''
					}`}
				>
					<div class="flex items-start justify-between">
						<div>
							<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5 mb-1">
								OFICINA #{t.numero_oficina}
							</Badge>
							<h3 class={`font-bold uppercase ${!t.activo ? 'line-through' : ''}`}>{t.nombre}</h3>
							{#if t.email}
								<p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
									<Mail class="w-3 h-3" /> {t.email}
								</p>
							{/if}
						</div>
						<StatusBadge activo={t.activo} />
					</div>

					<div class="mt-3 flex items-center justify-between pt-2 border-t text-xs">
						<span class="text-muted-foreground">
							{t.ciudad || 'CIUDAD N/A'} {t.zona ? `• ${t.zona.nombre}` : ''}
						</span>

						<div class="flex items-center gap-1">
							<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openDetail(t)}>
								<Eye class="w-3.5 h-3.5" />
							</Button>
							<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openEdit(t)}>
								<Edit class="w-3.5 h-3.5" />
							</Button>
							<form method="POST" action="?/toggleActiveTienda" use:enhance class="inline">
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
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground border rounded-lg bg-card">
					No se encontraron tiendas registradas.
				</div>
			{/each}
		</div>

		<!-- Vista Escritorio: Tabla tradicional (Homologado con Clientes) -->
		<div class="hidden sm:block border rounded-lg overflow-hidden bg-card">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Nº Oficina</th>
							<th class="p-3">Nombre Tienda</th>
							<th class="p-3">Supervisor</th>
							<th class="p-3">Zona</th>
							<th class="p-3">Ubicación</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if tiendas.length === 0}
							<tr>
								<td colspan="7" class="p-6 text-center text-muted-foreground">
									No se encontraron tiendas registradas.
								</td>
							</tr>
						{:else}
							{#each tiendas as t (t.id)}
								<tr class="hover:bg-muted/40 transition-colors {t.activo ? '' : 'text-muted-foreground opacity-60 bg-muted/20'}">
									<td class="p-3 font-mono text-xs font-bold">
										<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5">
											OF. #{t.numero_oficina}
										</Badge>
									</td>
									<td class="p-3 font-semibold uppercase">
										{t.nombre}
									</td>
									<td class="p-3 text-xs">
										{t.supervisor?.nombre_completo || '-'}
									</td>
									<td class="p-3">
										{#if t.zona}
											<Badge variant="secondary" class="text-xs font-semibold">{t.zona.nombre}</Badge>
										{:else}
											<span class="text-muted-foreground text-xs">-</span>
										{/if}
									</td>
									<td class="p-3 text-xs">
										{t.ciudad || ''}{t.ciudad && t.estado ? ', ' : ''}{t.estado || ''}
									</td>
									<td class="p-3">
										<StatusBadge activo={t.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Ficha Tienda" onclick={() => openDetail(t)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Tienda" onclick={() => openEdit(t)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveTienda" use:enhance class="inline">
												<input type="hidden" name="id" value={t.id} />
												<input type="hidden" name="activo" value={String(t.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={t.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={t.activo ? 'Desactivar tienda' : 'Activar tienda'}
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

			<!-- Paginación -->
			<div class="p-4 border-t">
				<PaginationControl {currentPage} {totalPages} {totalItems} onPageChange={handlePageChange} />
			</div>
		</div>
	</div>
</div>

<!-- Modal: Configuración de Código de Tienda / Número de Oficina (Solo Admin) -->
{#if isConfigCodigoOpen && isAdmin}
	<Dialog open={true} onOpenChange={(v) => !v && (isConfigCodigoOpen = false)}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Layers class="w-5 h-5 text-primary" /> Configurar Formato de Oficina
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateConfigCodigoTienda" use:enhance class="space-y-4 py-2">
				<div class="p-3 rounded-lg border bg-muted/30 text-xs space-y-1">
					<span class="text-muted-foreground font-semibold block uppercase">Vista previa del formato:</span>
					<Badge variant="outline" class="font-mono text-sm font-bold text-primary bg-primary/10">
						{previewCodigoTienda()}
					</Badge>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="cfg_prefijo">Prefijo (Opcional)</Label>
						<InputUppercase id="cfg_prefijo" name="prefijo" placeholder="EJ. OFI" bind:value={cfgPrefijo} />
					</div>
					<div class="space-y-2">
						<Label for="cfg_sufijo">Sufijo (Opcional)</Label>
						<InputUppercase id="cfg_sufijo" name="sufijo" placeholder="EJ. MX" bind:value={cfgSufijo} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="cfg_longitud">Longitud de Dígitos Numéricos (1 a 12)</Label>
					<Input id="cfg_longitud" name="longitud_numero" type="number" min="1" max="12" required bind:value={cfgLongitud} />
				</div>

				<div class="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
					<strong class="font-bold block">⚠️ Barrido Masivo Automático</strong>
					Al guardar los cambios, se reconstruirán y re-secuenciarán automáticamente todos los números de oficina de las tiendas existentes siguiendo el nuevo formato.
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isConfigCodigoOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar y Reconstruir</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Crear / Editar Tienda -->
{#if isCreateOpen || isEditOpen}
	<Dialog open={true} onOpenChange={(v) => { if (!v) { isCreateOpen = false; isEditOpen = false; } }}>
		<DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Store class="w-5 h-5 text-primary" />
					{isCreateOpen ? 'Crear Nueva Tienda' : 'Editar Tienda'}
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action={isCreateOpen ? '?/createTienda' : '?/updateTienda'} use:enhance class="space-y-4 py-2">
				{#if isEditOpen}
					<input type="hidden" name="id" value={formId} />
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="t_num">Número de Oficina (Opcional)</Label>
						<InputUppercase
							id="t_num"
							name="numero_oficina"
							placeholder={isCreateOpen ? `AUTOGENERADO (EJ. ${previewCodigoTienda()})` : 'EJ. OFI-000001'}
							bind:value={formNumeroOficina}
						/>
						<span class="text-[11px] text-muted-foreground block">
							{isCreateOpen ? 'Si se deja en blanco, se generará secuencialmente según el formato activo.' : 'Número de identificación único de la oficina.'}
						</span>
					</div>

					<div class="space-y-2">
						<Label for="t_nombre">Nombre de la Tienda *</Label>
						<InputUppercase id="t_nombre" name="nombre" placeholder="EJ. TIENDA CENTRAL" required bind:value={formNombre} />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="t_supervisor">Supervisor (Personal Operativo)</Label>
						<select id="t_supervisor" name="supervisor_id" class="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background" bind:value={formSupervisorId}>
							<option value="">-- Sin Supervisor --</option>
							{#each supervisores as s}
								<option value={s.id}>{s.nombre_completo} ({s.email})</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="t_zona">Zona Geográfica</Label>
							{#if isAdmin}
								<button
									type="button"
									onclick={() => (isZonasOpen = true)}
									class="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
								>
									<Settings class="w-3 h-3" /> Configurar Zonas
								</button>
							{/if}
						</div>
						<select id="t_zona" name="zona_id" class="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background" bind:value={formZonaId}>
							<option value="">-- Sin Zona --</option>
							{#each zonas as z}
								<option value={String(z.id)}>{z.nombre}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="t_email">Email de Contacto</Label>
						<Input id="t_email" name="email" type="email" placeholder="tienda@empresa.com" bind:value={formEmail} />
					</div>
					<div class="space-y-2">
						<Label for="t_tel">Teléfono Fijo</Label>
						<Input id="t_tel" name="telefono" placeholder="+52 555 1234" bind:value={formTelefono} />
					</div>
					<div class="space-y-2">
						<Label for="t_cel">Celular</Label>
						<Input id="t_cel" name="celular" placeholder="+52 555 9876" bind:value={formCelular} />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="t_calle">Calle / Dirección Principal</Label>
						<InputUppercase id="t_calle" name="calle" placeholder="AV. PRINCIPAL #123" bind:value={formCalle} />
					</div>
					<div class="space-y-2">
						<Label for="t_otra">Otra Dirección / Referencia</Label>
						<InputUppercase id="t_otra" name="otra_direccion" placeholder="LOCAL 4B EDIFICIO SUR" bind:value={formOtraDireccion} />
					</div>
				</div>

				<!-- Geolocalización -->
				<div class="p-4 rounded-lg border bg-muted/30 space-y-3">
					<span class="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Ubicación y Geolocalización</span>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="t_pais">País</Label>
							<select id="t_pais" name="pais_id" class="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background" bind:value={formPaisId}>
								<option value="">-- Seleccionar País --</option>
								{#each paises as p}
									<option value={String(p.id)}>{p.nombre} ({p.codigo_iso2})</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<Label for="t_cp">Código Postal</Label>
							<div class="flex gap-2">
								<InputUppercase id="t_cp" name="codigo_postal" placeholder="06000" bind:value={formCodigoPostal} />
								<Button type="button" variant="secondary" onclick={handleGeoSearch} disabled={searchingGeo}>
									{#if searchingGeo}
										<Loader2 class="w-4 h-4 animate-spin" />
									{:else}
										<MapPin class="w-4 h-4 text-primary" />
									{/if}
								</Button>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div class="space-y-2">
							<Label for="t_estado">Estado</Label>
							<InputUppercase id="t_estado" name="estado" bind:value={formEstado} />
						</div>
						<div class="space-y-2">
							<Label for="t_ciudad">Ciudad</Label>
							<InputUppercase id="t_ciudad" name="ciudad" bind:value={formCiudad} />
						</div>
						<div class="space-y-2">
							<Label for="t_municipio">Municipio</Label>
							<InputUppercase id="t_municipio" name="municipio" bind:value={formMunicipio} />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => { isCreateOpen = false; isEditOpen = false; }}>
						Cancelar
					</Button>
					<Button type="submit">{isCreateOpen ? 'Guardar Tienda' : 'Actualizar Tienda'}</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Tienda -->
{#if isDetailOpen && selectedTienda}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Building2 class="w-5 h-5 text-primary" /> Ficha de Tienda
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<div>
						<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5 mb-1">
							OFICINA #{selectedTienda.numero_oficina}
						</Badge>
						<h3 class="text-base font-bold uppercase">{selectedTienda.nombre}</h3>
					</div>
					<StatusBadge activo={selectedTienda.activo} />
				</div>

				<div class="grid grid-cols-2 gap-3 text-xs">
					<div>
						<span class="text-muted-foreground block">Supervisor:</span>
						<strong class="font-medium text-foreground">{selectedTienda.supervisor?.nombre_completo || 'Sin supervisor'}</strong>
					</div>
					<div>
						<span class="text-muted-foreground block">Zona:</span>
						<strong class="font-medium text-foreground">{selectedTienda.zona?.nombre || 'Sin zona'}</strong>
					</div>
				</div>

				<div class="space-y-1 text-xs border-t pt-2">
					<span class="text-muted-foreground font-semibold block uppercase">Contacto:</span>
					<p class="flex items-center gap-2"><Mail class="w-3.5 h-3.5 text-muted-foreground" /> {selectedTienda.email || 'N/A'}</p>
					<p class="flex items-center gap-2"><Phone class="w-3.5 h-3.5 text-muted-foreground" /> {selectedTienda.telefono || 'N/A'}</p>
					<p class="flex items-center gap-2"><Smartphone class="w-3.5 h-3.5 text-muted-foreground" /> {selectedTienda.celular || 'N/A'}</p>
				</div>

				<div class="space-y-1 text-xs border-t pt-2">
					<span class="text-muted-foreground font-semibold block uppercase">Dirección y Geolocalización:</span>
					<p>{selectedTienda.calle || 'Sin calle'} {selectedTienda.otra_direccion ? `(${selectedTienda.otra_direccion})` : ''}</p>
					<p class="text-muted-foreground font-mono">CP: {selectedTienda.codigo_postal || 'N/A'}</p>
					<p class="text-muted-foreground">
						{selectedTienda.ciudad || ''}{selectedTienda.ciudad && selectedTienda.estado ? ', ' : ''}{selectedTienda.estado || ''} {selectedTienda.pais ? `(${selectedTienda.pais.nombre})` : ''}
					</p>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Maestro de Zonas (Exclusivo para Administrador) -->
{#if isZonasOpen && isAdmin}
	<Dialog bind:open={isZonasOpen}>
		<DialogContent class="max-w-xl">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Settings class="w-5 h-5 text-primary" /> Maestro de Zonas
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2">
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div class="relative w-full sm:w-64">
						<Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Buscar zona alfabéticamente…"
							class="pl-8 h-9 text-xs"
							bind:value={zoneSearchInput}
						/>
					</div>
					<Button size="sm" onclick={openZoneCreate} class="gap-1 text-xs w-full sm:w-auto">
						<Plus class="w-3.5 h-3.5" /> Nueva Zona
					</Button>
				</div>

				<div class="max-h-72 overflow-y-auto border rounded-lg divide-y text-xs">
					{#if filteredZonas.length === 0}
						<div class="p-6 text-center text-muted-foreground">
							{zoneSearchInput ? 'No se encontraron zonas que coincidan con la búsqueda.' : 'No hay zonas configuradas.'}
						</div>
					{:else}
						{#each filteredZonas as z (z.id)}
							<div class={`p-3 flex items-center justify-between transition-colors ${!z.activo ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/30'}`}>
								<div>
									<div class="flex items-center gap-2">
										<strong class={`font-bold uppercase ${!z.activo ? 'line-through text-muted-foreground' : ''}`}>{z.nombre}</strong>
										<StatusBadge activo={z.activo} />
									</div>
									{#if z.descripcion}
										<p class="text-muted-foreground text-[11px] mt-0.5">{z.descripcion}</p>
									{/if}
								</div>

								<div class="flex items-center gap-1">
									<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => openZoneDetail(z)} title="Ver Detalle">
										<Eye class="w-3.5 h-3.5 text-blue-600" />
									</Button>
									<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => openZoneEdit(z)} title="Editar Zona">
										<Edit class="w-3.5 h-3.5 text-amber-600" />
									</Button>
									<form method="POST" action="?/toggleActiveZone" use:enhance class="inline">
										<input type="hidden" name="id" value={z.id} />
										<input type="hidden" name="activo" value={String(z.activo)} />
										<Button type="submit" variant="ghost" size="icon" class="h-7 w-7" title={z.activo ? 'Desactivar Zona' : 'Activar Zona'}>
											<Power class={`w-3.5 h-3.5 ${z.activo ? 'text-destructive' : 'text-emerald-600'}`} />
										</Button>
									</form>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<DialogFooter>
					<Button variant="outline" onclick={() => (isZonasOpen = false)}>Cerrar</Button>
				</DialogFooter>
			</div>
		</DialogContent>
	</Dialog>
{/if}

<!-- Sub-Modal: Detalle de Zona -->
{#if isZoneDetailOpen && selectedZone}
	<Dialog bind:open={isZoneDetailOpen}>
		<DialogContent class="max-w-sm">
			<DialogHeader>
				<DialogTitle class="text-lg font-bold flex items-center gap-2">
					<Info class="w-5 h-5 text-primary" /> Detalle de Zona
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-3 py-2 text-xs">
				<div class="flex items-center justify-between border-b pb-2">
					<h3 class="text-sm font-bold uppercase">{selectedZone.nombre}</h3>
					<StatusBadge activo={selectedZone.activo} />
				</div>

				<div>
					<span class="text-muted-foreground block font-medium">Descripción:</span>
					<p class="text-foreground mt-1">{selectedZone.descripcion || 'Sin descripción'}</p>
				</div>

				{#if selectedZone.created_at}
					<div class="border-t pt-2 text-[11px] text-muted-foreground">
						Registrada: {new Date(selectedZone.created_at).toLocaleDateString()}
					</div>
				{/if}
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isZoneDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Sub-Modal: Crear / Editar Zona -->
{#if isZoneCreateOpen || isZoneEditOpen}
	<Dialog open={true} onOpenChange={(v) => { if (!v) { isZoneCreateOpen = false; isZoneEditOpen = false; } }}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-lg font-bold">
					{isZoneCreateOpen ? 'Nueva Zona' : 'Editar Zona'}
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action={isZoneCreateOpen ? '?/createZone' : '?/updateZone'} use:enhance class="space-y-4 py-2">
				{#if isZoneEditOpen}
					<input type="hidden" name="id" value={zoneId} />
				{/if}

				<div class="space-y-2">
					<Label for="z_nombre">Nombre de la Zona *</Label>
					<InputUppercase id="z_nombre" name="nombre" placeholder="EJ. ZONA NORTE" required bind:value={zoneNombre} />
				</div>

				<div class="space-y-2">
					<Label for="z_desc">Descripción</Label>
					<InputUppercase id="z_desc" name="descripcion" placeholder="DESCRIPCIÓN DE LA COBERTURA" bind:value={zoneDescripcion} />
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => { isZoneCreateOpen = false; isZoneEditOpen = false; }}>
						Cancelar
					</Button>
					<Button type="submit">Guardar Zona</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
