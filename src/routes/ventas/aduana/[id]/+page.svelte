<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Printer, ArrowLeft, User, CreditCard, Boxes, AlertCircle, Package } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedCaja = $state('ALL');
	$effect(() => {
		if (data.cajaParam) selectedCaja = data.cajaParam;
	});

	const baseVenta = $derived(data.venta);
	const config = $derived(data.configuracion);
	const plantilla = $derived(data.plantilla);
	const documentos = $derived(data.documentosPorCaja || []);
	const isMultiBox = $derived(documentos.length > 1);
	const visibleDocs = $derived(
		selectedCaja === 'ALL'
			? documentos
			: documentos.filter((d: any) => d.cajaNumero === selectedCaja)
	);

	function printDocument() {
		window.print();
	}
</script>

<svelte:head>
	<title>Declaración de Aduana #{baseVenta.codigo_venta || 'BORRADOR'} | Sistema Logístico</title>
	<style>
		@media print {
			.box-page-break {
				page-break-before: always !important;
				break-before: page !important;
			}
		}
	</style>
</svelte:head>

<div class="min-h-screen bg-muted/20 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900 font-sans">
	<!-- Barra de Herramientas (No imprimible) -->
	<div class="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
		<div class="flex items-center gap-2">
			<Button href="/ventas/historial" variant="outline" size="sm" class="gap-2 text-xs">
				<ArrowLeft class="w-4 h-4" /> Volver al Historial
			</Button>
			{#if isMultiBox}
				<Badge class="text-[11px] bg-primary text-primary-foreground font-mono">
					📦 {documentos.length} Cajas (1 declaración por caja)
				</Badge>
			{/if}
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			{#if isMultiBox}
				<div class="flex items-center gap-1 bg-white p-1 rounded-lg border shadow-xs">
					<button
						type="button"
						onclick={() => (selectedCaja = 'ALL')}
						class="px-2.5 py-1 rounded text-[11px] font-bold transition-colors {selectedCaja === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-100'}"
					>
						Todas ({documentos.length})
					</button>
					{#each documentos as doc}
						<button
							type="button"
							onclick={() => (selectedCaja = doc.cajaNumero || 'ALL')}
							class="px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors {selectedCaja === doc.cajaNumero ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-100'}"
						>
							📦 {doc.cajaNumero}
						</button>
					{/each}
				</div>
			{/if}
			<Button onclick={printDocument} class="gap-2 font-bold text-xs bg-primary text-primary-foreground">
				<Printer class="w-4 h-4" />
				{isMultiBox && selectedCaja === 'ALL' ? `Imprimir ${visibleDocs.length} Declaraciones de Aduana` : 'Imprimir Declaración de Aduana'}
			</Button>
		</div>
	</div>

	<div class="space-y-8 print:space-y-0">
		{#each visibleDocs as doc, idx}
			{@const venta = doc.venta}
			{@const qrSvg = doc.qrSvg}
			<div class="{idx > 0 ? 'box-page-break' : ''}">
				{#if isMultiBox}
					<div class="max-w-4xl mx-auto mb-2 flex items-center justify-between bg-slate-800 text-white px-4 py-1.5 rounded-t-lg text-xs font-bold print:hidden">
						<span class="flex items-center gap-1.5 font-mono">
							<Package class="w-3.5 h-3.5 text-primary" />
							DECLARACIÓN DE ADUANA — CAJA {doc.cajaNumero} (Caja {doc.cajaIndex} de {doc.totalCajas})
						</span>
						<span class="text-[11px] text-slate-300 font-mono">
							[{venta.producto?.codigo}] {venta.producto?.descripcion} • {venta.peso} LB
						</span>
					</div>
				{/if}

				<!-- DOCUMENTO IMPRESO DECLARACIÓN DE ADUANA -->
				<div class="max-w-4xl mx-auto bg-white border print:border-none shadow-sm rounded-xl p-6 sm:p-8 space-y-6 print:shadow-none print:p-0">
					<!-- Encabezado Oficial Aduanero -->
					<div class="flex items-start justify-between border-b pb-6 gap-4">
						<div class="space-y-1">
							{#if config?.logo_url}
								<img src={config.logo_url} alt="Logo" class="h-10 object-contain mb-2" />
							{:else}
								<h1 class="text-xl font-black tracking-tight text-primary uppercase">
									{config?.nombre_empresa || 'SISTEMA LOGÍSTICO INTERNACIONAL'}
								</h1>
							{/if}
							<p class="text-xs text-muted-foreground font-medium">
								{config?.direccion_empresa || 'DIVISIÓN DE OPERACIONES Y CONTROL ADUANERO'}
							</p>
							<p class="text-xs text-muted-foreground">
								RIF/Tax ID: {config?.identificacion_fiscal || 'J-00000000-0'} | Tel: {config?.telefono_empresa || 'N/A'}
							</p>
						</div>

						<div class="flex items-center gap-4 text-right">
							<div class="space-y-1">
								<Badge variant="secondary" class="uppercase text-[10px] font-bold px-2 py-0.5 border-amber-500/40 text-amber-800 bg-amber-500/10">
									MANIFIESTO Y AUDITORÍA DE EMBARQUE {doc.cajaNumero ? `• CAJA ${doc.cajaNumero}` : ''}
								</Badge>
								<h2 class="text-lg font-black tracking-tight text-slate-900 uppercase">
									{plantilla?.encabezado_titulo || 'DECLARACIÓN JURADA DE ADUANA'} {doc.cajaNumero ? `— CAJA ${doc.cajaNumero}` : ''}
								</h2>
								<p class="font-mono text-sm font-bold text-primary">
									CÓDIGO VENTA: {venta.codigo_venta || 'BORRADOR'}
								</p>
								<p class="text-[10px] text-muted-foreground">
									Fecha Emisión: {new Date(venta.created_at).toLocaleDateString()}
								</p>
							</div>

							<div class="p-2 border rounded-lg bg-white shadow-xs shrink-0 flex flex-col items-center">
								{@html qrSvg}
								<span class="text-[8px] font-mono text-muted-foreground mt-0.5 uppercase">Aduana QR</span>
							</div>
						</div>
					</div>

					<!-- Rejilla de Actores Operativos -->
					<div class="grid grid-cols-2 gap-6 text-xs border rounded-xl p-4 bg-slate-50/50">
						<!-- Exportador / Remitente -->
						<div class="space-y-2 border-r pr-4">
							<div class="flex items-center gap-1.5 font-bold uppercase text-[11px] text-primary border-b pb-1">
								<User class="w-3.5 h-3.5" /> Exportador / Remitente
							</div>
							<div class="space-y-1 font-medium">
								<p class="font-bold text-sm text-slate-900 uppercase">{venta.cliente_origen?.nombre_completo}</p>
								<p><span class="text-muted-foreground">Doc. Identidad:</span> {venta.cliente_origen?.cedula || 'N/A'}</p>
								<p><span class="text-muted-foreground">Teléfono:</span> {venta.cliente_origen?.telefono || venta.cliente_origen?.numero_celular || 'N/A'}</p>
								<p><span class="text-muted-foreground">Dirección Fiscal:</span> {venta.cliente_origen?.direccion_1 || 'N/A'}</p>
							</div>
						</div>

						<!-- Importador / Destinatario -->
						<div class="space-y-2">
							<div class="flex items-center justify-between border-b pb-1">
								<span class="flex items-center gap-1.5 font-bold uppercase text-[11px] text-primary">
									<User class="w-3.5 h-3.5" /> Importador / Consignatario
								</span>
								<Badge variant="outline" class="font-mono text-[9px] font-bold uppercase">
									{venta.pais_destino?.nombre}
								</Badge>
							</div>
							<div class="space-y-1 font-medium">
								<p class="font-bold text-sm text-slate-900 uppercase">{venta.cliente_destino?.nombre_completo}</p>
								<p><span class="text-muted-foreground">Doc. Identidad / RIF:</span> <span class="font-bold">{venta.cliente_destino?.cedula || 'N/A'}</span></p>
								<p><span class="text-muted-foreground">Teléfono:</span> {venta.cliente_destino?.telefono || venta.cliente_destino?.numero_celular || 'N/A'}</p>
								<p><span class="text-muted-foreground">Dirección Destino:</span> {venta.direccion_entrega || venta.cliente_destino?.direccion_1 || 'N/A'}</p>
							</div>
						</div>
					</div>

					<!-- Tabla Detallada de Artículos Declarados -->
					<div class="border rounded-xl overflow-hidden text-xs space-y-0">
						<div class="bg-slate-100 p-3 font-bold uppercase text-[11px] flex items-center justify-between border-b">
							<span class="flex items-center gap-1.5"><Boxes class="w-4 h-4 text-primary" /> Manifiesto de Artículos Declarados {doc.cajaNumero ? `en Caja ${doc.cajaNumero}` : 'en el Envío'}</span>
							<span class="font-mono text-emerald-600 font-extrabold text-sm">TOTAL DECLARADO: ${venta.valor_declarado.toFixed(2)}</span>
						</div>
						<table class="w-full text-left">
							<thead class="bg-slate-50 text-[10px] uppercase font-semibold border-b">
								<tr>
									<th class="p-2.5">Descripción del Artículo Declarado</th>
									<th class="p-2.5 text-center">Cantidad Unidades</th>
									<th class="p-2.5 text-right">Valor Declarado ($)</th>
								</tr>
							</thead>
							<tbody class="divide-y font-medium">
								{#if venta.articulos_registrados && venta.articulos_registrados.length > 0}
									{#each venta.articulos_registrados as art}
										<tr>
											<td class="p-2.5 uppercase font-semibold">{art.nombre}</td>
											<td class="p-2.5 text-center font-mono">{art.cantidad}</td>
											<td class="p-2.5 text-right font-mono font-bold text-emerald-600">${Number(art.valor_total).toFixed(2)}</td>
										</tr>
									{/each}
								{:else}
									<tr>
										<td colspan="3" class="p-4 text-center text-muted-foreground">
											No se desglosaron artículos individuales para esta operación. Valor declarado consolidado: ${venta.valor_declarado.toFixed(2)}
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>

					<!-- Desglose Financiero y Auditoría de Cobro Mixto por Componente -->
					<div class="grid grid-cols-2 gap-6 text-xs">
						<!-- Resumen Tarifario -->
						<div class="border p-4 rounded-xl space-y-2 bg-slate-50/50">
							<span class="font-bold border-b pb-1 block uppercase text-[11px] text-primary">Resumen Financiero del Servicio {doc.cajaNumero ? `(Caja ${doc.cajaNumero})` : ''}:</span>
							<div class="flex justify-between"><span>Costo Tarifa Base ({venta.peso} LB):</span><span class="font-mono font-semibold">${venta.monto_base.toFixed(2)}</span></div>
							<div class="flex justify-between text-emerald-600"><span>(+) Cargos Adicionales:</span><span class="font-mono font-semibold">+${venta.monto_total_cargos.toFixed(2)}</span></div>
							<div class="flex justify-between text-destructive"><span>(-) Descuentos Aplicados:</span><span class="font-mono font-semibold">-${venta.monto_total_descuentos.toFixed(2)}</span></div>
							{#if venta.requiere_seguro}
								<div class="flex justify-between text-amber-600"><span>🛡️ Cobertura Seguro ({venta.porcentaje_seguro_aplicado}%):</span><span class="font-mono font-semibold">+${venta.monto_seguro.toFixed(2)}</span></div>
							{/if}
							<div class="flex justify-between font-extrabold text-sm border-t pt-1 text-slate-900">
								<span>TOTAL VENTA:</span>
								<span class="font-mono text-base text-emerald-600">${venta.monto_total.toFixed(2)}</span>
							</div>
						</div>

						<!-- Desglose de Pagos Registrados / Cobro Mixto -->
						<div class="border p-4 rounded-xl space-y-2 bg-slate-50/50">
							<div class="flex justify-between items-center border-b pb-1">
								<span class="font-bold uppercase text-[11px] text-primary flex items-center gap-1">
									<CreditCard class="w-3.5 h-3.5" /> Componentes de Pago Abonados:
								</span>
								<Badge variant={venta.estatus_pago === 'pagada' ? 'default' : 'outline'} class="uppercase text-[9px] font-bold">
									{venta.estatus_pago}
								</Badge>
							</div>

							{#if venta.pagos_registrados && venta.pagos_registrados.length > 0}
								<div class="divide-y border rounded bg-white">
									{#each venta.pagos_registrados as p}
										<div class="p-1.5 flex justify-between items-center text-[11px]">
											<div>
												<span class="font-bold uppercase block">{p.concepto_nombre}</span>
												{#if p.referencia}<span class="text-[9px] font-mono text-muted-foreground">Ref: {p.referencia}</span>{/if}
											</div>
											<span class="font-mono font-bold text-emerald-600">${Number(p.monto).toFixed(2)}</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-muted-foreground text-[11px] italic">Sin pagos registrados individualizados.</p>
							{/if}

							<div class="border-t pt-1 text-[11px] space-y-0.5">
								<div class="flex justify-between font-bold"><span>Total Pagado Acumulado:</span><span class="font-mono text-emerald-600">${(venta.monto_pagado || 0).toFixed(2)}</span></div>
								<div class="flex justify-between font-bold text-destructive"><span>Saldo Pendiente por Pagar:</span><span class="font-mono">${Math.max(0, venta.monto_total - (venta.monto_pagado || 0)).toFixed(2)}</span></div>
							</div>
						</div>
					</div>

					<!-- Recomendaciones Estándares e Inspección de Aduana -->
					<div class="border rounded-xl p-4 bg-amber-500/5 border-amber-500/20 text-xs space-y-2">
						<div class="flex items-center gap-1.5 font-bold uppercase text-amber-700 text-[11px]">
							<AlertCircle class="w-4 h-4 text-amber-600 shrink-0" /> Recomendaciones Estándares de Envíos e Inspección Aduanera
						</div>
						<div class="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-mono bg-white/80 p-3 rounded-lg border border-amber-500/20">
							{plantilla?.recomendaciones_aduana || `1. Declaración Jurada: El remitente declara bajo fe de juramento que la mercancía descrita no contiene sustancias estupefacientes, psicotrópicas, dinero en efectivo no autorizado, explosivos o mercancías de prohibida importación/exportación.
2. Inspección Fiscal: El envío queda sujeto a los controles, aforos y retenciones de la administración aduanera del país de destino.
3. Cobertura de Seguro y Reclamos: En caso de mermas, averías o faltantes, el destinatario debe dejar constancia escrita en el acta de recepción en un plazo no mayor a 48 horas.`}
						</div>
					</div>

					<!-- Firmas Oficiales de Auditoría -->
					<div class="grid grid-cols-2 gap-12 pt-8 border-t text-xs text-center font-semibold">
						<div class="space-y-8">
							<div class="border-b border-slate-400 w-3/4 mx-auto"></div>
							<p class="uppercase text-muted-foreground">Firma y Cédula del Declarante / Remitente</p>
						</div>
						<div class="space-y-8">
							<div class="border-b border-slate-400 w-3/4 mx-auto"></div>
							<p class="uppercase text-muted-foreground">Sello y Firma del Inspector de Aduana / Agente</p>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
