<script lang="ts">
	import PickingList from '$lib/components/documents/PickingList.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Printer } from '@lucide/svelte';

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Vista Previa - Plantilla PickingList Oficial</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white">
	<div class="max-w-[8.5in] mx-auto mb-6 flex items-center justify-between print:hidden">
		<div>
			<h1 class="text-lg font-bold text-slate-900">Plantilla PickingList - H&H World Group</h1>
			<p class="text-xs text-slate-500">Documento idéntico al PDF de referencia (Página 1 y Página 2)</p>
		</div>
		<Button onclick={handlePrint} class="gap-2 font-bold text-xs bg-primary text-primary-foreground shadow">
			<Printer class="w-4 h-4" /> Imprimir Documento
		</Button>
	</div>

	<!-- Componente oficial sin venta pasada para que use los valores exactos del PDF -->
	<PickingList />
</div>
