<script lang="ts">
	import type { PageData } from './$types';
	import { Printer, ArrowLeft, FileText, Package } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	let { data }: { data: PageData } = $props();

	let selectedCaja = $state('ALL');
	$effect(() => {
		if (data.cajaParam) selectedCaja = data.cajaParam;
	});

	const documentos = $derived(data.documentosPorCaja || []);
	const isMultiBox = $derived(documentos.length > 1);
	const visibleDocs = $derived(
		selectedCaja === 'ALL'
			? documentos
			: documentos.filter((d: any) => d.cajaNumero === selectedCaja)
	);

	function handlePrint() {
		window.print();
	}

	const paperClass = $derived(() => {
		const size = data.plantilla?.paper_size || 'letter';
		const orientation = data.plantilla?.orientation || 'portrait';
		if (size === 'a4') return orientation === 'landscape' ? 'w-[297mm]' : 'w-[210mm] min-h-[297mm]';
		if (size === 'a5') return orientation === 'landscape' ? 'w-[210mm]' : 'w-[148mm] min-h-[210mm]';
		if (size === 'thermal_80mm') return 'w-[80mm] min-h-0';
		if (size === 'thermal_58mm') return 'w-[58mm] min-h-0';
		if (size === 'legal') return orientation === 'landscape' ? 'w-[14in]' : 'w-[8.5in] min-h-[14in]';
		// Default letter
		return orientation === 'landscape' ? 'w-[11in]' : 'w-[8.5in] min-h-[11in]';
	});
</script>

<svelte:head>
	<title>{data.plantilla?.nombre || 'Documento'} - {data.venta?.codigo_venta || 'Venta'}</title>
	<style>
		@media print {
			@page {
				margin: 8mm;
				size: auto;
			}
			body {
				background: white !important;
				color: black !important;
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
			.no-print {
				display: none !important;
			}
			.print-container {
				width: 100% !important;
				max-width: none !important;
				margin: 0 !important;
				padding: 0 !important;
				box-shadow: none !important;
				border: none !important;
			}
			.box-page-break {
				page-break-before: always !important;
				break-before: page !important;
			}
		}
	</style>
</svelte:head>

<!-- BARRA SUPERIOR DE ACCIONES (NO IMPRIMIBLE) -->
<div class="no-print bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 px-4 py-3 shadow-md">
	<div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<a
				href="/ventas/historial"
				class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
			>
				<ArrowLeft class="w-4 h-4" />
				<span>Volver a Ventas</span>
			</a>
			<div>
				<h1 class="text-sm font-bold text-white flex items-center gap-2">
					<FileText class="w-4 h-4 text-primary" />
					{data.plantilla.nombre}
				</h1>
				<div class="flex items-center gap-2 mt-0.5 flex-wrap">
					<span class="text-[11px] text-slate-400">Orden: {data.venta.codigo_venta || 'Borrador'}</span>
					<span class="text-slate-600">•</span>
					<Badge variant="outline" class="text-[10px] text-slate-300 border-slate-700 uppercase">
						{data.plantilla.tipo}
					</Badge>
					<Badge variant="outline" class="text-[10px] text-slate-300 border-slate-700 uppercase">
						{data.plantilla.paper_size || 'letter'} ({data.plantilla.orientation || 'portrait'})
					</Badge>
					{#if isMultiBox}
						<Badge class="text-[10px] bg-primary text-primary-foreground font-mono">
							📦 {documentos.length} Cajas (1 documento por caja)
						</Badge>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2 flex-wrap">
			{#if isMultiBox}
				<div class="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
					<button
						type="button"
						onclick={() => (selectedCaja = 'ALL')}
						class="px-2.5 py-1 rounded text-[11px] font-bold transition-colors {selectedCaja === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:text-white'}"
					>
						Todas ({documentos.length})
					</button>
					{#each documentos as doc}
						<button
							type="button"
							onclick={() => (selectedCaja = doc.cajaNumero || 'ALL')}
							class="px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors {selectedCaja === doc.cajaNumero ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:text-white'}"
						>
							📦 {doc.cajaNumero}
						</button>
					{/each}
				</div>
			{/if}
			<Button
				variant="default"
				onclick={handlePrint}
				class="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 px-4 shadow"
			>
				<Printer class="w-4 h-4" />
				{isMultiBox && selectedCaja === 'ALL' ? `Imprimir ${visibleDocs.length} Documentos` : 'Imprimir Documento'}
			</Button>
		</div>
	</div>
</div>

<!-- CONTENEDOR DEL DOCUMENTO RENDERIZADO (1 POR CAJA) -->
<div class="min-h-screen bg-slate-100 py-6 px-4 flex flex-col items-center gap-8 print:block print:p-0 print:bg-white">
	{#each visibleDocs as doc, idx}
		<div class="w-full flex flex-col items-center print:block {idx > 0 ? 'box-page-break' : ''}">
			{#if isMultiBox}
				<div class="no-print mb-2 flex items-center justify-between bg-slate-800 text-white px-4 py-1.5 rounded-t-lg text-xs font-bold w-full max-w-[8.5in]">
					<span class="flex items-center gap-1.5 font-mono">
						<Package class="w-3.5 h-3.5 text-primary" />
						DOCUMENTO CAJA {doc.cajaNumero} (Caja {doc.cajaIndex} de {doc.totalCajas})
					</span>
					<span class="text-[11px] text-slate-300 font-mono">
						[{doc.venta.producto?.codigo}] {doc.venta.producto?.descripcion} • {doc.venta.peso} LB
					</span>
				</div>
			{/if}
			<div
				class="print-container bg-white shadow-xl rounded-xl p-8 border border-slate-200 text-slate-900 transition-all {paperClass()}"
			>
				{@html doc.renderedHtml}
			</div>
		</div>
	{/each}
</div>
