<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';

	let { activo }: { activo: boolean } = $props();
</script>

{#if activo}
	<Badge variant="outline" class="border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
		ACTIVO
	</Badge>
{:else}
	<Badge variant="secondary" class="border-muted bg-muted text-muted-foreground opacity-60 line-through">
		DESACTIVADO
	</Badge>
{/if}
