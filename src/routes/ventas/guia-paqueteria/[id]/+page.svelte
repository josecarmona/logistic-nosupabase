<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Printer, ArrowLeft, Package } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedCaja = $state('ALL');
	$effect(() => {
		if (data.cajaParam) selectedCaja = data.cajaParam;
	});

	const config = $derived(data.configuracion);
	const baseInvoiceCode = $derived(data.invoiceCode);
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
	<title>Guía de Paquetería #{baseInvoiceCode} | Sistema Logístico</title>
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
	<div class="max-w-3xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
		<div class="flex items-center gap-2">
			<Button href="/ventas/historial" variant="outline" size="sm" class="gap-2 text-xs">
				<ArrowLeft class="w-4 h-4" /> Volver al Historial
			</Button>
			{#if isMultiBox}
				<Badge class="text-[11px] bg-emerald-600 text-white font-mono">
					📦 {documentos.length} Cajas (1 guía por caja)
				</Badge>
			{/if}
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			{#if isMultiBox}
				<div class="flex items-center gap-1 bg-white p-1 rounded-lg border shadow-xs">
					<button
						type="button"
						onclick={() => (selectedCaja = 'ALL')}
						class="px-2.5 py-1 rounded text-[11px] font-bold transition-colors {selectedCaja === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}"
					>
						Todas ({documentos.length})
					</button>
					{#each documentos as doc}
						<button
							type="button"
							onclick={() => (selectedCaja = doc.cajaNumero || 'ALL')}
							class="px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors {selectedCaja === doc.cajaNumero ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}"
						>
							📦 {doc.cajaNumero}
						</button>
					{/each}
				</div>
			{/if}
			<Button onclick={printDocument} class="gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
				<Printer class="w-4 h-4" />
				{isMultiBox && selectedCaja === 'ALL' ? `Imprimir ${visibleDocs.length} Guías de Paquetería` : 'Imprimir Guía de Paquetería'}
			</Button>
		</div>
	</div>

	<div class="space-y-8 print:space-y-0">
		{#each visibleDocs as doc, idx}
			{@const venta = doc.venta}
			{@const invoiceCode = doc.invoiceCode}
			{@const barcodeSvg = doc.barcodeSvgWide}
			<div class="{idx > 0 ? 'box-page-break' : ''}">
				{#if isMultiBox}
					<div class="max-w-3xl mx-auto mb-2 flex items-center justify-between bg-slate-800 text-white px-4 py-1.5 rounded-t-lg text-xs font-bold print:hidden">
						<span class="flex items-center gap-1.5 font-mono">
							<Package class="w-3.5 h-3.5 text-emerald-400" />
							GUÍA DE PAQUETERÍA — CAJA {doc.cajaNumero} (Caja {doc.cajaIndex} de {doc.totalCajas})
						</span>
						<span class="text-[11px] text-slate-300 font-mono">
							[{venta.producto?.codigo}] {venta.producto?.descripcion} • {venta.peso} LB
						</span>
					</div>
				{/if}

				<!-- DOCUMENTO IMPRESO GUÍA DE PAQUETERÍA / LABEL DE ENVÍO -->
				<div class="max-w-3xl mx-auto bg-white border print:border-none shadow-sm rounded-xl p-8 sm:p-10 space-y-6 print:shadow-none print:p-0">
					<!-- Membrete Corporativo Superior -->
					<div class="text-center border-b pb-6 space-y-2">
						{#if config?.logo_url}
							<img src={config.logo_url} alt="Logo" class="max-h-16 mx-auto object-contain mb-1" />
						{:else}
							<div class="p-3 bg-primary text-primary-foreground font-black text-2xl tracking-tight rounded-xl inline-block shadow-sm">
								{config?.nombre_empresa || 'HH WORLD GROUP'}
							</div>
						{/if}
						<p class="text-xs font-bold uppercase text-slate-600 tracking-wider">
							{config?.eslogan || 'SERVICIOS DE CARGA Y LOGÍSTICA INTERNACIONAL'}
						</p>
					</div>

					<!-- Rejilla Principal: Direcciones (BILL TO / SHIP TO) vs Ficha Técnica -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b pb-6">
						<!-- Columna Izquierda: BILL TO y SHIP TO en tipografía grande y legible -->
						<div class="space-y-6 pr-0 sm:pr-4 sm:border-r">
							<!-- BILL TO -->
							<div class="space-y-1">
								<span class="font-black text-lg tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 inline-block">
									BILL TO (REMITENTE):
								</span>
								<p class="font-black text-base uppercase text-slate-800 pt-1">
									{venta.cliente_origen?.nombre_completo}
								</p>
								<p class="font-mono font-bold text-sm text-slate-700">
									TEL: {venta.cliente_origen?.telefono || venta.cliente_origen?.numero_celular || 'N/A'}
								</p>
							</div>

							<!-- SHIP TO -->
							<div class="space-y-1 pt-2">
								<span class="font-black text-lg tracking-wider text-slate-900 border-b-2 border-slate-900 pb-0.5 inline-block">
									SHIP TO (DESTINATARIO):
								</span>
								<p class="font-black text-base uppercase text-slate-900 pt-1">
									{venta.cliente_destino?.nombre_completo}
								</p>
								<p class="font-bold text-sm uppercase text-slate-800 leading-snug">
									{venta.direccion_entrega || venta.cliente_destino?.direccion_1 || 'N/A'}
								</p>
								<p class="font-bold text-sm uppercase text-slate-700">
									{venta.cliente_destino?.ciudad || ''} {venta.cliente_destino?.estado || ''} {venta.cliente_destino?.codigo_postal ? `CP: ${venta.cliente_destino.codigo_postal}` : ''}
								</p>
								<p class="font-black text-sm uppercase text-primary">
									PAÍS DESTINO: {venta.pais_destino?.nombre}
								</p>
								<p class="font-mono font-bold text-sm text-slate-700">
									TEL: {venta.cliente_destino?.telefono || venta.cliente_destino?.numero_celular || 'N/A'}
								</p>
								<p class="font-mono font-bold text-xs text-muted-foreground pt-1">
									REF: {invoiceCode}
								</p>
							</div>
						</div>

						<!-- Columna Derecha: Observaciones y Ficha Técnica del Bulto -->
						<div class="space-y-6 flex flex-col justify-between pl-0 sm:pl-2">
							<!-- Observación General -->
							<div class="border rounded-xl p-4 bg-slate-50 text-center space-y-1">
								<span class="font-black text-sm uppercase tracking-wider text-slate-700 block">OBSERVACIONES:</span>
								<span class="font-black text-base uppercase text-primary block">
									{venta.tipo_entrega === 'oficina' ? 'RETIRO EN OFICINA' : 'ENTREGA A DOMICILIO'} (NORMAL)
								</span>
								{#if doc.cajaNumero}
									<span class="inline-block mt-1 px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono font-black text-sm">
										CAJA {doc.cajaNumero}
									</span>
								{/if}
							</div>

							<!-- Especificaciones Técnicas del Envío -->
							<div class="space-y-3 text-sm font-semibold">
								{#if doc.cajaNumero}
									<div class="flex justify-between border-b pb-1.5">
										<span class="text-slate-600 font-bold uppercase">N° DE CAJA / BULTO:</span>
										<span class="font-mono font-black text-base text-primary">
											{doc.cajaNumero}
										</span>
									</div>
								{/if}

								<div class="flex justify-between border-b pb-1.5">
									<span class="text-slate-600 font-bold uppercase">TAMAÑO / CAJA:</span>
									<span class="font-black text-slate-900 uppercase">
										{venta.producto?.descripcion || 'ESTÁNDAR'}
									</span>
								</div>

								<div class="flex justify-between border-b pb-1.5">
									<span class="text-slate-600 font-bold uppercase">PESO FACTURABLE:</span>
									<span class="font-mono font-black text-base text-slate-900">
										{venta.peso} LBS
									</span>
								</div>

								<div class="flex justify-between border-b pb-1.5">
									<span class="text-slate-600 font-bold uppercase">FECHA DE ENVÍO:</span>
									<span class="font-mono font-bold text-slate-800">
										{new Date(venta.created_at).toLocaleDateString()}
									</span>
								</div>

								<div class="flex justify-between border-b pb-1.5">
									<span class="text-slate-600 font-bold uppercase">PAQUETERÍA:</span>
									<span class="font-black uppercase text-primary">
										{venta.proveedor?.nombre || 'PAQUETE EXPRÉS / JBG'}
									</span>
								</div>

								{#if venta.valor_declarado > 0}
									<div class="flex justify-between pb-1 text-emerald-700">
										<span class="font-bold uppercase">VALOR DECLARADO:</span>
										<span class="font-mono font-black">${venta.valor_declarado.toFixed(2)}</span>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Identificador de Factura / Tracking -->
					<div class="text-center space-y-1">
						<span class="text-xs font-black uppercase tracking-widest text-slate-500">IDENTIFICADOR DE GUÍA / INVOICE ID</span>
						<h2 class="text-3xl font-black font-mono tracking-tight text-primary">
							{invoiceCode}
						</h2>
					</div>

					<!-- Código de Barras 1D en el Centro -->
					<div class="flex justify-center p-3 bg-white border rounded-xl shadow-2xs">
						{@html barcodeSvg}
					</div>

					<!-- Pie de Guía de Paquetería -->
					<div class="text-center pt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
						DOCUMENTO OFICIAL DE DESPACHO • ESCANEAR CÓDIGO DE BARRAS PARA CONTROL EN RUTA
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
