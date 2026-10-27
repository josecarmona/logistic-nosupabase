<script lang="ts">
	import {
		Bold,
		Italic,
		Underline,
		Strikethrough,
		TextAlignStart,
		TextAlignCenter,
		TextAlignEnd,
		TextAlignJustify,
		Heading1,
		Heading2,
		Heading3,
		Type,
		Table as TableIcon,
		Image as ImageIcon,
		Columns2,
		Columns3,
		Minus,
		List,
		ListOrdered,
		Undo,
		Redo,
		Eye,
		Code,
		Sparkles,
		Plus,
		Trash2,
		Maximize2,
		Minimize2,
		ZoomIn,
		ZoomOut,
		Palette,
		Layers,
		Search,
		Check,
		X,
		Upload,
		Link as LinkIcon,
		FileSpreadsheet,
		QrCode,
		FileText,
		ChevronDown,
		HelpCircle,
		Sliders,
		RotateCcw,
		LayoutTemplate,
		CheckCircle2,
		Copy
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { DOCUMENT_TOKENS, renderMockDocument, PICKING_LIST_TEMPLATE_HTML } from '$lib/services/documentTemplate';
	import type { PlantillaDocumento } from '$lib/types/database';

	let {
		value = $bindable(''),
		paperSize = 'letter',
		orientation = 'portrait',
		documentName = '',
		documentType = 'guia',
		isFullscreen = $bindable(false),
		onsave
	}: {
		value: string;
		paperSize: NonNullable<PlantillaDocumento['paper_size']>;
		orientation: 'portrait' | 'landscape';
		documentName?: string;
		documentType?: string;
		isFullscreen?: boolean;
		onsave?: () => void;
	} = $props();

	// Modos de visualización
	type EditorMode = 'visual' | 'preview' | 'code';
	let currentMode = $state<EditorMode>('visual');

	// Nivel de zoom
	let zoom = $state<number>(1);

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
		if (typeof document !== 'undefined') {
			if (isFullscreen) {
				document.documentElement.requestFullscreen?.().catch(() => {});
			} else {
				if (document.fullscreenElement) {
					document.exitFullscreen?.().catch(() => {});
				}
			}
		}
	}

	$effect(() => {
		function onFsChange() {
			if (!document.fullscreenElement && isFullscreen) {
				isFullscreen = false;
			}
		}
		document.addEventListener('fullscreenchange', onFsChange);
		return () => document.removeEventListener('fullscreenchange', onFsChange);
	});

	// Panel lateral de variables y bloques
	let sidePanelOpen = $state(true);
	let activeSideTab = $state<'variables' | 'bloques' | 'plantillas'>('variables');

	// Búsqueda de variables
	let variableSearch = $state('');
	let selectedCategory = $state<string>('todos');

	// Elemento del editor contenteditable
	let editorCanvas = $state<HTMLDivElement | null>(null);

	// Estado contextual (tabla seleccionada, celda, imagen)
	let activeTable = $state<HTMLTableElement | null>(null);
	let activeCell = $state<HTMLTableCellElement | null>(null);
	let activeImage = $state<HTMLImageElement | null>(null);
	let activeBlock = $state<HTMLElement | null>(null);

	// Modales de inserción
	let isImageModalOpen = $state(false);
	let isTableModalOpen = $state(false);
	let isStarterModalOpen = $state(false);

	// Formulario Modal Imagen
	let imageSourceType = $state<'upload' | 'url' | 'logo'>('upload');
	let imageUrlInput = $state('');
	let uploadedImageBase64 = $state('');
	let imageWidthSelect = $state('auto');
	let imageAlignSelect = $state<'left' | 'center' | 'right'>('center');

	// Formulario Modal Tabla
	let tableRows = $state(3);
	let tableCols = $state(3);
	let tableStyle = $state<'standard' | 'striped' | 'clean'>('standard');
	let tableWithHeader = $state(true);

	// Paleta de colores de texto
	let isColorPaletteOpen = $state(false);
	let isBgColorPaletteOpen = $state(false);

	const textColors = [
		{ name: 'Negro', value: '#0f172a' },
		{ name: 'Gris Oscuro', value: '#334155' },
		{ name: 'Azul Primario', value: '#2563eb' },
		{ name: 'Azul Marino', value: '#1e3a8a' },
		{ name: 'Verde Esmeralda', value: '#059669' },
		{ name: 'Rojo Carmesí', value: '#dc2626' },
		{ name: 'Ámbar / Naranja', value: '#d97706' },
		{ name: 'Púrpura', value: '#7c3aed' }
	];

	const bgColors = [
		{ name: 'Sin fondo', value: 'transparent' },
		{ name: 'Gris Suave', value: '#f1f5f9' },
		{ name: 'Amarillo Claro', value: '#fef08a' },
		{ name: 'Azul Claro', value: '#dbeafe' },
		{ name: 'Verde Claro', value: '#d1fae5' },
		{ name: 'Rojo Claro', value: '#fee2e2' },
		{ name: 'Ámbar Claro', value: '#fef3c7' }
	];

	// Dimensiones de papel según configuración
	const paperDimensions = $derived.by(() => {
		if (paperSize === 'ticket') {
			return {
				width: '80mm',
				minHeight: '180mm',
				maxWidth: '80mm',
				padding: '12px 14px'
			};
		}
		if (paperSize === 'label_4x6') {
			return {
				width: '4in',
				minHeight: '6in',
				maxWidth: '4in',
				padding: '16px'
			};
		}
		if (paperSize === 'a4') {
			return orientation === 'landscape'
				? { width: '297mm', minHeight: '210mm', maxWidth: '297mm', padding: '28px' }
				: { width: '210mm', minHeight: '297mm', maxWidth: '210mm', padding: '28px' };
		}
		// Default letter
		return orientation === 'landscape'
			? { width: '11in', minHeight: '8.5in', maxWidth: '11in', padding: '32px' }
			: { width: '8.5in', minHeight: '11in', maxWidth: '8.5in', padding: '32px' };
	});

	// Filtrado de tokens
	const filteredVariables = $derived.by(() => {
		let list = DOCUMENT_TOKENS;
		if (selectedCategory !== 'todos') {
			list = list.filter((t) => t.category === selectedCategory);
		}
		if (variableSearch.trim()) {
			const q = variableSearch.toLowerCase();
			list = list.filter(
				(t) =>
					t.label.toLowerCase().includes(q) ||
					t.token.toLowerCase().includes(q) ||
					t.description.toLowerCase().includes(q)
			);
		}
		return list;
	});

	// Sincronización entre editor y variable 'value'
	function syncFromCanvas() {
		if (!editorCanvas) return;
		const temp = editorCanvas.cloneNode(true) as HTMLElement;
		temp.querySelectorAll('[data-selected-block]').forEach((el) => {
			el.removeAttribute('data-selected-block');
		});
		value = temp.innerHTML;
	}

	function syncToCanvas() {
		if (!editorCanvas) return;
		if (editorCanvas.innerHTML !== value) {
			editorCanvas.innerHTML = value || '<p><br></p>';
		}
	}

	$effect(() => {
		// Al cambiar value externamente o al inicio
		if (editorCanvas && currentMode === 'visual') {
			if (editorCanvas.innerHTML !== value) {
				editorCanvas.innerHTML = value || '<p><br></p>';
			}
		}
	});

	// Preservación y restauración de selección de texto
	let savedRange: Range | null = null;

	function saveCurrentSelection() {
		if (typeof window === 'undefined') return;
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0) {
			const range = sel.getRangeAt(0);
			if (editorCanvas && editorCanvas.contains(range.commonAncestorContainer)) {
				savedRange = range.cloneRange();
			}
		}
	}

	function restoreSelection() {
		if (!savedRange || typeof window === 'undefined') return;
		const sel = window.getSelection();
		if (sel) {
			try {
				sel.removeAllRanges();
				sel.addRange(savedRange);
			} catch (_) {}
		}
	}

	// Ejecución de comandos de edición de texto enriquecido
	function execCmd(command: string, arg: string | undefined = undefined) {
		if (editorCanvas) {
			if (savedRange) restoreSelection();
			editorCanvas.focus();
		}
		document.execCommand(command, false, arg);
		saveCurrentSelection();
		syncFromCanvas();
	}

	function setBlockFormat(tag: string) {
		if (editorCanvas) {
			if (savedRange) restoreSelection();
			editorCanvas.focus();
		}
		document.execCommand('formatBlock', false, tag);
		saveCurrentSelection();
		syncFromCanvas();
	}

	function setFontSize(size: string) {
		if (!editorCanvas || typeof window === 'undefined') return;
		if (savedRange) {
			restoreSelection();
		}
		editorCanvas.focus();
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		// Si no hay texto seleccionado (cursor colapsado), aplicar a la celda o elemento padre más cercano
		if (sel.isCollapsed) {
			if (activeCell) {
				activeCell.style.fontSize = size;
				saveCurrentSelection();
				syncFromCanvas();
				return;
			}
			const node = sel.anchorNode;
			const parent = (node?.nodeType === 1 ? (node as HTMLElement) : node?.parentElement) as HTMLElement | null;
			if (parent && parent !== editorCanvas && editorCanvas.contains(parent)) {
				parent.style.fontSize = size;
				saveCurrentSelection();
				syncFromCanvas();
				return;
			}
		}

		// Aplicar fontSize en la selección
		document.execCommand('fontSize', false, '7');
		const fontElements = editorCanvas.querySelectorAll('font[size="7"]');
		fontElements.forEach((font) => {
			const span = document.createElement('span');
			span.style.fontSize = size;
			const innerFontSpans = font.querySelectorAll('[style*="font-size"]');
			innerFontSpans.forEach((el) => {
				(el as HTMLElement).style.fontSize = '';
			});
			span.innerHTML = font.innerHTML;
			font.parentNode?.replaceChild(span, font);
		});
		saveCurrentSelection();
		syncFromCanvas();
	}

	function adjustFontSize(delta: number) {
		if (!editorCanvas || typeof window === 'undefined') return;
		if (savedRange) {
			restoreSelection();
		}
		editorCanvas.focus();
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		let currentSize = 12;
		const node = sel.anchorNode;
		const parent = (node?.nodeType === 1 ? (node as HTMLElement) : node?.parentElement) as HTMLElement | null;
		if (parent) {
			const computed = window.getComputedStyle(parent).fontSize;
			const parsed = parseInt(computed, 10);
			if (!isNaN(parsed)) currentSize = parsed;
		}
		const newSize = Math.max(7, Math.min(60, currentSize + delta)) + 'px';
		setFontSize(newSize);
	}

	function setTextColor(color: string) {
		if (savedRange) restoreSelection();
		execCmd('foreColor', color);
		isColorPaletteOpen = false;
	}

	function setTextBgColor(color: string) {
		if (savedRange) restoreSelection();
		execCmd('hiliteColor', color);
		isBgColorPaletteOpen = false;
	}

	// Insertar HTML en la posición del cursor de forma segura
	function insertHtmlAtCursor(html: string) {
		if (editorCanvas) {
			editorCanvas.focus();
		}
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) {
			if (editorCanvas) {
				editorCanvas.innerHTML += html;
				syncFromCanvas();
			}
			return;
		}

		const range = sel.getRangeAt(0);
		range.deleteContents();

		const el = document.createElement('div');
		el.innerHTML = html;
		const frag = document.createDocumentFragment();
		let node: Node | null;
		let lastNode: Node | null = null;
		while ((node = el.firstChild)) {
			lastNode = frag.appendChild(node);
		}
		range.insertNode(frag);

		if (lastNode) {
			range.setStartAfter(lastNode);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
		}

		syncFromCanvas();
	}

	// Inserción de variable de venta
	function insertVariable(token: string) {
		insertHtmlAtCursor(` ${token} `);
		toast.success(`Variable ${token} insertada`);
	}

	// Buscar bloque contenedor de maquetación
	function findParentBlock(el: HTMLElement | null): HTMLElement | null {
		if (!el || !editorCanvas || el === editorCanvas) return null;

		// 1. Si el elemento o ancestro tiene data-doc-block
		const docBlock = el.closest('[data-doc-block="true"]') as HTMLElement | null;
		if (docBlock && editorCanvas.contains(docBlock)) return docBlock;

		// 2. Si es una tabla
		const table = el.closest('table') as HTMLElement | null;
		if (table && editorCanvas.contains(table)) {
			if (table.parentElement && table.parentElement !== editorCanvas && table.parentElement.parentElement === editorCanvas) {
				return table.parentElement;
			}
			return table;
		}

		// 3. Si está dentro de un contenedor .doc-container, encontrar el bloque hijo directo
		const docContainer = el.closest('.doc-container') as HTMLElement | null;
		if (docContainer && editorCanvas.contains(docContainer)) {
			let curr: HTMLElement | null = el;
			while (curr && curr.parentElement && curr.parentElement !== docContainer) {
				curr = curr.parentElement;
			}
			if (curr && curr !== docContainer) {
				return curr;
			}
		}

		// 4. Subir hasta el elemento que es hijo directo de editorCanvas
		let curr: HTMLElement | null = el;
		while (curr && curr.parentElement && curr.parentElement !== editorCanvas) {
			curr = curr.parentElement;
		}
		if (curr && curr.parentElement === editorCanvas && curr !== editorCanvas) {
			return curr;
		}
		return null;
	}

	// Detección contextual al hacer clic en el editor
	function handleCanvasClick(e: MouseEvent | KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (!target || !editorCanvas) return;

		// Si hizo clic en el fondo blanco del lienzo fuera de cualquier bloque
		if (target === editorCanvas) {
			activeCell = null;
			activeTable = null;
			activeImage = null;
			activeBlock = null;
			editorCanvas.querySelectorAll('[data-selected-block]').forEach((el) => {
				el.removeAttribute('data-selected-block');
			});
			return;
		}

		if (!editorCanvas.contains(target)) return;

		// Detectar celda y tabla
		const cell = target.closest('td, th') as HTMLTableCellElement | null;
		const table = target.closest('table') as HTMLTableElement | null;
		activeCell = cell;
		activeTable = table;

		// Detectar imagen
		if (target.tagName && target.tagName.toLowerCase() === 'img') {
			activeImage = target as HTMLImageElement;
		} else {
			activeImage = null;
		}

		// Detectar bloque de maquetación contenedor
		activeBlock = findParentBlock(target);

		// Actualizar indicador visual de bloque seleccionado
		editorCanvas.querySelectorAll('[data-selected-block]').forEach((el) => {
			el.removeAttribute('data-selected-block');
		});
		if (activeBlock && activeBlock !== editorCanvas) {
			activeBlock.setAttribute('data-selected-block', 'true');
		}
	}

	function handleCanvasKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (activeBlock) {
				activeBlock.removeAttribute('data-selected-block');
				activeBlock = null;
			}
			isColorPaletteOpen = false;
			isBgColorPaletteOpen = false;
			return;
		}
		if (e.key === 'Delete' && (e.shiftKey || e.altKey)) {
			if (activeBlock) {
				e.preventDefault();
				deleteActiveBlock();
			}
		}
	}

	function deleteActiveBlock() {
		if (activeBlock && editorCanvas && editorCanvas.contains(activeBlock)) {
			activeBlock.remove();
			activeBlock = null;
			activeTable = null;
			activeCell = null;
			activeImage = null;
			syncFromCanvas();
			toast.info('Bloque eliminado correctamente');
		} else {
			deleteCurrentSelectionOrBlock();
		}
	}

	function duplicateActiveBlock() {
		if (activeBlock && editorCanvas && editorCanvas.contains(activeBlock)) {
			const clone = activeBlock.cloneNode(true) as HTMLElement;
			clone.removeAttribute('data-selected-block');
			activeBlock.after(clone);
			activeBlock = clone;
			activeBlock.setAttribute('data-selected-block', 'true');
			syncFromCanvas();
			toast.success('Bloque duplicado');
		}
	}

	function deleteCurrentSelectionOrBlock() {
		if (activeImage) {
			deleteSelectedImage();
			return;
		}
		if (activeTable) {
			deleteCurrentTable();
			return;
		}
		if (activeBlock && editorCanvas && editorCanvas.contains(activeBlock)) {
			activeBlock.remove();
			activeBlock = null;
			activeTable = null;
			activeCell = null;
			activeImage = null;
			syncFromCanvas();
			toast.info('Bloque eliminado correctamente');
			return;
		}
		const sel = window.getSelection();
		if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
			document.execCommand('delete');
			syncFromCanvas();
			return;
		}
		const node = sel?.anchorNode;
		const el = node?.nodeType === 1 ? (node as HTMLElement) : node?.parentElement;
		const block = findParentBlock(el || null);
		if (block && editorCanvas && editorCanvas.contains(block)) {
			block.remove();
			activeBlock = null;
			syncFromCanvas();
			toast.info('Bloque eliminado correctamente');
		}
	}

	// Control de imágenes
	function openInsertImageModal() {
		imageSourceType = 'upload';
		imageUrlInput = '';
		uploadedImageBase64 = '';
		imageWidthSelect = 'auto';
		imageAlignSelect = 'center';
		isImageModalOpen = true;
	}

	function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			if (!file.type.startsWith('image/')) {
				toast.error('Por favor seleccione un archivo de imagen válido');
				return;
			}
			const reader = new FileReader();
			reader.onload = (readerEvent) => {
				uploadedImageBase64 = (readerEvent.target?.result as string) || '';
			};
			reader.readAsDataURL(file);
		}
	}

	function confirmInsertImage() {
		let src = '';
		if (imageSourceType === 'upload') {
			if (!uploadedImageBase64) {
				toast.error('Por favor suba una imagen');
				return;
			}
			src = uploadedImageBase64;
		} else if (imageSourceType === 'url') {
			if (!imageUrlInput.trim()) {
				toast.error('Por favor ingrese la URL de la imagen');
				return;
			}
			src = imageUrlInput.trim();
		} else if (imageSourceType === 'logo') {
			insertHtmlAtCursor(' {{logo_empresa}} ');
			isImageModalOpen = false;
			toast.success('Logotipo institucional insertado');
			return;
		}

		let margin = '0 auto';
		if (imageAlignSelect === 'left') margin = '0 auto 0 0';
		if (imageAlignSelect === 'right') margin = '0 0 0 auto';

		const widthStyle = imageWidthSelect === 'auto' ? 'max-width: 100%;' : `width: ${imageWidthSelect}; max-width: 100%;`;

		const imgHtml = `<img src="${src}" alt="Imagen Documento" style="${widthStyle} height: auto; display: block; margin: ${margin}; border-radius: 4px;" />`;
		insertHtmlAtCursor(imgHtml);
		isImageModalOpen = false;
		toast.success('Imagen insertada');
	}

	function setImageWidth(w: string) {
		if (!activeImage) return;
		activeImage.style.width = w;
		activeImage.style.maxWidth = '100%';
		activeImage.style.height = 'auto';
		syncFromCanvas();
	}

	function setImageAlignment(align: 'left' | 'center' | 'right') {
		if (!activeImage) return;
		activeImage.style.display = 'block';
		if (align === 'center') {
			activeImage.style.marginLeft = 'auto';
			activeImage.style.marginRight = 'auto';
		} else if (align === 'left') {
			activeImage.style.marginLeft = '0';
			activeImage.style.marginRight = 'auto';
		} else {
			activeImage.style.marginLeft = 'auto';
			activeImage.style.marginRight = '0';
		}
		syncFromCanvas();
	}

	function deleteSelectedImage() {
		if (activeImage) {
			activeImage.remove();
			activeImage = null;
			syncFromCanvas();
			toast.info('Imagen eliminada');
		}
	}

	// Control de Tablas
	function openInsertTableModal() {
		tableRows = 3;
		tableCols = 3;
		tableStyle = 'standard';
		tableWithHeader = true;
		isTableModalOpen = true;
	}

	function confirmInsertTable() {
		let html = '';
		if (tableStyle === 'clean') {
			html += `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px;"><tbody>`;
			for (let r = 0; r < tableRows; r++) {
				html += `<tr style="border-bottom: 1px dashed #cbd5e1;">`;
				for (let c = 0; c < tableCols; c++) {
					const isRight = c === tableCols - 1;
					html += `<td style="padding: 6px 8px; ${isRight ? 'text-align: right; font-weight: bold;' : 'text-align: left;'}">Dato ${r + 1},${c + 1}</td>`;
				}
				html += `</tr>`;
			}
			html += `</tbody></table><p><br></p>`;
		} else if (tableStyle === 'striped') {
			html += `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; border: 1px solid #cbd5e1;">`;
			if (tableWithHeader) {
				html += `<thead><tr style="background-color: #0f172a; color: #ffffff;">`;
				for (let c = 0; c < tableCols; c++) {
					html += `<th style="padding: 7px 10px; border: 1px solid #334155; text-align: left; font-weight: bold; text-transform: uppercase;">Columna ${c + 1}</th>`;
				}
				html += `</tr></thead>`;
			}
			html += `<tbody>`;
			for (let r = 0; r < tableRows; r++) {
				const bg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
				html += `<tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">`;
				for (let c = 0; c < tableCols; c++) {
					html += `<td style="padding: 6px 10px; border: 1px solid #e2e8f0;">Dato ${r + 1},${c + 1}</td>`;
				}
				html += `</tr>`;
			}
			html += `</tbody></table><p><br></p>`;
		} else {
			html += `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; border: 1px solid #cbd5e1;">`;
			if (tableWithHeader) {
				html += `<thead><tr style="background-color: #f1f5f9; color: #0f172a; border-bottom: 2px solid #cbd5e1;">`;
				for (let c = 0; c < tableCols; c++) {
					html += `<th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: left; font-weight: bold; text-transform: uppercase;">Encabezado ${c + 1}</th>`;
				}
				html += `</tr></thead>`;
			}
			html += `<tbody>`;
			for (let r = 0; r < tableRows; r++) {
				html += `<tr style="border-bottom: 1px solid #cbd5e1;">`;
				for (let c = 0; c < tableCols; c++) {
					html += `<td style="padding: 6px 10px; border: 1px solid #cbd5e1;">Texto ${r + 1},${c + 1}</td>`;
				}
				html += `</tr>`;
			}
			html += `</tbody></table><p><br></p>`;
		}

		insertHtmlAtCursor(html);
		isTableModalOpen = false;
		toast.success('Tabla insertada en el diseño');
	}

	function addTableRow(below = true) {
		if (!activeCell) {
			toast.info('Haga clic dentro de una fila de la tabla primero');
			return;
		}
		const row = activeCell.closest('tr');
		if (!row) return;
		const colsCount = row.children.length;
		const newRow = document.createElement('tr');
		newRow.style.borderBottom = '1px solid #cbd5e1';
		for (let i = 0; i < colsCount; i++) {
			const td = document.createElement('td');
			td.style.padding = '6px 10px';
			td.style.border = '1px solid #cbd5e1';
			td.innerHTML = '&nbsp;';
			newRow.appendChild(td);
		}
		if (below) {
			row.parentNode?.insertBefore(newRow, row.nextSibling);
		} else {
			row.parentNode?.insertBefore(newRow, row);
		}
		syncFromCanvas();
		toast.success('Fila añadida');
	}

	function deleteTableRow() {
		if (!activeCell) return;
		const row = activeCell.closest('tr');
		if (!row) return;
		const table = row.closest('table');
		row.remove();
		if (table && table.querySelectorAll('tr').length === 0) {
			table.remove();
			activeTable = null;
			activeCell = null;
		}
		syncFromCanvas();
		toast.info('Fila eliminada');
	}

	function addTableColumn(right = true) {
		if (!activeCell) return;
		const cellIdx = (activeCell as HTMLTableCellElement).cellIndex;
		const table = activeCell.closest('table');
		if (!table) return;
		const rows = table.querySelectorAll('tr');
		rows.forEach((r) => {
			const isHeader = r.parentElement?.tagName.toLowerCase() === 'thead' || r.querySelector('th');
			const newCell = document.createElement(isHeader ? 'th' : 'td');
			newCell.style.padding = '6px 10px';
			newCell.style.border = '1px solid #cbd5e1';
			if (isHeader) {
				newCell.style.fontWeight = 'bold';
				newCell.style.backgroundColor = '#f1f5f9';
				newCell.textContent = 'Col';
			} else {
				newCell.innerHTML = '&nbsp;';
			}
			const refCell = r.children[cellIdx];
			if (right) {
				r.insertBefore(newCell, refCell ? refCell.nextSibling : null);
			} else {
				r.insertBefore(newCell, refCell || null);
			}
		});
		syncFromCanvas();
		toast.success('Columna añadida');
	}

	function deleteTableColumn() {
		if (!activeCell) return;
		const cellIdx = (activeCell as HTMLTableCellElement).cellIndex;
		const table = activeCell.closest('table');
		if (!table) return;
		const rows = table.querySelectorAll('tr');
		rows.forEach((r) => {
			if (r.children[cellIdx]) {
				r.children[cellIdx].remove();
			}
		});
		syncFromCanvas();
		toast.info('Columna eliminada');
	}

	function deleteCurrentTable() {
		if (activeTable) {
			activeTable.remove();
			activeTable = null;
			activeCell = null;
			syncFromCanvas();
			toast.info('Tabla eliminada');
		}
	}

	// Inserción de Bloques de Maquetación Preconstruidos
	function insertLayoutBlock(blockType: string) {
		let html = '';
		switch (blockType) {
			case '2cols':
				html = `
					<div data-doc-block="true" style="display: flex; gap: 14px; margin: 14px 0;">
						<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
							<p style="font-weight: 800; font-size: 11px; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Columna Izquierda</p>
							<p style="font-size: 11px; color: #334155; margin: 0;">Escriba contenido aquí...</p>
						</div>
						<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
							<p style="font-weight: 800; font-size: 11px; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Columna Derecha</p>
							<p style="font-size: 11px; color: #334155; margin: 0;">Escriba contenido aquí...</p>
						</div>
					</div><p><br></p>
				`;
				break;
			case '3cols':
				html = `
					<div data-doc-block="true" style="display: flex; gap: 10px; margin: 12px 0;">
						<div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; background-color: #ffffff;">
							<p style="font-size: 10px; color: #64748b; font-weight: bold; margin: 0; text-transform: uppercase;">FECHA</p>
							<p style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 2px 0;">{{fecha_emision}}</p>
						</div>
						<div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; background-color: #ffffff;">
							<p style="font-size: 10px; color: #64748b; font-weight: bold; margin: 0; text-transform: uppercase;">TRANSPORTE</p>
							<p style="font-size: 12px; font-weight: 800; color: #0f172a; margin: 2px 0;">{{empresa_transporte}}</p>
						</div>
						<div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; background-color: #ffffff;">
							<p style="font-size: 10px; color: #64748b; font-weight: bold; margin: 0; text-transform: uppercase;">GUÍA TRACKING</p>
							<p style="font-size: 12px; font-weight: 800; color: #2563eb; margin: 2px 0;">{{codigo_venta}}</p>
						</div>
					</div><p><br></p>
				`;
				break;
			case 'header_empresa':
				html = `
					<div data-doc-block="true" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
						<div>
							<h1 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0;">{{nombre_empresa}}</h1>
							<p style="font-size: 11px; color: #64748b; margin: 2px 0;">{{direccion_empresa}}</p>
							<p style="font-size: 11px; color: #64748b; margin: 2px 0;">TEL: {{telefono_empresa}} | {{email_empresa}}</p>
							<p style="font-size: 10px; font-weight: bold; color: #2563eb; text-transform: uppercase; margin: 2px 0;">{{eslogan_empresa}}</p>
						</div>
						<div style="text-align: right;">
							{{logo_empresa}}
							<p style="font-family: monospace; font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 6px;">GUÍA: {{codigo_venta}}</p>
						</div>
					</div><p><br></p>
				`;
				break;
			case 'shipper_receiver':
				html = `
					<div data-doc-block="true" style="display: flex; gap: 14px; margin: 14px 0; font-size: 11px;">
						<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
							<p style="font-weight: 900; font-size: 11px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; text-transform: uppercase;">
								REMITENTE (SHIPPER)
							</p>
							<p style="margin: 2px 0;"><strong>Nombre:</strong> {{remitente_nombre}}</p>
							<p style="margin: 2px 0;"><strong>Doc / Cédula:</strong> {{remitente_cedula}}</p>
							<p style="margin: 2px 0;"><strong>Dirección:</strong> {{remitente_direccion}}</p>
							<p style="margin: 2px 0;"><strong>Ciudad:</strong> {{remitente_ciudad}}</p>
							<p style="margin: 2px 0;"><strong>Teléfono:</strong> {{remitente_telefono}}</p>
						</div>
						<div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
							<p style="font-weight: 900; font-size: 11px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; text-transform: uppercase;">
								DESTINATARIO (CONSIGNEE) - {{pais_destino}}
							</p>
							<p style="margin: 2px 0;"><strong>Nombre:</strong> {{consignatario_nombre}}</p>
							<p style="margin: 2px 0;"><strong>Doc / RIF:</strong> {{consignatario_cedula}}</p>
							<p style="margin: 2px 0;"><strong>Dirección Entrega:</strong> {{direccion_entrega}}</p>
							<p style="margin: 2px 0;"><strong>Ciudad/Estado:</strong> {{consignatario_ciudad}}, {{consignatario_estado}}</p>
							<p style="margin: 2px 0;"><strong>Teléfono:</strong> {{consignatario_telefono}}</p>
						</div>
					</div><p><br></p>
				`;
				break;
			case 'tabla_articulos':
				html = `
					<div data-doc-block="true" style="margin: 14px 0;">
						<p style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">Detalle de Mercancía y Artículos Declarados:</p>
						{{tabla_articulos}}
					</div><p><br></p>
				`;
				break;
			case 'tabla_pagos':
				html = `
					<div data-doc-block="true" style="margin: 14px 0;">
						<p style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">Desglose de Métodos de Pago y Abonos:</p>
						{{tabla_pagos}}
					</div><p><br></p>
				`;
				break;
			case 'totales_box':
				html = `
					<div data-doc-block="true" style="display: flex; justify-content: flex-end; margin: 16px 0;">
						<div style="width: 280px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-size: 11px;">
							<div style="display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f1f5f9;">
								<span style="color: #64748b;">Flete Base:</span>
								<span style="font-weight: 700;">$ {{monto_base}}</span>
							</div>
							<div style="display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f1f5f9;">
								<span style="color: #64748b;">Seguro Liquidado:</span>
								<span style="font-weight: 700;">$ {{monto_seguro}}</span>
							</div>
							<div style="display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f1f5f9;">
								<span style="color: #64748b;">Recolección / Extras:</span>
								<span style="font-weight: 700;">$ {{monto_recoleccion}}</span>
							</div>
							<div style="display: flex; justify-content: space-between; padding: 8px 12px; background-color: #f1f5f9; font-weight: 900; font-size: 13px; border-top: 2px solid #cbd5e1;">
								<span style="color: #0f172a;">TOTAL A COBRAR:</span>
								<span style="color: #059669;">$ {{monto_total}}</span>
							</div>
						</div>
					</div><p><br></p>
				`;
				break;
			case 'tracking_codes':
				html = `
					<div data-doc-block="true" style="display: flex; justify-content: space-around; align-items: center; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; margin: 16px 0; background-color: #fafafa;">
						<div style="text-align: center;">
							{{codigo_qr}}
							<p style="font-size: 9px; font-weight: bold; color: #475569; margin-top: 4px;">RASTREO EN LÍNEA</p>
						</div>
						<div style="text-align: center;">
							{{codigo_barras}}
							<p style="font-size: 9px; font-weight: bold; color: #475569; margin-top: 4px;">CÓDIGO DE GUÍA</p>
						</div>
					</div><p><br></p>
				`;
				break;
			case 'signatures':
				html = `
					<div data-doc-block="true" style="display: flex; justify-content: space-between; gap: 40px; margin-top: 40px; padding-top: 10px; font-size: 11px; text-align: center;">
						<div style="flex: 1;">
							<div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto 6px auto;"></div>
							<p style="font-weight: bold; text-transform: uppercase; color: #334155; margin: 0;">Firma Despachador</p>
							<p style="font-size: 10px; color: #94a3b8; margin: 2px 0;">Agencia Autorizada</p>
						</div>
						<div style="flex: 1;">
							<div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto 6px auto;"></div>
							<p style="font-weight: bold; text-transform: uppercase; color: #334155; margin: 0;">Firma de Conformidad Cliente</p>
							<p style="font-size: 10px; color: #94a3b8; margin: 2px 0;">Recibido a Satisfacción</p>
						</div>
					</div><p><br></p>
				`;
				break;
			case 'terms_box':
				html = `
					<div data-doc-block="true" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #f8fafc; margin: 14px 0; font-size: 10px; color: #64748b; line-height: 1.4;">
						<p style="font-weight: bold; color: #0f172a; margin: 0 0 4px 0; text-transform: uppercase;">Términos y Declaración de Conformidad:</p>
						<p style="margin: 0;">El remitente declara bajo fe de juramento que la mercancía no contiene sustancias prohibidas ni objetos peligrosos. La empresa transportista responde de acuerdo a las cláusulas comerciales vigentes.</p>
					</div><p><br></p>
				`;
				break;
		}

		if (html) {
			insertHtmlAtCursor(html);
			toast.success('Bloque de maquetación añadido');
		}
	}

	// Cargar Plantillas Base Prediseñadas
	function loadStarterTemplate(type: string) {
		let tpl = '';
		if (type === 'guia') {
			tpl = `<div class="doc-container font-sans text-slate-900 space-y-4">
  <div data-doc-block="true" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px;">
    <div>
      <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0;">{{nombre_empresa}}</h1>
      <p style="font-size: 11px; color: #64748b; margin: 2px 0;">{{direccion_empresa}}</p>
      <p style="font-size: 11px; color: #64748b; margin: 2px 0;">TEL: {{telefono_empresa}} | {{email_empresa}}</p>
    </div>
    <div style="text-align: right;">
      {{logo_empresa}}
      <p style="font-family: monospace; font-size: 13px; font-weight: 900; color: #2563eb; margin-top: 4px;">{{codigo_venta}}</p>
    </div>
  </div>

  <div data-doc-block="true" style="display: flex; gap: 14px; margin: 14px 0; font-size: 11px;">
    <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
      <p style="font-weight: 900; font-size: 11px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">REMITENTE:</p>
      <p style="margin: 2px 0;"><strong>{{remitente_nombre}}</strong></p>
      <p style="margin: 2px 0;">Doc: {{remitente_cedula}}</p>
      <p style="margin: 2px 0;">{{remitente_direccion}}</p>
      <p style="margin: 2px 0;">Tel: {{remitente_telefono}}</p>
    </div>
    <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc;">
      <p style="font-weight: 900; font-size: 11px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">DESTINATARIO ({{pais_destino}}):</p>
      <p style="margin: 2px 0;"><strong>{{consignatario_nombre}}</strong></p>
      <p style="margin: 2px 0;">Doc: {{consignatario_cedula}}</p>
      <p style="margin: 2px 0;">{{direccion_entrega}}</p>
      <p style="margin: 2px 0;">Tel: {{consignatario_telefono}}</p>
    </div>
  </div>

  <div data-doc-block="true" style="margin: 14px 0;">
    {{tabla_articulos}}
  </div>

  <div data-doc-block="true" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; background-color: #f1f5f9; font-size: 12px; font-weight: 800;">
    <span>TOTAL VENTA:</span>
    <span style="font-size: 16px; color: #059669;">$ {{monto_total}}</span>
  </div>

  <div data-doc-block="true" style="display: flex; justify-content: center; margin: 16px 0;">
    {{codigo_qr}}
  </div>

  <div data-doc-block="true" style="padding-top: 16px; border-top: 1px solid #e2e8f0;">
    {{firmas_conformidad}}
  </div>
</div>`;
		} else if (type === 'picking') {
			tpl = PICKING_LIST_TEMPLATE_HTML;
		} else if (type === 'etiqueta') {
			tpl = `<div class="doc-container font-sans text-slate-900 p-2 space-y-2 text-center" style="max-width: 4in; margin: 0 auto;">
  <div data-doc-block="true" style="border-bottom: 2px solid #000; padding-bottom: 6px;">
    <h1 style="font-size: 16px; font-weight: 900; margin: 0;">{{nombre_empresa}}</h1>
    <p style="font-size: 10px; margin: 2px 0;">DESTINO: <strong style="font-size: 14px;">{{pais_destino}}</strong></p>
  </div>

  <div data-doc-block="true" style="margin: 8px 0;">
    {{codigo_barras}}
  </div>

  <div data-doc-block="true" style="border: 2px solid #000; border-radius: 6px; padding: 8px; text-align: left; font-size: 11px; margin: 8px 0;">
    <p style="font-weight: 900; margin: 0 0 4px 0; font-size: 12px; border-bottom: 1px solid #ccc;">DESTINATARIO:</p>
    <p style="font-size: 13px; font-weight: 800; margin: 2px 0;">{{consignatario_nombre}}</p>
    <p style="margin: 2px 0;">{{direccion_entrega}}</p>
    <p style="margin: 2px 0;">Ciudad: {{consignatario_ciudad}}</p>
    <p style="margin: 2px 0;">Tel: {{consignatario_telefono}}</p>
  </div>

  <div data-doc-block="true" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #000; padding: 6px; font-size: 10px;">
    <div style="text-align: left;">
      <p style="margin: 0;">PESO: <strong style="font-size: 13px;">{{peso_facturable}} LB</strong></p>
      <p style="margin: 0;">TRACKING: <strong>{{codigo_venta}}</strong></p>
    </div>
    <div>
      {{codigo_qr}}
    </div>
  </div>
</div>`;
		} else if (type === 'blanco') {
			tpl = `<div class="doc-container font-sans text-slate-900 p-6 space-y-4">
  <p>Comience a diseñar aquí...</p>
</div>`;
		}

		value = tpl;
		syncToCanvas();
		isStarterModalOpen = false;
		toast.success('Plantilla base cargada en el maquetador');
	}

	// Render de previsualización con datos de prueba
	const renderedMockHtml = $derived.by(() => {
		if (currentMode !== 'preview') return '';
		return renderMockDocument(value);
	});
