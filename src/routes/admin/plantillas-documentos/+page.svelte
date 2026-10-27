<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import {
		FileText,
		Plus,
		Search,
		Edit,
		CheckCircle2,
		Power,
		Sparkles,
		Eye,
		Tag,
		Copy,
		BookOpen,
		Printer,
		Barcode,
		ClipboardList,
		User,
		Truck,
		DollarSign,
		ShieldCheck,
		Boxes,
		Maximize2,
		Code,
		Layout,
		Sliders
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { PlantillaDocumento } from '$lib/types/database';
	import { DOCUMENT_TOKENS, renderMockDocument } from '$lib/services/documentTemplate';
	import DocumentLayoutEditor from '$lib/components/documents/DocumentLayoutEditor.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const plantillas = $derived(data.plantillas || []);

	let searchInput = $state('');
	$effect(() => {
		searchInput = data.search || '';
	});

	let isModalOpen = $state(false);
	let isPreviewModalOpen = $state(false);
	let editingPlantilla = $state<PlantillaDocumento | null>(null);
	let previewPlantilla = $state<PlantillaDocumento | null>(null);

	let formNombre = $state('');
	let formTipo = $state<'guia' | 'picking' | 'factura' | 'declaracion_aduana' | 'etiqueta' | 'personalizado'>('guia');
	let formTitulo = $state('');
	let formContenidoHtml = $state('');
	let formRecomendaciones = $state('');
	let formPaperSize = $state<NonNullable<PlantillaDocumento['paper_size']>>('letter');
	let formOrientation = $state<'portrait' | 'landscape'>('portrait');
	let formRoles = $state<string[]>(['admin', 'gerente', 'operador']);
	let formEsDefault = $state(false);

	let isEditorFullscreen = $state(false);
	let previewWithMock = $state(true);

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput.trim()) params.set('search', searchInput.trim());
		goto(`?${params.toString()}`);
	}

	function openCreateModal() {
		isEditorFullscreen = false;
		editingPlantilla = null;
		formNombre = '';
		formTipo = 'guia';
		formTitulo = 'DOCUMENTO OFICIAL DE DESPACHO';
		formPaperSize = 'letter';
		formOrientation = 'portrait';
		formRoles = ['admin', 'gerente', 'operador'];
		formContenidoHtml = `<div class="doc-container font-sans text-slate-900 p-6 space-y-4">
  <div class="flex justify-between items-start border-b pb-4">
    <div>
      <h1 class="text-xl font-black text-primary uppercase">{{nombre_empresa}}</h1>
      <p class="text-xs text-slate-600">{{direccion_empresa}}</p>
      <p class="text-xs text-slate-600">TEL: {{telefono_empresa}}</p>
    </div>
    <div class="text-right">
      {{logo_empresa}}
      <p class="font-mono text-xs font-bold text-primary mt-1">{{codigo_venta}}</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4 text-xs border rounded-lg p-3 bg-slate-50">
    <div>
      <p class="font-bold text-primary">REMITENTE:</p>
      <p class="font-bold text-slate-900">{{remitente_nombre}}</p>
      <p>{{remitente_direccion}}</p>
      <p>Tel: {{remitente_telefono}}</p>
    </div>
    <div>
      <p class="font-bold text-primary">DESTINATARIO ({{pais_destino}}):</p>
      <p class="font-bold text-slate-900">{{consignatario_nombre}}</p>
      <p>{{direccion_entrega}}</p>
      <p>Tel: {{consignatario_telefono}}</p>
    </div>
  </div>

  <div class="my-4">
    {{tabla_articulos}}
  </div>

  <div class="flex justify-between items-center p-3 border rounded-lg bg-slate-100 font-bold text-xs">
    <span>TOTAL VENTA:</span>
    <span class="text-base text-emerald-600 font-black">$ {{monto_total}}</span>
  </div>

  <div class="flex justify-center p-4">
    {{codigo_qr}}
  </div>

  <div class="pt-6 border-t">
    {{firmas_conformidad}}
  </div>
</div>`;
		formRecomendaciones = 'Verificar empaque sellado antes de firmar conformidad.';
		formEsDefault = false;
		isModalOpen = true;
	}

	function openEditModal(p: PlantillaDocumento) {
		isEditorFullscreen = false;
		editingPlantilla = p;
		formNombre = p.nombre;
		formTipo = p.tipo;
		formTitulo = p.encabezado_titulo || '';
		formContenidoHtml = p.contenido_html;
		formRecomendaciones = p.recomendaciones_aduana || '';
		formPaperSize = p.paper_size || 'letter';
		formOrientation = p.orientation || 'portrait';
		formRoles = p.roles_permitidos && p.roles_permitidos.length > 0 ? p.roles_permitidos : ['admin', 'gerente', 'operador'];
		formEsDefault = p.es_default;
		isModalOpen = true;
	}

	function openPreviewModal(p: PlantillaDocumento) {
		previewPlantilla = p;
		isPreviewModalOpen = true;
	}

	function toggleRole(r: string) {
		if (formRoles.includes(r)) {
			formRoles = formRoles.filter((item) => item !== r);
		} else {
			formRoles = [...formRoles, r];
		}
	}

	$effect(() => {
		if (form?.success) {
			toast.success(
				form.action === 'createPlantilla'
					? 'Plantilla creada con éxito'
					: form.action === 'updatePlantilla'
						? 'Plantilla actualizada con éxito'
						: 'Estado de la plantilla modificado'
			);
			isModalOpen = false;
		} else if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Diseñador WYSIWYG de Plantillas de Documentos | Panel Admin</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
	<!-- Encabezado Principal -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<Layout class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Diseñador Visual de Documentos y Plantillas</h1>
				<p class="text-xs text-muted-foreground">
					Diseña Guías de Despacho, Picking Lists, Invoices, Etiquetas y Declaraciones de Aduana, y define qué roles pueden utilizarlas.
				</p>
			</div>
		</div>

		<Button onclick={openCreateModal} class="gap-2 font-bold shadow-md">
			<Plus class="w-4 h-4" /> Nueva Plantilla de Documento
		</Button>
	</div>

	<!-- Filtros de búsqueda -->
	<Card>
		<CardContent class="p-4">
			<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex items-center gap-3">
				<div class="relative flex-1">
					<Search class="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
					<Input
						placeholder="Buscar plantilla por nombre..."
						bind:value={searchInput}
						class="pl-9 text-xs uppercase"
					/>
				</div>
				<Button type="submit" variant="secondary" size="sm" class="text-xs">
					Buscar
				</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Lista de Plantillas -->
	<Card>
		<CardContent class="p-0 overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase">
						<th class="p-3">Nombre de la Plantilla</th>
						<th class="p-3">Tipo de Documento</th>
						<th class="p-3">Formato & Papel</th>
						<th class="p-3">Roles con Acceso</th>
						<th class="p-3 text-center">Predeterminada</th>
						<th class="p-3">Estado</th>
						<th class="p-3 text-right">Acciones</th>
					</tr>
				</thead>
				<tbody class="divide-y text-xs">
					{#if plantillas.length === 0}
						<tr>
							<td colspan="7" class="p-6 text-center text-muted-foreground">
								No se encontraron plantillas de documentos registradas.
							</td>
						</tr>
					{:else}
						{#each plantillas as p (p.id)}
							<tr class={`hover:bg-muted/40 transition-colors ${!p.activo ? 'opacity-60 bg-muted/20' : ''}`}>
								<td class="p-3">
									<span class="font-bold uppercase block text-slate-900">{p.nombre}</span>
									<span class="text-[10px] text-muted-foreground truncate block max-w-xs">{p.encabezado_titulo || 'Sin título'}</span>
								</td>
								<td class="p-3">
									<Badge variant={p.tipo === 'guia' ? 'default' : p.tipo === 'picking' ? 'secondary' : 'outline'} class="uppercase text-[10px] font-bold">
										{#if p.tipo === 'guia'}GUÍA (QR){/if}
										{#if p.tipo === 'picking'}PICKING & INVOICE{/if}
										{#if p.tipo === 'etiqueta'}ETIQUETA (BARRAS){/if}
										{#if p.tipo === 'declaracion_aduana'}DECLARACIÓN ADUANA{/if}
										{#if p.tipo === 'factura'}FACTURA / RECIBO{/if}
										{#if p.tipo === 'personalizado'}PERSONALIZADO{/if}
									</Badge>
								</td>
								<td class="p-3 font-mono text-[11px]">
									<span class="uppercase font-semibold text-slate-800">{p.paper_size || 'LETTER'}</span>
									<span class="text-muted-foreground text-[10px] block font-sans">({p.orientation === 'landscape' ? 'Horizontal' : 'Vertical'})</span>
								</td>
								<td class="p-3">
									<div class="flex flex-wrap gap-1 max-w-xs">
										{#each p.roles_permitidos || ['admin'] as r}
											<Badge variant="outline" class="text-[9px] uppercase font-mono font-bold bg-slate-50">
												{r}
											</Badge>
										{/each}
									</div>
								</td>
								<td class="p-3 text-center">
									{#if p.es_default}
										<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] uppercase font-extrabold">
											⭐ PREDETERMINADA
										</Badge>
									{:else}
										<span class="text-[10px] text-muted-foreground">-</span>
									{/if}
								</td>
								<td class="p-3">
									<Badge variant={p.activo ? 'default' : 'outline'} class="uppercase text-[10px] font-bold">
										{p.activo ? 'ACTIVO' : 'INACTIVO'}
									</Badge>
								</td>
								<td class="p-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<Button variant="ghost" size="icon" onclick={() => openPreviewModal(p)} title="Previsualizar Plantilla">
											<Eye class="w-4 h-4 text-blue-600" />
										</Button>
										<Button variant="ghost" size="icon" onclick={() => openEditModal(p)} title="Editar Diseño Visual">
											<Edit class="w-4 h-4" />
										</Button>
										<form method="POST" action="?/toggleActivePlantilla" use:enhance class="inline">
											<input type="hidden" name="id" value={p.id} />
											<input type="hidden" name="activo" value={String(p.activo)} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												class={p.activo ? 'text-amber-600 hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'}
												title={p.activo ? 'Desactivar Plantilla' : 'Activar Plantilla'}
											>
												<Power class="w-4 h-4" />
											</Button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</CardContent>
	</Card>
</div>

<!-- MODAL DISEÑADOR Y EDITOR VISUAL WYSIWYG DE PLANTILLAS -->
<Dialog bind:open={isModalOpen}>
	<DialogContent
		class={isEditorFullscreen
			? 'fixed inset-0 top-0 left-0 w-screen h-screen max-w-none max-h-none rounded-none p-0 overflow-hidden m-0 border-0 ring-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col gap-0 duration-0'
			: 'sm:max-w-6xl max-h-[96vh] overflow-y-auto'}
		overlayClass={isEditorFullscreen ? 'z-[9998] bg-black/90' : ''}
		showCloseButton={!isEditorFullscreen}
	>
		{#if !isEditorFullscreen}
			<DialogHeader>
				<DialogTitle class="text-base font-bold flex items-center gap-2">
					<Layout class="w-5 h-5 text-primary" />
					{editingPlantilla ? 'Diseñador Visual de Plantilla' : 'Nueva Plantilla de Documento'}
				</DialogTitle>
			</DialogHeader>
		{/if}

		<form
			id="form_plantilla_doc"
			method="POST"
			action={editingPlantilla ? '?/updatePlantilla' : '?/createPlantilla'}
			use:enhance
			class={isEditorFullscreen ? 'flex flex-col h-screen w-screen p-0 m-0 overflow-hidden' : 'space-y-4 pt-2 text-xs'}
		>
			{#if editingPlantilla}
				<input type="hidden" name="id" value={editingPlantilla.id} />
			{/if}

			<div class={isEditorFullscreen ? 'hidden' : 'space-y-4'}>
				<!-- Fila 1: Datos Base -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div class="space-y-1">
						<Label for="pl_nombre" class="text-xs font-bold">Nombre del Documento / Plantilla *</Label>
						<Input
							id="pl_nombre"
							name="nombre"
							required
							bind:value={formNombre}
							placeholder="Ej. Guía Internacional de Paquetería"
							class="text-xs font-medium"
						/>
					</div>

					<div class="space-y-1">
						<Label for="pl_tipo" class="text-xs font-bold">Tipo de Documento *</Label>
						<select
							id="pl_tipo"
							name="tipo"
							bind:value={formTipo}
							class="w-full h-9 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
						>
							<option value="guia">GUÍA DE DESPACHO (CON QR)</option>
							<option value="picking">PICKING LIST & INVOICE COMERCIAL</option>
							<option value="etiqueta">ETIQUETA CON CÓDIGO DE BARRAS 1D</option>
							<option value="declaracion_aduana">DECLARACIÓN JURADA DE ADUANA</option>
							<option value="factura">FACTURA / RECIBO DE PAGO</option>
							<option value="personalizado">DOCUMENTO PERSONALIZADO</option>
						</select>
					</div>

					<div class="space-y-1">
						<Label for="pl_titulo" class="text-xs font-bold">Encabezado / Título del Documento</Label>
						<Input
							id="pl_titulo"
							name="encabezado_titulo"
							bind:value={formTitulo}
							placeholder="Ej. GUÍA OFICIAL DE EMBARQUE"
							class="text-xs font-semibold uppercase"
						/>
					</div>
				</div>

				<!-- Fila 2: Formato de Papel, Orientación y Roles con Acceso -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-muted/20 border rounded-xl">
					<div class="space-y-1">
						<Label class="text-xs font-bold">Tamaño de Papel</Label>
						<select name="paper_size" bind:value={formPaperSize} class="w-full h-8 px-2 rounded border text-xs bg-background">
							<option value="letter">CARTA (LETTER 8.5 x 11 in)</option>
							<option value="a4">A4 (210 x 297 mm)</option>
							<option value="ticket">TICKET / ROLLO TÉRMICO (80mm)</option>
							<option value="label_4x6">ETIQUETA ADHESIVA (4 x 6 in)</option>
						</select>
					</div>

					<div class="space-y-1">
						<Label class="text-xs font-bold">Orientación de Impresión</Label>
						<select name="orientation" bind:value={formOrientation} class="w-full h-8 px-2 rounded border text-xs bg-background">
							<option value="portrait">VERTICAL (PORTRAIT)</option>
							<option value="landscape">HORIZONTAL (LANDSCAPE)</option>
						</select>
					</div>

					<div class="space-y-1">
						<Label class="text-xs font-bold">Roles Autorizados para Usar este Documento</Label>
						<div class="flex flex-wrap gap-2 pt-0.5">
							{#each ['admin', 'gerente', 'operador', 'cliente'] as r}
								<label class="inline-flex items-center gap-1 cursor-pointer">
									<input
										type="checkbox"
										name="roles_permitidos"
										value={r}
										checked={formRoles.includes(r)}
										onchange={() => toggleRole(r)}
										class="rounded border-gray-300 text-primary"
									/>
									<span class="text-[11px] font-mono uppercase font-bold">{r}</span>
								</label>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Maquetador y Diseñador Visual WYSIWYG de Documentos -->
			<div class={isEditorFullscreen ? 'flex-1 h-full w-full overflow-hidden' : 'space-y-1.5 pt-1'}>
				{#if !isEditorFullscreen}
					<div class="flex items-center justify-between pb-0.5">
						<Label class="text-xs font-bold flex items-center gap-1.5 text-primary">
							<Layout class="w-4 h-4" />
							Maquetador y Diseñador Visual del Documento *
						</Label>
						<span class="text-[11px] text-muted-foreground">
							Maqueta con herramientas de texto, tablas personalizadas, imágenes y catálogo de variables de venta.
						</span>
					</div>
				{/if}

				<input type="hidden" name="contenido_html" bind:value={formContenidoHtml} />

				<DocumentLayoutEditor
					bind:value={formContenidoHtml}
					bind:isFullscreen={isEditorFullscreen}
					onsave={() => {
						const f = document.getElementById('form_plantilla_doc') as HTMLFormElement;
						f?.requestSubmit();
					}}
					paperSize={formPaperSize}
					orientation={formOrientation}
					documentName={formNombre}
					documentType={formTipo}
				/>
			</div>

			<div class={isEditorFullscreen ? 'hidden' : 'space-y-4'}>
				<!-- Recomendaciones -->
				<div class="space-y-1.5">
					<Label for="pl_recom" class="text-xs font-bold">Recomendaciones Estándares de Inspección o Términos Legales</Label>
					<textarea
						id="pl_recom"
						name="recomendaciones_aduana"
						bind:value={formRecomendaciones}
						rows="2"
						placeholder="Cláusulas legales o términos de servicio adicionales..."
						class="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary"
					></textarea>
				</div>

				<!-- Checkbox Default -->
				<div class="flex items-center gap-2 border p-3 rounded-lg bg-muted/20">
					<input
						type="checkbox"
						id="pl_default"
						name="es_default"
						value="true"
						bind:checked={formEsDefault}
						class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
					/>
					<Label for="pl_default" class="text-xs font-bold cursor-pointer">
						¿Establecer como plantilla predeterminada para este tipo de documento?
					</Label>
				</div>

				<DialogFooter class="pt-4">
					<Button type="button" variant="outline" onclick={() => (isModalOpen = false)} class="text-xs">
						Cancelar
					</Button>
					<Button type="submit" class="text-xs gap-1.5 font-bold">
						<CheckCircle2 class="w-4 h-4" />
						{editingPlantilla ? 'Guardar Cambios' : 'Crear Plantilla'}
					</Button>
				</DialogFooter>
			</div>
		</form>
	</DialogContent>
</Dialog>

<!-- MODAL PREVISUALIZACIÓN DE PLANTILLA -->
{#if isPreviewModalOpen && previewPlantilla}
	<Dialog bind:open={isPreviewModalOpen}>
		<DialogContent class="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-base font-bold flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Eye class="w-5 h-5 text-blue-600" />
						Previsualización: {previewPlantilla.nombre}
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => (previewWithMock = !previewWithMock)}
							class={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
								previewWithMock
									? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
									: 'bg-muted text-muted-foreground border-border'
							}`}
						>
							{previewWithMock ? '✓ Con Datos de Venta de Prueba' : 'Tokens Originales'}
						</button>
						<Badge variant="outline" class="font-mono text-xs uppercase">{previewPlantilla.paper_size || 'LETTER'}</Badge>
					</div>
				</DialogTitle>
			</DialogHeader>

			<div class="p-6 bg-white border rounded-xl shadow-inner font-sans text-slate-900 overflow-x-auto">
				{@html previewWithMock ? renderMockDocument(previewPlantilla.contenido_html) : previewPlantilla.contenido_html}
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isPreviewModalOpen = false)} class="text-xs">
					Cerrar
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

