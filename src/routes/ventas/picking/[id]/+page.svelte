<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Printer, ArrowLeft, Package } from '@lucide/svelte';
	import type { PageData } from './$types';
	import PickingList from '$lib/components/documents/PickingList.svelte';

	let { data }: { data: PageData } = $props();

	let selectedCaja = $state('ALL');
	$effect(() => {
		if (data.cajaParam) selectedCaja = data.cajaParam;
	});

	const config = $derived(data.configuracion);
	const invoiceCode = $derived(data.invoiceCode);
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
	<title>Picking List & Invoice #{invoiceCode} | Sistema Logístico</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900 font-sans">
	<!-- Barra de Herramientas (No imprimible) -->
	<div class="max-w-[8.5in] mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
		<div class="flex items-center gap-2">
			<Button href="/ventas/historial" variant="outline" size="sm" class="gap-2 text-xs">
				<ArrowLeft class="w-4 h-4" /> Volver al Historial
			</Button>
			{#if isMultiBox}
				<Badge class="text-[11px] bg-primary text-primary-foreground font-mono">
					📦 {documentos.length} Cajas (1 documento por caja)
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
			<Button onclick={printDocument} class="gap-2 font-bold text-xs bg-primary text-primary-foreground shadow">
				<Printer class="w-4 h-4" />
				{isMultiBox && selectedCaja === 'ALL' ? `Imprimir ${visibleDocs.length} Picking Lists` : 'Imprimir Picking List (2 Páginas)'}
			</Button>
		</div>
	</div>

	<!-- Componente Oficial de Picking List (1 por cada caja) -->
	<div class="space-y-8 print:space-y-0">
		{#each visibleDocs as doc}
			<div>
				{#if isMultiBox}
					<div class="max-w-[8.5in] mx-auto mb-2 flex items-center justify-between bg-slate-800 text-white px-4 py-1.5 rounded-t-lg text-xs font-bold print:hidden">
						<span class="flex items-center gap-1.5 font-mono">
							<Package class="w-3.5 h-3.5 text-primary" />
							PICKING LIST — CAJA {doc.cajaNumero} (Caja {doc.cajaIndex} de {doc.totalCajas})
						</span>
						<span class="text-[11px] text-slate-300 font-mono">
							[{doc.venta.producto?.codigo}] {doc.venta.producto?.descripcion} • {doc.venta.peso} LB
						</span>
					</div>
				{/if}
				<PickingList venta={doc.venta} {config} barcodeSvg={doc.barcodeSvg} invoiceCode={doc.invoiceCode} />
			</div>
		{/each}
	</div>
</div>
