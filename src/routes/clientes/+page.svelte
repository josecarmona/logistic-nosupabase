<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { lookupGeoLocation, lookupGeoLocationWithDetails } from '$lib/services/geo';
	import { toast } from 'svelte-sonner';
	import { Search, Plus, Edit, Eye, Power, MapPin, Loader2, Users, Mail, Phone, Download, Key, ShieldCheck, ShieldAlert, Check } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { ProfileWithRelations } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const clientes = $derived(data.clientes || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);
	const paises = $derived(data.paises || []);
	const adquisiciones = $derived(data.adquisiciones || []);
	const roles = $derived(data.roles || []);
	const isAdmin = $derived(data.isAdmin || false);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search;
	});

	// Modales
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDetailOpen = $state(false);
	let isLinkAuthOpen = $state(false);
	let linkAuthEmail = $state('');
	let linkAuthPassword = $state('');
	let selectedClient = $state<ProfileWithRelations | null>(null);

	function getDummyEmailForClient(c: ProfileWithRelations | null): string {
		if (!c) return '';
		const identifier = (c.codigo || c.numero_celular || c.telefono || c.id.slice(0, 8))
			.toLowerCase()
			.replace(/[^a-z0-9._-]/g, '');
		return `${identifier}@cliente.hhworldgroup.com`;
	}

	// Estado del formulario (creación / edición)
	let formId = $state('');
	let formEmail = $state('');
	let formNombre = $state('');
	let formRazonSocial = $state('');
	let formDireccion1 = $state('');
	let formDireccion2 = $state('');
	let formPaisId = $state('');
	let formCodigoPostal = $state('');
	let formCiudad = $state('');
	let formEstado = $state('');
	let formMunicipio = $state('');
	let formCelular = $state('');
	let formTelefono = $state('');
	let formTipoAdquisicionId = $state('');
	let formReferencia = $state('');
	let formRolId = $state('');

	let searchingGeo = $state(false);

	function exportToCSV() {
		if (!clientes || clientes.length === 0) {
			toast.error('No hay clientes para exportar');
			return;
		}

		const columns = [
			{ key: 'codigo', label: 'Código' },
			{ key: 'nombre_completo', label: 'Nombre Completo' },
			{ key: 'email', label: 'Email' },
			{ key: 'numero_celular', label: 'Celular' },
			{ key: 'telefono', label: 'Teléfono' },
			{ key: 'ciudad', label: 'Ciudad' },
			{ key: 'estado', label: 'Estado' }
		];

		const rows = clientes.map((c) => ({
			codigo: c.codigo || '',
			nombre_completo: c.nombre_completo,
			email: c.email,
			numero_celular: c.numero_celular || '',
			telefono: c.telefono || '',
			ciudad: c.ciudad || '',
			estado: c.estado || ''
		}));

		const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
		const csvRows = rows.map((row: any) =>
			columns.map((col) => `"${String(row[col.key]).replace(/"/g, '""')}"`).join(',')
		);

		const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...csvRows].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Clientes_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success('Listado de clientes descargado en CSV');
	}

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'create'
					? 'Cliente registrado correctamente'
					: form.action === 'update'
						? 'Datos del cliente actualizados'
						: form.action === 'linkAuthUser'
							? (form.message || 'Cuenta de acceso vinculada exitosamente')
							: 'Estado actualizado'
			);
			if (form.action === 'linkAuthUser' && selectedClient && form.profileId === selectedClient.id) {
				selectedClient.user_id = form.userId;
				selectedClient.email = form.email;
				isLinkAuthOpen = false;
				linkAuthPassword = '';
			}
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
		formId = '';
		formEmail = '';
		formNombre = '';
		formRazonSocial = '';
		formDireccion1 = '';
		formDireccion2 = '';
		formPaisId = '';
		formCodigoPostal = '';
		formCiudad = '';
		formEstado = '';
		formMunicipio = '';
		formCelular = '';
		formTelefono = '';
		formTipoAdquisicionId = '';
		formReferencia = '';
		isCreateOpen = true;
	}

	function openEdit(c: ProfileWithRelations) {
		selectedClient = c;
		formId = c.id;
		formEmail = c.email;
		formNombre = c.nombre_completo;
		formRazonSocial = c.razon_social || '';
		formDireccion1 = c.direccion_1 || '';
		formDireccion2 = c.direccion_2 || '';
		formPaisId = c.pais_id ? String(c.pais_id) : '';
		formCodigoPostal = c.codigo_postal || '';
		formCiudad = c.ciudad || '';
		formEstado = c.estado || '';
		formMunicipio = c.municipio || '';
		formCelular = c.numero_celular || '';
		formTelefono = c.telefono || '';
		formTipoAdquisicionId = c.tipo_adquisicion_id ? String(c.tipo_adquisicion_id) : '';
		formReferencia = c.referencia || '';
		formRolId = c.rol_id ? String(c.rol_id) : '';

		isEditOpen = true;
	}

	function openDetail(c: ProfileWithRelations) {
		selectedClient = c;
		isLinkAuthOpen = false;
		linkAuthEmail = c.email?.trim() ? c.email.trim() : getDummyEmailForClient(c);
		linkAuthPassword = '';
		isDetailOpen = true;
	}

	async function handleGeoSearch() {
		if (!formPaisId || !formCodigoPostal) {
			toast.error('Atención', {
				description: 'Selecciona un país e ingresa el código postal antes de buscar.'
			});
			return;
		}

		const countryObj = paises.find((p) => String(p.id) === String(formPaisId));
		if (!countryObj) return;

		searchingGeo = true;
		try {
			const { result, message } = await lookupGeoLocationWithDetails(countryObj.codigo_iso2, formCodigoPostal, countryObj.nombre);
			if (result && (result.ciudad || result.estado || result.municipio)) {
				if (result.ciudad) formCiudad = result.ciudad.toUpperCase();
				if (result.estado) formEstado = result.estado.toUpperCase();
				if (result.municipio) formMunicipio = result.municipio.toUpperCase();
				toast.success('Ubicación obtenida automáticamente');
			} else {
				toast.info(message || 'No se encontró ubicación automática', {
					description: message ? undefined : 'Por favor ingresa ciudad, estado y municipio manualmente.'
				});
			}
		} catch (e) {
			toast.error('Error al consultar geolocalización');
		} finally {
			searchingGeo = false;
		}
	}
