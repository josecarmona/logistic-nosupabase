<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { AlertTriangle, Home, ArrowLeft } from '@lucide/svelte';

	const status = $derived(page.status || 500);
	const message = $derived(
		page.error?.message ||
			(status === 404
				? 'La página que estás buscando no existe o ha sido movida.'
				: status === 403
					? 'No tienes permiso para acceder a esta sección de la aplicación.'
					: 'Ha ocurrido un error inesperado en el servidor.')
	);
</script>

<svelte:head>
	<title>Error {status} - Sistema Logística</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
	<Card class="w-full max-w-md shadow-lg border-destructive/20">
		<CardHeader>
			<div class="mx-auto w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
				<AlertTriangle class="w-7 h-7" />
			</div>
			<CardTitle class="text-3xl font-extrabold tracking-tight">Error {status}</CardTitle>
			<CardDescription class="text-sm font-semibold uppercase text-muted-foreground mt-1">
				{#if status === 404}
					Página No Encontrada
				{:else if status === 403}
					Acceso Restringido
				{:else}
					Error Interno del Servidor
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<p class="text-sm text-muted-foreground">
				{message}
			</p>
			<div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
				<Button variant="outline" onclick={() => history.back()} class="w-full sm:w-auto gap-2">
					<ArrowLeft class="w-4 h-4" /> Volver atrás
				</Button>
				<Button href="/" class="w-full sm:w-auto gap-2">
					<Home class="w-4 h-4" /> Ir al inicio
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