</script>

<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.color-picker-container')) {
			isColorPaletteOpen = false;
			isBgColorPaletteOpen = false;
		}
	}}
/>

<div
	class={`flex flex-col bg-slate-900 text-slate-100 transition-all ${
		isFullscreen ? 'h-full w-full rounded-none border-0' : 'h-[750px] w-full border rounded-xl shadow-xl'
	}`}
>
	<!-- 1. BARRA SUPERIOR PRINCIPAL (MODOS, ZOOM, ACCIONES) -->
	<div class="relative z-40 overflow-visible flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800 text-xs select-none">
		<!-- Modos de Vista -->
		<div class="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
			<button
				type="button"
				onclick={() => { currentMode = 'visual'; syncToCanvas(); }}
				class={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all ${
					currentMode === 'visual'
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'text-slate-400 hover:text-white hover:bg-slate-800'
				}`}
			>
				<LayoutTemplate class="w-3.5 h-3.5" />
				Maquetador Visual
			</button>

			<button
				type="button"
				onclick={() => (currentMode = 'preview')}
				class={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all ${
					currentMode === 'preview'
						? 'bg-emerald-600 text-white shadow-sm'
						: 'text-slate-400 hover:text-white hover:bg-slate-800'
				}`}
			>
				<Eye class="w-3.5 h-3.5" />
				Vista Previa con Datos
			</button>

			<button
				type="button"
				onclick={() => (currentMode = 'code')}
				class={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all ${
					currentMode === 'code'
						? 'bg-amber-600 text-white shadow-sm'
						: 'text-slate-400 hover:text-white hover:bg-slate-800'
				}`}
			>
				<Code class="w-3.5 h-3.5" />
				Código HTML
			</button>
		</div>

		<!-- Indicador de Papel y Orientación -->
		<div class="hidden md:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/80">
			<span class="text-slate-500 font-bold">Papel:</span>
			<span class="uppercase font-mono font-bold text-slate-200">{paperSize}</span>
			<span class="text-slate-600">•</span>
			<span class="text-slate-500 font-bold">Orientación:</span>
			<span class="uppercase font-mono font-bold text-slate-200">{orientation === 'landscape' ? 'Horizontal' : 'Vertical'}</span>
			{#if documentName}
				<span class="text-slate-600">•</span>
				<span class="font-bold text-slate-300 truncate max-w-xs">{documentName}</span>
			{/if}
		</div>

		<!-- Zoom y Pantalla Completa -->
		<div class="flex items-center gap-2">
			<!-- Selector de Zoom -->
			<div class="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-md px-1.5 py-0.5">
				<button
					type="button"
					onclick={() => (zoom = Math.max(0.6, Number((zoom - 0.1).toFixed(1))))}
					class="p-1 hover:text-white text-slate-400 hover:bg-slate-800 rounded"
					title="Reducir Zoom"
				>
					<ZoomOut class="w-3.5 h-3.5" />
				</button>
				<span class="font-mono text-[11px] font-bold text-slate-300 w-12 text-center">
					{Math.round(zoom * 100)}%
				</span>
				<button
					type="button"
					onclick={() => (zoom = Math.min(1.4, Number((zoom + 0.1).toFixed(1))))}
					class="p-1 hover:text-white text-slate-400 hover:bg-slate-800 rounded"
					title="Aumentar Zoom"
				>
					<ZoomIn class="w-3.5 h-3.5" />
				</button>
			</div>

			<!-- Botón Plantillas Base -->
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => (isStarterModalOpen = true)}
				class="h-7 text-xs gap-1 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
			>
				<FileSpreadsheet class="w-3.5 h-3.5 text-primary" />
				Plantillas Base
			</Button>

			<!-- Toggle Panel Lateral -->
			<button
				type="button"
				onclick={() => (sidePanelOpen = !sidePanelOpen)}
				class={`h-7 px-2.5 rounded-md border text-xs font-semibold flex items-center gap-1 transition-colors ${
					sidePanelOpen
						? 'bg-primary/20 border-primary/40 text-primary'
						: 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
				}`}
				title="Panel de Herramientas y Variables"
			>
				<Layers class="w-3.5 h-3.5" />
				<span class="hidden sm:inline">Elementos</span>
			</button>

			{#if isFullscreen && onsave}
				<Button
					type="button"
					size="sm"
					onclick={onsave}
					class="h-7 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow"
				>
					<CheckCircle2 class="w-3.5 h-3.5" />
					Guardar Plantilla
				</Button>
			{/if}

			<!-- Maximizar / Fullscreen -->
			<button
				type="button"
				onclick={toggleFullscreen}
				class={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-bold border transition-colors ${
					isFullscreen
						? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
						: 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
				}`}
				title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
			>
				{#if isFullscreen}
					<Minimize2 class="w-3.5 h-3.5" />
					<span class="hidden sm:inline">Salir Pantalla Completa (Esc)</span>
				{:else}
					<Maximize2 class="w-3.5 h-3.5" />
					<span class="hidden sm:inline">Pantalla Completa</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- 2. BARRA DE HERRAMIENTAS DE FORMATO (WYSIWYG TOOLBAR) - SOLO EN MODO VISUAL -->
	{#if currentMode === 'visual'}
		<div class="relative z-30 overflow-visible flex flex-wrap items-center gap-1.5 px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs select-none">
			<!-- Selector de Encabezados / Estilo de Bloque -->
			<select
				onchange={(e) => setBlockFormat((e.target as HTMLSelectElement).value)}
				class="h-7 px-2 rounded bg-slate-950 border border-slate-700 text-[11px] font-semibold text-slate-200 focus:outline-none"
				title="Formato de Encabezado"
			>
				<option value="p">Párrafo Normal</option>
				<option value="h1">Título Principal (H1)</option>
				<option value="h2">Subtítulo (H2)</option>
				<option value="h3">Encabezado (H3)</option>
			</select>

			<!-- Selector de Tamaño de Fuente -->
			<select
				onchange={(e) => {
					const val = (e.target as HTMLSelectElement).value;
					if (val) setFontSize(val);
				}}
				class="h-7 px-2 rounded bg-slate-950 border border-slate-700 text-[11px] font-semibold text-slate-200 focus:outline-none"
				title="Tamaño de Fuente"
			>
				<option value="">Tamaño...</option>
				<option value="8px">8 px (Muy pequeña)</option>
				<option value="9px">9 px</option>
				<option value="10px">10 px</option>
				<option value="11px">11 px (Compacto)</option>
				<option value="12px">12 px (Normal)</option>
				<option value="13px">13 px</option>
				<option value="14px">14 px (Mediana)</option>
				<option value="16px">16 px (Destacada)</option>
				<option value="18px">18 px</option>
				<option value="20px">20 px (Grande)</option>
				<option value="24px">24 px</option>
				<option value="28px">28 px (Muy grande)</option>
				<option value="32px">32 px</option>
				<option value="36px">36 px (Gigante)</option>
			</select>

			<!-- Botones Aumentar / Reducir Tamaño Rápido -->
			<div class="flex items-center bg-slate-950 border border-slate-700 rounded overflow-hidden">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => adjustFontSize(-1)}
					class="px-1.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
					title="Reducir tamaño de letra (A-)"
				>
					A-
				</button>
				<div class="w-px h-3 bg-slate-700"></div>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => adjustFontSize(1)}
					class="px-1.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
					title="Aumentar tamaño de letra (A+)"
				>
					A+
				</button>
			</div>

			<div class="h-4 w-px bg-slate-800 mx-0.5"></div>

			<!-- Negrita, Cursiva, Subrayado, Tachado -->
			<div class="flex items-center gap-0.5">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('bold')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Negrita (Ctrl+B)"
				>
					<Bold class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('italic')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Cursiva (Ctrl+I)"
				>
					<Italic class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('underline')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Subrayado (Ctrl+U)"
				>
					<Underline class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('strikeThrough')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Tachado"
				>
					<Strikethrough class="w-3.5 h-3.5" />
				</button>
			</div>

			<div class="h-4 w-px bg-slate-800 mx-0.5"></div>

			<!-- Colores de Texto y Fondo (Paleta elevada con z-[100]) -->
			<div class="relative inline-block color-picker-container">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={(e) => {
						e.stopPropagation();
						isColorPaletteOpen = !isColorPaletteOpen;
						isBgColorPaletteOpen = false;
					}}
					class="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Color de Texto"
				>
					<Palette class="w-3.5 h-3.5 text-blue-400" />
					<ChevronDown class="w-3 h-3 text-slate-500" />
				</button>
				{#if isColorPaletteOpen}
					<div
						class="absolute left-0 top-full mt-1.5 z-[100] p-2 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl flex flex-wrap gap-1.5 w-40"
					>
						{#each textColors as c}
							<button
								type="button"
								onmousedown={(e) => e.preventDefault()}
								onclick={() => setTextColor(c.value)}
								class="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
								style="background-color: {c.value};"
								title={c.name}
							></button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="relative inline-block color-picker-container">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={(e) => {
						e.stopPropagation();
						isBgColorPaletteOpen = !isBgColorPaletteOpen;
						isColorPaletteOpen = false;
					}}
					class="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Color de Fondo / Resaltado"
				>
					<span class="w-3.5 h-3.5 rounded border border-amber-400 bg-amber-400/30 flex items-center justify-center text-[9px] font-bold">A</span>
					<ChevronDown class="w-3 h-3 text-slate-500" />
				</button>
				{#if isBgColorPaletteOpen}
					<div
						class="absolute left-0 top-full mt-1.5 z-[100] p-2 bg-slate-950 border border-slate-700 rounded-lg shadow-2xl flex flex-wrap gap-1.5 w-40"
					>
						{#each bgColors as bg}
							<button
								type="button"
								onmousedown={(e) => e.preventDefault()}
								onclick={() => setTextBgColor(bg.value)}
								class="w-6 h-6 rounded border border-white/20 transition-transform hover:scale-110 flex items-center justify-center text-[9px] font-bold text-slate-900"
								style="background-color: {bg.value};"
								title={bg.name}
							>
								{bg.value === 'transparent' ? '✕' : ''}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="h-4 w-px bg-slate-800 mx-0.5"></div>

			<!-- Alineación -->
			<div class="flex items-center gap-0.5">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('justifyLeft')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Alinear a la Izquierda"
				>
					<TextAlignStart class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('justifyCenter')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Centrar"
				>
					<TextAlignCenter class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('justifyRight')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Alinear a la Derecha"
				>
					<TextAlignEnd class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('justifyFull')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Justificar"
				>
					<TextAlignJustify class="w-3.5 h-3.5" />
				</button>
			</div>

			<div class="h-4 w-px bg-slate-800 mx-0.5"></div>

			<!-- Listas y Separador -->
			<div class="flex items-center gap-0.5">
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('insertUnorderedList')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Lista con Viñetas"
				>
					<List class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('insertOrderedList')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Lista Numerada"
				>
					<ListOrdered class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => execCmd('insertHorizontalRule')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
					title="Línea Divisoria"
				>
					<Minus class="w-3.5 h-3.5" />
				</button>
			</div>

			<div class="h-4 w-px bg-slate-800 mx-0.5"></div>

			<!-- BOTONES PRINCIPALES DE INSERCIÓN: IMAGEN, TABLA, BLOQUES -->
			<div class="flex items-center gap-1.5">
				<!-- Insertar Imagen -->
				<button
					type="button"
					onclick={openInsertImageModal}
					class="px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 flex items-center gap-1 font-bold text-[11px] transition-colors"
					title="Insertar Imagen o Logotipo"
				>
					<ImageIcon class="w-3.5 h-3.5" />
					<span>Imagen</span>
				</button>

				<!-- Insertar Tabla -->
				<button
					type="button"
					onclick={openInsertTableModal}
					class="px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center gap-1 font-bold text-[11px] transition-colors"
					title="Insertar Tabla de Datos"
				>
					<TableIcon class="w-3.5 h-3.5" />
					<span>Tabla</span>
				</button>

				<!-- Insertar 2 Columnas Rápido -->
				<button
					type="button"
					onclick={() => insertLayoutBlock('2cols')}
					class="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1 text-[11px]"
					title="Insertar 2 Columnas"
				>
					<Columns2 class="w-3.5 h-3.5" />
					<span>2 Col</span>
				</button>
			</div>

			<!-- Deshacer / Rehacer y Eliminar Selección/Bloque -->
			<div class="ml-auto flex items-center gap-1">
				<button
					type="button"
					onclick={() => execCmd('undo')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
					title="Deshacer (Ctrl+Z)"
				>
					<Undo class="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onclick={() => execCmd('redo')}
					class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
					title="Rehacer (Ctrl+Y)"
				>
					<Redo class="w-3.5 h-3.5" />
				</button>
				<div class="h-4 w-px bg-slate-800 mx-0.5"></div>
				<button
					type="button"
					onmousedown={(e) => e.preventDefault()}
					onclick={deleteCurrentSelectionOrBlock}
					class="p-1.5 rounded bg-red-950/40 hover:bg-red-900/70 border border-red-800/40 text-red-400 hover:text-white transition-colors"
					title="Eliminar elemento, bloque o texto seleccionado (Shift+Supr)"
				>
					<Trash2 class="w-3.5 h-3.5" />
				</button>
			</div>
		</div>

		<!-- BARRA CONTEXTUAL PARA TABLAS (SI HAY UNA TABLA ACTIVA) -->
		{#if activeTable}
			<div class="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/70 border-b border-emerald-800/80 text-[11px] text-emerald-300">
				<span class="font-bold flex items-center gap-1">
					<TableIcon class="w-3.5 h-3.5" /> Tabla activa:
				</span>
				<button
					type="button"
					onclick={() => addTableRow(false)}
					class="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700"
				>
					+ Fila Arriba
				</button>
				<button
					type="button"
					onclick={() => addTableRow(true)}
					class="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700"
				>
					+ Fila Abajo
				</button>
				<button
					type="button"
					onclick={deleteTableRow}
					class="px-2 py-0.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300"
				>
					Eliminar Fila
				</button>
				<span class="text-emerald-800">•</span>
				<button
					type="button"
					onclick={() => addTableColumn(false)}
					class="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700"
				>
					+ Columna Izq
				</button>
				<button
					type="button"
					onclick={() => addTableColumn(true)}
					class="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700"
				>
					+ Columna Der
				</button>
				<button
					type="button"
					onclick={deleteTableColumn}
					class="px-2 py-0.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300"
				>
					Eliminar Columna
				</button>
				<div class="ml-auto">
					<button
						type="button"
						onclick={deleteCurrentTable}
						class="px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-white font-bold flex items-center gap-1"
					>
						<Trash2 class="w-3 h-3" /> Borrar Tabla
					</button>
				</div>
			</div>
		{/if}

		<!-- BARRA CONTEXTUAL PARA IMÁGENES (SI HAY UNA IMAGEN ACTIVA) -->
		{#if activeImage}
			<div class="flex items-center gap-2 px-3 py-1.5 bg-blue-950/70 border-b border-blue-800/80 text-[11px] text-blue-300">
				<span class="font-bold flex items-center gap-1">
					<ImageIcon class="w-3.5 h-3.5" /> Imagen seleccionada:
				</span>
				<span class="text-slate-400">Tamaño:</span>
				<button
					type="button"
					onclick={() => setImageWidth('25%')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					25%
				</button>
				<button
					type="button"
					onclick={() => setImageWidth('50%')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					50%
				</button>
				<button
					type="button"
					onclick={() => setImageWidth('75%')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					75%
				</button>
				<button
					type="button"
					onclick={() => setImageWidth('100%')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					100%
				</button>
				<span class="text-blue-800">•</span>
				<span class="text-slate-400">Alinear:</span>
				<button
					type="button"
					onclick={() => setImageAlignment('left')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					Izquierda
				</button>
				<button
					type="button"
					onclick={() => setImageAlignment('center')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					Centro
				</button>
				<button
					type="button"
					onclick={() => setImageAlignment('right')}
					class="px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 border border-blue-700"
				>
					Derecha
				</button>
				<div class="ml-auto">
					<button
						type="button"
						onclick={deleteSelectedImage}
						class="px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-white font-bold flex items-center gap-1"
					>
						<Trash2 class="w-3 h-3" /> Eliminar Imagen
					</button>
				</div>
			</div>
		{/if}

		<!-- BARRA CONTEXTUAL PARA BLOQUES (SI HAY UN BLOQUE ACTIVO Y NO ES TABLA NI IMAGEN) -->
		{#if activeBlock && !activeTable && !activeImage}
			<div class="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 border-b border-slate-700 text-[11px] text-slate-200">
				<span class="font-bold flex items-center gap-1.5 text-blue-400">
					<LayoutTemplate class="w-3.5 h-3.5" /> Bloque seleccionado:
				</span>
				<span class="text-slate-400 text-[10px]">
					(Puede editar los textos directamente o eliminar/duplicar el bloque entero)
				</span>
				<div class="flex items-center gap-1 ml-auto">
					<button
						type="button"
						onclick={duplicateActiveBlock}
						class="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold flex items-center gap-1 transition-colors"
						title="Duplicar este bloque completo"
					>
						<Copy class="w-3 h-3 text-slate-300" /> Duplicar Bloque
					</button>
					<button
						type="button"
						onclick={deleteActiveBlock}
						class="px-2.5 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-white font-bold flex items-center gap-1 shadow-sm transition-colors"
						title="Eliminar este bloque completo"
					>
						<Trash2 class="w-3 h-3" /> Eliminar Bloque
					</button>
				</div>
			</div>
		{/if}
	{/if}

	<!-- 3. ÁREA PRINCIPAL DE TRABAJO (SIDEBAR + CANVAS) -->
	<div class="flex-1 flex overflow-hidden relative z-10">
		<!-- PANEL LATERAL DE VARIABLES Y BLOQUES -->
		{#if sidePanelOpen && currentMode === 'visual'}
			<div class="w-72 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0 text-xs">
				<!-- Tabs del Panel Lateral -->
				<div class="flex border-b border-slate-800 bg-slate-900/50">
					<button
						type="button"
						onclick={() => (activeSideTab = 'variables')}
						class={`flex-1 py-2 font-bold text-[11px] text-center transition-colors border-b-2 ${
							activeSideTab === 'variables'
								? 'border-primary text-primary bg-slate-900'
								: 'border-transparent text-slate-400 hover:text-slate-200'
						}`}
					>
						✨ Variables
					</button>
					<button
						type="button"
						onclick={() => (activeSideTab = 'bloques')}
						class={`flex-1 py-2 font-bold text-[11px] text-center transition-colors border-b-2 ${
							activeSideTab === 'bloques'
								? 'border-primary text-primary bg-slate-900'
								: 'border-transparent text-slate-400 hover:text-slate-200'
						}`}
					>
						🧱 Bloques
					</button>
					<button
						type="button"
						onclick={() => (activeSideTab = 'plantillas')}
						class={`flex-1 py-2 font-bold text-[11px] text-center transition-colors border-b-2 ${
							activeSideTab === 'plantillas'
								? 'border-primary text-primary bg-slate-900'
								: 'border-transparent text-slate-400 hover:text-slate-200'
						}`}
					>
						📄 Modelos
					</button>
				</div>

				<!-- CONTENIDO TAB 1: VARIABLES DE VENTAS -->
				{#if activeSideTab === 'variables'}
					<div class="p-2 space-y-2 flex-1 flex flex-col overflow-hidden">
						<!-- Buscador de Variables -->
						<div class="relative">
							<Search class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
							<input
								type="text"
								placeholder="Buscar variable..."
								bind:value={variableSearch}
								class="w-full h-8 pl-8 pr-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 focus:outline-none focus:border-primary"
							/>
						</div>

						<!-- Filtro de Categorías -->
						<div class="flex flex-wrap gap-1">
							{#each [
								{ id: 'todos', label: 'Todos' },
								{ id: 'remitente', label: 'Remitente' },
								{ id: 'consignatario', label: 'Destino' },
								{ id: 'logistica', label: 'Logística' },
								{ id: 'finanzas', label: 'Costos' },
								{ id: 'graficos', label: 'Gráficos' }
							] as cat}
								<button
									type="button"
									onclick={() => (selectedCategory = cat.id)}
									class={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
										selectedCategory === cat.id
											? 'bg-primary text-primary-foreground font-bold'
											: 'bg-slate-900 text-slate-400 hover:text-slate-200'
									}`}
								>
									{cat.label}
								</button>
							{/each}
						</div>

						<!-- Lista scrolleable de Variables -->
						<div class="flex-1 overflow-y-auto space-y-1 pr-1">
							{#each filteredVariables as v}
								<button
									type="button"
									onclick={() => insertVariable(v.token)}
									class="w-full text-left p-2 rounded bg-slate-900 hover:bg-slate-800/90 border border-slate-800/80 hover:border-primary/50 transition-all group"
								>
									<div class="flex items-center justify-between">
										<span class="font-bold text-[11px] text-slate-200 group-hover:text-primary transition-colors">
											{v.label}
										</span>
										<Plus class="w-3 h-3 text-slate-500 group-hover:text-primary" />
									</div>
									<div class="font-mono text-[10px] text-blue-400 truncate mt-0.5">
										{v.token}
									</div>
									<p class="text-[9px] text-slate-500 line-clamp-1 mt-0.5">
										{v.description}
									</p>
								</button>
							{/each}
							{#if filteredVariables.length === 0}
								<p class="text-center text-slate-500 p-4 text-[11px]">No se encontraron variables con ese criterio.</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- CONTENIDO TAB 2: BLOQUES DE MAQUETACIÓN -->
				{#if activeSideTab === 'bloques'}
					<div class="p-2 space-y-2 flex-1 overflow-y-auto">
						<p class="text-[10px] text-slate-400 font-semibold px-1">
							Haz clic para insertar estructuras pre-diseñadas en el documento:
						</p>

						<!-- Bloques Disponibles -->
						<div class="space-y-1.5">
							<button
								type="button"
								onclick={() => insertLayoutBlock('header_empresa')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<LayoutTemplate class="w-3.5 h-3.5 text-primary" />
									Encabezado Institucional
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">Logo, nombre de empresa, dirección, contacto y código de guía.</p>
							</button>

							<button
								type="button"
								onclick={() => insertLayoutBlock('shipper_receiver')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<Columns2 class="w-3.5 h-3.5 text-emerald-400" />
									Remitente y Destinatario
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">2 tarjetas enmarcadas en paralelo con todos los datos de envío.</p>
							</button>

							<button
								type="button"
								onclick={() => insertLayoutBlock('tabla_articulos')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<TableIcon class="w-3.5 h-3.5 text-blue-400" />
									Tabla Dinámica de Artículos
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">Inserta la tabla con el contenido detallado de la encomienda.</p>
							</button>

							<button
								type="button"
								onclick={() => insertLayoutBlock('totales_box')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<FileSpreadsheet class="w-3.5 h-3.5 text-amber-400" />
									Resumen Financiero y Totales
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">Caja compacta a la derecha con subtotal, seguro y total en verde.</p>
							</button>

							<button
								type="button"
								onclick={() => insertLayoutBlock('tracking_codes')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<QrCode class="w-3.5 h-3.5 text-purple-400" />
									Códigos QR y Barras 1D
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">Contenedor centrado para escaneo móvil y lector de terminal.</p>
							</button>

							<button
								type="button"
								onclick={() => insertLayoutBlock('signatures')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<Check class="w-3.5 h-3.5 text-slate-400" />
									Firmas de Conformidad
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">Líneas de firma para agente despachador y cliente receptor.</p>
							</button>

							<button
								type="button"
								onclick={() => insertLayoutBlock('terms_box')}
								class="w-full text-left p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary/40 transition-all"
							>
								<div class="font-bold text-[11px] text-slate-200 flex items-center gap-1.5">
									<FileText class="w-3.5 h-3.5 text-slate-400" />
									Cláusulas y Términos Legales
								</div>
								<p class="text-[10px] text-slate-500 mt-0.5">Recuadro con letra pequeña para recomendaciones de inspección.</p>
							</button>
						</div>
					</div>
				{/if}

				<!-- CONTENIDO TAB 3: PLANTILLAS BASE -->
				{#if activeSideTab === 'plantillas'}
					<div class="p-2 space-y-2 flex-1 overflow-y-auto">
						<p class="text-[10px] text-slate-400 font-semibold px-1">
							Cargar un diseño estándar como punto de partida:
						</p>

						<div class="space-y-2">
							<button
								type="button"
								onclick={() => loadStarterTemplate('guia')}
								class="w-full text-left p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary transition-all"
							>
								<div class="font-bold text-xs text-white">Guía de Despacho (con QR)</div>
								<p class="text-[10px] text-slate-400 mt-1">Formato ideal para carta/A4 con remitente, destinatario, QR y firmas.</p>
							</button>

							<button
								type="button"
								onclick={() => loadStarterTemplate('picking')}
								class="w-full text-left p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary transition-all"
							>
								<div class="font-bold text-xs text-white">Picking List & Invoice</div>
								<p class="text-[10px] text-slate-400 mt-1">Formato comercial con código de barras, packing list y tabla de cobro.</p>
							</button>

							<button
								type="button"
								onclick={() => loadStarterTemplate('etiqueta')}
								class="w-full text-left p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary transition-all"
							>
								<div class="font-bold text-xs text-white">Etiqueta Adhesiva (4 x 6 in)</div>
								<p class="text-[10px] text-slate-400 mt-1">Diseño vertical optimizado para impresoras térmicas de etiquetas de caja.</p>
							</button>

							<button
								type="button"
								onclick={() => loadStarterTemplate('blanco')}
								class="w-full text-left p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/40 transition-all text-red-300"
							>
								<div class="font-bold text-xs">Página en Blanco</div>
								<p class="text-[10px] text-slate-400 mt-1">Limpiar todo y empezar el diseño desde cero.</p>
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- LIENZO CENTRAL (CANVAS DE PAPEL WYSIWYG O VISTA PREVIA O CÓDIGO) -->
		<div class="flex-1 overflow-auto bg-slate-950 p-6 flex justify-center items-start">
			<!-- MODO 1: MAQUETADOR VISUAL WYSIWYG -->
			{#if currentMode === 'visual'}
				<div
					style="transform: scale({zoom}); transform-origin: top center; transition: transform 0.15s ease;"
					class="my-2"
				>
					<div
						bind:this={editorCanvas}
						contenteditable="true"
						role="textbox"
						tabindex="0"
						aria-multiline="true"
						aria-label="Lienzo de maquetación de documento"
						oninput={syncFromCanvas}
						onblur={syncFromCanvas}
						onclick={handleCanvasClick}
						onmouseup={() => { saveCurrentSelection(); }}
						onkeyup={(e) => { handleCanvasClick(e); saveCurrentSelection(); }}
						onkeydown={handleCanvasKeydown}
						style="
							width: {paperDimensions.width};
							min-height: {paperDimensions.minHeight};
							max-width: {paperDimensions.maxWidth};
							padding: {paperDimensions.padding};
						"
						class="bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans text-xs selection:bg-blue-100 selection:text-blue-900"
					></div>
				</div>
			{/if}

			<!-- MODO 2: VISTA PREVIA CON DATOS DE PRUEBA -->
			{#if currentMode === 'preview'}
				<div
					style="transform: scale({zoom}); transform-origin: top center; transition: transform 0.15s ease;"
					class="my-2"
				>
					<div
						style="
							width: {paperDimensions.width};
							min-height: {paperDimensions.minHeight};
							max-width: {paperDimensions.maxWidth};
							padding: {paperDimensions.padding};
						"
						class="bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 leading-relaxed font-sans text-xs"
					>
						{@html renderedMockHtml}
					</div>
				</div>
			{/if}

			<!-- MODO 3: CÓDIGO FUENTE HTML (PARA USUARIOS TÉCNICOS) -->
			{#if currentMode === 'code'}
				<div class="w-full max-w-4xl h-full flex flex-col space-y-2">
					<div class="flex items-center justify-between text-xs text-slate-400">
						<span class="font-mono font-bold text-amber-400 flex items-center gap-1.5">
							<Code class="w-4 h-4" /> Editor de Código HTML de la Plantilla
						</span>
						<span class="text-[11px]">Los cambios hechos aquí se reflejan instantáneamente en el maquetador visual.</span>
					</div>
					<textarea
						bind:value
						rows="24"
						class="w-full flex-1 rounded-lg border border-slate-800 bg-slate-900 p-4 font-mono text-xs text-emerald-400 leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
					></textarea>
				</div>
			{/if}
		</div>
	</div>

	<!-- PIE DE BARRA: INDICADOR DE ESTADO -->
	<div class="px-4 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 select-none">
		<div class="flex items-center gap-2">
			<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
			<span>Maquetador de Documentos Activo</span>
			{#if documentName}
				<span class="text-slate-600">•</span>
				<span class="font-semibold text-slate-300 truncate max-w-xs">{documentName}</span>
			{/if}
		</div>
		<div class="flex items-center gap-4">
			<span>Tamaño de fuente y estilos se renderizan con alta fidelidad para impresión PDF</span>
		</div>
	</div>
</div>

<!-- MODAL: INSERTAR IMAGEN -->
<Dialog bind:open={isImageModalOpen}>
	<DialogContent
		class="sm:max-w-md bg-slate-900 text-slate-100 border-slate-800 z-[10001]"
		overlayClass="z-[10000] bg-black/60 backdrop-blur-xs"
	>
		<DialogHeader>
			<DialogTitle class="text-sm font-bold flex items-center gap-2 text-white">
				<ImageIcon class="w-4 h-4 text-blue-400" />
				Insertar Imagen en el Documento
			</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-2 text-xs">
			<!-- Pestañas de origen de imagen -->
			<div class="flex rounded-lg border border-slate-800 p-1 bg-slate-950">
				<button
					type="button"
					onclick={() => (imageSourceType = 'upload')}
					class={`flex-1 py-1.5 font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
						imageSourceType === 'upload' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
					}`}
				>
					<Upload class="w-3.5 h-3.5" />
					Subir desde PC
				</button>
				<button
					type="button"
					onclick={() => (imageSourceType = 'url')}
					class={`flex-1 py-1.5 font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
						imageSourceType === 'url' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
					}`}
				>
					<LinkIcon class="w-3.5 h-3.5" />
					Por URL
				</button>
				<button
					type="button"
					onclick={() => (imageSourceType = 'logo')}
					class={`flex-1 py-1.5 font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
						imageSourceType === 'logo' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
					}`}
				>
					<Sparkles class="w-3.5 h-3.5" />
					Logotipo
				</button>
			</div>

			<!-- Opción: Subir Imagen -->
			{#if imageSourceType === 'upload'}
				<div class="space-y-2">
					<Label class="text-xs text-slate-300">Seleccione un archivo de imagen (PNG, JPG, SVG, WebP):</Label>
					<input
						type="file"
						accept="image/*"
						onchange={handleFileUpload}
						class="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
					/>
					{#if uploadedImageBase64}
						<div class="p-2 border border-slate-800 rounded-lg bg-slate-950 flex justify-center">
							<img src={uploadedImageBase64} alt="Previsualización" class="max-h-28 object-contain rounded" />
						</div>
					{/if}
				</div>
			{/if}

			<!-- Opción: Por URL -->
			{#if imageSourceType === 'url'}
				<div class="space-y-2">
					<Label class="text-xs text-slate-300">Enlace o URL de la Imagen:</Label>
					<Input
						type="url"
						placeholder="https://ejemplo.com/imagen.png"
						bind:value={imageUrlInput}
						class="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
					/>
					{#if imageUrlInput.trim()}
						<div class="p-2 border border-slate-800 rounded-lg bg-slate-950 flex justify-center">
							<img src={imageUrlInput.trim()} alt="Previsualización" class="max-h-28 object-contain rounded" />
						</div>
					{/if}
				</div>
			{/if}

			<!-- Opción: Logotipo Institucional -->
			{#if imageSourceType === 'logo'}
				<div class="p-3 border border-slate-800 rounded-lg bg-slate-950 space-y-1.5">
					<p class="font-bold text-white">Logotipo Dinámico de la Empresa</p>
					<p class="text-slate-400 text-[11px]">
						Se insertará la variable <span class="font-mono text-primary font-bold">{`{{logo_empresa}}`}</span>.
						Al generar e imprimir el documento, se sustituirá automáticamente por el logotipo configurado en la empresa.
					</p>
				</div>
			{/if}

			<!-- Opciones de Diseño para la Imagen -->
			{#if imageSourceType !== 'logo'}
				<div class="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
					<div class="space-y-1">
						<Label class="text-[11px] text-slate-400">Ancho en el documento</Label>
						<select
							bind:value={imageWidthSelect}
							class="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
						>
							<option value="auto">Automático / Original</option>
							<option value="120px">Pequeño (120px)</option>
							<option value="180px">Mediano (180px)</option>
							<option value="250px">Grande (250px)</option>
							<option value="50%">50% del ancho</option>
							<option value="100%">100% (Ancho Completo)</option>
						</select>
					</div>

					<div class="space-y-1">
						<Label class="text-[11px] text-slate-400">Alineación</Label>
						<select
							bind:value={imageAlignSelect}
							class="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
						>
							<option value="left">Izquierda</option>
							<option value="center">Centrado</option>
							<option value="right">Derecha</option>
						</select>
					</div>
				</div>
			{/if}
		</div>

		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => (isImageModalOpen = false)} class="h-8 text-xs border-slate-700 text-slate-300">
				Cancelar
			</Button>
			<Button type="button" onclick={confirmInsertImage} class="h-8 text-xs font-bold bg-primary text-white">
				Insertar Imagen
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- MODAL: INSERTAR TABLA -->
<Dialog bind:open={isTableModalOpen}>
	<DialogContent
		class="sm:max-w-md bg-slate-900 text-slate-100 border-slate-800 z-[10001]"
		overlayClass="z-[10000] bg-black/60 backdrop-blur-xs"
	>
		<DialogHeader>
			<DialogTitle class="text-sm font-bold flex items-center gap-2 text-white">
				<TableIcon class="w-4 h-4 text-emerald-400" />
				Insertar Tabla en el Documento
			</DialogTitle>
		</DialogHeader>

		<div class="space-y-4 py-2 text-xs">
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1">
					<Label class="text-xs text-slate-300">Número de Filas</Label>
					<Input
						type="number"
						min="1"
						max="15"
						bind:value={tableRows}
						class="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
					/>
				</div>
				<div class="space-y-1">
					<Label class="text-xs text-slate-300">Número de Columnas</Label>
					<Input
						type="number"
						min="1"
						max="8"
						bind:value={tableCols}
						class="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
					/>
				</div>
			</div>

			<div class="space-y-1">
				<Label class="text-xs text-slate-300">Estilo de la Tabla</Label>
				<select
					bind:value={tableStyle}
					class="w-full h-8 px-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
				>
					<option value="standard">Bordeada Estándar (Limpia con cabecera gris)</option>
					<option value="striped">Moderna Rayada (Filas alternadas con cabecera oscura)</option>
					<option value="clean">Desglose 2 Columnas (Sin bordes externos, ideal para recibos)</option>
				</select>
			</div>

			<div class="flex items-center gap-2 pt-1">
				<input
					type="checkbox"
					id="tbl_header"
					bind:checked={tableWithHeader}
					class="rounded border-slate-700 bg-slate-950 text-primary"
				/>
				<Label for="tbl_header" class="text-xs text-slate-300 cursor-pointer">
					Incluir fila de encabezado resaltada
				</Label>
			</div>
		</div>

		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => (isTableModalOpen = false)} class="h-8 text-xs border-slate-700 text-slate-300">
				Cancelar
			</Button>
			<Button type="button" onclick={confirmInsertTable} class="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
				Crear Tabla
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- MODAL: PLANTILLAS BASE -->
<Dialog bind:open={isStarterModalOpen}>
	<DialogContent
		class="sm:max-w-lg bg-slate-900 text-slate-100 border-slate-800 z-[10001]"
		overlayClass="z-[10000] bg-black/60 backdrop-blur-xs"
	>
		<DialogHeader>
			<DialogTitle class="text-sm font-bold flex items-center gap-2 text-white">
				<FileSpreadsheet class="w-4 h-4 text-primary" />
				Cargar Plantilla Base Prediseñada
			</DialogTitle>
		</DialogHeader>

		<div class="space-y-3 py-2 text-xs">
			<p class="text-slate-400">
				Seleccione una plantilla base para sustituir el contenido actual con una maquetación profesional lista para personalizar:
			</p>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<button
					type="button"
					onclick={() => loadStarterTemplate('guia')}
					class="text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-primary transition-all group"
				>
					<div class="font-bold text-xs text-white group-hover:text-primary">Guía de Despacho (con QR)</div>
					<p class="text-[10px] text-slate-400 mt-1">Encabezado, remitente/destino en 2 columnas, tabla y código QR.</p>
				</button>

				<button
					type="button"
					onclick={() => loadStarterTemplate('picking')}
					class="text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-primary transition-all group"
				>
					<div class="font-bold text-xs text-white group-hover:text-primary">Picking List & Invoice</div>
					<p class="text-[10px] text-slate-400 mt-1">Código de barras 1D, datos de invoice, packing list y tabla de cobro.</p>
				</button>

				<button
					type="button"
					onclick={() => loadStarterTemplate('etiqueta')}
					class="text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-primary transition-all group"
				>
					<div class="font-bold text-xs text-white group-hover:text-primary">Etiqueta Térmica (4 x 6 in)</div>
					<p class="text-[10px] text-slate-400 mt-1">Diseño compacto vertical para impresión de adhesivos de caja.</p>
				</button>

				<button
					type="button"
					onclick={() => loadStarterTemplate('blanco')}
					class="text-left p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-red-500/40 transition-all text-red-300"
				>
					<div class="font-bold text-xs">Documento en Blanco</div>
					<p class="text-[10px] text-slate-400 mt-1">Limpiar todo y empezar el diseño desde cero.</p>
				</button>
			</div>
		</div>

		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => (isStarterModalOpen = false)} class="h-8 text-xs border-slate-700 text-slate-300">
				Cerrar
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<style>
	:global([data-doc-block="true"]) {
		position: relative;
		transition: outline 0.12s ease-in-out;
		cursor: text;
	}
	:global([data-doc-block="true"]:hover) {
		outline: 1px dashed rgba(59, 130, 246, 0.45);
	}
	:global([data-selected-block="true"]) {
		outline: 2px solid #2563eb !important;
		outline-offset: 2px;
	}
</style>
