<script lang="ts">
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { toast } from 'svelte-sonner';
	import {
		FileText,
		Eye,
		Search,
		Filter,
		XCircle,
		CheckCircle2,
		DollarSign,
		UserCheck,
		Globe,
		MapPin,
		IdCard,
		Plus,
		ArrowRight,
		Edit,
		CreditCard,
		Truck,
		Printer,
		Barcode,
		ClipboardList,
		Receipt,
		Percent,
		Calendar,
		Boxes,
		Package
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { VentaWithRelations } from '$lib/types/database';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const ventas = $derived(data.ventas || []);
	const totalItems = $derived(data.totalItems || 0);
	const totalPages = $derived(data.totalPages || 1);
	const currentPage = $derived(data.currentPage || 1);
	const conceptosPago = $derived(data.conceptosPago || []);
	const isCliente = $derived(data.isCliente || false);
	const isAdmin = $derived(Boolean(data.isAdmin || (data.roles || []).includes('admin')));

	let isDateModalOpen = $state(false);
	let selectedVentaDate = $state<VentaWithRelations | null>(null);
	let editFechaValue = $state('');

	function openDateModal(v: VentaWithRelations) {
		selectedVentaDate = v;
		if (v.created_at) {
			const d = new Date(v.created_at);
			const pad = (n: number) => String(n).padStart(2, '0');
			const year = d.getFullYear();
			const month = pad(d.getMonth() + 1);
			const day = pad(d.getDate());
			const hours = pad(d.getHours());
			const minutes = pad(d.getMinutes());
			editFechaValue = `${year}-${month}-${day}T${hours}:${minutes}`;
		} else {
			editFechaValue = '';
		}
		isDateModalOpen = true;
	}

	let searchInput = $state('');
	let filterEstatusPago = $state('todos');

	$effect(() => {
		searchInput = data.search || '';
		filterEstatusPago = data.estatusPago || 'todos';
	});

	let isDetailOpen = $state(false);
	let selectedVentaDetail = $state<VentaWithRelations | null>(null);

	let isPrintModalOpen = $state(false);
	let selectedVentaPrint = $state<VentaWithRelations | null>(null);
	let selectedPrintCaja = $state<string>('ALL');

	let isAbonoModalOpen = $state(false);
	let selectedVentaAbono = $state<VentaWithRelations | null>(null);
	let abonoConceptoId = $state('');
	let abonoMontoInput = $state(0);
	let abonoReferenciaInput = $state('');

	function setTab(tab: 'borrador' | 'realizada') {
		const params = new URLSearchParams(window.location.search);
		params.set('estatus_venta', tab);
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		if (data.estatusVenta) params.set('estatus_venta', data.estatusVenta);
		if (filterEstatusPago && filterEstatusPago !== 'todos') params.set('estatus_pago', filterEstatusPago);
		goto(`?${params.toString()}`);
	}

	function handlePageChange(newPage: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('page', String(newPage));
		goto(`?${params.toString()}`);
	}

	function openDetail(v: VentaWithRelations) {
		selectedVentaDetail = v;
		isDetailOpen = true;
	}

	function openPrintModal(v: VentaWithRelations, cajaNumero: string = 'ALL') {
		selectedVentaPrint = v;
		selectedPrintCaja = cajaNumero;
		isPrintModalOpen = true;
	}

	function isVentaCajas(v: VentaWithRelations | null | undefined): boolean {
		if (!v) return false;
		return (
			v.tipo_operacion === 'venta_cajas' ||
			Boolean(v.codigo_venta?.startsWith('CAJ-')) ||
			Boolean(v.codigo_venta?.startsWith('BOR-CAJ-'))
		);
	}

	const selectedAbonoConcepto = $derived(
		conceptosPago.find((cp) => String(cp.id) === String(abonoConceptoId))
	);
	const abonoComisionPct = $derived(Number(selectedAbonoConcepto?.porcentaje_comision || 0));
	const abonoComisionMonto = $derived(
		abonoComisionPct > 0 ? Number((abonoMontoInput * (abonoComisionPct / 100)).toFixed(2)) : 0
	);
	const abonoTotalCobrado = $derived(
		Number((abonoMontoInput + abonoComisionMonto).toFixed(2))
	);

	function openAbonoModal(v: VentaWithRelations) {
		selectedVentaAbono = v;
		abonoConceptoId = '';
		abonoReferenciaInput = '';
		const saldo = Math.max(0, Number((v.monto_total - (v.monto_pagado || 0)).toFixed(2)));
		abonoMontoInput = saldo;
		isAbonoModalOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			if (form.action === 'procesarBorrador') {
				toast.success(`Venta procesada exitosamente con el Código ${form.codigo_venta || ''}`);
			} else if (form.action === 'registrarAbono') {
				toast.success(`Abono de $${form.montoAbono?.toFixed(2)} registrado con éxito${form.montoComision ? ` (+Comisión $${form.montoComision.toFixed(2)} = Total Cobrado $${form.montoCobrado?.toFixed(2)})` : ''}. Saldo restante: $${form.saldoRestante?.toFixed(2)}`);
				isAbonoModalOpen = false;
			} else if (form.action === 'actualizarFechaVenta') {
				toast.success(form.message || 'Fecha de venta actualizada con éxito');
				isDateModalOpen = false;
				const f = form as any;
				if (selectedVentaDetail && f.id == selectedVentaDetail.id && f.nuevaFecha) {
					selectedVentaDetail.created_at = f.nuevaFecha;
				}
			} else {
				toast.success('Operación realizada con éxito');
			}
		} else if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Historial de Ventas | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
	<!-- Encabezado Principal -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<FileText class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Historial de Ventas y Envíos</h1>
				<p class="text-xs text-muted-foreground">
					Consulta detallada, edición de borradores, registro de abonos y seguimiento de operaciones procesadas.
				</p>
			</div>
		</div>

		<Button href="/ventas" class="gap-2">
			<Plus class="w-4 h-4" /> Nueva Operación de Venta
		</Button>
	</div>

	<!-- PESTAÑAS PRINCIPALES: BORRADORES / PROCESADAS -->
	<div class="flex items-center gap-2 border-b">
		<button
			type="button"
			onclick={() => setTab('borrador')}
			class={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all border-b-2 -mb-[1px] ${
				data.estatusVenta === 'borrador'
					? 'border-amber-500 bg-amber-500/10 text-amber-700 shadow-sm'
					: 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
			}`}
		>
			<FileText class="w-4 h-4" />
			Ventas en Borrador
			<Badge variant="secondary" class="ml-1 text-[10px] bg-amber-500/20 text-amber-800 font-black">
				{data.countBorradores}
			</Badge>
		</button>

		<button
			type="button"
			onclick={() => setTab('realizada')}
			class={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs font-bold transition-all border-b-2 -mb-[1px] ${
				data.estatusVenta === 'realizada'
					? 'border-primary bg-primary/10 text-primary shadow-sm'
					: 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
			}`}
		>
			<CheckCircle2 class="w-4 h-4" />
			Ventas Procesadas
			<Badge variant="secondary" class="ml-1 text-[10px] bg-primary/20 text-primary font-black">
				{data.countProcesadas}
			</Badge>
		</button>
	</div>

	<!-- Tarjeta de Búsqueda y Filtro de Pago -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div class="sm:col-span-2 relative">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="BUSCAR POR CÓDIGO (EJ. VEN-0000001 O CAJ-0000001)..."
						bind:value={searchInput}
						class="pl-8 uppercase text-xs"
					/>
				</div>

				<div>
					<select bind:value={filterEstatusPago} onchange={handleSearch} class="w-full h-9 px-2.5 rounded-md border text-xs uppercase bg-background">
						<option value="todos">-- ESTATUS PAGO: TODOS --</option>
						<option value="pendiente">PENDIENTE</option>
						<option value="parcial">PARCIAL</option>
						<option value="pagada">PAGADA</option>
					</select>
				</div>
			</form>
		</CardContent>
	</Card>

	<!-- Tabla del Historial de Ventas -->
	<Card>
		<CardHeader class="pb-3 flex flex-row items-center justify-between">
			<CardTitle class="text-base font-semibold">
				{data.estatusVenta === 'borrador' ? 'Lista de Ordenes de Venta en Borrador' : 'Lista de Ordenes de Venta Procesadas'}
			</CardTitle>
		</CardHeader>
		<CardContent class="p-0 sm:p-6 pt-0">
			<div class="border rounded-lg overflow-hidden">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
						<tr>
							<th class="p-3">Código Venta</th>
							<th class="p-3">Fecha</th>
							<th class="p-3">Remitente / Comprador</th>
							<th class="p-3">Consignatario</th>
							<th class="p-3">Producto / Destino</th>
							<th class="p-3 text-right">Monto Total ($)</th>
							<th class="p-3 text-right">Monto Pagado ($)</th>
							<th class="p-3 text-center">Estatus Pago</th>
							<th class="p-3 text-right">Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#if ventas.length === 0}
							<tr>
								<td colspan="9" class="p-6 text-center text-muted-foreground">
									No se encontraron ventas registradas en esta pestaña.
								</td>
							</tr>
						{:else}
							{#each ventas as v (v.id)}
								{@const esCajas = isVentaCajas(v)}
								<tr class={`hover:bg-muted/40 transition-colors ${v.estatus_venta === 'anulada' ? 'opacity-60 bg-muted/20' : ''}`}>
									<td class="p-3 font-mono font-bold text-xs text-primary">
										{#if v.estatus_venta === 'borrador'}
											<Badge variant="outline" class="font-sans text-[10px] text-amber-700 bg-amber-500/10 border-amber-500/30">
												BORRADOR
											</Badge>
										{:else}
											{v.codigo_venta}
										{/if}
										{#if esCajas}
											<Badge variant="outline" class="font-sans text-[9px] font-bold text-amber-700 bg-amber-500/10 border-amber-500/30 block w-fit mt-0.5">
												📦 VENTA DE CAJAS
											</Badge>
										{:else if v.guia_proveedor}
											<Badge variant="outline" class="font-mono text-[9px] text-blue-700 bg-blue-50 border-blue-300 block w-fit mt-0.5" title="Guía asignada por la API del proveedor">
												PROV: {v.guia_proveedor}
											</Badge>
										{/if}
									</td>
									<td class="p-3 text-xs text-muted-foreground">
										{new Date(v.created_at).toLocaleDateString()}
									</td>
									<td class="p-3 font-semibold uppercase text-xs">
										{v.cliente_origen?.nombre_completo || '-'}
									</td>
									<td class="p-3 font-semibold uppercase text-xs">
										{#if esCajas}
											<span class="text-amber-700 dark:text-amber-400 text-[11px] font-bold">ENTREGA EN TIENDA</span>
										{:else}
											{v.cliente_destino?.nombre_completo || '-'}
											{#if v.cliente_destino?.cedula}
												<span class="text-[10px] text-muted-foreground block font-mono">({v.cliente_destino.cedula})</span>
											{/if}
										{/if}
									</td>
									<td class="p-3 text-xs">
										{#if v.producto && (!isCliente || v.estatus_venta !== 'borrador')}
											<span class="font-bold block">[{v.producto.codigo}] {v.producto.descripcion}</span>
										{:else}
											<span class="font-bold block text-muted-foreground">SIN PRODUCTO ASIGNADO</span>
										{/if}
										{#if esCajas}
											<span class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
												Cantidad: {v.total_cajas || 1} {(v.total_cajas || 1) === 1 ? 'caja' : 'cajas'} (Sin traslado)
											</span>
										{:else}
											<span class="text-[10px] text-muted-foreground">Destino: {v.pais_destino?.nombre || 'SIN PAÍS'} ({v.pais_destino?.codigo_iso3 || 'S/C'})</span>
										{/if}
									</td>
									<td class="p-3 text-right font-mono font-bold text-sm text-emerald-600">${v.monto_total.toFixed(2)}</td>
									<td class="p-3 text-right font-mono font-semibold text-xs">
										${(v.monto_pagado || 0).toFixed(2)}
										{#if v.monto_total - (v.monto_pagado || 0) > 0.001}
											<span class="text-[10px] text-destructive block font-mono font-bold">
												Saldo: ${(v.monto_total - (v.monto_pagado || 0)).toFixed(2)}
											</span>
										{/if}
									</td>
									<td class="p-3 text-center">
										<Badge
											variant={v.estatus_pago === 'pagada' ? 'default' : v.estatus_pago === 'parcial' ? 'secondary' : 'outline'}
											class="uppercase text-[10px] font-bold"
										>
											{v.estatus_pago}
										</Badge>
									</td>
									<td class="p-3 text-right">
										<div class="flex items-center justify-end gap-1">
											{#if isCliente}
												<!-- Para el cliente: ÚNICAMENTE Imprimir Declaración de Aduana y Editar Operación en Borrador -->
												{#if !esCajas}
													<Button href={`/ventas/aduana/${v.id}`} target="_blank" variant="ghost" size="icon" class="text-purple-600 hover:bg-purple-500/10" title="Imprimir Declaración de Aduana">
														<FileText class="w-4 h-4" />
													</Button>
												{/if}

												{#if v.estatus_venta === 'borrador'}
													<Button href={`/ventas?edit=${v.id}`} variant="ghost" size="icon" class="text-amber-600 hover:bg-amber-500/10" title="Editar Operación en Borrador">
														<Edit class="w-4 h-4" />
													</Button>
												{/if}
											{:else}
												<!-- Para operadores / administradores: Todas las acciones -->
												<Button variant="ghost" size="icon" title="Ver Detalle Completo" onclick={() => openDetail(v)}>
													<Eye class="w-4 h-4" />
												</Button>

												{#if isAdmin && v.estatus_venta === 'realizada'}
													<Button variant="ghost" size="icon" class="text-indigo-600 hover:bg-indigo-500/10" title="Cambiar Fecha de Venta (Exclusivo Administrador)" onclick={() => openDateModal(v)}>
														<Calendar class="w-4 h-4" />
													</Button>
												{/if}

												<!-- Menú / Selector de Impresión de Documentos -->
												<Button variant="ghost" size="icon" class="text-blue-600 hover:bg-blue-500/10" title="Imprimir Documentos" onclick={() => openPrintModal(v)}>
													<Printer class="w-4 h-4" />
												</Button>

												<Button href={`/ventas/picking/${v.id}`} target="_blank" variant="ghost" size="icon" class="text-emerald-600 hover:bg-emerald-500/10" title="Imprimir Picking List / Invoice">
													<ClipboardList class="w-4 h-4" />
												</Button>

												{#if !esCajas}
													<Button href={`/ventas/aduana/${v.id}`} target="_blank" variant="ghost" size="icon" class="text-purple-600 hover:bg-purple-500/10" title="Imprimir Declaración de Aduana">
														<FileText class="w-4 h-4" />
													</Button>
												{/if}

												{#if !esCajas && v.url_documento_proveedor}
													<Button href={v.url_documento_proveedor} target="_blank" variant="ghost" size="icon" class="text-blue-600 hover:bg-blue-500/10" title={`Abrir Guía PDF API Proveedor (${v.guia_proveedor || 'Zoom'})`}>
														<Globe class="w-4 h-4 text-blue-600" />
													</Button>
												{/if}

												{#if v.estatus_pago !== 'pagada' && v.estatus_venta !== 'anulada'}
													<Button variant="ghost" size="icon" class="text-emerald-600 hover:bg-emerald-500/10" title="Registrar Abono a la Venta" onclick={() => openAbonoModal(v)}>
														<DollarSign class="w-4 h-4" />
													</Button>
												{/if}

												{#if v.estatus_venta === 'borrador'}
													<Button href={`/ventas?edit=${v.id}`} variant="ghost" size="icon" class="text-amber-600 hover:bg-amber-500/10" title="Editar Operación en Borrador">
														<Edit class="w-4 h-4" />
													</Button>

													<form method="POST" action="?/procesarBorrador" use:enhance class="inline">
														<input type="hidden" name="id" value={v.id} />
														<Button type="submit" variant="ghost" size="icon" class="text-emerald-600 hover:bg-emerald-500/10" title="Procesar y Asignar Código Secuencial Oficial">
															<CheckCircle2 class="w-4 h-4" />
														</Button>
													</form>
												{/if}

												{#if v.estatus_venta !== 'anulada'}
													<form method="POST" action="?/anularVenta" use:enhance class="inline">
														<input type="hidden" name="id" value={v.id} />
														<Button type="submit" variant="ghost" size="icon" class="text-destructive hover:bg-destructive/10" title="Anular Venta">
															<XCircle class="w-4 h-4" />
														</Button>
													</form>
												{/if}
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="mt-4">
				<PaginationControl {currentPage} {totalPages} {totalItems} onPageChange={handlePageChange} />
			</div>
		</CardContent>
	</Card>
</div>

<!-- MODAL: MODIFICAR FECHA DE VENTA (EXCLUSIVO ADMINISTRADOR) -->
{#if isDateModalOpen && selectedVentaDate}
	<Dialog bind:open={isDateModalOpen}>
		<DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-base font-bold flex items-center gap-2">
					<Calendar class="w-5 h-5 text-indigo-600" />
					Modificar Fecha de Venta #{selectedVentaDate.codigo_venta || 'Borrador'}
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/actualizarFechaVenta" use:enhance class="space-y-4 pt-2">
				<input type="hidden" name="id" value={selectedVentaDate.id} />

				<!-- Resumen de la Orden -->
				<div class="border p-3 rounded-lg bg-muted/20 space-y-1.5 text-xs">
					<div class="flex justify-between items-center">
						<span class="text-muted-foreground">Código de Orden:</span>
						<span class="font-mono font-bold text-foreground">{selectedVentaDate.codigo_venta || 'Sin Código'}</span>
					</div>
					{#if selectedVentaDate.cliente_origen}
						<div class="flex justify-between items-center">
							<span class="text-muted-foreground">Remitente:</span>
							<span class="font-medium truncate max-w-[200px]">{selectedVentaDate.cliente_origen.nombre_completo}</span>
						</div>
					{/if}
					{#if selectedVentaDate.cliente_destino}
						<div class="flex justify-between items-center">
							<span class="text-muted-foreground">Consignatario:</span>
							<span class="font-medium truncate max-w-[200px]">{selectedVentaDate.cliente_destino.nombre_completo}</span>
						</div>
					{/if}
					<div class="flex justify-between items-center border-t pt-1 text-[11px]">
						<span class="text-muted-foreground">Fecha Registrada Actual:</span>
						<span class="font-mono font-semibold text-foreground">{new Date(selectedVentaDate.created_at).toLocaleString()}</span>
					</div>
				</div>

				<div class="space-y-1.5">
					<label for="edit_fecha_venta" class="text-xs font-bold block flex items-center justify-between">
						<span>Nueva Fecha y Hora de Venta *</span>
						<span class="text-[10px] text-indigo-600 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full">Exclusivo Admin</span>
					</label>
					<Input
						id="edit_fecha_venta"
						name="fecha_venta"
						type="datetime-local"
						required
						bind:value={editFechaValue}
						class="h-9 text-xs font-mono font-medium"
					/>
					<p class="text-[10px] text-muted-foreground">
						Al guardar, se actualizará la fecha oficial de registro en la orden y en todos los documentos generados (guías de despacho, etiquetas, manifiestos).
					</p>
				</div>

				<DialogFooter class="flex flex-row justify-end gap-2 pt-2">
					<Button type="button" variant="outline" size="sm" onclick={() => (isDateModalOpen = false)}>
						Cancelar
					</Button>
					<Button type="submit" size="sm" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5">
						<Calendar class="w-3.5 h-3.5" />
						Guardar Nueva Fecha
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- MODAL: REGISTRAR ABONO / PAGO PARCIAL -->
{#if isAbonoModalOpen && selectedVentaAbono}
	<Dialog bind:open={isAbonoModalOpen}>
		<DialogContent class="sm:max-w-md max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-base font-bold flex items-center gap-2">
					<CreditCard class="w-5 h-5 text-emerald-600" />
					Registrar Abono a Venta {selectedVentaAbono.codigo_venta || 'Borrador'}
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/registrarAbono" use:enhance class="space-y-4 pt-2">
				<input type="hidden" name="venta_id" value={selectedVentaAbono.id} />

				<!-- Resumen de Saldos de la Venta -->
				<div class="border p-3 rounded-lg bg-muted/20 space-y-1 text-xs">
					<div class="flex justify-between">
						<span>Monto Total Venta:</span>
						<span class="font-mono font-bold text-emerald-600">${selectedVentaAbono.monto_total.toFixed(2)}</span>
					</div>
					<div class="flex justify-between">
						<span>Total Abonado Previamente:</span>
						<span class="font-mono font-semibold">${(selectedVentaAbono.monto_pagado || 0).toFixed(2)}</span>
					</div>
					<div class="flex justify-between font-bold text-destructive border-t pt-1">
						<span>Saldo Pendiente por Pagar:</span>
						<span class="font-mono text-sm">${Math.max(0, selectedVentaAbono.monto_total - (selectedVentaAbono.monto_pagado || 0)).toFixed(2)}</span>
					</div>
				</div>

				<div class="space-y-1.5">
					<label for="a_concepto" class="text-xs font-bold block">Método / Concepto de Pago *</label>
					<select id="a_concepto" name="concepto_pago_id" bind:value={abonoConceptoId} required class="w-full h-9 px-2.5 rounded-md border text-xs uppercase bg-background">
						<option value="">-- SELECCIONAR CONCEPTO --</option>
						{#each conceptosPago as cp}
							<option value={String(cp.id)}>
								{cp.nombre}{Number(cp.porcentaje_comision || 0) > 0 ? ` (+${Number(cp.porcentaje_comision).toFixed(1)}% COMISIÓN)` : ''}
							</option>
						{/each}
					</select>
				</div>

				<div class="space-y-1.5">
					<label for="a_monto" class="text-xs font-bold block">Monto a Abonar ($) *</label>
					<Input
						id="a_monto"
						name="monto"
						type="number"
						step="0.01"
						min="0.01"
						max={Math.max(0, selectedVentaAbono.monto_total - (selectedVentaAbono.monto_pagado || 0))}
						required
						bind:value={abonoMontoInput}
						class="h-9 text-xs font-mono font-bold"
					/>
					<p class="text-[10px] text-muted-foreground italic">
						* El valor por defecto es el saldo por pagar. Puedes ingresar un monto menor para realizar un pago parcial.
					</p>
				</div>

				<!-- Desglose de Comisión si el concepto tiene recargo (ej. Tarjeta de Crédito) -->
				{#if abonoComisionPct > 0 && abonoMontoInput > 0}
					<div class="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/20 text-xs space-y-1">
						<div class="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
							<span class="flex items-center gap-1">
								<Percent class="w-3.5 h-3.5" /> Recargo Comisión ({abonoComisionPct.toFixed(2)}%):
							</span>
							<span class="font-mono font-bold">+${abonoComisionMonto.toFixed(2)}</span>
						</div>
						<div class="flex items-center justify-between border-t border-indigo-200/60 pt-1 font-bold text-foreground">
							<span>Total a Cobrar al Cliente:</span>
							<span class="font-mono text-sm text-indigo-600 dark:text-indigo-400">${abonoTotalCobrado.toFixed(2)}</span>
						</div>
						<p class="text-[10px] text-muted-foreground italic pt-0.5">
							* Amortiza al saldo de la venta: ${abonoMontoInput.toFixed(2)}. La comisión por {selectedAbonoConcepto?.nombre} es ${abonoComisionMonto.toFixed(2)}.
						</p>
					</div>
				{/if}

				<div class="space-y-1.5">
					<label for="a_ref" class="text-xs font-bold block">Referencia de Operación (4 a 9 dígitos numéricos)</label>
					<Input
						id="a_ref"
						name="referencia"
						type="text"
						bind:value={abonoReferenciaInput}
						placeholder="EJ. 987654"
						class="h-9 text-xs font-mono"
					/>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isAbonoModalOpen = false)} class="text-xs">
						Cancelar
					</Button>
					<Button type="submit" class="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
						<CheckCircle2 class="w-4 h-4" /> Registrar Abono
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- MODAL: DETALLE COMPLETO DE VENTA -->
{#if isDetailOpen && selectedVentaDetail}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="sm:max-w-4xl max-w-[calc(100%-1.5rem)] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
			<!-- Header Fijo Superior con Datos Principales y Estatus -->
			<div class="px-5 sm:px-6 py-4 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/15 pr-14">
				<div>
					<div class="flex items-center gap-2">
						<div class="p-2 rounded-lg bg-primary/10 text-primary">
							<FileText class="w-5 h-5" />
						</div>
						<div>
							<h2 class="text-base sm:text-lg font-bold leading-none flex items-center gap-2">
								{#if selectedVentaDetail.estatus_venta === 'borrador'}
									<span>Venta en Borrador</span>
									<Badge variant="outline" class="font-sans text-[10px] text-amber-700 bg-amber-500/10 border-amber-500/30">
										BORRADOR
									</Badge>
								{:else}
									<span>Venta #{selectedVentaDetail.codigo_venta}</span>
								{/if}
								{#if isVentaCajas(selectedVentaDetail)}
									<Badge variant="outline" class="font-sans text-[10px] text-amber-800 bg-amber-500/15 border-amber-500/30 font-bold">
										📦 VENTA DE CAJAS
									</Badge>
								{/if}
							</h2>
							<p class="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
								<span>📅 {new Date(selectedVentaDetail.created_at).toLocaleString()}</span>
								{#if isAdmin && selectedVentaDetail.estatus_venta === 'realizada'}
									<button
										type="button"
										class="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline ml-0.5 inline-flex items-center gap-0.5 cursor-pointer"
										onclick={() => {
											if (selectedVentaDetail) openDateModal(selectedVentaDetail);
										}}
									>
										<Calendar class="w-3 h-3 inline" /> Modificar Fecha
									</button>
								{/if}
								{#if selectedVentaDetail.es_multiple_cajas || (selectedVentaDetail.total_cajas && selectedVentaDetail.total_cajas > 1)}
									<span>•</span>
									<span class="font-bold text-primary">📦 {selectedVentaDetail.total_cajas} Cajas</span>
								{/if}
								{#if selectedVentaDetail.producto}
									<span>•</span>
									<span class="font-medium">[{selectedVentaDetail.producto.codigo}] {selectedVentaDetail.producto.descripcion}</span>
								{/if}
								{#if !isVentaCajas(selectedVentaDetail) && selectedVentaDetail.pais_destino}
									<span>•</span>
									<span>Destino: {selectedVentaDetail.pais_destino.nombre} ({selectedVentaDetail.pais_destino.codigo_iso3})</span>
								{/if}
							</p>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<div class="text-left sm:text-right">
						<span class="text-[10px] uppercase font-bold text-muted-foreground block">Estatus</span>
						<div class="flex items-center gap-1.5 mt-0.5">
							<Badge variant={selectedVentaDetail.estatus_venta === 'realizada' ? 'default' : selectedVentaDetail.estatus_venta === 'anulada' ? 'destructive' : 'secondary'} class="uppercase font-bold text-[10px]">
								{selectedVentaDetail.estatus_venta}
							</Badge>
							<Badge variant={selectedVentaDetail.estatus_pago === 'pagada' ? 'default' : selectedVentaDetail.estatus_pago === 'parcial' ? 'secondary' : 'outline'} class="uppercase font-bold text-[10px]">
								{selectedVentaDetail.estatus_pago}
							</Badge>
						</div>
					</div>
				</div>
			</div>

			<!-- Cuerpo Desplazable (Scrollable Area) con Diseño Responsivo -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
					<!-- COLUMNA IZQUIERDA: Participantes, Transporte y Artículos -->
					<div class="space-y-4">
						<!-- Participantes (Remitente y Consignatario) -->
						<div class="border p-3.5 rounded-xl bg-card space-y-3 shadow-xs">
							<span class="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block border-b pb-1.5 flex items-center gap-1.5">
								<UserCheck class="w-3.5 h-3.5 text-primary" /> {isVentaCajas(selectedVentaDetail) ? 'Datos del Cliente Comprador' : 'Participantes de la Operación'}
							</span>
							<div class="grid grid-cols-1 {isVentaCajas(selectedVentaDetail) ? '' : 'sm:grid-cols-2'} gap-3">
								<div class="space-y-1 bg-muted/20 p-2.5 rounded-lg border">
									<span class="font-bold text-muted-foreground uppercase text-[9px] block">{isVentaCajas(selectedVentaDetail) ? 'Cliente Comprador:' : 'Remitente (Origen):'}</span>
									<span class="font-bold block uppercase text-xs text-foreground">{selectedVentaDetail.cliente_origen?.nombre_completo || 'N/A'}</span>
									{#if selectedVentaDetail.cliente_origen?.cedula}
										<span class="text-[10px] text-muted-foreground block font-mono">Cédula: {selectedVentaDetail.cliente_origen.cedula}</span>
									{/if}
									<span class="text-[10px] text-muted-foreground block">{selectedVentaDetail.cliente_origen?.telefono || selectedVentaDetail.cliente_origen?.numero_celular || 'Sin teléfono'}</span>
									{#if selectedVentaDetail.cliente_origen?.email}
										<span class="text-[10px] text-muted-foreground block truncate">{selectedVentaDetail.cliente_origen.email}</span>
									{/if}
								</div>
								{#if !isVentaCajas(selectedVentaDetail)}
									<div class="space-y-1 bg-muted/20 p-2.5 rounded-lg border">
										<span class="font-bold text-muted-foreground uppercase text-[9px] block">Consignatario (Destino):</span>
										<span class="font-bold block uppercase text-xs text-foreground">{selectedVentaDetail.cliente_destino?.nombre_completo || 'N/A'}</span>
										{#if selectedVentaDetail.cliente_destino?.cedula}
											<span class="text-[10px] font-mono font-bold text-primary block">Cédula: {selectedVentaDetail.cliente_destino.cedula}</span>
										{/if}
										<span class="text-[10px] text-muted-foreground block">{selectedVentaDetail.cliente_destino?.telefono || selectedVentaDetail.cliente_destino?.numero_celular || 'Sin teléfono'}</span>
										{#if selectedVentaDetail.cliente_destino?.ciudad}
											<span class="text-[10px] text-muted-foreground block">Ciudad: {selectedVentaDetail.cliente_destino.ciudad}</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<!-- Transporte y Entrega Logística -->
						{#if !isVentaCajas(selectedVentaDetail)}
							<div class="border p-3.5 rounded-xl bg-card space-y-2.5 shadow-xs">
								<div class="flex items-center justify-between border-b pb-1.5">
									<span class="font-bold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
										<Truck class="w-3.5 h-3.5 text-primary" /> Transporte y Tipo de Entrega
									</span>
									<Badge variant={selectedVentaDetail.tipo_entrega === 'oficina' ? 'secondary' : 'outline'} class="uppercase text-[9px] font-bold">
										{selectedVentaDetail.tipo_entrega === 'oficina' ? 'RETIRO EN OFICINA / OCURRE' : 'DOMICILIO'}
									</Badge>
								</div>
								<div class="flex justify-between items-center text-xs">
									<span class="text-muted-foreground text-[10px] uppercase font-bold">Empresa Proveedora:</span>
									<span class="font-bold uppercase text-primary">
										{selectedVentaDetail.proveedor?.nombre || 'NO ESPECIFICADO'}
										{#if selectedVentaDetail.proveedor?.tiene_api}
											<span class="text-[9px] text-blue-600 font-extrabold ml-1">(CON API)</span>
										{/if}
									</span>
								</div>
								{#if selectedVentaDetail.guia_proveedor}
									<div class="flex justify-between items-center text-xs border-t pt-1.5">
										<span class="text-muted-foreground text-[10px] uppercase font-bold">Guía API Proveedor:</span>
										<div class="flex items-center gap-2">
											<span class="font-mono font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
												{selectedVentaDetail.guia_proveedor}
											</span>
											{#if selectedVentaDetail.url_documento_proveedor}
												<Button href={selectedVentaDetail.url_documento_proveedor} target="_blank" variant="outline" size="sm" class="h-6 text-[10px] gap-1 font-bold text-blue-600 border-blue-300">
													<Globe class="w-3 h-3" /> Ver Guía PDF
												</Button>
											{/if}
										</div>
									</div>
								{/if}
								{#if selectedVentaDetail.direccion_entrega}
									<div class="text-[11px] border-t pt-1.5 space-y-1">
										<span class="text-muted-foreground text-[10px] uppercase font-bold block">Dirección Final de Entrega:</span>
										<p class="font-mono text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border">
											{selectedVentaDetail.direccion_entrega}
										</p>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Detalle de Cajas del Envío (si aplica) -->
						{#if selectedVentaDetail.es_multiple_cajas && selectedVentaDetail.cajas_detalle && selectedVentaDetail.cajas_detalle.length > 0}
							<div class="border p-3.5 rounded-xl bg-card space-y-2 shadow-xs">
								<span class="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block border-b pb-1.5 flex items-center gap-1.5">
									<Package class="w-3.5 h-3.5 text-primary" /> {isVentaCajas(selectedVentaDetail) ? `Cajas Vendidas (${selectedVentaDetail.cajas_detalle.length})` : `Cajas del Envío (${selectedVentaDetail.cajas_detalle.length})`}
								</span>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
									{#each selectedVentaDetail.cajas_detalle as c}
										<div class="p-2 rounded-lg border bg-muted/20 space-y-1.5">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-1.5 flex-wrap">
													<Badge variant="default" class="font-mono text-[10px] font-bold">📦 {c.numero}</Badge>
													{#if c.descontar_inventario === false}
														<Badge variant="outline" class="text-[9px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-500/10">
															CAJA DEL CLIENTE (SIN STOCK)
														</Badge>
													{/if}
												</div>
												<span class="font-mono font-bold text-foreground">${Number(c.monto_base || 0).toFixed(2)}</span>
											</div>
											<div class="text-[10px] text-muted-foreground flex items-center justify-between gap-2">
												<div>
													{#if !isVentaCajas(selectedVentaDetail)}
														<span>Peso Facturable: <b class="text-foreground">{c.peso_facturable || c.peso_reportado} LB</b></span>
													{/if}
													{#if c.alto && c.ancho && c.largo}
														<span class="ml-1">({c.alto}×{c.ancho}×{c.largo} in)</span>
													{/if}
												</div>
												{#if !isVentaCajas(selectedVentaDetail)}
													<Button
														type="button"
														variant="outline"
														size="sm"
														class="h-6 px-2 text-[10px] gap-1 font-bold"
														onclick={() => {
															const v = selectedVentaDetail!;
															isDetailOpen = false;
															openPrintModal(v, c.numero);
														}}
													>
														<Printer class="w-3 h-3" /> Doc. Caja
													</Button>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Artículos Declarados en el Envío -->
						{#if selectedVentaDetail.articulos_registrados && selectedVentaDetail.articulos_registrados.length > 0}
							<div class="border p-3.5 rounded-xl bg-card space-y-2 shadow-xs">
								<div class="flex items-center justify-between border-b pb-1.5">
									<span class="font-bold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
										<ClipboardList class="w-3.5 h-3.5 text-primary" /> Artículos Declarados ({selectedVentaDetail.articulos_registrados.length})
									</span>
									<span class="font-mono text-[10px] font-bold text-muted-foreground">
										Total Unidades: {selectedVentaDetail.articulos_registrados.reduce((acc, a) => acc + Number(a.cantidad || 0), 0)}
									</span>
								</div>
								<div class="divide-y border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
									{#each selectedVentaDetail.articulos_registrados as art}
										<div class="p-2 flex items-center justify-between text-xs bg-background/50 hover:bg-muted/30 transition-colors">
											<div>
												<div class="flex items-center gap-1.5">
													{#if art.caja_numero}
														<Badge variant="outline" class="font-mono text-[9px] py-0 px-1 border-primary/40 text-primary">📦 {art.caja_numero}</Badge>
													{/if}
													<span class="font-bold uppercase">{art.nombre}</span>
												</div>
												<span class="text-[10px] text-muted-foreground font-mono">Cantidad: {art.cantidad}</span>
											</div>
											<span class="font-mono font-bold text-emerald-600">${Number(art.valor_total).toFixed(2)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- COLUMNA DERECHA: Liquidación Financiera y Abonos Registrados -->
					<div class="space-y-4">
						<!-- Desglose Financiero -->
						<div class="border p-3.5 rounded-xl space-y-2 bg-card shadow-xs">
							<span class="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block border-b pb-1.5 flex items-center gap-1.5">
								<Receipt class="w-3.5 h-3.5 text-primary" /> Desglose de la Liquidación
							</span>
							<div class="space-y-1 text-xs">
								<div class="flex justify-between py-0.5">
									<span class="text-muted-foreground">{isVentaCajas(selectedVentaDetail) ? 'Subtotal Cajas:' : 'Monto Base Tarifa:'}</span>
									<span class="font-mono font-semibold">${selectedVentaDetail.monto_base.toFixed(2)}</span>
								</div>
								{#if selectedVentaDetail.monto_total_cargos > 0}
									<div class="flex justify-between py-0.5 text-emerald-600">
										<span>(+) Cargos Adicionales:</span>
										<span class="font-mono font-semibold">+${selectedVentaDetail.monto_total_cargos.toFixed(2)}</span>
									</div>
									{#if selectedVentaDetail.cargos_descuentos_aplicados}
										{#each selectedVentaDetail.cargos_descuentos_aplicados.filter(c => c.tipo === 'cargo') as cg}
											<div class="flex justify-between pl-3 text-[10px] text-muted-foreground">
												<span>• {cg.nombre}{cg.es_porcentaje && cg.porcentaje != null ? ` (${cg.porcentaje}%)` : ''}:</span>
												<span class="font-mono">+${cg.monto.toFixed(2)}</span>
											</div>
										{/each}
									{/if}
								{/if}
								{#if selectedVentaDetail.monto_total_descuentos > 0}
									<div class="flex justify-between py-0.5 text-destructive">
										<span>(-) Descuentos Aplicados:</span>
										<span class="font-mono font-semibold">-${selectedVentaDetail.monto_total_descuentos.toFixed(2)}</span>
									</div>
									{#if selectedVentaDetail.cargos_descuentos_aplicados}
										{#each selectedVentaDetail.cargos_descuentos_aplicados.filter(c => c.tipo === 'descuento') as ds}
											<div class="flex justify-between pl-3 text-[10px] text-muted-foreground">
												<span>• {ds.nombre}{ds.es_porcentaje && ds.porcentaje != null ? ` (${ds.porcentaje}%)` : ''}:</span>
												<span class="font-mono">-${ds.monto.toFixed(2)}</span>
											</div>
										{/each}
									{/if}
								{/if}
								{#if selectedVentaDetail.requiere_seguro}
									<div class="flex justify-between py-0.5 text-amber-600">
										<span>🛡️ Seguro ({selectedVentaDetail.porcentaje_seguro_aplicado}%):</span>
										<span class="font-mono font-semibold">+${selectedVentaDetail.monto_seguro.toFixed(2)}</span>
									</div>
								{/if}
							</div>

							<div class="border-t pt-2 space-y-1.5">
								<div class="flex justify-between items-baseline font-black text-sm bg-muted/40 p-2 rounded-lg">
									<span class="uppercase tracking-wide text-xs">Total Venta:</span>
									<span class="font-mono text-base text-emerald-600 dark:text-emerald-400 font-bold">
										${selectedVentaDetail.monto_total.toFixed(2)}
									</span>
								</div>
								<div class="flex justify-between text-xs px-2">
									<span class="text-muted-foreground">Monto Abonado / Pagado:</span>
									<span class="font-mono font-bold text-emerald-600">
										${(selectedVentaDetail.monto_pagado || 0).toFixed(2)}
									</span>
								</div>
								<div class="flex justify-between text-xs px-2 font-bold">
									{#if (selectedVentaDetail.monto_total - (selectedVentaDetail.monto_pagado || 0)) > 0.001}
										<span class="text-destructive">Saldo Pendiente por Cobrar:</span>
										<span class="font-mono text-destructive text-sm font-black">
											${Math.max(0, selectedVentaDetail.monto_total - (selectedVentaDetail.monto_pagado || 0)).toFixed(2)}
										</span>
									{:else}
										<span class="text-emerald-600">Estado de Cuenta:</span>
										<span class="font-mono text-emerald-600 font-bold uppercase text-[11px]">
											✓ TOTALMENTE SOLVENTE
										</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Historial de Pagos Abonados -->
						<div class="border p-3.5 rounded-xl bg-card space-y-2 shadow-xs">
							<div class="flex items-center justify-between border-b pb-1.5">
								<span class="font-bold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
									<CreditCard class="w-3.5 h-3.5 text-primary" /> Abonos Registrados (Cobro Mixto)
								</span>
								{#if selectedVentaDetail.pagos_registrados && selectedVentaDetail.pagos_registrados.length > 0}
									<Badge variant="secondary" class="text-[9px] font-mono">
										{selectedVentaDetail.pagos_registrados.length} {selectedVentaDetail.pagos_registrados.length === 1 ? 'pago' : 'pagos'}
									</Badge>
								{/if}
							</div>

							{#if selectedVentaDetail.pagos_registrados && selectedVentaDetail.pagos_registrados.length > 0}
								<div class="divide-y border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
									{#each selectedVentaDetail.pagos_registrados as p}
										<div class="p-2.5 flex items-center justify-between text-xs bg-background/50 hover:bg-muted/30 transition-colors">
											<div>
												<span class="font-bold uppercase block text-foreground">{p.concepto_nombre}</span>
												{#if (p.porcentaje_comision || 0) > 0}
													<span class="text-[10px] font-semibold text-indigo-600 block">
														Recargo {p.porcentaje_comision}%: +${(p.monto_comision || 0).toFixed(2)} (Cobro: ${(p.monto_cobrado || p.monto).toFixed(2)})
													</span>
												{/if}
												{#if p.referencia}
													<span class="text-[10px] font-mono text-muted-foreground block">Ref: {p.referencia}</span>
												{/if}
											</div>
											<div class="text-right">
												<span class="font-mono font-bold text-emerald-600 block">${Number(p.monto).toFixed(2)}</span>
												{#if (p.monto_comision || 0) > 0}
													<span class="text-[9px] text-muted-foreground block font-mono">Total cobrado: ${(p.monto_cobrado || p.monto).toFixed(2)}</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-muted-foreground italic text-center py-3 bg-muted/20 rounded-lg">
									Sin abonos o pagos registrados aún para esta venta.
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Fijo Inferior con Botones de Acción e Impresión -->
			<div class="px-4 sm:px-6 py-3 border-t bg-muted/20 shrink-0 flex flex-wrap items-center justify-between gap-2">
				<div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
					{#if !isVentaCajas(selectedVentaDetail)}
						<Button href={`/ventas/guia/${selectedVentaDetail.id}`} target="_blank" variant="outline" size="sm" class="gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 font-bold">
							<Printer class="w-3.5 h-3.5" /> Guía (QR)
						</Button>

						<Button href={`/ventas/guia-paqueteria/${selectedVentaDetail.id}`} target="_blank" variant="outline" size="sm" class="gap-1 text-xs text-cyan-700 border-cyan-200 hover:bg-cyan-50 font-bold">
							<Barcode class="w-3.5 h-3.5" /> Guía (Barras)
						</Button>
					{/if}

					<Button href={`/ventas/picking/${selectedVentaDetail.id}`} target="_blank" variant="outline" size="sm" class="gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-bold">
						<ClipboardList class="w-3.5 h-3.5" /> {isVentaCajas(selectedVentaDetail) ? 'Recibo / Invoice' : 'Picking & Invoice'}
					</Button>

					{#if !isVentaCajas(selectedVentaDetail)}
						<Button href={`/ventas/aduana/${selectedVentaDetail.id}`} target="_blank" variant="outline" size="sm" class="gap-1 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 font-bold">
							<FileText class="w-3.5 h-3.5" /> Declaración Aduana
						</Button>
					{/if}

					{#if selectedVentaDetail.estatus_venta === 'borrador'}
						<Button href={`/ventas?edit=${selectedVentaDetail.id}`} class="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
							<Edit class="w-3.5 h-3.5" /> Editar Borrador
						</Button>
					{/if}

					{#if selectedVentaDetail.estatus_pago !== 'pagada' && selectedVentaDetail.estatus_venta !== 'anulada'}
						<Button class="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onclick={() => { if (selectedVentaDetail) { const v = selectedVentaDetail; isDetailOpen = false; openAbonoModal(v); } }}>
							<DollarSign class="w-3.5 h-3.5" /> Registrar Abono
						</Button>
					{/if}

					{#if isAdmin && selectedVentaDetail.estatus_venta === 'realizada'}
						<Button
							variant="outline"
							size="sm"
							class="gap-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
							onclick={() => {
								if (selectedVentaDetail) openDateModal(selectedVentaDetail);
							}}
						>
							<Calendar class="w-3.5 h-3.5" /> Cambiar Fecha
						</Button>
					{/if}
				</div>
				<Button variant="outline" onclick={() => (isDetailOpen = false)} class="text-xs">Cerrar</Button>
			</div>
		</DialogContent>
	</Dialog>
{/if}

<!-- MODAL: SELECTOR DE DOCUMENTOS DE IMPRESIÓN -->
{#if isPrintModalOpen && selectedVentaPrint}
	{@const cajaQuery = selectedPrintCaja && selectedPrintCaja !== 'ALL' ? `?caja=${encodeURIComponent(selectedPrintCaja)}` : ''}
	<Dialog bind:open={isPrintModalOpen}>
		<DialogContent class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-base font-bold flex items-center gap-2">
					<Printer class="w-5 h-5 text-primary" />
					Opciones de Impresión: {selectedVentaPrint.codigo_venta || 'Borrador'}
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2">
				<p class="text-xs text-muted-foreground">
					Selecciona el formato de documento operativo o comercial que deseas generar e imprimir para esta orden:
				</p>

				<!-- SELECTOR DE CAJA (SI ES ENVÍO DE MÚLTIPLES CAJAS) -->
				{#if !isVentaCajas(selectedVentaPrint) && selectedVentaPrint.es_multiple_cajas && selectedVentaPrint.cajas_detalle && selectedVentaPrint.cajas_detalle.length > 0}
					<div class="p-3 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
								<Package class="w-3.5 h-3.5" /> Documento por Caja ({selectedVentaPrint.cajas_detalle.length} Cajas)
							</span>
							<Badge variant="outline" class="text-[9px] font-mono border-primary/30 text-primary">
								{selectedPrintCaja === 'ALL' ? 'Todas las cajas' : `Caja ${selectedPrintCaja}`}
							</Badge>
						</div>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => (selectedPrintCaja = 'ALL')}
								class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors {selectedPrintCaja === 'ALL' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground'}"
							>
								Todas ({selectedVentaPrint.cajas_detalle.length} docs)
							</button>
							{#each selectedVentaPrint.cajas_detalle as c}
								<button
									type="button"
									onclick={() => (selectedPrintCaja = c.numero)}
									class="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors {selectedPrintCaja === c.numero ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground'}"
								>
									📦 {c.numero}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- SECCIÓN 1: PLANTILLAS PERSONALIZADAS DISEÑADAS (WYSIWYG) -->
				{#if data.plantillasDocumentos && data.plantillasDocumentos.length > 0}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-[11px] font-bold uppercase tracking-wider text-primary">
								Plantillas Diseñadas ({data.plantillasDocumentos.length})
							</span>
							<Badge variant="outline" class="text-[9px] bg-primary/10 text-primary border-primary/20">
								Personalizadas
							</Badge>
						</div>

						<div class="grid grid-cols-1 gap-2">
							{#each data.plantillasDocumentos as plantilla}
								<a
									href={`/ventas/documento/${plantilla.id}/${selectedVentaPrint.id}${cajaQuery}`}
									target="_blank"
									class="p-3 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between group bg-card shadow-xs"
								>
									<div class="flex items-center gap-3">
										<div class="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
											<FileText class="w-5 h-5" />
										</div>
										<div>
											<span class="font-bold text-xs uppercase block text-slate-900 group-hover:text-primary">
												{plantilla.nombre}
											</span>
											<span class="text-[10px] text-muted-foreground block">
												Tipo: {plantilla.tipo} • Papel: {plantilla.paper_size || 'letter'} ({plantilla.orientation || 'portrait'})
											</span>
										</div>
									</div>
									<div class="flex items-center gap-1.5 shrink-0">
										{#if plantilla.es_default}
											<Badge variant="default" class="text-[9px] font-mono">Default</Badge>
										{/if}
										<Badge variant="secondary" class="text-[9px] font-mono uppercase">{plantilla.tipo}</Badge>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- SECCIÓN 2: FORMATOS ESTÁNDAR DEL SISTEMA -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
							Formatos Estándar del Sistema
						</span>
						<Badge variant="outline" class="text-[9px]">Base</Badge>
					</div>

					<div class="grid grid-cols-1 gap-2">
						{#if !isVentaCajas(selectedVentaPrint)}
							<!-- Opción 1: Guía Oficial Estándar con QR -->
							<a
								href={`/ventas/guia/${selectedVentaPrint.id}${cajaQuery}`}
								target="_blank"
								class="p-2.5 border rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
							>
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
										<Printer class="w-4 h-4" />
									</div>
									<div>
										<span class="font-bold text-xs block text-slate-900 group-hover:text-blue-600">
											Guía de Despacho Estándar (con QR)
										</span>
										<span class="text-[10px] text-muted-foreground block">
											Formato oficial de embarque con QR de trazabilidad
										</span>
									</div>
								</div>
								<Badge variant="outline" class="text-[10px] font-mono shrink-0">Estándar</Badge>
							</a>

							<!-- Opción 2: Guía de Paquetería / Shipping Label con Código de Barras -->
							<a
								href={`/ventas/guia-paqueteria/${selectedVentaPrint.id}${cajaQuery}`}
								target="_blank"
								class="p-2.5 border rounded-xl hover:border-cyan-600 hover:bg-cyan-50/50 transition-all flex items-center justify-between group"
							>
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
										<Barcode class="w-4 h-4" />
									</div>
									<div>
										<span class="font-bold text-xs block text-slate-900 group-hover:text-cyan-700">
											Guía de Paquetería (con Código de Barras 1D)
										</span>
										<span class="text-[10px] text-muted-foreground block">
											Shipping label con bulto, tracking y Code 128B
										</span>
									</div>
								</div>
								<Badge variant="secondary" class="text-[10px] font-mono text-cyan-800 bg-cyan-100 shrink-0">1D Barcode</Badge>
							</a>
						{/if}

						<!-- Opción 3: Picking List / Invoice Comercial de Paquetería -->
						<a
							href={`/ventas/picking/${selectedVentaPrint.id}${cajaQuery}`}
							target="_blank"
							class="p-2.5 border rounded-xl hover:border-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
						>
							<div class="flex items-center gap-3">
								<div class="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
									<ClipboardList class="w-4 h-4" />
								</div>
								<div>
									<span class="font-bold text-xs block text-slate-900 group-hover:text-emerald-600">
										{isVentaCajas(selectedVentaPrint) ? 'Recibo Comercial / Invoice de Cajas' : 'Picking List & Invoice Comercial'}
									</span>
									<span class="text-[10px] text-muted-foreground block">
										{isVentaCajas(selectedVentaPrint) ? 'Comprobante comercial de venta de cajas y liquidación de pago' : 'Desglose de bultos, tarifas, recolección, póliza y firmas'}
									</span>
								</div>
							</div>
							<Badge variant="secondary" class="text-[10px] font-mono text-emerald-800 bg-emerald-100 shrink-0">
								{isVentaCajas(selectedVentaPrint) ? 'Invoice' : 'Picking'}
							</Badge>
						</a>

						{#if !isVentaCajas(selectedVentaPrint)}
							<!-- Opción 4: Declaración Jurada de Aduana -->
							<a
								href={`/ventas/aduana/${selectedVentaPrint.id}${cajaQuery}`}
								target="_blank"
								class="p-2.5 border rounded-xl hover:border-purple-600 hover:bg-purple-50/50 transition-all flex items-center justify-between group"
							>
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
										<FileText class="w-4 h-4" />
									</div>
									<div>
										<span class="font-bold text-xs block text-slate-900 group-hover:text-purple-600">
											Declaración Jurada de Aduana
										</span>
										<span class="text-[10px] text-muted-foreground block">
											Manifiesto aduanero, aforo e inspección fiscal
										</span>
									</div>
								</div>
								<Badge variant="outline" class="text-[10px] font-mono shrink-0">Aduana</Badge>
							</a>
						{/if}
					</div>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isPrintModalOpen = false)} class="text-xs w-full sm:w-auto">
					Cerrar
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
