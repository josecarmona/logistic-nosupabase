<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Printer, ArrowLeft, Truck, User, Package, Boxes } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedCaja = $state('ALL');
	$effect(() => {
		if (data.cajaParam) selectedCaja = data.cajaParam;
	});

	const baseVenta = $derived(data.venta);
	const config = $derived(data.configuracion);
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
	<title>Guía de Despacho #{baseVenta.codigo_venta || 'BORRADOR'} | Sistema Logístico</title>
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
				{isMultiBox && selectedCaja === 'ALL' ? `Imprimir ${visibleDocs.length} Guías de Despacho` : 'Imprimir Guía de Despacho'}
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
							<Package class="w-3.5 h-3.5 text-emerald-400" />
							GUÍA DE DESPACHO — CAJA {doc.cajaNumero} (Caja {doc.cajaIndex} de {doc.totalCajas})
						</span>
						<span class="text-[11px] text-slate-300 font-mono">
							[{venta.producto?.codigo}] {venta.producto?.descripcion} • {venta.peso} LB
						</span>
					</div>
				{/if}

				<!-- DOCUMENTO IMPRESO GUÍA DE DESPACHO -->
				<div class="max-w-4xl mx-auto bg-white border print:border-none shadow-sm rounded-xl p-6 sm:p-8 space-y-6 print:shadow-none print:p-0">
					<!-- Encabezado Oficial -->
					<div class="flex items-start justify-between border-b pb-6 gap-4">
						<div class="space-y-1">
							{#if config?.logo_url}
								<img src={config.logo_url} alt="Logo" class="h-10 object-contain mb-2" />
							{:else}
								<h1 class="text-xl font-black tracking-tight text-primary uppercase">
									{config?.nombre_empresa || 'SISTEMA LOGÍSTICO'}
								</h1>
							{/if}
							<p class="text-xs text-muted-foreground font-medium">
								{config?.direccion_empresa || 'CENTRO DE OPERACIONES Y EMBARQUE LOGÍSTICO'}
							</p>
							<p class="text-xs text-muted-foreground">
								Tel: {config?.telefono_empresa || 'N/A'} | Email: {config?.email_empresa || 'info@logistica.com'}
							</p>
						</div>

						<!-- Título y Código QR -->
						<div class="flex items-center gap-4 text-right">
							<div class="space-y-1">
								<Badge variant="outline" class="uppercase text-[10px] font-bold px-2 py-0.5 border-primary/40 text-primary">
									DOCUMENTO OFICIAL DE EMBARQUE {doc.cajaNumero ? `• CAJA ${doc.cajaNumero}` : ''}
								</Badge>
								<h2 class="text-lg font-black tracking-tight text-slate-900 uppercase">
									GUÍA DE DESPACHO {doc.cajaNumero ? `— CAJA ${doc.cajaNumero}` : ''}
								</h2>
								<p class="font-mono text-sm font-bold text-emerald-600">
									CÓDIGO: {venta.codigo_venta || 'BORRADOR'}
								</p>
								<p class="text-[10px] text-muted-foreground">
									Fecha Emisión: {new Date(venta.created_at).toLocaleDateString()} {new Date(venta.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</p>
							</div>

							<!-- Código QR Vectorial -->
							<div class="p-2 border rounded-lg bg-white shadow-xs shrink-0 flex flex-col items-center">
								{@html qrSvg}
								<span class="text-[8px] font-mono text-muted-foreground mt-0.5 uppercase">Escanear Tracking</span>
							</div>
						</div>
					</div>

					<!-- Rejilla Remitente y Consignatario -->
					<div class="grid grid-cols-2 gap-6 text-xs border rounded-xl p-4 bg-slate-50/50">
						<!-- Remitente -->
						<div class="space-y-2 border-r pr-4">
							<div class="flex items-center gap-1.5 font-bold uppercase text-[11px] text-primary border-b pb-1">
								<User class="w-3.5 h-3.5" /> Remitente (Origen)
							</div>
							<div class="space-y-1 font-medium">
								<p class="font-bold text-sm text-slate-900 uppercase">{venta.cliente_origen?.nombre_completo}</p>
								<p><span class="text-muted-foreground">Cédula/RIF:</span> {venta.cliente_origen?.cedula || 'N/A'}</p>
								<p><span class="text-muted-foreground">Teléfono:</span> {venta.cliente_origen?.telefono || venta.cliente_origen?.numero_celular || 'N/A'}</p>
								<p><span class="text-muted-foreground">Dirección:</span> {venta.cliente_origen?.direccion_1 || 'N/A'}</p>
							</div>
						</div>

						<!-- Consignatario -->
						<div class="space-y-2">
							<div class="flex items-center justify-between border-b pb-1">
								<span class="flex items-center gap-1.5 font-bold uppercase text-[11px] text-primary">
									<User class="w-3.5 h-3.5" /> Consignatario (Destino)
								</span>
								<Badge variant="outline" class="font-mono text-[9px] font-bold uppercase">
									{venta.pais_destino?.nombre || 'DESTINO'}
								</Badge>
							</div>
							<div class="space-y-1 font-medium">
								<p class="font-bold text-sm text-slate-900 uppercase">{venta.cliente_destino?.nombre_completo}</p>
								<p><span class="text-muted-foreground">Cédula/RIF:</span> <span class="font-bold">{venta.cliente_destino?.cedula || 'N/A'}</span></p>
								<p><span class="text-muted-foreground">Teléfono:</span> {venta.cliente_destino?.telefono || venta.cliente_destino?.numero_celular || 'N/A'}</p>
								<p><span class="text-muted-foreground">Ciudad / País:</span> {venta.cliente_destino?.ciudad || 'N/A'} - {venta.pais_destino?.nombre}</p>
							</div>
						</div>
					</div>

					<!-- Rejilla de Transporte y Tipo de Entrega en Destino -->
					<div class="border rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs">
						<div class="flex items-center justify-between border-b pb-2">
							<span class="font-bold uppercase text-primary flex items-center gap-1.5 text-xs">
								<Truck class="w-4 h-4" /> Empresa Proveedora de Transporte & Tipo de Entrega
							</span>
							<Badge variant={venta.tipo_entrega === 'oficina' ? 'secondary' : 'default'} class="uppercase text-[10px] font-bold">
								{venta.tipo_entrega === 'oficina' ? 'RETIRO EN OFICINA / OCURRE' : 'ENTREGA A DOMICILIO'}
							</Badge>
						</div>

						<div class="grid grid-cols-2 gap-4 pt-1">
							<div>
								<span class="text-muted-foreground block text-[10px] font-bold uppercase">Empresa de Transporte:</span>
								<span class="font-bold text-sm uppercase text-slate-900">
									{venta.proveedor?.nombre || 'TRANSPORTE INTERNO / PROPIO'}
									{#if venta.proveedor?.tiene_api}
										<span class="text-[10px] text-blue-600 font-extrabold ml-1">(CON API)</span>
									{/if}
								</span>
							</div>
							<div>
								<span class="text-muted-foreground block text-[10px] font-bold uppercase">Dirección Final de Entrega:</span>
								<p class="font-mono text-xs font-semibold text-slate-800">
									{venta.direccion_entrega || venta.cliente_destino?.direccion_1 || 'N/A'}
								</p>
							</div>
						</div>
					</div>

					<!-- Especificaciones Técnicas y Pesos -->
					<div class="grid grid-cols-4 gap-3 text-xs text-center border p-3 rounded-xl bg-slate-100/60 font-mono">
						<div>
							<span class="text-[10px] text-muted-foreground font-sans uppercase font-bold block">Producto {doc.cajaNumero ? `(Caja ${doc.cajaNumero})` : ''}</span>
							<span class="font-bold text-primary">[{venta.producto?.codigo}] {venta.producto?.descripcion}</span>
						</div>
						<div>
							<span class="text-[10px] text-muted-foreground font-sans uppercase font-bold block">Peso Reportado</span>
							<span class="font-bold">{venta.peso_reportado || venta.peso} LB</span>
						</div>
						<div>
							<span class="text-[10px] text-muted-foreground font-sans uppercase font-bold block">Peso Volumétrico</span>
							<span class="font-bold">{venta.peso_volumetrico || 0} LB</span>
						</div>
						<div>
							<span class="text-[10px] text-muted-foreground font-sans uppercase font-bold block">Peso Facturable</span>
							<span class="font-extrabold text-sm text-emerald-600">{venta.peso} LB</span>
						</div>
					</div>

					<!-- Tabla de Artículos Declarados -->
					{#if venta.articulos_registrados && venta.articulos_registrados.length > 0}
						<div class="border rounded-xl overflow-hidden text-xs">
							<div class="bg-slate-100 p-2.5 font-bold uppercase text-[11px] flex items-center justify-between border-b">
								<span class="flex items-center gap-1.5"><Boxes class="w-4 h-4 text-primary" /> Artículos Declarados {doc.cajaNumero ? `en Caja ${doc.cajaNumero}` : 'en la Guía'}</span>
								<span class="font-mono text-emerald-600">${venta.valor_declarado.toFixed(2)}</span>
							</div>
							<table class="w-full text-left">
								<thead class="bg-slate-50 text-[10px] uppercase font-semibold border-b">
									<tr>
										<th class="p-2">Item / Nombre del Artículo</th>
										<th class="p-2 text-center">Cantidad</th>
										<th class="p-2 text-right">Valor Total ($)</th>
									</tr>
								</thead>
								<tbody class="divide-y font-medium">
									{#each venta.articulos_registrados as art}
										<tr>
											<td class="p-2 uppercase font-semibold">{art.nombre}</td>
											<td class="p-2 text-center font-mono">{art.cantidad}</td>
											<td class="p-2 text-right font-mono font-bold text-emerald-600">${Number(art.valor_total).toFixed(2)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					<!-- Firmas de Conformidad y Recepción -->
					<div class="grid grid-cols-2 gap-12 pt-8 border-t text-xs text-center font-semibold">
						<div class="space-y-8">
							<div class="border-b border-slate-400 w-3/4 mx-auto"></div>
							<p class="uppercase text-muted-foreground">Firma y Sello del Operador de Despacho</p>
						</div>
						<div class="space-y-8">
							<div class="border-b border-slate-400 w-3/4 mx-auto"></div>
							<p class="uppercase text-muted-foreground">Firma de Conformidad del Consignatario / Destino</p>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
