<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	let {
		currentPage = 1,
		totalPages = 1,
		totalItems = 0,
		onPageChange
	}: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		onPageChange: (page: number) => void;
	} = $props();
</script>

<div class="flex flex-col items-center justify-between gap-3 sm:flex-row py-3">
	<p class="text-xs text-muted-foreground">
		Mostrando página <span class="font-semibold text-foreground">{currentPage}</span> de
		<span class="font-semibold text-foreground">{totalPages}</span> ({totalItems} registros)
	</p>
	<div class="flex items-center space-x-2">
		<Button
			variant="outline"
			size="sm"
			disabled={currentPage <= 1}
			onclick={() => onPageChange(currentPage - 1)}
		>
			<ChevronLeft class="mr-1 h-4 w-4" /> Anterior
		</Button>
		<Button
			variant="outline"
			size="sm"
			disabled={currentPage >= totalPages}
			onclick={() => onPageChange(currentPage + 1)}
		>
			Siguiente <ChevronRight class="ml-1 h-4 w-4" />
		</Button>
	</div>
</div>
