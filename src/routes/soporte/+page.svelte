<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import {
		LifeBuoy,
		Plus,
		Search,
		AlertOctagon,
		Sparkles,
		CheckCircle2,
		Clock,
		AlertTriangle,
		MessageSquare,
		User,
		RotateCcw,
		Edit,
		Filter
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { TicketSoporte } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tickets = $derived(data.tickets || []);
	const staffUsers = $derived(data.staffUsers || []);
	const isAdminOrGerente = $derived(data.isAdminOrGerente || false);

	// Filtros reactivos
	let searchInput = $state('');
	let tipoFilter = $state('todos');
	let estatusFilter = $state('todos');

	$effect(() => {
		if (data.filters) {
			searchInput = data.filters.search || '';
			tipoFilter = data.filters.tipo || 'todos';
			estatusFilter = data.filters.estatus || 'todos';
		}
	});

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		if (tipoFilter !== 'todos') params.set('tipo', tipoFilter);
		if (estatusFilter !== 'todos') params.set('estatus', estatusFilter);
		goto(`?${params.toString()}`);
	}

	function resetFilters() {
		searchInput = '';
		tipoFilter = 'todos';
		estatusFilter = 'todos';
		goto('/soporte');
	}

	// Modales
	let isCreateOpen = $state(false);
	let isManageOpen = $state(false);
	let selectedTicket = $state<TicketSoporte | null>(null);

	// Formulario de creación
	let formTipo = $state<'falla' | 'requerimiento' | 'mejora'>('falla');
	let formTitulo = $state('');
	let formModulo = $state('ventas');
	let formPrioridad = $state<'baja' | 'media' | 'alta' | 'critica'>('media');
	let formDescripcion = $state('');
	let formCapturaUrl = $state('');

	// Formulario de gestión (Admin)
	let manageEstatus = $state('abierto');
	let manageAsignadoAId = $state('');
	let manageRespuesta = $state('');

	function openCreate() {
		formTipo = 'falla';
		formTitulo = '';
		formModulo = 'ventas';
		formPrioridad = 'media';
		formDescripcion = '';
		formCapturaUrl = '';
		isCreateOpen = true;
	}

	function openManage(t: TicketSoporte) {
		selectedTicket = t;
		manageEstatus = t.estatus;
		manageAsignadoAId = t.asignado_a_id ? String(t.asignado_a_id) : '';
		manageRespuesta = t.respuesta_soporte || '';
		isManageOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Operación exitosa');
			isCreateOpen = false;
			isManageOpen = false;
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	// Conteo de tickets por tipo y estatus
	const totalAbiertos = $derived(tickets.filter(t => t.estatus === 'abierto' || t.estatus === 'en_revision' || t.estatus === 'en_progreso').length);
	const totalResueltos = $derived(tickets.filter(t => t.estatus === 'resuelto' || t.estatus === 'cerrado').length);
	const totalFallas = $derived(tickets.filter(t => t.tipo === 'falla').length);
	const totalRequerimientos = $derived(tickets.filter(t => t.tipo === 'requerimiento').length);

	function getTipoBadge(tipo: string) {
		switch (tipo) {
			case 'falla':
				return { label: 'FALLA TÉCNICA', class: 'bg-destructive/15 text-destructive border-destructive/30 font-bold' };
			case 'requerimiento':
				return { label: 'REQUERIMIENTO', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold' };
			case 'mejora':
				return { label: 'MEJORA', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold' };
			default:
				return { label: tipo.toUpperCase(), class: 'bg-muted text-muted-foreground' };
		}
	}

	function getPrioridadBadge(p: string) {
		switch (p) {
			case 'critica':
				return { label: 'CRÍTICA', class: 'bg-destructive text-destructive-foreground font-black animate-pulse' };
			case 'alta':
				return { label: 'ALTA', class: 'bg-amber-600 text-white font-bold' };
			case 'media':
				return { label: 'MEDIA', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' };
			case 'baja':
				return { label: 'BAJA', class: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' };
			default:
				return { label: p.toUpperCase(), class: 'bg-muted text-muted-foreground' };
		}
	}

	function getEstatusBadge(e: string) {
		switch (e) {
			case 'abierto':
				return { label: 'ABIERTO', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' };
			case 'en_revision':
				return { label: 'EN REVISIÓN', class: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' };
			case 'en_progreso':
				return { label: 'EN PROGRESO', class: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' };
			case 'resuelto':
				return { label: 'RESUELTO', class: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold' };
			case 'cerrado':
				return { label: 'CERRADO', class: 'bg-muted text-muted-foreground' };
			default:
				return { label: e.toUpperCase(), class: 'bg-muted text-muted-foreground' };
		}
	}
</script>

<svelte:head>
	<title>Módulo de Reportes de Fallas y Requerimientos - Sistema Logístico</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6 space-y-6">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
		<div>
			<div class="flex items-center gap-2">
				<div class="p-2 rounded-lg bg-primary/10 text-primary">
					<LifeBuoy class="w-6 h-6" />
				</div>
				<div>
					<h1 class="text-2xl font-black tracking-tight">Reporte de Fallas y Requerimientos</h1>
					<p class="text-xs sm:text-sm text-muted-foreground">
						Canal centralizado para notificar incidencias técnicas y solicitar nuevas funcionalidades.
					</p>
				</div>
			</div>
		</div>

		<Button onclick={openCreate} class="gap-1.5 text-xs font-bold shadow-sm">
			<Plus class="w-4 h-4" /> Nuevo Reporte
		</Button>
	</div>

	<!-- Tarjetas Resumen -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
		<Card class="border shadow-xs">
			<CardContent class="p-3.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase text-muted-foreground">Pendientes / Activos</span>
					<Clock class="w-4 h-4 text-amber-500" />
				</div>
				<span class="text-2xl font-black font-mono block mt-1 text-amber-600 dark:text-amber-400">
					{totalAbiertos}
				</span>
			</CardContent>
		</Card>

		<Card class="border shadow-xs">
			<CardContent class="p-3.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase text-muted-foreground">Resueltos / Cerrados</span>
					<CheckCircle2 class="w-4 h-4 text-emerald-500" />
				</div>
				<span class="text-2xl font-black font-mono block mt-1 text-emerald-600 dark:text-emerald-400">
					{totalResueltos}
				</span>
			</CardContent>
		</Card>

		<Card class="border shadow-xs">
			<CardContent class="p-3.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase text-muted-foreground">Fallas Técnicas</span>
					<AlertOctagon class="w-4 h-4 text-destructive" />
				</div>
				<span class="text-2xl font-black font-mono block mt-1 text-destructive">
					{totalFallas}
				</span>
			</CardContent>
		</Card>

		<Card class="border shadow-xs">
			<CardContent class="p-3.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-bold uppercase text-muted-foreground">Requerimientos</span>
					<Sparkles class="w-4 h-4 text-blue-500" />
				</div>
				<span class="text-2xl font-black font-mono block mt-1 text-blue-600 dark:text-blue-400">
					{totalRequerimientos}
				</span>
			</CardContent>
		</Card>
	</div>

	<!-- Barra de Búsqueda y Filtros -->
	<Card class="p-3 shadow-xs border bg-card">
		<form onsubmit={(e) => { e.preventDefault(); applyFilters(); }} class="flex flex-col sm:flex-row flex-wrap items-center gap-2.5">
			<div class="relative flex-1 min-w-[200px] w-full sm:w-auto">
				<Search class="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
				<Input
					placeholder="Buscar por código, título o descripción..."
					bind:value={searchInput}
					class="pl-8 h-8 text-xs bg-background"
				/>
			</div>

			<div class="flex items-center gap-1.5 w-full sm:w-auto">
				<select
					bind:value={tipoFilter}
					onchange={applyFilters}
					class="h-8 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
				>
					<option value="todos">Todos los Tipos</option>
					<option value="falla">Falla Técnica</option>
					<option value="requerimiento">Requerimiento</option>
					<option value="mejora">Mejora</option>
				</select>

				<select
					bind:value={estatusFilter}
					onchange={applyFilters}
					class="h-8 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
				>
					<option value="todos">Todos los Estados</option>
					<option value="abierto">Abiertos</option>
					<option value="en_revision">En Revisión</option>
					<option value="en_progreso">En Progreso</option>
					<option value="resuelto">Resueltos</option>
					<option value="cerrado">Cerrados</option>
				</select>

				<Button type="submit" size="sm" class="h-8 text-xs gap-1">
					<Filter class="w-3 h-3" /> Filtrar
				</Button>

				<Button type="button" variant="outline" size="sm" onclick={resetFilters} class="h-8 text-xs" title="Restablecer">
					<RotateCcw class="w-3 h-3" />
				</Button>
			</div>
		</form>
	</Card>

	<!-- Listado de Tickets -->
	<Card class="border shadow-xs overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs border-collapse">
				<thead>
					<tr class="border-b bg-muted/40 font-bold uppercase text-[11px] text-muted-foreground">
						<th class="p-3">Código</th>
						<th class="p-3">Tipo</th>
						<th class="p-3">Prioridad</th>
						<th class="p-3">Título / Detalle</th>
						<th class="p-3">Módulo</th>
						<th class="p-3">Estado</th>
						<th class="p-3">Reportado Por</th>
						<th class="p-3">Fecha</th>
						{#if isAdminOrGerente}
							<th class="p-3 text-right">Gestión</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#if tickets.length === 0}
						<tr>
							<td colspan={isAdminOrGerente ? 9 : 8} class="p-8 text-center text-muted-foreground">
								<LifeBuoy class="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
								<p class="font-bold">No se encontraron reportes registrados</p>
								<p class="text-[11px] mt-1">Haz clic en "Nuevo Reporte" para registrar una falla o solicitud.</p>
							</td>
						</tr>
					{:else}
						{#each tickets as t (t.id)}
							{@const tBadge = getTipoBadge(t.tipo)}
							{@const pBadge = getPrioridadBadge(t.prioridad)}
							{@const eBadge = getEstatusBadge(t.estatus)}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="p-3 font-mono font-bold text-primary">
									{t.codigo}
								</td>
								<td class="p-3">
									<Badge variant="outline" class={`text-[10px] ${tBadge.class}`}>
										{tBadge.label}
									</Badge>
								</td>
								<td class="p-3">
									<Badge variant="outline" class={`text-[10px] ${pBadge.class}`}>
										{pBadge.label}
									</Badge>
								</td>
								<td class="p-3 max-w-sm">
									<p class="font-bold text-foreground text-xs leading-tight mb-0.5">{t.titulo}</p>
									<p class="text-[11px] text-muted-foreground line-clamp-2">{t.descripcion}</p>
									{#if t.respuesta_soporte}
										<div class="mt-1.5 p-1.5 rounded bg-primary/5 border border-primary/20 text-[10px]">
											<strong class="text-primary block font-bold">Respuesta Técnica:</strong>
											<span class="text-foreground">{t.respuesta_soporte}</span>
										</div>
									{/if}
								</td>
								<td class="p-3">
									<Badge variant="secondary" class="uppercase text-[9px] font-mono">
										{t.modulo_afectado}
									</Badge>
								</td>
								<td class="p-3">
									<Badge variant="outline" class={`text-[10px] ${eBadge.class}`}>
										{eBadge.label}
									</Badge>
								</td>
								<td class="p-3">
									<span class="font-semibold block text-xs">{t.usuario_reporta?.nombre_completo || 'Usuario'}</span>
									<span class="text-[10px] text-muted-foreground font-mono block">{t.usuario_reporta?.email || ''}</span>
								</td>
								<td class="p-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
									{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}
								</td>
								{#if isAdminOrGerente}
									<td class="p-3 text-right">
										<Button size="sm" variant="outline" onclick={() => openManage(t)} class="h-7 text-xs gap-1">
											<Edit class="w-3 h-3" /> Atender
										</Button>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</Card>
</div>

<!-- Modal: Crear Nuevo Reporte -->
{#if isCreateOpen}
	<Dialog bind:open={isCreateOpen}>
		<DialogContent class="max-w-lg">
			<DialogHeader>
				<DialogTitle class="text-lg font-bold flex items-center gap-2">
					<LifeBuoy class="w-5 h-5 text-primary" /> Registrar Falla o Requerimiento
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createTicket" use:enhance class="space-y-3.5 py-1">
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label class="text-xs font-bold">Tipo de Reporte *</Label>
						<select
							name="tipo"
							bind:value={formTipo}
							required
							class="w-full h-9 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
						>
							<option value="falla">Falla Técnica / Error</option>
							<option value="requerimiento">Nuevo Requerimiento</option>
							<option value="mejora">Mejora / Optimización</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-bold">Prioridad *</Label>
						<select
							name="prioridad"
							bind:value={formPrioridad}
							required
							class="w-full h-9 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
						>
							<option value="baja">Baja</option>
							<option value="media">Media</option>
							<option value="alta">Alta</option>
							<option value="critica">Crítica (Bloqueante)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label for="t_modulo" class="text-xs font-bold">Módulo Afectado *</Label>
						<select
							id="t_modulo"
							name="modulo_afectado"
							bind:value={formModulo}
							required
							class="w-full h-9 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
						>
							<option value="ventas">Operación de Ventas</option>
							<option value="productos">Maestro de Productos</option>
							<option value="clientes">Maestro de Clientes</option>
							<option value="inventario">Control de Inventario</option>
							<option value="reportes">Métricas / Reportes</option>
							<option value="proveedores">Proveedores</option>
							<option value="configuracion">Configuración / Sistema</option>
							<option value="general">General / Otro</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<Label for="t_captura" class="text-xs font-bold">Enlace a Captura (Opcional)</Label>
						<Input
							id="t_captura"
							name="captura_url"
							bind:value={formCapturaUrl}
							placeholder="https://..."
							class="h-9 text-xs bg-background"
						/>
					</div>
				</div>

				<div class="space-y-1.5">
					<Label for="t_titulo" class="text-xs font-bold">Título Resumido *</Label>
					<Input
						id="t_titulo"
						name="titulo"
						bind:value={formTitulo}
						placeholder="Ej. Error al guardar cliente con cédula extranjera"
						required
						class="h-9 text-xs bg-background font-semibold"
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="t_desc" class="text-xs font-bold">Descripción Paso a Paso del Problema o Requerimiento *</Label>
					<textarea
						id="t_desc"
						name="descripcion"
						bind:value={formDescripcion}
						rows="4"
						placeholder="Indica qué estabas haciendo, el mensaje de error o el comportamiento esperado..."
						required
						class="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary"
					></textarea>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateOpen = false)} class="text-xs">
						Cancelar
					</Button>
					<Button type="submit" class="text-xs font-bold gap-1.5">
						<CheckCircle2 class="w-4 h-4" /> Enviar Reporte
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- Modal: Gestión de Ticket (Admin / Gerente) -->
{#if isManageOpen && selectedTicket}
	<Dialog bind:open={isManageOpen}>
		<DialogContent class="max-w-lg">
			<DialogHeader>
				<DialogTitle class="text-lg font-bold flex items-center justify-between">
					<span class="flex items-center gap-2">
						<Edit class="w-4 h-4 text-primary" /> Atender Ticket #{selectedTicket.codigo}
					</span>
					<Badge variant="outline" class={getTipoBadge(selectedTicket.tipo).class}>
						{getTipoBadge(selectedTicket.tipo).label}
					</Badge>
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateTicketStatus" use:enhance class="space-y-3.5 py-1">
				<input type="hidden" name="id" value={selectedTicket.id} />

				<div class="p-3 rounded-lg border bg-muted/30 space-y-1.5 text-xs">
					<p class="font-bold text-foreground text-sm">{selectedTicket.titulo}</p>
					<p class="text-muted-foreground whitespace-pre-wrap">{selectedTicket.descripcion}</p>
					{#if selectedTicket.captura_url}
						<a href={selectedTicket.captura_url} target="_blank" rel="noopener noreferrer" class="text-primary underline text-[11px] block mt-1">
							Ver Evidencia / Captura Adjunta &rarr;
						</a>
					{/if}
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label class="text-xs font-bold">Estado del Ticket *</Label>
						<select
							name="estatus"
							bind:value={manageEstatus}
							required
							class="w-full h-9 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
						>
							<option value="abierto">Abierto</option>
							<option value="en_revision">En Revisión</option>
							<option value="en_progreso">En Progreso</option>
							<option value="resuelto">Resuelto</option>
							<option value="cerrado">Cerrado</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-bold">Asignar Responsable</Label>
						<select
							name="asignado_a_id"
							bind:value={manageAsignadoAId}
							class="w-full h-9 px-2.5 rounded-md border text-xs uppercase bg-background"
						>
							<option value="">-- Sin asignar --</option>
							{#each staffUsers as su}
								<option value={String(su.id)}>
									{su.nombre_completo || su.email}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="space-y-1.5">
					<Label for="m_resp" class="text-xs font-bold">Respuesta Técnica / Solución Aplicada</Label>
					<textarea
						id="m_resp"
						name="respuesta_soporte"
						bind:value={manageRespuesta}
						rows="3"
						placeholder="Escribe la respuesta que verá el usuario sobre la resolución o estado..."
						class="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary"
					></textarea>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isManageOpen = false)} class="text-xs">
						Cancelar
					</Button>
					<Button type="submit" class="text-xs font-bold gap-1.5">
						<CheckCircle2 class="w-4 h-4" /> Guardar Cambios
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}