</script>

<svelte:head>
	<title>Sección Clientes - Gestión de Clientes</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-6 space-y-6">
	<!-- Encabezado de la Sección Clientes -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
		<div>
			<h1 class="text-2xl font-extrabold tracking-tight flex items-center gap-2">
				<Users class="w-6 h-6 text-primary" /> Maestro de Clientes
			</h1>
			<p class="text-sm text-muted-foreground">
				Listado exclusivo de clientes registrados con su codificación y datos de contacto.
			</p>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Button onclick={exportToCSV} variant="outline" class="gap-2 flex-1 sm:flex-none">
				<Download class="w-4 h-4" /> Exportar CSV
			</Button>
			<Button onclick={openCreate} class="gap-2 flex-1 sm:flex-none">
				<Plus class="w-4 h-4" /> Nuevo Cliente
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
					placeholder="Buscar por código, nombre o correo…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>
	</div>

	<!-- Listado Mobile (Cards) y Desktop (Tabla) -->
	<div class="space-y-4">
		<!-- Vista Móvil: Tarjetas apiladas -->
		<div class="grid grid-cols-1 gap-3 sm:hidden">
			{#each clientes as c (c.id)}
				<div
					class={`p-4 rounded-lg border bg-card transition-all ${
						!c.activo ? 'bg-muted/40 text-muted-foreground opacity-60' : ''
					}`}
				>
					<div class="flex items-start justify-between">
						<div>
							<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5 mb-1">
								{c.codigo || 'SIN CÓDIGO'}
							</Badge>
							<h3 class={`font-bold uppercase ${!c.activo ? 'line-through' : ''}`}>{c.nombre_completo}</h3>
							<p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
								<Mail class="w-3 h-3" /> {c.email}
							</p>
						</div>
						<StatusBadge activo={c.activo} />
					</div>

					<div class="mt-3 flex items-center justify-between pt-2 border-t text-xs">
						<span class="text-muted-foreground">
							{c.pais?.nombre || 'PAÍS N/A'} {c.numero_celular ? `• Cel: ${c.numero_celular}` : ''}
						</span>

						<div class="flex items-center gap-1">
							<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openDetail(c)}>
								<Eye class="w-3.5 h-3.5" />
							</Button>
							<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openEdit(c)}>
								<Edit class="w-3.5 h-3.5" />
							</Button>
							<form method="POST" action="?/toggleActiveClient" use:enhance class="inline">
								<input type="hidden" name="id" value={c.id} />
								<input type="hidden" name="activo" value={String(c.activo)} />
								<Button
									type="submit"
									variant="ghost"
									size="icon"
									class={`h-8 w-8 ${c.activo ? 'text-destructive' : 'text-emerald-600'}`}
								>
									<Power class="w-3.5 h-3.5" />
								</Button>
							</form>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground border rounded-lg bg-card">
					No se encontraron clientes registrados.
				</div>
			{/each}
		</div>

		<!-- Vista Escritorio: Tabla tradicional -->
		<div class="hidden sm:block border rounded-lg overflow-hidden bg-card">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Código</th>
							<th class="p-3">Nombre Completo</th>
							<th class="p-3">Correo Electrónico</th>
							<th class="p-3">País / Ubicación</th>
							<th class="p-3">Teléfono / Celular</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if clientes.length === 0}
							<tr>
								<td colspan="7" class="p-6 text-center text-muted-foreground">
									No se encontraron clientes registrados.
								</td>
							</tr>
						{:else}
							{#each clientes as c (c.id)}
								<tr class="hover:bg-muted/40 transition-colors {c.activo ? '' : 'text-muted-foreground opacity-60 bg-muted/20'}">
									<td class="p-3 font-mono font-bold text-xs">
										<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5">
											{c.codigo || 'SIN CÓDIGO'}
										</Badge>
									</td>
									<td class="p-3 font-semibold uppercase">
										{c.nombre_completo || 'SIN NOMBRE'}
									</td>
									<td class="p-3 text-xs">
										{c.email}
									</td>
									<td class="p-3 text-xs">
										{c.pais?.nombre || '-'} {c.ciudad ? `(${c.ciudad})` : ''}
									</td>
									<td class="p-3 text-xs">
										{c.numero_celular || c.telefono || '-'}
									</td>
									<td class="p-3">
										<StatusBadge activo={c.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Ficha Cliente" onclick={() => openDetail(c)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Cliente" onclick={() => openEdit(c)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActiveClient" use:enhance class="inline">
												<input type="hidden" name="id" value={c.id} />
												<input type="hidden" name="activo" value={String(c.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={c.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={c.activo ? 'Desactivar cliente' : 'Activar cliente'}
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
		</div>

		<PaginationControl
			{currentPage}
			{totalPages}
			{totalItems}
			onPageChange={handlePageChange}
		/>
	</div>
</div>

<!-- Modal: Crear Cliente -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Users class="w-5 h-5 text-primary" /> Registrar Nuevo Cliente
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createClient" use:enhance autocomplete="off" class="space-y-4 py-2">
				<!-- Sección 1: Identificación y Contacto -->
				<div class="p-3.5 rounded-lg border bg-card space-y-3">
					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label for="cli_nombre">Nombre Completo *</Label>
							<InputUppercase id="cli_nombre" name="nombre_completo" required placeholder="EJ. JUAN PÉREZ" bind:value={formNombre} />
						</div>

						<div class="space-y-1.5 md:col-span-6">
							<Label for="cli_email">Correo Electrónico (Opcional)</Label>
							<Input id="cli_email" name="email" type="email" autocomplete="off" placeholder="correo@ejemplo.com" bind:value={formEmail} />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-4">
							<Label for="cli_cel">Número Celular</Label>
							<Input id="cli_cel" name="numero_celular" type="tel" autocomplete="off" placeholder="+1 / +58..." bind:value={formCelular} />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label for="cli_tel">Teléfono Fijo</Label>
							<Input id="cli_tel" name="telefono" type="tel" autocomplete="off" bind:value={formTelefono} />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label for="cli_adq">Tipo de Adquisición</Label>
							<select
								id="cli_adq"
								name="tipo_adquisicion_id"
								bind:value={formTipoAdquisicionId}
								class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="">-- SELECCIONAR --</option>
								{#each adquisiciones as a}
									<option value={String(a.id)}>{a.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="cli_razon">Razón Social</Label>
						<InputUppercase id="cli_razon" name="razon_social" placeholder="OPCIONAL" bind:value={formRazonSocial} />
					</div>
				</div>

				<!-- Sección 2: Ubicación Geográfica y Direcciones Completas -->
				<div class="p-3.5 rounded-lg border bg-muted/20 space-y-3">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
							<MapPin class="w-3.5 h-3.5" /> Ubicación Geográfica y Dirección Completa
						</span>
						<span class="text-[11px] text-muted-foreground">Selecciona País + Código Postal y pulsa el icono para autocompletar</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-5">
							<Label for="cli_pais">País</Label>
							<select
								id="cli_pais"
								name="pais_id"
								bind:value={formPaisId}
								class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="">-- SELECCIONAR --</option>
								{#each paises as p}
									<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5 md:col-span-3">
							<Label for="cli_cp">Código Postal</Label>
							<div class="flex gap-1.5">
								<InputUppercase id="cli_cp" name="codigo_postal" bind:value={formCodigoPostal} />
								<Button type="button" variant="outline" size="icon" class="shrink-0" onclick={handleGeoSearch} disabled={searchingGeo} title="Buscar por Código Postal">
									{#if searchingGeo}
										<Loader2 class="w-4 h-4 animate-spin" />
									{:else}
										<MapPin class="w-4 h-4 text-primary" />
									{/if}
								</Button>
							</div>
						</div>

						<div class="space-y-1.5 md:col-span-4">
							<Label for="cli_estado">Estado / Provincia</Label>
							<InputUppercase id="cli_estado" name="estado" bind:value={formEstado} />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label for="cli_ciudad">Ciudad</Label>
							<InputUppercase id="cli_ciudad" name="ciudad" bind:value={formCiudad} />
						</div>

						<div class="space-y-1.5 md:col-span-6">
							<Label for="cli_municipio">Municipio / Condado</Label>
							<InputUppercase id="cli_municipio" name="municipio" bind:value={formMunicipio} />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="cli_dir1">Dirección Principal (Línea 1 - Calle, Av., Urbanización, Edificio, Casa)</Label>
						<InputUppercase id="cli_dir1" name="direccion_1" placeholder="INGRESE LA DIRECCIÓN COMPLETA SIN RECORTES..." bind:value={formDireccion1} />
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-7">
							<Label for="cli_dir2">Dirección Secundaria (Línea 2 - Apto, Piso, Local, Punto de Referencia)</Label>
							<InputUppercase id="cli_dir2" name="direccion_2" bind:value={formDireccion2} />
						</div>
						<div class="space-y-1.5 md:col-span-5">
							<Label for="cli_ref">Referencia Adicional</Label>
							<InputUppercase id="cli_ref" name="referencia" bind:value={formReferencia} />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Cliente</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Cliente -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Datos del Cliente
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateClient" use:enhance autocomplete="off" class="space-y-4 py-2">
				<input type="hidden" name="id" value={formId} />

				<div class="p-3.5 rounded-lg border bg-card space-y-3">
					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label for="edit_cli_nombre">Nombre Completo *</Label>
							<InputUppercase id="edit_cli_nombre" name="nombre_completo" required bind:value={formNombre} />
						</div>

						<div class="space-y-1.5 md:col-span-6">
							<Label for="edit_cli_email">Correo Electrónico (Opcional)</Label>
							<Input id="edit_cli_email" name="email" type="email" autocomplete="off" placeholder="correo@ejemplo.com" bind:value={formEmail} />
						</div>
					</div>

					{#if isAdmin}
						<div class="space-y-1.5 p-3 border rounded-lg bg-muted/40">
							<Label for="edit_cli_rol" class="font-semibold flex items-center gap-1 text-primary">
								Rol asignado al Perfil (Solo Administrador)
							</Label>
							<select id="edit_cli_rol" name="rol_id" bind:value={formRolId} class="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background uppercase font-medium">
								{#each roles as r}
									<option value={String(r.id)}>{r.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>
					{/if}

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-4">
							<Label for="edit_cli_cel">Número Celular</Label>
							<Input id="edit_cli_cel" name="numero_celular" type="tel" autocomplete="off" bind:value={formCelular} />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label for="edit_cli_tel">Teléfono Fijo</Label>
							<Input id="edit_cli_tel" name="telefono" type="tel" autocomplete="off" bind:value={formTelefono} />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label for="edit_cli_adq">Tipo de Adquisición</Label>
							<select
								id="edit_cli_adq"
								name="tipo_adquisicion_id"
								bind:value={formTipoAdquisicionId}
								class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="">-- SELECCIONAR --</option>
								{#each adquisiciones as a}
									<option value={String(a.id)}>{a.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="edit_cli_razon">Razón Social</Label>
						<InputUppercase id="edit_cli_razon" name="razon_social" bind:value={formRazonSocial} />
					</div>
				</div>

				<!-- Geodatos y Direcciones Completas -->
				<div class="p-3.5 rounded-lg border bg-muted/20 space-y-3">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
							<MapPin class="w-3.5 h-3.5" /> Ubicación Geográfica y Dirección Completa
						</span>
						<span class="text-[11px] text-muted-foreground">Selecciona País + Código Postal y pulsa el icono para autocompletar</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-5">
							<Label for="edit_cli_pais">País</Label>
							<select
								id="edit_cli_pais"
								name="pais_id"
								bind:value={formPaisId}
								class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm uppercase focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value="">-- SELECCIONAR --</option>
								{#each paises as p}
									<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5 md:col-span-3">
							<Label for="edit_cli_cp">Código Postal</Label>
							<div class="flex gap-1.5">
								<InputUppercase id="edit_cli_cp" name="codigo_postal" bind:value={formCodigoPostal} />
								<Button type="button" variant="outline" size="icon" class="shrink-0" onclick={handleGeoSearch} disabled={searchingGeo} title="Buscar por Código Postal">
									{#if searchingGeo}
										<Loader2 class="w-4 h-4 animate-spin" />
									{:else}
										<MapPin class="w-4 h-4 text-primary" />
									{/if}
								</Button>
							</div>
						</div>

						<div class="space-y-1.5 md:col-span-4">
							<Label for="edit_cli_estado">Estado / Provincia</Label>
							<InputUppercase id="edit_cli_estado" name="estado" bind:value={formEstado} />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label for="edit_cli_ciudad">Ciudad</Label>
							<InputUppercase id="edit_cli_ciudad" name="ciudad" bind:value={formCiudad} />
						</div>

						<div class="space-y-1.5 md:col-span-6">
							<Label for="edit_cli_municipio">Municipio / Condado</Label>
							<InputUppercase id="edit_cli_municipio" name="municipio" bind:value={formMunicipio} />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="edit_cli_dir1">Dirección Principal (Línea 1 - Calle, Av., Urbanización, Edificio, Casa)</Label>
						<InputUppercase id="edit_cli_dir1" name="direccion_1" bind:value={formDireccion1} />
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-7">
							<Label for="edit_cli_dir2">Dirección Secundaria (Línea 2 - Apto, Piso, Local, Punto de Referencia)</Label>
							<InputUppercase id="edit_cli_dir2" name="direccion_2" bind:value={formDireccion2} />
						</div>
						<div class="space-y-1.5 md:col-span-5">
							<Label for="edit_cli_ref">Referencia Adicional</Label>
							<InputUppercase id="edit_cli_ref" name="referencia" bind:value={formReferencia} />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>Cancelar</Button>
					<Button type="submit">Actualizar Cliente</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Ficha de Cliente -->
{#if isDetailOpen && selectedClient}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Ficha de Cliente</DialogTitle>
			</DialogHeader>

			<div class="space-y-3 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedClient.activo} />
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Nombre Completo</span>
					<span class="font-bold text-base uppercase">{selectedClient.nombre_completo}</span>
					{#if selectedClient.email}
						<span class="text-xs text-muted-foreground block">{selectedClient.email}</span>
					{:else}
						<span class="text-xs font-mono text-muted-foreground italic block">SIN CORREO REGISTRADO</span>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Código de Cliente Asignado</span>
						<Badge variant="outline" class="font-mono font-bold text-xs text-primary bg-primary/5">
							{selectedClient.codigo || 'SIN CÓDIGO'}
						</Badge>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Vinculación Auth</span>
						{#if selectedClient.user_id}
							<span class="text-xs text-emerald-600 font-medium flex items-center gap-1">
								<ShieldCheck class="w-3.5 h-3.5" /> Vinculado a Supabase Auth
							</span>
						{:else}
							<span class="text-xs text-amber-600 font-medium flex items-center gap-1">
								<ShieldAlert class="w-3.5 h-3.5" /> Perfil sin usuario auth
							</span>
						{/if}
					</div>
				</div>

				{#if !selectedClient.user_id && isAdmin}
					<div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
						<div class="flex items-center justify-between gap-2">
							<div class="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
								<Key class="w-4 h-4 shrink-0" />
								<span>Acceso de inicio de sesión no asignado</span>
							</div>
							<Button
								type="button"
								size="sm"
								variant="outline"
								class="h-7 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/20 gap-1"
								onclick={() => {
									isLinkAuthOpen = !isLinkAuthOpen;
									if (isLinkAuthOpen && selectedClient) {
										linkAuthEmail = selectedClient.email?.trim() ? selectedClient.email.trim() : getDummyEmailForClient(selectedClient);
										linkAuthPassword = '';
									}
								}}
							>
								<Key class="w-3.5 h-3.5" />
								{isLinkAuthOpen ? 'Cancelar' : '🔑 Activar Acceso'}
							</Button>
						</div>
						{#if isLinkAuthOpen}
							<form method="POST" action="?/linkAuthUser" use:enhance autocomplete="off" class="space-y-3 pt-2 border-t border-amber-500/20">
								<input type="hidden" name="profile_id" value={selectedClient.id} />
								<input type="hidden" name="nombre_completo" value={selectedClient.nombre_completo} />
								<div class="space-y-1">
									<Label for="cli_link_email" class="text-xs font-medium">Correo Electrónico (Opcional / Dummy Sugerido)</Label>
									<Input
										id="cli_link_email"
										name="email"
										type="email"
										autocomplete="new-password"
										data-lpignore="true"
										data-1p-ignore="true"
										bind:value={linkAuthEmail}
										placeholder={getDummyEmailForClient(selectedClient)}
										class="h-8 text-xs bg-background font-mono"
									/>
									{#if !selectedClient.email}
										<p class="text-[11px] text-muted-foreground leading-tight">
											💡 Se ha pre-cargado el correo virtual sugerido
											<span class="font-mono font-semibold text-primary">
												{getDummyEmailForClient(selectedClient)}
											</span>
											para que pueda ingresar directamente con su código o celular. Puedes dejarlo así o escribir un correo real.
										</p>
									{/if}
								</div>
								<div class="space-y-1">
									<Label for="cli_link_pass" class="text-xs font-medium">Asignar contraseña (Mín. 6 caracteres) *</Label>
									<Input
										id="cli_link_pass"
										name="password"
										type="password"
										autocomplete="new-password"
										data-lpignore="true"
										data-1p-ignore="true"
										required
										minlength={6}
										placeholder="Contraseña para ingreso al sistema"
										bind:value={linkAuthPassword}
										class="h-8 text-xs bg-background"
									/>
								</div>
								<div class="flex justify-end">
									<Button type="submit" size="sm" class="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1">
										<Check class="w-3.5 h-3.5" /> Activar Usuario
									</Button>
								</div>
							</form>
						{/if}
					</div>
				{/if}

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Razón Social</span>
					<span class="uppercase">{selectedClient.razon_social || 'N/A'}</span>
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Dirección</span>
					<span class="uppercase block">{selectedClient.direccion_1 || '-'}</span>
					{#if selectedClient.direccion_2}
						<span class="uppercase block text-xs text-muted-foreground">{selectedClient.direccion_2}</span>
					{/if}
				</div>

				<div class="grid grid-cols-3 gap-2 border-b pb-2 text-xs">
					<div>
						<span class="text-muted-foreground block">País</span>
						<span class="font-medium uppercase">{selectedClient.pais?.nombre || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground block">C.P.</span>
						<span class="font-medium">{selectedClient.codigo_postal || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground block">Ciudad</span>
						<span class="font-medium uppercase">{selectedClient.ciudad || '-'}</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2 text-xs">
					<div>
						<span class="text-muted-foreground block">Estado / Municipio</span>
						<span class="font-medium uppercase">
							{selectedClient.estado || ''} {selectedClient.municipio ? `/ ${selectedClient.municipio}` : ''}
						</span>
					</div>
					<div>
						<span class="text-muted-foreground block">Teléfonos</span>
						<span class="font-medium block">Cel: {selectedClient.numero_celular || '-'}</span>
						<span class="font-medium block">Fijo: {selectedClient.telefono || '-'}</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs">
					<div>
						<span class="text-muted-foreground block">Tipo de Adquisición</span>
						<span class="font-medium uppercase">{selectedClient.tipo_adquisicion?.nombre || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground block">Referencia</span>
						<span class="font-medium uppercase">{selectedClient.referencia || '-'}</span>
					</div>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
