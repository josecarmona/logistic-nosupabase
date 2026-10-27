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
		Users,
		UserPlus,
		Mail,
		Phone,
		Smartphone,
		Globe,
		Map,
		Tag,
		Settings,
		ShieldCheck,
		Download,
		Link as LinkIcon,
		Key,
		ShieldAlert,
		Check,
		EyeOff,
		Copy
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { ProfileWithRelations } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const profiles = $derived(data.profiles || []);
	const canViewPasswords = $derived(data.canViewPasswords ?? true);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);
	const paises = $derived(data.paises || []);
	const adquisiciones = $derived(data.adquisiciones || []);
	const roles = $derived(data.roles || []);
	const configsCodigo = $derived(data.configsCodigo || []);
	const currentRol = $derived(data.currentRol || 'staff');

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search;
	});

	// Exportar Usuarios a CSV
	function exportToCSV() {
		if (!profiles || profiles.length === 0) {
			toast.error('No hay usuarios para exportar');
			return;
		}

		const columns = [
			{ key: 'codigo', label: 'Código' },
			{ key: 'nombre_completo', label: 'Nombre Completo' },
			{ key: 'email', label: 'Email' },
			{ key: 'rol', label: 'Rol' },
			{ key: 'numero_celular', label: 'Celular' },
			{ key: 'ciudad', label: 'Ciudad' }
		];

		const rows = profiles.map((p) => ({
			codigo: p.codigo || '',
			nombre_completo: p.nombre_completo,
			email: p.email,
			rol: p.rol?.nombre || 'cliente',
			numero_celular: p.numero_celular || '',
			ciudad: p.ciudad || ''
		}));

		const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
		const csvRows = rows.map((row: any) =>
			columns.map((col) => `"${String(row[col.key]).replace(/"/g, '""')}"`).join(',')
		);

		const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...csvRows].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `Usuarios_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success('Listado de usuarios descargado en CSV');
	}

	// Modales
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDetailOpen = $state(false);
	let isConfigCodigoOpen = $state(false);
	let selectedProfile = $state<ProfileWithRelations | null>(null);

	// Estado configuración código por ROL
	let cfgRolId = $state('');
	let formPrefijo = $state('');
	let formSufijo = $state('');
	let formLongitudNumero = $state(6);

	$effect(() => {
		if (roles && roles.length > 0 && !cfgRolId) {
			cfgRolId = String(roles[0].id);
		}
	});

	$effect(() => {
		if (cfgRolId && configsCodigo) {
			const matched = configsCodigo.find((c) => String(c.rol_id) === String(cfgRolId));
			if (matched) {
				formPrefijo = matched.prefijo || '';
				formSufijo = matched.sufijo || '';
				formLongitudNumero = matched.longitud_numero || 6;
			} else {
				const matchedRol = roles.find((r) => String(r.id) === String(cfgRolId));
				formPrefijo = matchedRol ? matchedRol.nombre.substring(0, 3).toUpperCase() : 'CLI';
				formSufijo = '';
				formLongitudNumero = 6;
			}
		}
	});

	function getPreviewCode(pre: string, suf: string, len: number): string {
		const num = '1'.padStart(len || 6, '0');
		const p = (pre || '').trim().toUpperCase();
		const s = (suf || '').trim().toUpperCase();
		if (p && s) return `${p}-${num}-${s}`;
		if (p && !s) return `${p}-${num}`;
		if (!p && s) return `${num}-${s}`;
		return num;
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
	let formCedula = $state('');
	let formPassword = $state('');
	let isLinkAuthOpen = $state(false);
	let linkAuthEmail = $state('');
	let linkAuthPassword = $state('');
	let showPasswordInDetail = $state(false);
	let showPasswordInEdit = $state(false);
	let showPasswordInCreate = $state(false);
	let showPasswordInLink = $state(false);

	function getDummyEmailForProfile(p: ProfileWithRelations): string {
		const raw = (p.codigo || (p.id ? p.id.slice(0, 8) : 'cliente')).trim();
		const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
		return `${clean}@cliente.hhworldgroup.com`;
	}

	function copyPasswordToClipboard(pass?: string | null) {
		if (!pass) return;
		navigator.clipboard.writeText(pass);
		toast.success('Contraseña copiada al portapapeles');
	}

	const isVenezuelaCreate = $derived.by(() => {
		const p = paises.find((pa) => String(pa.id) === String(formPaisId));
		return p?.codigo_iso2 === 'VE';
	});

	let searchingGeo = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'create'
					? 'Perfil creado correctamente'
					: form.action === 'update'
						? 'Perfil actualizado correctamente'
						: form.action === 'updateCodeConfig'
							? `Configuración de código actualizada. Se reconstruyeron ${form.updatedCount ?? 0} usuarios.`
						: form.action === 'linkAuthUser'
							? 'Cuenta de acceso Supabase Auth vinculada correctamente'
							: 'Estado actualizado'
			);
			isCreateOpen = false;
			isEditOpen = false;
			isConfigCodigoOpen = false;
			isDetailOpen = false;
			isLinkAuthOpen = false;
		} else if ((form as any)?.message) {
			toast.error('Error', { description: String((form as any).message) });
		}
	});

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		if (currentRol && currentRol !== 'staff') params.set('rol', currentRol);
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleRoleChange(newRol: string) {
		const params = new URLSearchParams();
		if (newRol && newRol !== 'staff') params.set('rol', newRol);
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
		formPaisId = paises.length > 0 ? String(paises[0].id) : '';
		formCodigoPostal = '';
		formCiudad = '';
		formEstado = '';
		formMunicipio = '';
		formCelular = '';
		formTelefono = '';
		formTipoAdquisicionId = adquisiciones.length > 0 ? String(adquisiciones[0].id) : '';
		formReferencia = '';
		formRolId = roles.length > 0 ? String(roles[0].id) : '';
		formCedula = '';
		formPassword = '';
		showPasswordInCreate = false;
		isCreateOpen = true;
	}

	function openEdit(p: ProfileWithRelations) {
		selectedProfile = p;
		formId = String(p.id);
		formEmail = p.email || '';
		formNombre = p.nombre_completo;
		formRazonSocial = p.razon_social || '';
		formDireccion1 = p.direccion_1 || '';
		formDireccion2 = p.direccion_2 || '';
		formPaisId = p.pais_id ? String(p.pais_id) : '';
		formCodigoPostal = p.codigo_postal || '';
		formCiudad = p.ciudad || '';
		formEstado = p.estado || '';
		formMunicipio = p.municipio || '';
		formCelular = p.numero_celular || '';
		formTelefono = p.telefono || '';
		formTipoAdquisicionId = p.tipo_adquisicion_id ? String(p.tipo_adquisicion_id) : '';
		formReferencia = p.referencia || '';
		formRolId = p.rol_id ? String(p.rol_id) : '';
		formCedula = p.cedula || '';
		formPassword = '';
		showPasswordInEdit = false;
		isEditOpen = true;
	}

	function openDetail(p: ProfileWithRelations) {
		selectedProfile = p;
		isLinkAuthOpen = false;
		linkAuthEmail = p.email && p.email.trim() ? p.email.trim() : getDummyEmailForProfile(p);
		linkAuthPassword = '';
		showPasswordInDetail = false;
		showPasswordInLink = false;
		isDetailOpen = true;
	}

	async function handleGeoLookup() {
		if (!formCodigoPostal) {
			toast.error('Atención', { description: 'Ingresa un Código Postal para consultar' });
			return;
		}

		let iso2 = 'US';
		let paisNombre = 'United States';
		if (formPaisId) {
			const found = paises.find((p) => String(p.id) === String(formPaisId));
			if (found?.codigo_iso2) iso2 = found.codigo_iso2;
			if (found?.nombre) paisNombre = found.nombre;
		}

		searchingGeo = true;
		try {
			const { result, message } = await lookupGeoLocationWithDetails(iso2, formCodigoPostal, paisNombre);
			if (result && (result.ciudad || result.estado || result.municipio)) {
				if (result.ciudad) formCiudad = result.ciudad.toUpperCase();
				if (result.estado) formEstado = result.estado.toUpperCase();
				if (result.municipio) formMunicipio = result.municipio.toUpperCase();
				toast.success('Ubicación obtenida correctamente');
			} else {
				toast.info(message || 'No se encontró ubicación automática', {
					description: message ? undefined : 'Por favor completa los datos manualmente.'
				});
			}
		} catch (e) {
			toast.error('Error al consultar la ubicación');
		} finally {
			searchingGeo = false;
		}
	}
</script>

<svelte:head>
	<title>Panel de Administración - Gestión de Usuarios</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-6 space-y-6">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
		<div>
			<h1 class="text-2xl font-extrabold tracking-tight flex items-center gap-2">
				<Users class="w-6 h-6 text-primary" /> Gestión de Usuarios y Perfiles
			</h1>
			<p class="text-sm text-muted-foreground">
				Panel exclusivo de administración para la gestión completa de perfiles, roles y usuarios Auth.
			</p>
		</div>

		<div class="flex items-center gap-2 w-full sm:w-auto">
			<Button onclick={exportToCSV} variant="outline" class="gap-2 flex-1 sm:flex-none">
				<Download class="w-4 h-4" /> Exportar CSV
			</Button>

			<Button onclick={() => (isConfigCodigoOpen = true)} variant="outline" class="gap-2 flex-1 sm:flex-none">
				<Settings class="w-4 h-4" /> Configurar Códigos por Rol
			</Button>

			<Button onclick={openCreate} class="gap-2 flex-1 sm:flex-none">
				<UserPlus class="w-4 h-4" /> Nuevo Perfil / Usuario
			</Button>
		</div>
	</div>

	<!-- Controles de Búsqueda y Filtro de Roles -->
	<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
		<form onsubmit={handleSearch} class="flex w-full lg:w-80 items-center gap-2">
			<div class="relative w-full">
				<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar por código, nombre o email…"
					class="pl-8"
					bind:value={searchInput}
				/>
			</div>
			<Button type="submit" variant="secondary" size="sm">Buscar</Button>
		</form>

		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="text-xs font-semibold text-muted-foreground mr-1">Filtrar:</span>
			<Button
				variant={currentRol === 'staff' ? 'default' : 'outline'}
				size="sm"
				class="h-8 text-xs font-medium"
				onclick={() => handleRoleChange('staff')}
			>
				Personal / Staff
			</Button>
			{#each roles as r}
				<Button
					variant={currentRol === String(r.id) ? 'default' : 'outline'}
					size="sm"
					class="h-8 text-xs font-medium uppercase"
					onclick={() => handleRoleChange(String(r.id))}
				>
					{r.nombre}
				</Button>
			{/each}
			<Button
				variant={currentRol === 'all' ? 'default' : 'outline'}
				size="sm"
				class="h-8 text-xs font-medium"
				onclick={() => handleRoleChange('all')}
			>
				Todos
			</Button>
		</div>
	</div>

	<!-- Tabla / Tarjetas de Usuarios -->
	<div class="space-y-4">
		<!-- Vista Móvil (Cards) -->
		<div class="grid grid-cols-1 gap-3 sm:hidden">
			{#each profiles as p (p.id)}
				<div
					class={`p-4 rounded-lg border bg-card transition-all ${
						!p.activo ? 'bg-muted/40 text-muted-foreground opacity-60' : ''
					}`}
				>
					<div class="flex items-start justify-between">
						<div>
							<div class="flex items-center gap-1.5 mb-1">
								{#if p.codigo}
									<Badge variant="outline" class="font-mono text-[10px] font-bold text-primary bg-primary/5">
										{p.codigo}
									</Badge>
								{/if}
								<Badge variant="outline" class="uppercase text-[10px] font-bold">
									{p.rol?.nombre || 'CLIENTE'}
								</Badge>
							</div>
							<h3 class={`font-bold uppercase ${!p.activo ? 'line-through' : ''}`}>
								{p.nombre_completo || p.email}
							</h3>
							<p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
								<Mail class="w-3 h-3" /> {p.email}
							</p>
						</div>
						<StatusBadge activo={p.activo} />
					</div>

					<div class="mt-3 flex items-center justify-between pt-2 border-t text-xs">
						<span class="text-muted-foreground">
							{p.ciudad || 'CIUDAD N/A'}
						</span>

						<div class="flex items-center gap-1">
							<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openDetail(p)}>
								<Eye class="w-3.5 h-3.5" />
							</Button>
							<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openEdit(p)}>
								<Edit class="w-3.5 h-3.5" />
							</Button>
							<form method="POST" action="?/toggleActive" use:enhance class="inline">
								<input type="hidden" name="id" value={p.id} />
								<input type="hidden" name="activo" value={String(p.activo)} />
								<Button
									type="submit"
									variant="ghost"
									size="icon"
									class={`h-8 w-8 ${p.activo ? 'text-destructive' : 'text-emerald-600'}`}
								>
									<Power class="w-3.5 h-3.5" />
								</Button>
							</form>
						</div>
					</div>
				</div>
			{:else}
				<div class="text-center py-8 text-muted-foreground border rounded-lg bg-card">
					No se encontraron perfiles o usuarios registrados.
				</div>
			{/each}
		</div>

		<!-- Vista Escritorio (Tabla) -->
		<div class="hidden sm:block border rounded-lg overflow-hidden bg-card">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
						<tr>
							<th class="p-3">Código</th>
							<th class="p-3">Nombre Completo</th>
							<th class="p-3">Email</th>
							<th class="p-3">Rol</th>
							<th class="p-3">Celular</th>
							<th class="p-3">Estado</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if profiles.length === 0}
							<tr>
								<td colspan="7" class="p-6 text-center text-muted-foreground">
									No se encontraron perfiles o usuarios registrados.
								</td>
							</tr>
						{:else}
							{#each profiles as p (p.id)}
								<tr
									class={`hover:bg-muted/40 transition-colors ${
										!p.activo ? 'text-muted-foreground opacity-60 bg-muted/20' : ''
									}`}
								>
									<td class="p-3 font-mono text-xs font-bold">
										{#if p.codigo}
											<Badge variant="outline" class="font-mono text-xs font-bold text-primary bg-primary/5">
												{p.codigo}
											</Badge>
										{:else}
											<span class="text-muted-foreground text-xs">-</span>
										{/if}
									</td>
									<td class="p-3 font-semibold uppercase">
										{p.nombre_completo || p.email}
									</td>
									<td class="p-3 text-xs">
										{p.email}
									</td>
									<td class="p-3">
										<div class="flex flex-col gap-1 items-start">
											<Badge variant="outline" class="uppercase text-xs font-semibold">
												{p.rol?.nombre || 'CLIENTE'}
											</Badge>
											{#if p.user_id}
												<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[9px] font-bold uppercase gap-1 py-0">
													<ShieldCheck class="w-2.5 h-2.5" /> Acceso Activo
												</Badge>
											{:else}
												<Badge variant="secondary" class="text-[9px] font-normal uppercase py-0 text-muted-foreground">
													Sin Usuario
												</Badge>
											{/if}
										</div>
									</td>
									<td class="p-3 text-xs font-mono">
										{p.numero_celular || '-'}
									</td>
									<td class="p-3">
										<StatusBadge activo={p.activo} />
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											<Button variant="ghost" size="icon" title="Ver Detalle" onclick={() => openDetail(p)}>
												<Eye class="w-4 h-4" />
											</Button>
											<Button variant="ghost" size="icon" title="Editar Perfil" onclick={() => openEdit(p)}>
												<Edit class="w-4 h-4" />
											</Button>
											<form method="POST" action="?/toggleActive" use:enhance class="inline">
												<input type="hidden" name="id" value={p.id} />
												<input type="hidden" name="activo" value={String(p.activo)} />
												<Button
													type="submit"
													variant="ghost"
													size="icon"
													class={p.activo ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-600'}
													title={p.activo ? 'Desactivar perfil' : 'Activar perfil'}
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

<!-- Modal: Crear Perfil / Usuario -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
			<DialogHeader class="border-b pb-3">
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<UserPlus class="w-5 h-5 text-primary" /> Crear Nuevo Perfil / Usuario
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createProfile" use:enhance autocomplete="off" class="space-y-5 py-2">
				<!-- SECCIÓN 1: INFORMACIÓN DE CONTACTO Y ACCESO -->
				<div class="space-y-3">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
							1. Información de Contacto y Credenciales
						</span>
						<Badge variant="outline" class="text-[10px] font-bold uppercase text-primary border-primary/30 bg-primary/5">
							Nuevo Perfil
						</Badge>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
						<div class="md:col-span-7 space-y-1.5">
							<Label for="c_nombre" class="text-xs font-semibold">Nombre Completo / Razón Social Principal *</Label>
							<InputUppercase id="c_nombre" name="nombre_completo" required bind:value={formNombre} placeholder="EJ. JUAN PÉREZ" />
						</div>

						<div class="md:col-span-5 space-y-1.5">
							<Label for="c_razon" class="text-xs font-semibold">Razón Social / Empresa (Opcional)</Label>
							<InputUppercase id="c_razon" name="razon_social" bind:value={formRazonSocial} placeholder="EJ. INVERSIONES PÉREZ C.A." />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
						<div class="space-y-1.5">
							<Label for="c_cel" class="text-xs font-semibold">Teléfono Celular</Label>
							<Input id="c_cel" name="numero_celular" bind:value={formCelular} placeholder="+584141234567" autocomplete="off" />
						</div>

						<div class="space-y-1.5">
							<Label for="c_tel" class="text-xs font-semibold">Teléfono Fijo / Contacto Alterno</Label>
							<Input id="c_tel" name="telefono" bind:value={formTelefono} placeholder="+582121234567" autocomplete="off" />
						</div>

						<div class="space-y-1.5">
							<Label for="c_email" class="text-xs font-semibold">Correo Electrónico (Opcional si es cliente)</Label>
							<Input id="c_email" name="email" type="email" bind:value={formEmail} placeholder="correo@ejemplo.com" autocomplete="new-password" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3 rounded-lg bg-muted/30 border">
						<div class="space-y-1.5">
							<Label for="c_rol" class="text-xs font-semibold">Rol Asignado (Solo Admin) *</Label>
							<select id="c_rol" name="rol_id" bind:value={formRolId} required class="w-full h-10 px-3 rounded-md border bg-background text-sm uppercase font-semibold">
								{#each roles as r}
									<option value={String(r.id)}>{r.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5">
							<Label for="c_password" class="flex items-center justify-between text-xs">
								<span class="font-bold text-primary flex items-center gap-1">
									<ShieldCheck class="w-3.5 h-3.5" /> Contraseña de Acceso al Sistema
								</span>
								<span class="text-[10px] text-muted-foreground font-normal">(Mín. 6 caracteres)</span>
							</Label>
							<div class="relative">
								<Input
									id="c_password"
									name="password"
									type={showPasswordInCreate ? 'text' : 'password'}
									bind:value={formPassword}
									placeholder="Crear contraseña para ingreso"
									autocomplete="new-password"
									class="pr-9 font-mono"
								/>
								<button
									type="button"
									onclick={() => (showPasswordInCreate = !showPasswordInCreate)}
									class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									title={showPasswordInCreate ? 'Ocultar contraseña' : 'Ver contraseña'}
								>
									{#if showPasswordInCreate}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- SECCIÓN 2: DIRECCIÓN Y UBICACIÓN -->
				<div class="space-y-3 pt-1">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
							2. Dirección y Ubicación de Entrega
						</span>
						<Badge variant="outline" class="text-[10px] font-bold uppercase text-emerald-700 border-emerald-500/30 bg-emerald-500/10">
							📍 Autocompletado Postal
						</Badge>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-muted/20 p-3.5 rounded-lg border items-end">
						<div class="sm:col-span-4 space-y-1.5">
							<Label for="c_pais" class="text-xs font-semibold">País *</Label>
							<select id="c_pais" name="pais_id" bind:value={formPaisId} class="w-full h-10 px-3 rounded-md border bg-background text-sm uppercase font-medium">
								<option value="">-- SELECCIONAR PAÍS --</option>
								{#each paises as pa}
									<option value={String(pa.id)}>{pa.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="c_cp" class="text-xs font-semibold">Código Postal</Label>
							<div class="flex gap-1.5">
								<InputUppercase id="c_cp" name="codigo_postal" bind:value={formCodigoPostal} placeholder="EJ. 30047 / 58217" />
								<Button type="button" variant="secondary" class="shrink-0 gap-1.5 px-3" onclick={handleGeoLookup} disabled={searchingGeo} title="Autocompletar Ciudad, Estado y Municipio">
									{#if searchingGeo}
										<Loader2 class="w-4 h-4 animate-spin" />
									{:else}
										<MapPin class="w-4 h-4 text-primary" />
									{/if}
									<span class="text-xs font-bold">Geo</span>
								</Button>
							</div>
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="c_cedula" class="text-xs font-semibold {isVenezuelaCreate ? 'text-amber-700 dark:text-amber-400 font-bold' : ''}">
								Cédula / RIF {isVenezuelaCreate ? '(Obligatorio VE) *' : '(Opcional)'}
							</Label>
							<InputUppercase
								id="c_cedula"
								name="cedula"
								placeholder="EJ. V-12345678"
								required={isVenezuelaCreate}
								bind:value={formCedula}
							/>
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="c_estado" class="text-xs font-semibold">Estado / Provincia</Label>
							<InputUppercase id="c_estado" name="estado" bind:value={formEstado} placeholder="ESTADO O PROVINCIA" />
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="c_ciudad" class="text-xs font-semibold">Ciudad / Localidad</Label>
							<InputUppercase id="c_ciudad" name="ciudad" bind:value={formCiudad} placeholder="CIUDAD" />
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="c_mun" class="text-xs font-semibold">Municipio / Población</Label>
							<InputUppercase id="c_mun" name="municipio" bind:value={formMunicipio} placeholder="MUNICIPIO O CONDADO" />
						</div>
					</div>

					<!-- Direcciones a ancho completo para lectura sin recortes -->
					<div class="space-y-3">
						<div class="space-y-1.5">
							<Label for="c_dir1" class="text-xs font-semibold flex items-center gap-1">
								<MapPin class="w-3.5 h-3.5 text-primary" /> Dirección Línea 1 (Calle / Avenida / Urbanización / N° Exterior)
							</Label>
							<InputUppercase id="c_dir1" name="direccion_1" bind:value={formDireccion1} placeholder="AV. PRINCIPAL, CALLE, NÚMERO DE CASA O EDIFICIO..." />
						</div>

						<div class="space-y-1.5">
							<Label for="c_dir2" class="text-xs font-semibold">Dirección Línea 2 (Edificio, Piso, Depto / Interior, Colonia)</Label>
							<InputUppercase id="c_dir2" name="direccion_2" bind:value={formDireccion2} placeholder="EDIFICIO A, PISO 3, APTO 3B, SECTOR O COLONIA..." />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
						<div class="md:col-span-4 space-y-1.5">
							<Label for="c_adq" class="text-xs font-semibold">Tipo de Adquisición</Label>
							<select id="c_adq" name="tipo_adquisicion_id" bind:value={formTipoAdquisicionId} class="w-full h-10 px-3 rounded-md border bg-background text-sm uppercase">
								<option value="">-- SELECCIONAR --</option>
								{#each adquisiciones as ad}
									<option value={String(ad.id)}>{ad.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="md:col-span-8 space-y-1.5">
							<Label for="c_ref" class="text-xs font-semibold">Referencias / Entre Calles / Observaciones</Label>
							<InputUppercase id="c_ref" name="referencia" bind:value={formReferencia} placeholder="PUNTOS DE REFERENCIA O ENTRE CALLES..." />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-4 border-t">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar Perfil</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Editar Perfil -->
{#if isEditOpen}
	<Dialog bind:open={isEditOpen}>
		<DialogContent class="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
			<DialogHeader class="border-b pb-3">
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Perfil / Usuario
					{#if selectedProfile?.codigo}
						<Badge variant="outline" class="font-mono text-xs text-primary bg-primary/5 ml-1">{selectedProfile.codigo}</Badge>
					{/if}
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateProfile" use:enhance autocomplete="off" class="space-y-5 py-2">
				<input type="hidden" name="id" value={formId} />

				<!-- SECCIÓN 1: INFORMACIÓN DE CONTACTO Y ACCESO -->
				<div class="space-y-3">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
							1. Información de Contacto y Credenciales
						</span>
						{#if selectedProfile?.user_id}
							<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] font-bold uppercase gap-1">
								<ShieldCheck class="w-3 h-3" /> Usuario Auth Activo
							</Badge>
						{/if}
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
						<div class="md:col-span-7 space-y-1.5">
							<Label for="edit_nombre" class="text-xs font-semibold">Nombre Completo / Razón Social Principal *</Label>
							<InputUppercase id="edit_nombre" name="nombre_completo" required bind:value={formNombre} />
						</div>

						<div class="md:col-span-5 space-y-1.5">
							<Label for="edit_razon" class="text-xs font-semibold">Razón Social / Empresa (Opcional)</Label>
							<InputUppercase id="edit_razon" name="razon_social" bind:value={formRazonSocial} />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
						<div class="space-y-1.5">
							<Label for="edit_cel" class="text-xs font-semibold">Teléfono Celular</Label>
							<Input id="edit_cel" name="numero_celular" bind:value={formCelular} autocomplete="off" />
						</div>

						<div class="space-y-1.5">
							<Label for="edit_tel" class="text-xs font-semibold">Teléfono Fijo / Contacto Alterno</Label>
							<Input id="edit_tel" name="telefono" bind:value={formTelefono} autocomplete="off" />
						</div>

						<div class="space-y-1.5">
							<Label for="edit_email" class="text-xs font-semibold">Correo Electrónico (Opcional si es cliente)</Label>
							<Input id="edit_email" name="email" type="email" bind:value={formEmail} placeholder="correo@ejemplo.com" autocomplete="new-password" />
						</div>
					</div>

					<!-- Bloque de Rol y Contraseñas -->
					<div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 p-3.5 rounded-lg bg-muted/30 border">
						<div class="md:col-span-4 space-y-1.5">
							<Label for="edit_rol" class="text-xs font-semibold">Rol Asignado (Solo Admin) *</Label>
							<select id="edit_rol" name="rol_id" bind:value={formRolId} required class="w-full h-10 px-3 rounded-md border bg-background text-sm uppercase font-semibold">
								{#each roles as r}
									<option value={String(r.id)}>{r.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						{#if canViewPasswords}
							<div class="md:col-span-4 space-y-1.5">
								<Label class="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
									<Key class="w-3.5 h-3.5" /> Contraseña Actual Registrada
								</Label>
								<div class="flex items-center gap-1.5 h-10 px-3 rounded-md border bg-background">
									{#if selectedProfile?.password_visible}
										<span class="font-mono text-xs font-bold flex-1 truncate select-all">
											{showPasswordInEdit ? selectedProfile.password_visible : '••••••••••••'}
										</span>
										<button
											type="button"
											onclick={() => (showPasswordInEdit = !showPasswordInEdit)}
											class="text-muted-foreground hover:text-primary p-1"
											title={showPasswordInEdit ? 'Ocultar contraseña' : 'Visualizar contraseña actual'}
										>
											{#if showPasswordInEdit}
												<EyeOff class="w-4 h-4" />
											{:else}
												<Eye class="w-4 h-4" />
											{/if}
										</button>
										<button
											type="button"
											onclick={() => copyPasswordToClipboard(selectedProfile?.password_visible)}
											class="text-muted-foreground hover:text-primary p-1"
											title="Copiar contraseña"
										>
											<Copy class="w-3.5 h-3.5" />
										</button>
									{:else}
										<span class="text-[11px] text-muted-foreground italic flex-1">
											{selectedProfile?.user_id ? 'Sin copia en texto (asigne nueva)' : 'Sin acceso asignado'}
										</span>
									{/if}
								</div>
							</div>
						{/if}

						<div class="{canViewPasswords ? 'md:col-span-4' : 'md:col-span-8'} space-y-1.5">
							<Label for="edit_password" class="flex items-center justify-between text-xs">
								<span class="font-bold text-primary flex items-center gap-1">
									<ShieldCheck class="w-3.5 h-3.5" /> Asignar / Cambiar Clave
								</span>
								<span class="text-[10px] text-muted-foreground font-normal">(Vacío = no cambiar)</span>
							</Label>
							<div class="relative">
								<Input
									id="edit_password"
									name="password"
									type={showPasswordInEdit ? 'text' : 'password'}
									bind:value={formPassword}
									placeholder="Nueva contraseña (mín. 6)"
									autocomplete="new-password"
									class="pr-9 font-mono"
								/>
								<button
									type="button"
									onclick={() => (showPasswordInEdit = !showPasswordInEdit)}
									class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									title={showPasswordInEdit ? 'Ocultar contraseña' : 'Ver contraseña'}
								>
									{#if showPasswordInEdit}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- SECCIÓN 2: DIRECCIÓN Y UBICACIÓN -->
				<div class="space-y-3 pt-1">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
							2. Dirección y Ubicación de Entrega
						</span>
						<Badge variant="outline" class="text-[10px] font-bold uppercase text-emerald-700 border-emerald-500/30 bg-emerald-500/10">
							📍 Autocompletado Postal
						</Badge>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-muted/20 p-3.5 rounded-lg border items-end">
						<div class="sm:col-span-4 space-y-1.5">
							<Label for="edit_pais" class="text-xs font-semibold">País *</Label>
							<select id="edit_pais" name="pais_id" bind:value={formPaisId} class="w-full h-10 px-3 rounded-md border bg-background text-sm uppercase font-medium">
								<option value="">-- SELECCIONAR PAÍS --</option>
								{#each paises as pa}
									<option value={String(pa.id)}>{pa.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="edit_cp" class="text-xs font-semibold">Código Postal</Label>
							<div class="flex gap-1.5">
								<InputUppercase id="edit_cp" name="codigo_postal" bind:value={formCodigoPostal} />
								<Button type="button" variant="secondary" class="shrink-0 gap-1.5 px-3" onclick={handleGeoLookup} disabled={searchingGeo} title="Autocompletar Ciudad, Estado y Municipio">
									{#if searchingGeo}
										<Loader2 class="w-4 h-4 animate-spin" />
									{:else}
										<MapPin class="w-4 h-4 text-primary" />
									{/if}
									<span class="text-xs font-bold">Geo</span>
								</Button>
							</div>
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="edit_cedula" class="text-xs font-semibold {isVenezuelaCreate ? 'text-amber-700 dark:text-amber-400 font-bold' : ''}">
								Cédula / RIF {isVenezuelaCreate ? '(Obligatorio VE) *' : '(Opcional)'}
							</Label>
							<InputUppercase
								id="edit_cedula"
								name="cedula"
								placeholder="EJ. V-12345678"
								required={isVenezuelaCreate}
								bind:value={formCedula}
							/>
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="edit_estado" class="text-xs font-semibold">Estado / Provincia</Label>
							<InputUppercase id="edit_estado" name="estado" bind:value={formEstado} />
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="edit_ciudad" class="text-xs font-semibold">Ciudad / Localidad</Label>
							<InputUppercase id="edit_ciudad" name="ciudad" bind:value={formCiudad} />
						</div>

						<div class="sm:col-span-4 space-y-1.5">
							<Label for="edit_mun" class="text-xs font-semibold">Municipio / Población</Label>
							<InputUppercase id="edit_mun" name="municipio" bind:value={formMunicipio} />
						</div>
					</div>

					<!-- Direcciones a ancho completo para lectura sin recortes -->
					<div class="space-y-3">
						<div class="space-y-1.5">
							<Label for="edit_dir1" class="text-xs font-semibold flex items-center gap-1">
								<MapPin class="w-3.5 h-3.5 text-primary" /> Dirección Línea 1 (Calle / Avenida / Urbanización / N° Exterior)
							</Label>
							<InputUppercase id="edit_dir1" name="direccion_1" bind:value={formDireccion1} />
						</div>

						<div class="space-y-1.5">
							<Label for="edit_dir2" class="text-xs font-semibold">Dirección Línea 2 (Edificio, Piso, Depto / Interior, Colonia)</Label>
							<InputUppercase id="edit_dir2" name="direccion_2" bind:value={formDireccion2} />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
						<div class="md:col-span-4 space-y-1.5">
							<Label for="edit_adq" class="text-xs font-semibold">Tipo de Adquisición</Label>
							<select id="edit_adq" name="tipo_adquisicion_id" bind:value={formTipoAdquisicionId} class="w-full h-10 px-3 rounded-md border bg-background text-sm uppercase">
								<option value="">-- SELECCIONAR --</option>
								{#each adquisiciones as ad}
									<option value={String(ad.id)}>{ad.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="md:col-span-8 space-y-1.5">
							<Label for="edit_ref" class="text-xs font-semibold">Referencias / Entre Calles / Observaciones</Label>
							<InputUppercase id="edit_ref" name="referencia" bind:value={formReferencia} />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-4 border-t">
					<Button type="button" variant="outline" onclick={() => (isEditOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Actualizar Perfil</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Detalle de Perfil -->
{#if isDetailOpen && selectedProfile}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="sm:max-w-xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold">Detalle del Perfil / Usuario</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2 text-sm">
				<div class="flex items-center justify-between border-b pb-2">
					<span class="text-muted-foreground">Estado:</span>
					<StatusBadge activo={selectedProfile.activo} />
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Nombre Completo</span>
						<span class="font-semibold uppercase">{selectedProfile.nombre_completo || '-'}</span>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Correo Electrónico</span>
						<span class="font-medium break-all">{selectedProfile.email || 'SIN CORREO'}</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Rol Asignado</span>
						<Badge variant="outline" class="uppercase text-[10px]">
							{selectedProfile.rol?.nombre || 'CLIENTE'}
						</Badge>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Vinculación Auth</span>
						{#if selectedProfile.user_id}
							<span class="text-xs text-emerald-600 font-medium flex items-center gap-1"><ShieldCheck class="w-3.5 h-3.5" /> Vinculado a Supabase Auth</span>
						{:else}
							<span class="text-xs text-amber-600 font-medium flex items-center gap-1"><ShieldAlert class="w-3.5 h-3.5" /> Perfil sin usuario auth</span>
						{/if}
					</div>
				</div>

				<!-- Visualización de Contraseña para Perfil General Autorizado (HILVIC HERNANDEZ / Admin) -->
				{#if canViewPasswords && selectedProfile.user_id}
					<div class="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1.5">
						<div class="flex items-center justify-between gap-2">
							<span class="text-xs font-bold text-primary flex items-center gap-1.5">
								<Key class="w-4 h-4 shrink-0" /> Contraseña de Acceso del Usuario:
							</span>
							{#if selectedProfile.password_visible}
								<div class="flex items-center gap-1">
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="h-7 px-2 text-xs gap-1"
										onclick={() => (showPasswordInDetail = !showPasswordInDetail)}
									>
										{#if showPasswordInDetail}
											<EyeOff class="w-3.5 h-3.5" /> Ocultar
										{:else}
											<Eye class="w-3.5 h-3.5" /> Visualizar
										{/if}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="h-7 px-2 text-xs gap-1"
										onclick={() => copyPasswordToClipboard(selectedProfile?.password_visible)}
										title="Copiar contraseña"
									>
										<Copy class="w-3.5 h-3.5" /> Copiar
									</Button>
								</div>
							{/if}
						</div>
						{#if selectedProfile.password_visible}
							<div class="p-2 rounded bg-background border font-mono text-sm font-bold tracking-wider text-foreground select-all">
								{showPasswordInDetail ? selectedProfile.password_visible : '••••••••••••'}
							</div>
						{:else}
							<p class="text-xs text-muted-foreground italic">
								Contraseña asignada previamente en cifrado Auth. Para habilitar su lectura directa, asígnele o actualice la clave desde el botón <b>Editar Perfil (✏️)</b>.
							</p>
						{/if}
					</div>
				{/if}

				{#if selectedProfile.cedula || selectedProfile.pais?.codigo_iso2 === 'VE'}
					<div class="border-b pb-2">
						<span class="text-xs text-muted-foreground block">Cédula / RIF (Venezuela)</span>
						<span class="font-mono font-bold text-amber-700 dark:text-amber-400">{selectedProfile.cedula || 'NO REGISTRADA'}</span>
					</div>
				{/if}

				{#if !selectedProfile.user_id}
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
									if (isLinkAuthOpen && selectedProfile) {
										linkAuthEmail = selectedProfile.email && selectedProfile.email.trim()
											? selectedProfile.email.trim()
											: getDummyEmailForProfile(selectedProfile);
										linkAuthPassword = '';
									}
								}}
							>
								<Key class="w-3.5 h-3.5" />
								{isLinkAuthOpen ? 'Cancelar' : '🔑 Crear / Vincular Auth'}
							</Button>
						</div>
						{#if isLinkAuthOpen}
							<form method="POST" action="?/linkAuthUser" use:enhance autocomplete="off" class="space-y-3 pt-2 border-t border-amber-500/20">
								<input type="hidden" name="profile_id" value={selectedProfile.id} />
								<input type="hidden" name="nombre_completo" value={selectedProfile.nombre_completo} />
								<div class="space-y-1">
									<Label for="link_auth_email" class="text-xs font-medium">Correo Electrónico de Acceso (Sugerido / Editable)</Label>
									<Input
										id="link_auth_email"
										name="email"
										type="email"
										bind:value={linkAuthEmail}
										placeholder={getDummyEmailForProfile(selectedProfile)}
										autocomplete="new-password"
										data-lpignore="true"
										class="h-8 text-xs bg-background font-mono"
									/>
									{#if !selectedProfile.email}
										<p class="text-[11px] text-muted-foreground leading-tight">
											💡 Se ha pre-cargado el correo virtual sugerido
											<span class="font-mono font-semibold text-primary">
												{getDummyEmailForProfile(selectedProfile)}
											</span>
											para que el usuario pueda ingresar con su código ({selectedProfile.codigo || ''}) o número celular.
										</p>
									{/if}
								</div>
								<div class="space-y-1">
									<Label for="link_auth_pass" class="text-xs font-medium">Asignar contraseña de acceso (Mín. 6 caracteres) *</Label>
									<div class="relative">
										<Input
											id="link_auth_pass"
											name="password"
											type={showPasswordInLink ? 'text' : 'password'}
											required
											minlength={6}
											placeholder="Contraseña para ingreso al sistema"
											bind:value={linkAuthPassword}
											autocomplete="new-password"
											data-lpignore="true"
											class="h-8 text-xs bg-background pr-8 font-mono"
										/>
										<button
											type="button"
											onclick={() => (showPasswordInLink = !showPasswordInLink)}
											class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											title={showPasswordInLink ? 'Ocultar contraseña' : 'Ver contraseña'}
										>
											{#if showPasswordInLink}
												<EyeOff class="w-3.5 h-3.5" />
											{:else}
												<Eye class="w-3.5 h-3.5" />
											{/if}
										</button>
									</div>
								</div>
								<div class="flex justify-end">
									<Button type="submit" size="sm" class="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1">
										<Check class="w-3.5 h-3.5" /> Confirmar y Vincular
									</Button>
								</div>
							</form>
						{/if}
					</div>
				{/if}

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Razón Social</span>
					<span class="uppercase">{selectedProfile.razon_social || 'N/A'}</span>
				</div>

				<div class="grid grid-cols-2 gap-2 border-b pb-2">
					<div>
						<span class="text-xs text-muted-foreground block">Código de Perfil</span>
						<Badge variant="outline" class="font-mono font-bold text-xs text-primary bg-primary/5">
							{selectedProfile.codigo || 'SIN CÓDIGO'}
						</Badge>
					</div>
					<div>
						<span class="text-xs text-muted-foreground block">Rol Asignado</span>
						<Badge variant="outline" class="uppercase text-xs font-bold">{selectedProfile.rol?.nombre || 'CLIENTE'}</Badge>
					</div>
				</div>

				<div class="border-b pb-2">
					<span class="text-xs text-muted-foreground block">Dirección Completa</span>
					<span class="uppercase block font-medium">{selectedProfile.direccion_1 || '-'}</span>
					{#if selectedProfile.direccion_2}
						<span class="uppercase block text-xs text-muted-foreground">{selectedProfile.direccion_2}</span>
					{/if}
				</div>

				<div class="grid grid-cols-3 gap-2 border-b pb-2 text-xs">
					<div>
						<span class="text-muted-foreground block">País</span>
						<span class="uppercase font-medium">{selectedProfile.pais?.nombre || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground block">Código Postal</span>
						<span class="font-mono font-semibold">{selectedProfile.codigo_postal || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground block">Ciudad / Estado</span>
						<span class="uppercase font-medium">{selectedProfile.ciudad || '-'}{selectedProfile.estado ? `, ${selectedProfile.estado}` : ''}</span>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 text-xs">
					<div>
						<span class="text-muted-foreground block">Teléfono / Celular</span>
						<span>{selectedProfile.telefono || selectedProfile.numero_celular || '-'}</span>
					</div>
					<div>
						<span class="text-muted-foreground block">Tipo Adquisición</span>
						<span class="uppercase font-medium">{selectedProfile.tipo_adquisicion?.nombre || '-'}</span>
					</div>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Configuración de Código Consecutivo de Perfiles por ROL -->
{#if isConfigCodigoOpen}
	<Dialog bind:open={isConfigCodigoOpen}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Settings class="w-5 h-5 text-primary" /> Configurar Código por Rol
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateCodeConfig" use:enhance class="space-y-4 py-2">
				<div class="space-y-2">
					<Label for="cfg_rol">Seleccionar Rol a Configurar *</Label>
					<select id="cfg_rol" name="rol_id" bind:value={cfgRolId} required class="w-full h-10 px-3 rounded border text-sm uppercase">
						{#each roles as r}
							<option value={String(r.id)}>{r.nombre.toUpperCase()}</option>
						{/each}
					</select>
				</div>

				<p class="text-xs text-muted-foreground">
					Personaliza el prefijo, sufijo y cantidad de ceros del código para el rol seleccionado.
				</p>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="cfg_prefijo">Prefijo (Opcional)</Label>
						<InputUppercase
							id="cfg_prefijo"
							name="prefijo"
							maxlength={10}
							placeholder="EJ. CLI"
							bind:value={formPrefijo}
						/>
					</div>

					<div class="space-y-2">
						<Label for="cfg_sufijo">Sufijo (Opcional)</Label>
						<InputUppercase
							id="cfg_sufijo"
							name="sufijo"
							maxlength={10}
							placeholder="EJ. MX"
							bind:value={formSufijo}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="cfg_longitud">Longitud de Dígitos (Relleno de Ceros) *</Label>
					<Input
						id="cfg_longitud"
						name="longitud_numero"
						type="number"
						min="1"
						max="12"
						required
						bind:value={formLongitudNumero}
					/>
				</div>

				<div class="p-3 rounded-md bg-muted/60 text-xs space-y-1">
					<span class="text-muted-foreground font-semibold block uppercase">Ejemplo de Código Resultante para este Rol:</span>
					<div class="font-mono text-sm font-bold text-primary">
						{getPreviewCode(formPrefijo, formSufijo, formLongitudNumero)}
					</div>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isConfigCodigoOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit">Guardar y Reconstruir Rol</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
