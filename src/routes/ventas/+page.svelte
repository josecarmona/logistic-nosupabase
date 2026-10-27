<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { InputUppercase } from '$lib/components/ui/input-uppercase';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PaginationControl from '$lib/components/PaginationControl.svelte';
	import { lookupGeoLocation, lookupGeoLocationWithDetails } from '$lib/services/geo';
	import { toast } from 'svelte-sonner';
	import {
		ShoppingCart,
		Plus,
		Trash2,
		AlertTriangle,
		CheckCircle2,
		Globe,
		Sparkles,
		CreditCard,
		DollarSign,
		UserCheck,
		PackageCheck,
		Scale,
		Hash,
		Eye,
		FileText,
		UserPlus,
		Edit,
		Mail,
		Phone,
		MapPin,
		IdCard,
		Tag,
		ArrowRight,
		Loader2,
		Boxes,
		Truck,
		ChevronDown,
		ChevronUp,
		ShieldCheck,
		Percent,
		Calendar,
		Lock,
		Search,
		X
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type {
		VentaWithRelations,
		ProfileWithRelations,
		ProductoWithRelations,
		TarifaWithRelations,
		Zona,
		Pais,
		TipoTarifa,
		ConceptoPago,
		CargoDescuento,
		TipoAdquisicion,
		CajaDetalle
	} from '$lib/types/database';
	import { fetchZoomOficinasPorCiudad, type ZoomOficina } from '$lib/services/zoom-api';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const clientes = $derived(data.clientes || []);
	const productos = $derived(data.productos || []);
	const tarifas = $derived(data.tarifas || []);
	const zonas = $derived(data.zonas || []);
	const paises = $derived(data.paises || []);
	const tiposTarifa = $derived(data.tiposTarifa || []);
	const conceptosPago = $derived(data.conceptosPago || []);
	const cargosDescuentos = $derived(data.cargosDescuentos || []);
	const tipoAdquisiciones = $derived(data.tipoAdquisiciones || []);
	const articulosMaster = $derived(data.articulos || []);

	// Interfaz para el manejo reactivo de múltiples cajas en la vista
	interface CajaItem {
		numero: string;
		tipo_tarifa_id: string;
		producto_id: string;
		peso_reportado: number;
		alto?: number;
		ancho?: number;
		largo?: number;
		descontar_inventario?: boolean;
	}

	// Estado para Múltiples Cajas por Venta
	let esMultipleCajas = $state(false);
	let numeroCajasInput = $state(2);
	let cajas = $state<CajaItem[]>([]);
	let selectedCajaParaArticulo = $state('001/002');
	let filtroCajaArticulos = $state('TODAS');
	let descontarInventarioCaja = $state(true);

	function formatCajaNumero(index: number, total: number): string {
		const padIndex = String(index + 1).padStart(3, '0');
		const padTotal = String(total).padStart(3, '0');
		return `${padIndex}/${padTotal}`;
	}

	function getDimensionesFromProducto(prod: ProductoWithRelations | null | undefined): { alto: number; ancho: number; largo: number } | null {
		if (!prod) return null;
		if (prod.atributos_valores && typeof prod.atributos_valores === 'object') {
			const entries = Object.entries(prod.atributos_valores);
			const largoVal = entries.find(([k]) => k.toUpperCase().includes('LARGO'))?.[1];
			const anchoVal = entries.find(([k]) => k.toUpperCase().includes('ANCHO'))?.[1];
			const altoVal = entries.find(([k]) => k.toUpperCase().includes('ALTO'))?.[1];

			const l = largoVal !== undefined && String(largoVal).trim() !== '' ? parseFloat(String(largoVal)) : NaN;
			const a = anchoVal !== undefined && String(anchoVal).trim() !== '' ? parseFloat(String(anchoVal)) : NaN;
			const h = altoVal !== undefined && String(altoVal).trim() !== '' ? parseFloat(String(altoVal)) : NaN;

			if (!isNaN(l) && !isNaN(a) && !isNaN(h) && (l > 0 || a > 0 || h > 0)) {
				return { alto: h, ancho: a, largo: l };
			}
		}
		if (prod.descripcion) {
			const m = prod.descripcion.trim().match(/^(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)$/);
			if (m) {
				const d1 = parseFloat(m[1]);
				const d2 = parseFloat(m[2]);
				const d3 = parseFloat(m[3]);
				if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) {
					return { alto: d1, largo: d2, ancho: d3 };
				}
			}
		}
		return null;
	}

	function handleCajaProductoChange(caja: CajaItem) {
		const prod = productos.find((p) => String(p.id) === String(caja.producto_id)) || null;
		const dims = getDimensionesFromProducto(prod);
		if (dims) {
			caja.alto = dims.alto;
			caja.ancho = dims.ancho;
			caja.largo = dims.largo;
		} else {
			caja.alto = 0;
			caja.ancho = 0;
			caja.largo = 0;
		}
	}

	function syncCajas(count: number) {
		const total = Math.max(2, Math.min(50, Number(count) || 2));
		numeroCajasInput = total;
		const oldCajas = [...cajas];
		const newCajas: CajaItem[] = [];

		for (let i = 0; i < total; i++) {
			const num = formatCajaNumero(i, total);
			const prev = oldCajas[i];
			const targetProdId = prev?.producto_id || (productoId || '');
			const prodRef = targetProdId ? productos.find((p) => String(p.id) === String(targetProdId)) : null;
			const dimsRef = getDimensionesFromProducto(prodRef);
			const hasPrevDims = Boolean(prev && ((Number(prev.alto) || 0) > 0 || (Number(prev.ancho) || 0) > 0 || (Number(prev.largo) || 0) > 0));

			newCajas.push({
				numero: num,
				tipo_tarifa_id: prev?.tipo_tarifa_id || (tipoTarifaId || (tiposTarifa[0] ? String(tiposTarifa[0].id) : '')),
				producto_id: targetProdId,
				peso_reportado: prev?.peso_reportado || (pesoReportado > 0 ? pesoReportado : 1),
				alto: hasPrevDims ? Number(prev?.alto) || 0 : dimsRef?.alto || 0,
				ancho: hasPrevDims ? Number(prev?.ancho) || 0 : dimsRef?.ancho || 0,
				largo: hasPrevDims ? Number(prev?.largo) || 0 : dimsRef?.largo || 0,
				descontar_inventario: prev?.descontar_inventario !== undefined ? prev.descontar_inventario : true
			});
		}

		// Reasignar caja_numero a los artículos para conservar la numeración actualizada
		if (articulosSeleccionados.length > 0 && oldCajas.length > 0) {
			articulosSeleccionados = articulosSeleccionados.map((art) => {
				const oldIdx = oldCajas.findIndex((c) => c.numero === art.caja_numero);
				if (oldIdx >= 0) {
					const targetIdx = Math.min(oldIdx, total - 1);
					return { ...art, caja_numero: newCajas[targetIdx].numero };
				}
				return { ...art, caja_numero: newCajas[0].numero };
			});
		}

		cajas = newCajas;
		if (!newCajas.some((c) => c.numero === selectedCajaParaArticulo)) {
			selectedCajaParaArticulo = newCajas[0].numero;
		}
	}

	function toggleMultipleCajas() {
		if (esMultipleCajas) {
			if (cajas.length === 0) {
				syncCajas(numeroCajasInput);
			}
		} else {
			if (articulosSeleccionados.length > 0) {
				articulosSeleccionados = articulosSeleccionados.map((a) => ({ ...a, caja_numero: '001/001' }));
			}
		}
	}

	function addCaja() {
		syncCajas(cajas.length + 1);
	}

	function removeCaja(index: number) {
		if (cajas.length <= 2) {
			toast.info('El envío con múltiples cajas debe contener al menos 2 cajas.');
			return;
		}
		const cajaEliminada = cajas[index];
		const targetCaja = cajas[0].numero;
		articulosSeleccionados = articulosSeleccionados.map((a) => {
			if (a.caja_numero === cajaEliminada.numero) {
				return { ...a, caja_numero: targetCaja };
			}
			return a;
		});
		syncCajas(cajas.length - 1);
	}

	// Lista de Artículos declarados en la Venta (Mínimo 1, sin máximo)
	let articulosSeleccionados = $state<Array<{ articulo_id?: number; nombre: string; cantidad: number; valor_total: number; caja_numero?: string }>>([]);
	let selectedArticuloMasterId = $state('');
	let searchArticuloMasterQuery = $state('');
	let isArticuloMasterDropdownOpen = $state(false);
	let masterArticuloCantidad = $state(1);
	let masterArticuloValorTotal = $state(0);
	let customArticuloNombre = $state('');
	let customArticuloCantidad = $state(1);
	let customArticuloValorTotal = $state(0);

	const filteredArticulosMaster = $derived.by(() => {
		const q = searchArticuloMasterQuery.trim().toLowerCase();
		if (!q) return articulosMaster;
		return articulosMaster.filter((a) => a.nombre.toLowerCase().includes(q));
	});

	function selectArticuloMasterItem(art: { id: number; nombre: string }) {
		selectedArticuloMasterId = String(art.id);
		searchArticuloMasterQuery = art.nombre;
		isArticuloMasterDropdownOpen = false;
	}

	function clearArticuloMasterSelection() {
		selectedArticuloMasterId = '';
		searchArticuloMasterQuery = '';
	}

	function addArticuloFromMaster() {
		let art = articulosMaster.find((a) => String(a.id) === String(selectedArticuloMasterId));
		if (!art && searchArticuloMasterQuery.trim()) {
			const exact = articulosMaster.find(
				(a) => a.nombre.toLowerCase() === searchArticuloMasterQuery.trim().toLowerCase()
			);
			if (exact) art = exact;
		}
		if (!art) {
			toast.error('Seleccione un artículo válido del maestro');
			return;
		}

		articulosSeleccionados.push({
			articulo_id: art.id,
			nombre: art.nombre,
			cantidad: Number(masterArticuloCantidad) || 1,
			valor_total: Number(masterArticuloValorTotal) || 0,
			caja_numero: esMultipleCajas ? selectedCajaParaArticulo : '001/001'
		});
		selectedArticuloMasterId = '';
		searchArticuloMasterQuery = '';
		isArticuloMasterDropdownOpen = false;
		masterArticuloCantidad = 1;
		masterArticuloValorTotal = 0;
		syncValorDeclaradoFromArticulos();
	}

	function addCustomArticulo() {
		if (!customArticuloNombre.trim()) {
			toast.error('El nombre del artículo es obligatorio');
			return;
		}
		articulosSeleccionados.push({
			nombre: customArticuloNombre.trim().toUpperCase(),
			cantidad: Number(customArticuloCantidad) || 1,
			valor_total: Number(customArticuloValorTotal) || 0,
			caja_numero: esMultipleCajas ? selectedCajaParaArticulo : '001/001'
		});
		customArticuloNombre = '';
		customArticuloCantidad = 1;
		customArticuloValorTotal = 0;
		syncValorDeclaradoFromArticulos();
	}

	function removeArticulo(index: number) {
		articulosSeleccionados.splice(index, 1);
		syncValorDeclaradoFromArticulos();
	}

	function removeArticuloItem(item: { articulo_id?: number; nombre: string; cantidad: number; valor_total: number; caja_numero?: string }) {
		const idx = articulosSeleccionados.indexOf(item);
		if (idx >= 0) {
			articulosSeleccionados.splice(idx, 1);
			syncValorDeclaradoFromArticulos();
		}
	}

	function syncValorDeclaradoFromArticulos() {
		const total = articulosSeleccionados.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
		valorDeclarado = Number(total.toFixed(2));
	}

	const articulosParaMostrar = $derived.by(() => {
		if (!esMultipleCajas || filtroCajaArticulos === 'TODAS') {
			return articulosSeleccionados;
		}
		return articulosSeleccionados.filter((a) => a.caja_numero === filtroCajaArticulos);
	});



	function formatDatetimeLocal(isoStr?: string | null): string {
		const d = isoStr ? new Date(isoStr) : new Date();
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	// Estado del Formulario de Operación de Venta
	let editingVentaId = $state<number | null>(null);
	let tipoOperacion = $state<'envio' | 'venta_cajas'>('envio');
	let cantidadCajasUnica = $state(1);
	const esVentaCajas = $derived(tipoOperacion === 'venta_cajas');

	function getPrecioVentaProducto(p?: ProductoWithRelations | null): number {
		if (!p) return 0;
		const pv = Number(p.precio_venta ?? p.atributos_valores?.__precio_venta ?? 0);
		return pv > 0 ? pv : Number(p.costo ?? 0);
	}

	let fechaVenta = $state(formatDatetimeLocal());
	let clienteOrigenId = $state('');
	let clienteDestinoId = $state('');
	let destinatarioEnTienda = $state(false);
	let productoId = $state('');
	let tipoTarifaId = $state('');
	let zonaId = $state('');
	let paisDestinoId = $state('');
	let proveedorId = $state('');
	let tipoEntrega = $state<'domicilio' | 'oficina'>('domicilio');
	let direccionEntrega = $state('');
	let zoomOficinasDisponibles = $state<ZoomOficina[]>([]);
	let selectedZoomOficinaCodigo = $state('');
	let guiaProveedorManual = $state('');
	let ciudadesProveedorApi = $state<string[]>([]);
	let selectedCiudadApi = $state('');
	let selectedProveedorDireccionId = $state('');
	let peso = $state(1);

	const proveedoresAll = $derived(data.proveedores || []);

	// Filtra la lista de proveedores para mostrar solo los que atienden el país destino seleccionado
	const proveedores = $derived.by(() => {
		if (!paisDestinoId) return proveedoresAll;
		return proveedoresAll.filter((p) => {
			if (!p.paises_atendidos || p.paises_atendidos.length === 0) return true;
			return p.paises_atendidos.some((pa) => String(pa.id) === String(paisDestinoId));
		});
	});
	let pesoReportado = $state(1);
	let alto = $state(0);
	let ancho = $state(0);
	let largo = $state(0);
	let requiereSeguro = $state(false);
	let valorDeclarado = $state(0);
	let porcentajeSeguroManual = $state(0);

	const proveedorObj = $derived.by(() => {
		return proveedores.find((p) => String(p.id) === String(proveedorId)) || null;
	});

	// Cargar ciudades oficiales de la API si el proveedor tiene API
	$effect(() => {
		if (proveedorObj?.tiene_api) {
			fetch(`/api/proveedores/ciudades?proveedorId=${proveedorObj.id}`)
				.then((r) => r.json())
				.then((d) => {
					ciudadesProveedorApi = d.ciudades || [];
					if (!selectedCiudadApi && ciudadesProveedorApi.length > 0) {
						const clientCity = (clienteDestinoObj?.ciudad || '').toUpperCase().trim();
						const match = ciudadesProveedorApi.find((c) => c === clientCity || clientCity.includes(c) || c.includes(clientCity));
						selectedCiudadApi = match || ciudadesProveedorApi[0];
					}
				})
				.catch((err) => console.warn('Error cargando ciudades API:', err));
		} else {
			ciudadesProveedorApi = [];
			selectedCiudadApi = '';
		}
	});

	$effect(() => {
		if (proveedorObj?.tiene_api && tipoEntrega === 'oficina') {
			const ciudad = selectedCiudadApi || clienteDestinoObj?.ciudad || '';
			fetchZoomOficinasPorCiudad(ciudad).then((ofs) => {
				zoomOficinasDisponibles = ofs;
				if (ofs.length > 0) {
					if (!selectedZoomOficinaCodigo || !ofs.some(o => o.codigo === selectedZoomOficinaCodigo)) {
						selectedZoomOficinaCodigo = ofs[0].codigo;
						direccionEntrega = `${ofs[0].nombre}: ${ofs[0].direccion}`;
					}
				}
			});
		} else {
			zoomOficinasDisponibles = [];
			selectedZoomOficinaCodigo = '';
		}
	});

	$effect(() => {
		if (tipoEntrega === 'domicilio') {
			direccionEntrega = clienteDestinoObj?.direccion_1 || (clienteDestinoId ? 'DOMICILIO REGISTRADO DEL CLIENTE CONSIGNATARIO' : '');
		} else if (tipoEntrega === 'oficina') {
			if (proveedorObj) {
				if (proveedorObj.tiene_api) {
					if (selectedZoomOficinaCodigo) {
						const selectedOf = zoomOficinasDisponibles.find((o) => o.codigo === selectedZoomOficinaCodigo);
						if (selectedOf) {
							direccionEntrega = `${selectedOf.nombre}: ${selectedOf.direccion}`;
						}
					} else if (zoomOficinasDisponibles.length > 0) {
						direccionEntrega = `${zoomOficinasDisponibles[0].nombre}: ${zoomOficinasDisponibles[0].direccion}`;
					} else {
						const ciudad = (selectedCiudadApi || clienteDestinoObj?.ciudad || 'CIUDAD DESTINO').toUpperCase();
						direccionEntrega = `OFICINA API [${proveedorObj.nombre}] - AGENCIA RECEPTORA DE ${ciudad}`;
					}
				} else {
					// Si el proveedor no usa API pero tiene múltiples direcciones
					if (proveedorObj.direcciones && proveedorObj.direcciones.length > 0) {
						const dirFound = proveedorObj.direcciones.find(d => String(d.id) === String(selectedProveedorDireccionId))
							|| proveedorObj.direcciones.find(d => d.es_principal)
							|| proveedorObj.direcciones[0];
						if (dirFound) {
							direccionEntrega = `${dirFound.titulo}: ${dirFound.direccion}${dirFound.ciudad ? ' (' + dirFound.ciudad + ')' : ''}`;
						} else {
							direccionEntrega = proveedorObj.direccion || 'DIRECCIÓN MAESTRO PROVEEDOR NO REGISTRADA';
						}
					} else {
						direccionEntrega = proveedorObj.direccion || 'DIRECCIÓN MAESTRO PROVEEDOR NO REGISTRADA';
					}
				}
			} else {
				direccionEntrega = 'SELECCIONE UN PROVEEDOR DE TRANSPORTE';
			}
		}
	});

	$effect(() => {
		if (data.editingVenta) {
			const eV = data.editingVenta;
			editingVentaId = eV.id;
			const isCajMode =
				eV.tipo_operacion === 'venta_cajas' ||
				String(eV.codigo_venta || '').startsWith('CAJ-') ||
				String(eV.codigo_venta || '').startsWith('BOR-CAJ-');
			tipoOperacion = isCajMode ? 'venta_cajas' : 'envio';
			fechaVenta = formatDatetimeLocal(eV.created_at);
			clienteOrigenId = eV.cliente_origen_id || '';
			clienteDestinoId = eV.cliente_destino_id || '';
			productoId = String(eV.producto_id || eV.cajas_detalle?.[0]?.producto_id || '');
			const matchedTarifa = tarifas.find((t) => String(t.id) === String(eV.tarifa_id));
			tipoTarifaId = matchedTarifa
				? String(matchedTarifa.tipo_tarifa_id)
				: String((eV as any).tipo_tarifa_id || eV.cajas_detalle?.[0]?.tipo_tarifa_id || '');
			zonaId = String(eV.zona_id || '');
			paisDestinoId = String(eV.pais_destino_id || '');
			proveedorId = eV.proveedor_id ? String(eV.proveedor_id) : '';
			tipoEntrega = (eV.tipo_entrega as 'domicilio' | 'oficina') || 'domicilio';
			guiaProveedorManual = eV.guia_proveedor || '';
			if (eV.direccion_entrega) direccionEntrega = eV.direccion_entrega;
			peso = eV.peso || 1;
			pesoReportado = eV.peso_reportado || eV.peso || 1;
			alto = eV.alto || 0;
			ancho = eV.ancho || 0;
			largo = eV.largo || 0;
			requiereSeguro = eV.requiere_seguro || false;
			valorDeclarado = eV.valor_declarado || 0;
			porcentajeSeguroManual = eV.porcentaje_seguro_aplicado || 0;

			if (eV.es_multiple_cajas) {
				esMultipleCajas = true;
				cantidadCajasUnica = 1;
				numeroCajasInput = eV.total_cajas || (eV.cajas_detalle ? eV.cajas_detalle.length : 2);
				if (eV.cajas_detalle && eV.cajas_detalle.length > 0) {
					cajas = eV.cajas_detalle.map((c, idx) => ({
						numero: c.numero || formatCajaNumero(idx, eV.total_cajas || 2),
						tipo_tarifa_id: String(c.tipo_tarifa_id || ''),
						producto_id: String(c.producto_id || ''),
						peso_reportado: Number(c.peso_reportado) || 1,
						alto: Number(c.alto) || 0,
						ancho: Number(c.ancho) || 0,
						largo: Number(c.largo) || 0,
						descontar_inventario: c.descontar_inventario !== false
					}));
				} else {
					syncCajas(numeroCajasInput);
				}
			} else {
				esMultipleCajas = false;
				cantidadCajasUnica = eV.total_cajas && eV.total_cajas > 1 ? eV.total_cajas : 1;
				numeroCajasInput = 2;
				cajas = [];
				descontarInventarioCaja =
					eV.descontar_inventario !== false &&
					(Array.isArray(eV.cajas_detalle) && eV.cajas_detalle.length > 0
						? eV.cajas_detalle[0]?.descontar_inventario !== false
						: true);
			}

			if (eV.articulos_registrados && eV.articulos_registrados.length > 0) {
				articulosSeleccionados = eV.articulos_registrados.map((a) => ({
					articulo_id: a.articulo_id || undefined,
					nombre: a.nombre,
					cantidad: Number(a.cantidad) || 1,
					valor_total: Number(a.valor_total) || 0,
					caja_numero: a.caja_numero || (esMultipleCajas && cajas[0] ? cajas[0].numero : '001/001')
				}));
			}

			if (eV.cargos_descuentos_aplicados && eV.cargos_descuentos_aplicados.length > 0) {
				cargosDescuentosAplicados = eV.cargos_descuentos_aplicados
					.filter(
						(cd) =>
							!String(cd.nombre || '')
								.toUpperCase()
								.startsWith('DESCUENTO CAJA SIN DESCUENTO DE INVENTARIO')
					)
					.map((cd) => ({
						id: cd.cargo_descuento_id || undefined,
						nombre: cd.nombre,
						tipo: cd.tipo,
						es_porcentaje: !!cd.es_porcentaje,
						porcentaje: cd.porcentaje != null ? Number(cd.porcentaje) : undefined,
						monto: Number(cd.monto) || 0
					}));
			}

			if (eV.pagos_registrados && eV.pagos_registrados.length > 0) {
				pagosRegistrados = eV.pagos_registrados.map((p) => ({
					concepto_pago_id: p.concepto_pago_id || undefined,
					concepto_nombre: p.concepto_nombre,
					monto: Number(p.monto) || 0,
					porcentaje_comision: Number(p.porcentaje_comision || 0),
					monto_comision: Number(p.monto_comision || 0),
					monto_cobrado: Number(p.monto_cobrado || p.monto || 0),
					referencia: p.referencia || undefined
				}));
			}
		} else {
			editingVentaId = null;
			fechaVenta = formatDatetimeLocal();
			descontarInventarioCaja = true;
		}
	});

	// Estructura y Estado de Cargos y Descuentos aplicados
	interface CargoDescuentoItem {
		id?: number;
		nombre: string;
		tipo: 'cargo' | 'descuento';
		es_porcentaje: boolean;
		porcentaje?: number;
		monto: number;
	}

	let cargosDescuentosAplicados = $state<CargoDescuentoItem[]>([]);
	let selectedCargoDescuentoId = $state('');
	let isCustomCargoOpen = $state(false);
	let customCargoNombre = $state('');
	let customCargoTipo = $state<'cargo' | 'descuento'>('cargo');
	let customCargoEsPorcentaje = $state(false);
	let customCargoValor = $state(0);

	// Lista de Pagos Mixtos registrados
	let pagosRegistrados = $state<
		Array<{
			concepto_pago_id?: number;
			concepto_nombre: string;
			monto: number;
			porcentaje_comision?: number;
			monto_comision?: number;
			monto_cobrado?: number;
			referencia?: string;
		}>
	>([]);

	let selectedConceptoPagoId = $state('');
	let pagoMontoInput = $state(0);
	let pagoReferenciaInput = $state('');

	const selectedConceptoObj = $derived(
		conceptosPago.find((cp) => String(cp.id) === String(selectedConceptoPagoId))
	);
	const abonoComisionPct = $derived(Number(selectedConceptoObj?.porcentaje_comision || 0));
	const abonoComisionMonto = $derived(
		abonoComisionPct > 0 ? Number((pagoMontoInput * (abonoComisionPct / 100)).toFixed(2)) : 0
	);
	const abonoTotalCobrado = $derived(
		Number((pagoMontoInput + abonoComisionMonto).toFixed(2))
	);

	// Modales
	let isPagoModalOpen = $state(false);
	let isDetailOpen = $state(false);
	let selectedVentaDetail = $state<VentaWithRelations | null>(null);

	// Modales para Crear y Editar Cliente en Venta
	let isCreateClientOpen = $state(false);
	let isEditClientOpen = $state(false);
	let targetClientRoleForCreation = $state<'origen' | 'destino'>('origen');

	// Formulario Modal de Cliente Completo (Siguiendo las mismas normas del maestro de clientes)
	let clientModalId = $state('');
	let clientModalEmail = $state('');
	let clientModalNombre = $state('');
	let clientModalRazonSocial = $state('');
	let clientModalCedula = $state('');
	let clientModalDireccion1 = $state('');
	let clientModalDireccion2 = $state('');
	let clientModalPaisId = $state('');
	let clientModalCodigoPostal = $state('');
	let clientModalCiudad = $state('');
	let clientModalEstado = $state('');
	let clientModalMunicipio = $state('');
	let clientModalCelular = $state('');
	let clientModalTelefono = $state('');
	let clientModalTipoAdquisicionId = $state('');
	let clientModalReferencia = $state('');

	let searchingGeo = $state(false);

	// Autocompletado de Búsqueda de Clientes Dinámica (Búsqueda en todo el catálogo de 143,000 clientes)
	let searchOrigenQuery = $state('');
	let searchDestinoQuery = $state('');
	let isSearchingOrigen = $state(false);
	let isSearchingDestino = $state(false);

	let clientesPool = $state<ProfileWithRelations[]>([]);

	function addClientesToPool(newClients: ProfileWithRelations[], overwrite = false) {
		if (!newClients || newClients.length === 0) return;
		const poolMap = new Map(clientesPool.map((c) => [c.id, c]));
		let changed = false;
		for (const c of newClients) {
			if (c && c.id && (overwrite || !poolMap.has(c.id))) {
				poolMap.set(c.id, c);
				changed = true;
			}
		}
		if (changed) {
			clientesPool = Array.from(poolMap.values());
		}
	}

	$effect(() => {
		const incoming = data.clientes;
		const editing = data.editingVenta;
		untrack(() => {
			if (incoming && incoming.length > 0) {
				addClientesToPool(incoming);
			}
			if (editing?.cliente_origen) {
				addClientesToPool([editing.cliente_origen as ProfileWithRelations]);
			}
			if (editing?.cliente_destino) {
				addClientesToPool([editing.cliente_destino as ProfileWithRelations]);
			}
		});
	});

	let debounceOrigenTimer: ReturnType<typeof setTimeout>;
	function handleSearchOrigen(val: string) {
		searchOrigenQuery = val;
		clearTimeout(debounceOrigenTimer);
		const q = val.trim();
		if (q.length < 2) return;

		debounceOrigenTimer = setTimeout(async () => {
			isSearchingOrigen = true;
			try {
				const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(q)}`);
				if (res.ok) {
					const results: ProfileWithRelations[] = await res.json();
					addClientesToPool(results);
				}
			} catch (err) {
				console.error('Error al buscar remitentes:', err);
			} finally {
				isSearchingOrigen = false;
			}
		}, 300);
	}

	let debounceDestinoTimer: ReturnType<typeof setTimeout>;
	function handleSearchDestino(val: string) {
		searchDestinoQuery = val;
		clearTimeout(debounceDestinoTimer);
		const q = val.trim();
		if (q.length < 2) return;

		debounceDestinoTimer = setTimeout(async () => {
			isSearchingDestino = true;
			try {
				const res = await fetch(`/api/clientes/search?q=${encodeURIComponent(q)}`);
				if (res.ok) {
					const results: ProfileWithRelations[] = await res.json();
					addClientesToPool(results);
				}
			} catch (err) {
				console.error('Error al buscar destinatarios:', err);
			} finally {
				isSearchingDestino = false;
			}
		}, 300);
	}

	const filteredClientesOrigen = $derived.by(() => {
		let list = clientesPool;
		if (searchOrigenQuery.trim()) {
			const q = searchOrigenQuery.toLowerCase().trim();
			list = clientesPool.filter(
				(c) =>
					(c.nombre_completo && c.nombre_completo.toLowerCase().includes(q)) ||
					(c.numero_celular && c.numero_celular.toLowerCase().includes(q)) ||
					(c.telefono && c.telefono.toLowerCase().includes(q)) ||
					(c.codigo && c.codigo.toLowerCase().includes(q)) ||
					(c.cedula && c.cedula.toLowerCase().includes(q)) ||
					(c.email && c.email.toLowerCase().includes(q))
			);
		} else {
			list = clientesPool.slice(0, 50);
		}
		if (clienteOrigenId && !list.some((c) => String(c.id) === String(clienteOrigenId))) {
			const sel = clientesPool.find((c) => String(c.id) === String(clienteOrigenId));
			if (sel) list = [sel, ...list];
		}
		return list;
	});

	const filteredClientesDestino = $derived.by(() => {
		let list = clientesPool;
		if (searchDestinoQuery.trim()) {
			const q = searchDestinoQuery.toLowerCase().trim();
			list = clientesPool.filter(
				(c) =>
					(c.nombre_completo && c.nombre_completo.toLowerCase().includes(q)) ||
					(c.numero_celular && c.numero_celular.toLowerCase().includes(q)) ||
					(c.telefono && c.telefono.toLowerCase().includes(q)) ||
					(c.codigo && c.codigo.toLowerCase().includes(q)) ||
					(c.cedula && c.cedula.toLowerCase().includes(q)) ||
					(c.email && c.email.toLowerCase().includes(q))
			);
		} else {
			list = clientesPool.slice(0, 50);
		}
		if (clienteDestinoId && !list.some((c) => String(c.id) === String(clienteDestinoId))) {
			const sel = clientesPool.find((c) => String(c.id) === String(clienteDestinoId));
			if (sel) list = [sel, ...list];
		}
		return list;
	});

	// Determina si el usuario autenticado tiene el rol 'admin'
	const isAdmin = $derived((data.roles || []).includes('admin'));

	// Determina si el usuario autenticado tiene únicamente el rol 'cliente'
	const isCliente = $derived(
		(data.roles || []).includes('cliente') &&
		!(data.roles || []).includes('admin') &&
		!(data.roles || []).includes('gerente') &&
		!(data.roles || []).includes('operador')
	);

	// Auto-asignar el clienteOrigenId al perfil del cliente logueado si es rol 'cliente'
	$effect(() => {
		if (isCliente && data.user) {
			if (clienteOrigenId !== String(data.user.id)) {
				clienteOrigenId = String(data.user.id);
			}
			if (pesoReportado <= 0) {
				pesoReportado = 1;
			}
		}
	});

	// Al seleccionar el cliente de destino, AUTO-EXTRAER su País Destino (pais_id) de su perfil
	$effect(() => {
		if (clienteDestinoId) {
			const clientDest = clientesPool.find((c) => String(c.id) === String(clienteDestinoId));
			if (clientDest && clientDest.pais_id) {
				paisDestinoId = String(clientDest.pais_id);
			} else {
				paisDestinoId = '';
			}
		} else {
			paisDestinoId = '';
		}
	});

	const clienteOrigenObj = $derived.by(() => {
		return clientesPool.find((c) => String(c.id) === String(clienteOrigenId)) || null;
	});

	const clienteDestinoObj = $derived.by(() => {
		return clientesPool.find((c) => String(c.id) === String(clienteDestinoId)) || null;
	});

	// Estados del Acordeón para colapsar / expandir cada sección
	let paso1Open = $state(true);
	let paso2Open = $state(true);
	let paso3Open = $state(true);
	let paso4Open = $state(true);

	// Estado Semáforo Paso 1: Remitente, Consignatario y Tipo de Entrega
	const paso1Semaforo = $derived.by(() => {
		if (esVentaCajas) {
			return clienteOrigenId ? 'verde' : 'rojo';
		}
		const hasOrigen = !!clienteOrigenId;
		const hasDestino = destinatarioEnTienda || !!clienteDestinoId;
		const hasProv = isCliente || !!proveedorId;
		const needsManualGuia = !isCliente && proveedorObj && !proveedorObj.tiene_api;
		const hasManualGuia = !needsManualGuia || (guiaProveedorManual && guiaProveedorManual.trim().length > 0);

		if (!hasOrigen && !hasDestino && !hasProv) return 'rojo';
		if (hasOrigen && hasDestino && hasProv && hasManualGuia) return 'verde';
		return 'amarillo';
	});

	// Determina si la tarifa o el tipo de tarifa corresponde a una promoción (precio $0.00 permitido)
	function esTarifaPromocion(tarifa: any, targetTipoTarifaId?: string | number | null): boolean {
		if (tarifa?.tipo_tarifa && typeof tarifa.tipo_tarifa.promocion === 'boolean') {
			return Boolean(tarifa.tipo_tarifa.promocion);
		}
		const tId = targetTipoTarifaId ?? tarifa?.tipo_tarifa_id;
		if (!tId) return false;
		const tt = tiposTarifa.find((item) => String(item.id) === String(tId));
		return Boolean(tt?.promocion);
	}

	function esTarifaValida(tarifa: any, targetTipoTarifaId?: string | number | null): boolean {
		if (!tarifa) return false;
		const precio = Number(tarifa.precio ?? -1);
		if (precio > 0) return true;
		if (precio === 0 && esTarifaPromocion(tarifa, targetTipoTarifaId)) return true;
		return false;
	}

	// Determina si el operador seleccionó una combinación de tarifa que NO existe en el sistema o su precio base es $0 sin ser promoción
	const isTarifaInexistente = $derived.by(() => {
		if (isCliente) return false;
		if (esVentaCajas) {
			if (esMultipleCajas) {
				if (cajas.length === 0) return false;
				return cajas.some((c) => {
					if (!c.producto_id) return false;
					const p = productos.find((prod) => String(prod.id) === String(c.producto_id));
					return getPrecioVentaProducto(p) <= 0;
				});
			}
			if (productoId) {
				return getPrecioVentaProducto(productoObj) <= 0;
			}
			return false;
		}
		if (esMultipleCajas) {
			if (cajas.length === 0) return false;
			return cajas.some((c) => {
				if (!c.tipo_tarifa_id || !c.producto_id) return false;
				const t = getTarifaParaCaja(c);
				return !esTarifaValida(t, c.tipo_tarifa_id);
			});
		}
		if (tipoTarifaId && productoId && paisDestinoId && zonaId) {
			return !esTarifaValida(tarifaEncontrada, tipoTarifaId);
		}
		return false;
	});

	// Estado Semáforo Paso 2: Tipo Tarifa, Producto y Especificaciones de Cargas (o Seguro de Envío para cliente)
	const paso2Semaforo = $derived.by(() => {
		if (isCliente) return 'verde';
		if (esVentaCajas) {
			if (esMultipleCajas) {
				if (cajas.length === 0) return 'rojo';
				if (isTarifaInexistente) return 'rojo';
				const allBoxesReady = cajas.every((c) => {
					if (!c.producto_id) return false;
					const p = productos.find((prod) => String(prod.id) === String(c.producto_id));
					return getPrecioVentaProducto(p) > 0;
				});
				return allBoxesReady ? 'verde' : 'amarillo';
			}
			if (!productoId) return 'rojo';
			if (isTarifaInexistente) return 'rojo';
			if (getPrecioVentaProducto(productoObj) > 0 && Math.max(1, Number(cantidadCajasUnica) || 1) >= 1) return 'verde';
			return 'amarillo';
		}
		if (esMultipleCajas) {
			if (cajas.length === 0) return 'rojo';
			const allConfigured = cajas.every(
				(c) => c.tipo_tarifa_id && c.producto_id && Number(c.peso_reportado) > 0 && esTarifaValida(getTarifaParaCaja(c), c.tipo_tarifa_id)
			);
			if (isTarifaInexistente) return 'rojo';
			if (allConfigured && !isSobrepeso) return 'verde';
			return 'amarillo';
		}
		const hasProducto = !!productoId;
		const hasPeso = pesoFacturable > 0;
		const hasTarifa = !!tipoTarifaId;

		if (!hasProducto && !hasTarifa) return 'rojo';
		if (isTarifaInexistente) return 'rojo';
		if (hasProducto && hasPeso && hasTarifa && esTarifaValida(tarifaEncontrada, tipoTarifaId) && !isSobrepeso) return 'verde';
		return 'amarillo';
	});

	// Estado Semáforo Paso 3: Declaración de Artículos
	const paso3Semaforo = $derived.by(() => {
		if (esVentaCajas) return 'verde';
		if (articulosSeleccionados.length === 0) return 'rojo';
		const allValid = articulosSeleccionados.every((a) => a.nombre && Number(a.cantidad) > 0 && Number(a.valor_total) > 0);
		if (!allValid) return 'amarillo';
		if (esMultipleCajas && cajas.length > 0) {
			const cajasConArticulos = new Set(articulosSeleccionados.map((a) => a.caja_numero));
			const faltanCajas = cajas.some((c) => !cajasConArticulos.has(c.numero));
			if (faltanCajas) return 'amarillo';
		}
		return 'verde';
	});

	// Estado Semáforo Paso 4: Cargos y Descuentos (Opcional)
	const paso4Semaforo = $derived.by(() => {
		return 'verde';
	});

	// Zona Logística asignada al usuario que usa la aplicación
	const defaultUserZonaId = $derived(data.user?.zona_id ? String(data.user.zona_id) : (data.userZonaId ? String(data.userZonaId) : ''));

	const userZonaObj = $derived.by(() => {
		const targetId = zonaId || defaultUserZonaId;
		if (!targetId) return null;
		return zonas.find((z) => String(z.id) === String(targetId)) || null;
	});

	// Auto-asignar la Zona Logística del usuario activo
	$effect(() => {
		if (defaultUserZonaId) {
			zonaId = defaultUserZonaId;
		} else if (zonas.length > 0 && !zonaId) {
			zonaId = String(zonas[0].id);
		}
	});

	// Función helper para obtener productos con tarifa activa por Tipo de Tarifa
	function getProductosConTarifa(targetTipoTarifaId: string) {
		if (!targetTipoTarifaId) return [];
		const tarifasValidas = tarifas.filter((t) => {
			if (!t.activo) return false;
			if (String(t.tipo_tarifa_id) !== String(targetTipoTarifaId)) return false;
			if (paisDestinoId && String(t.pais_id) !== String(paisDestinoId)) return false;
			if (zonaId && String(t.zona_id) !== String(zonaId)) return false;
			return true;
		});

		let idsValidos = new Set(tarifasValidas.map((t) => String(t.producto_id)));
		if (idsValidos.size === 0) {
			const tarifasPorTipoGeneral = tarifas.filter(
				(t) => t.activo && String(t.tipo_tarifa_id) === String(targetTipoTarifaId)
			);
			idsValidos = new Set(tarifasPorTipoGeneral.map((t) => String(t.producto_id)));
		}
		return productos.filter((p) => idsValidos.has(String(p.id)));
	}

	// Productos filtrados que TIENEN una tarifa activa vinculada al Tipo de Tarifa seleccionado
	const productosConTarifa = $derived(getProductosConTarifa(tipoTarifaId));

	// Obtener la tarifa aplicable a una caja individual
	function getTarifaParaCaja(caja: CajaItem) {
		if (!caja.tipo_tarifa_id || !caja.producto_id || !paisDestinoId || !zonaId) return null;
		return (
			tarifas.find(
				(t) =>
					String(t.tipo_tarifa_id) === String(caja.tipo_tarifa_id) &&
					String(t.pais_id) === String(paisDestinoId) &&
					String(t.zona_id) === String(zonaId) &&
					String(t.producto_id) === String(caja.producto_id) &&
					t.activo
			) || null
		);
	}

	// Cálculos de peso y costo de una caja individual
	function getCajaCalculos(caja: CajaItem) {
		const a = Number(caja.alto) || 0;
		const w = Number(caja.ancho) || 0;
		const l = Number(caja.largo) || 0;
		const pesoVol = a > 0 && w > 0 && l > 0 ? Number(((a * w * l) / 166).toFixed(2)) : 0;
		const pesoRep = Number(caja.peso_reportado) || 0;
		const pesoFac = Math.max(pesoRep, pesoVol) || (pesoRep > 0 ? pesoRep : 1);

		if (esVentaCajas) {
			const cProd = productos.find((p) => String(p.id) === String(caja.producto_id)) || null;
			const precioCaja = getPrecioVentaProducto(cProd);
			return {
				pesoVolumetrico: pesoVol,
				pesoFacturable: 1,
				montoBase: precioCaja,
				tarifa: null,
				esPorPeso: false,
				esPromocion: false,
				esValida: precioCaja > 0
			};
		}

		const t = getTarifaParaCaja(caja);
		let monto = 0;
		let esPorPeso = false;
		const esPromocion = esTarifaPromocion(t, caja.tipo_tarifa_id);
		const esValida = esTarifaValida(t, caja.tipo_tarifa_id);
		if (t) {
			if (t.tipo_calculo) {
				esPorPeso = t.tipo_calculo === 'peso';
			} else if (t.es_por_peso !== undefined) {
				esPorPeso = Boolean(t.es_por_peso);
			} else {
				const tipoObj = tiposTarifa.find((tt) => String(tt.id) === String(caja.tipo_tarifa_id));
				esPorPeso = tipoObj ? (
					tipoObj.nombre.toLowerCase().includes('libre') ||
					tipoObj.nombre.toLowerCase().includes('peso') ||
					tipoObj.nombre.toLowerCase().includes('libra') ||
					tipoObj.nombre.toLowerCase().includes('lb')
				) : false;
			}
			monto = esPorPeso ? Number((Number(t.precio) * pesoRep).toFixed(2)) : Number(t.precio);
		}
		return {
			pesoVolumetrico: pesoVol,
			pesoFacturable: pesoFac,
			montoBase: monto,
			tarifa: t,
			esPorPeso,
			esPromocion,
			esValida
		};
	}

	// Payload serializado de cajas para el servidor
	const cajasPayload = $derived.by(() => {
		if (!esMultipleCajas) return [];
		return cajas.map((c, idx) => {
			const calc = getCajaCalculos(c);
			const cProd = productos.find((p) => String(p.id) === String(c.producto_id));
			const cPrecioVenta = getPrecioVentaProducto(cProd);
			const noDescontar = c.descontar_inventario === false;
			return {
				numero: c.numero,
				indice: idx + 1,
				tipo_tarifa_id: c.tipo_tarifa_id,
				producto_id: c.producto_id,
				peso_reportado: Number(c.peso_reportado) || 1,
				alto: Number(c.alto) || 0,
				ancho: Number(c.ancho) || 0,
				largo: Number(c.largo) || 0,
				peso_volumetrico: calc.pesoVolumetrico,
				peso_facturable: calc.pesoFacturable,
				tarifa_id: calc.tarifa?.id || null,
				monto_base: calc.montoBase,
				descontar_inventario: !noDescontar,
				descuento_caja: noDescontar ? cPrecioVenta : 0
			};
		});
	});

	// Producto Seleccionado y sus Atributos
	const productoObj = $derived.by(() => {
		return productos.find((p) => String(p.id) === String(productoId)) || null;
	});

	function handleSingleProductoChange(targetId: string) {
		const prod = productos.find((p) => String(p.id) === String(targetId)) || null;
		const dims = getDimensionesFromProducto(prod);
		if (dims) {
			alto = dims.alto;
			ancho = dims.ancho;
			largo = dims.largo;
		} else {
			alto = 0;
			ancho = 0;
			largo = 0;
		}
	}

	// Resetear productoId si el producto actualmente seleccionado deja de ser válido para la nueva tarifa
	$effect(() => {
		if (!esVentaCajas && productoId && tipoTarifaId && !isCliente) {
			const isValid = productosConTarifa.some((p) => String(p.id) === String(productoId));
			if (!isValid) {
				productoId = '';
				alto = 0;
				ancho = 0;
				largo = 0;
			}
		}
	});

	// Auto-extraer dimensiones de los atributos del Producto cuando está seleccionado y las dimensiones están en 0
	$effect(() => {
		const prod = productoObj;
		if (prod) {
			const dims = getDimensionesFromProducto(prod);
			if (dims && untrack(() => alto === 0 && ancho === 0 && largo === 0)) {
				alto = dims.alto;
				ancho = dims.ancho;
				largo = dims.largo;
			}
		}
	});

	const tipoTarifaObj = $derived.by(() => {
		if (!tipoTarifaId) return null;
		return tiposTarifa.find((tt) => String(tt.id) === String(tipoTarifaId)) || null;
	});

	// Determinar si el Tipo de Tarifa es "Peso Libre" o cobro por peso/libra (heurística de respaldo)
	const isPesoLibre = $derived.by(() => {
		if (!tipoTarifaObj) return false;
		const name = tipoTarifaObj.nombre.toLowerCase();
		return name.includes('libre') || name.includes('peso') || name.includes('libra') || name.includes('lb');
	});

	// Determinar si la tarifa de la venta se calcula por peso reportado o es tarifa única
	const esTarifaPorPeso = $derived.by(() => {
		if (!tarifaEncontrada) return isPesoLibre;
		if (tarifaEncontrada.tipo_calculo) {
			return tarifaEncontrada.tipo_calculo === 'peso';
		}
		if (tarifaEncontrada.es_por_peso !== undefined) {
			return Boolean(tarifaEncontrada.es_por_peso);
		}
		return isPesoLibre;
	});

	// Cálculo del Peso Volumétrico en Libras (LB): (Alto * Ancho * Largo) / 166 (pulgadas)
	const pesoVolumetric = $derived.by(() => {
		const a = Number(alto) || 0;
		const w = Number(ancho) || 0;
		const l = Number(largo) || 0;
		if (a <= 0 || w <= 0 || l <= 0) return 0;
		return Number(((a * w * l) / 166).toFixed(2));
	});

	// El Peso Facturable Final es el MAYOR entre el peso reportado y el peso volumétrico (o suma de todas las cajas)
	const pesoFacturable = $derived.by(() => {
		if (esVentaCajas) return 1;
		if (esMultipleCajas && cajas.length > 0) {
			return Number(cajas.reduce((acc, c) => acc + getCajaCalculos(c).pesoFacturable, 0).toFixed(2));
		}
		const r = Number(pesoReportado) || 0;
		const v = Number(pesoVolumetric) || 0;
		const m = Math.max(r, v);
		return m > 0 ? m : (Number(peso) || 1);
	});

	// País Destino Seleccionado y su Límite de Peso
	const paisDestinoObj = $derived.by(() => {
		return paises.find((p) => String(p.id) === String(paisDestinoId)) || null;
	});

	// Helper para determinar el límite efectivo considerando carga máxima del producto vs país destino
	function getLimiteEfectivo(prod: any, pais: any): { limite: number; esPersonalizado: boolean; nombreOrigen: string } {
		const paisLimite = pais && pais.limite_peso ? Number(pais.limite_peso) : 0;
		const prodLimite = prod && prod.carga_maxima ? Number(prod.carga_maxima) : 0;
		if (prodLimite > 0 && prodLimite > paisLimite) {
			return { limite: prodLimite, esPersonalizado: true, nombreOrigen: prod.descripcion || 'Producto' };
		}
		return { limite: paisLimite, esPersonalizado: false, nombreOrigen: pais?.nombre || 'País' };
	}

	const limiteInfoSingle = $derived(getLimiteEfectivo(productoObj, paisDestinoObj));

	const capacidadMinimaPais = $derived(
		paisDestinoObj && Number(paisDestinoObj.capacidad_minima) > 0 ? Number(paisDestinoObj.capacidad_minima) : 0
	);

	const isBajoPesoMinimo = $derived(
		!esVentaCajas && !esMultipleCajas && capacidadMinimaPais > 0 && pesoFacturable < capacidadMinimaPais
	);

	// En múltiples cajas, identificar cuáles cajas exceden su límite individual
	const cajasSobrepeso = $derived.by(() => {
		if (esVentaCajas || !esMultipleCajas || cajas.length === 0) return [];
		const problematics: Array<{ numero: string; peso: number; limite: number; esPersonalizado: boolean; nombreOrigen: string }> = [];
		for (const c of cajas) {
			const cProd = productos.find((p) => String(p.id) === String(c.producto_id)) || null;
			const info = getLimiteEfectivo(cProd, paisDestinoObj);
			const cCalc = getCajaCalculos(c);
			if (info.limite > 0 && cCalc.pesoFacturable > info.limite) {
				problematics.push({
					numero: c.numero,
					peso: cCalc.pesoFacturable,
					limite: info.limite,
					esPersonalizado: info.esPersonalizado,
					nombreOrigen: info.nombreOrigen
				});
			}
		}
		return problematics;
	});

	const isSobrepeso = $derived.by(() => {
		if (esVentaCajas) return false;
		if (esMultipleCajas) {
			return cajasSobrepeso.length > 0;
		}
		return limiteInfoSingle.limite > 0 && pesoFacturable > limiteInfoSingle.limite;
	});

	// Búsqueda de Tarifa Coincidente para (Tipo Tarifa + País + Zona + Producto)
	const tarifaEncontrada = $derived.by(() => {
		if (!tipoTarifaId || !paisDestinoId || !zonaId || !productoId) return null;
		return (
			tarifas.find(
				(t) =>
					String(t.tipo_tarifa_id) === String(tipoTarifaId) &&
					String(t.pais_id) === String(paisDestinoId) &&
					String(t.zona_id) === String(zonaId) &&
					String(t.producto_id) === String(productoId) &&
					t.activo
			) || null
		);
	});

	// Monto Base Tarifa: Si es Múltiples Cajas suma de cada caja, si no (Precio por LB * Peso Reportado si es por peso, o Fijo)
	const montoBase = $derived.by(() => {
		if (esVentaCajas) {
			if (esMultipleCajas && cajas.length > 0) {
				return Number(cajas.reduce((acc, c) => acc + getCajaCalculos(c).montoBase, 0).toFixed(2));
			}
			const precioCaja = getPrecioVentaProducto(productoObj);
			const cant = Math.max(1, Number(cantidadCajasUnica) || 1);
			return Number((precioCaja * cant).toFixed(2));
		}
		if (esMultipleCajas && cajas.length > 0) {
			return Number(cajas.reduce((acc, c) => acc + getCajaCalculos(c).montoBase, 0).toFixed(2));
		}
		if (!tarifaEncontrada) return 0;
		const precioUnitario = Number(tarifaEncontrada.precio) || 0;
		if (esTarifaPorPeso) {
			const pesoRep = Number(pesoReportado) || 0;
			return Number((precioUnitario * pesoRep).toFixed(2));
		}
		return precioUnitario;
	});

	// Auto-inicializar % de seguro cuando cambia el producto si este lo define
	$effect(() => {
		if (productoObj && !esVentaCajas) {
			if (productoObj.requiere_seguro) {
				requiereSeguro = true;
			}
			if (productoObj.porcentaje_seguro && productoObj.porcentaje_seguro > 0) {
				porcentajeSeguroManual = productoObj.porcentaje_seguro;
			}
		}
	});

	// Porcentaje de Seguro Aplicado (permite edición manual e inicialización por producto)
	const porcentajeSeguroAplicado = $derived(Number(porcentajeSeguroManual) || 0);

	const montoSeguro = $derived(esVentaCajas ? 0 : (requiereSeguro ? (valorDeclarado * porcentajeSeguroAplicado) / 100 : 0));

	// Helper para obtener el monto en dólares del concepto (recalculado reactivamente sobre montoBase si es porcentaje)
	function getCargoDescuentoMonto(item: CargoDescuentoItem): number {
		if (item.es_porcentaje && typeof item.porcentaje === 'number') {
			return Number(((montoBase * item.porcentaje) / 100).toFixed(2));
		}
		return Number(item.monto || 0);
	}

	// Descuentos automáticos por cajas que NO se descuentan del inventario
	const descuentosCajasSinInventario = $derived.by(() => {
		const items: Array<{ nombre: string; monto: number; cajaNumero?: string }> = [];
		if (esMultipleCajas) {
			for (const c of cajas) {
				if (c.descontar_inventario === false && c.producto_id) {
					const prod = productos.find((p) => String(p.id) === String(c.producto_id));
					const pv = getPrecioVentaProducto(prod);
					if (pv > 0) {
						items.push({
							nombre: `Descuento Caja no descontada de inventario (Caja ${c.numero}${prod?.codigo ? ` - ${prod.codigo}` : ''})`,
							monto: pv,
							cajaNumero: c.numero
						});
					}
				}
			}
		} else if (!descontarInventarioCaja && productoObj) {
			const pv = getPrecioVentaProducto(productoObj);
			const cant = esVentaCajas ? Math.max(1, Number(cantidadCajasUnica) || 1) : 1;
			const totalPv = Number((pv * cant).toFixed(2));
			if (totalPv > 0) {
				items.push({
					nombre: `Descuento Caja no descontada de inventario [${productoObj.codigo}]`,
					monto: totalPv,
					cajaNumero: '001/001'
				});
			}
		}
		return items;
	});

	const totalDescuentoCajasSinInventario = $derived.by(() => {
		return Number(descuentosCajasSinInventario.reduce((acc, curr) => acc + curr.monto, 0).toFixed(2));
	});

	// Totales de Cargos y Descuentos
	const montoTotalCargos = $derived.by(() => {
		return cargosDescuentosAplicados
			.filter((c) => c.tipo === 'cargo')
			.reduce((acc, curr) => acc + getCargoDescuentoMonto(curr), 0);
	});

	const montoTotalDescuentos = $derived.by(() => {
		const manual = cargosDescuentosAplicados
			.filter((c) => c.tipo === 'descuento')
			.reduce((acc, curr) => acc + getCargoDescuentoMonto(curr), 0);
		return Number((manual + totalDescuentoCajasSinInventario).toFixed(2));
	});

	// Payload reactivo actualizado para el guardado en base de datos
	const cargosDescuentosPayload = $derived(
		cargosDescuentosAplicados.map((item) => ({
			id: item.id,
			nombre: item.nombre,
			tipo: item.tipo,
			es_porcentaje: item.es_porcentaje,
			porcentaje: item.es_porcentaje ? item.porcentaje : null,
			monto: getCargoDescuentoMonto(item)
		}))
	);

	const montoSubtotal = $derived(montoBase + montoTotalCargos - montoTotalDescuentos);
	const montoTotal = $derived(Math.max(0, montoSubtotal + montoSeguro));

	const montoPagado = $derived.by(() => {
		return pagosRegistrados.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
	});

	const montoPendiente = $derived(Math.max(0, montoTotal - montoPagado));

	const estatusPago = $derived.by(() => {
		if (montoPagado >= montoTotal && montoTotal > 0) return 'pagada';
		if (montoTotal === 0 && !isTarifaInexistente && (esVentaCajas ? (esMultipleCajas ? cajas.length > 0 : Boolean(productoId)) : (esMultipleCajas ? cajas.length > 0 : Boolean(tarifaEncontrada)))) return 'pagada';
		if (montoPagado > 0) return 'parcial';
		return 'pendiente';
	});

	// Búsqueda de geolocalización por País + Código Postal (Igual al maestro de clientes)
	async function handleGeoSearch() {
		if (!clientModalPaisId || !clientModalCodigoPostal) {
			toast.error('Selecciona un país e ingresa el código postal antes de buscar.');
			return;
		}

		const countryObj = paises.find((p) => String(p.id) === String(clientModalPaisId));
		if (!countryObj) return;

		searchingGeo = true;
		try {
			const { result, message } = await lookupGeoLocationWithDetails(
				countryObj.codigo_iso2,
				clientModalCodigoPostal,
				countryObj.nombre
			);
			if (result && (result.ciudad || result.estado || result.municipio)) {
				if (result.ciudad) clientModalCiudad = result.ciudad.toUpperCase();
				if (result.estado) clientModalEstado = result.estado.toUpperCase();
				if (result.municipio) clientModalMunicipio = result.municipio.toUpperCase();
				toast.success('Ubicación obtenida automáticamente');
			} else {
				toast.info(message || 'No se encontró ubicación automática. Completa los campos manualmente.');
			}
		} catch (e) {
			toast.error('Error al consultar geolocalización');
		} finally {
			searchingGeo = false;
		}
	}

	// Manejo de Creación y Edición de Clientes
	function openCreateClient(targetRole: 'origen' | 'destino') {
		targetClientRoleForCreation = targetRole;
		clientModalId = '';
		clientModalEmail = '';
		clientModalNombre = '';
		clientModalRazonSocial = '';
		clientModalCedula = '';
		clientModalDireccion1 = '';
		clientModalDireccion2 = '';
		clientModalPaisId = '';
		clientModalCodigoPostal = '';
		clientModalCiudad = '';
		clientModalEstado = '';
		clientModalMunicipio = '';
		clientModalCelular = '';
		clientModalTelefono = '';
		clientModalTipoAdquisicionId = '';
		clientModalReferencia = '';
		isCreateClientOpen = true;
	}

	function openEditClient(client: ProfileWithRelations) {
		clientModalId = String(client.id);
		clientModalEmail = client.email;
		clientModalNombre = client.nombre_completo;
		clientModalRazonSocial = client.razon_social || '';
		clientModalCedula = client.cedula || '';
		clientModalDireccion1 = client.direccion_1 || '';
		clientModalDireccion2 = client.direccion_2 || '';
		clientModalPaisId = client.pais_id ? String(client.pais_id) : '';
		clientModalCodigoPostal = client.codigo_postal || '';
		clientModalCiudad = client.ciudad || '';
		clientModalEstado = client.estado || '';
		clientModalMunicipio = client.municipio || '';
		clientModalCelular = client.numero_celular || '';
		clientModalTelefono = client.telefono || '';
		clientModalTipoAdquisicionId = client.tipo_adquisicion_id ? String(client.tipo_adquisicion_id) : '';
		clientModalReferencia = client.referencia || '';
		isEditClientOpen = true;
	}

	// Manejo de Cargos / Descuentos
	function addCargoDescuento() {
		if (!selectedCargoDescuentoId) return;
		const cd = cargosDescuentos.find((item) => String(item.id) === String(selectedCargoDescuentoId));
		if (cd) {
			const isPerc = !!cd.es_porcentaje;
			const valor = Number(cd.monto_defecto) || 0;
			cargosDescuentosAplicados.push({
				id: cd.id,
				nombre: cd.nombre,
				tipo: cd.tipo,
				es_porcentaje: isPerc,
				porcentaje: isPerc ? valor : undefined,
				monto: isPerc ? Number(((montoBase * valor) / 100).toFixed(2)) : valor
			});
		}
		selectedCargoDescuentoId = '';
	}

	function addCustomCargoDescuento() {
		if (!customCargoNombre.trim()) {
			toast.error('Ingresa una descripción para el concepto personalizado');
			return;
		}
		if (customCargoValor <= 0) {
			toast.error('Ingresa un monto o porcentaje mayor a 0');
			return;
		}

		const isPerc = customCargoEsPorcentaje;
		const valor = Number(customCargoValor) || 0;
		cargosDescuentosAplicados.push({
			nombre: customCargoNombre.trim().toUpperCase(),
			tipo: customCargoTipo,
			es_porcentaje: isPerc,
			porcentaje: isPerc ? valor : undefined,
			monto: isPerc ? Number(((montoBase * valor) / 100).toFixed(2)) : valor
		});

		customCargoNombre = '';
		customCargoValor = 0;
		customCargoEsPorcentaje = false;
		isCustomCargoOpen = false;
		toast.success('Concepto personalizado agregado');
	}

	function removeCargoDescuento(index: number) {
		cargosDescuentosAplicados.splice(index, 1);
	}

	// Manejo de Pagos Mixtos
	function openPagoModal() {
		selectedConceptoPagoId = '';
		pagoReferenciaInput = '';
		pagoMontoInput = Number(montoPendiente.toFixed(2));
		isPagoModalOpen = true;
	}

	function addPagoRegistrado() {
		if (!selectedConceptoPagoId || pagoMontoInput <= 0) {
			toast.error('Seleccione un método de pago e ingrese un monto válido mayor a 0');
			return;
		}

		const saldoReal = Number(montoPendiente.toFixed(2));
		if (pagoMontoInput > saldoReal + 0.001) {
			toast.error(`El monto del abono ($${pagoMontoInput.toFixed(2)}) no puede ser mayor al saldo por pagar ($${saldoReal.toFixed(2)})`);
			return;
		}

		const concepto = conceptosPago.find((cp) => String(cp.id) === String(selectedConceptoPagoId));
		if (!concepto) return;

		if (concepto.requiere_referencia) {
			const refClean = pagoReferenciaInput.trim();
			if (!/^\d{4,9}$/.test(refClean)) {
				toast.error('El código de referencia debe contener de 4 a 9 dígitos numéricos');
				return;
			}
		}

		const comisionPct = Number(concepto.porcentaje_comision || 0);
		const comisionMonto = comisionPct > 0 ? Number((pagoMontoInput * (comisionPct / 100)).toFixed(2)) : 0;
		const totalCobrado = Number((pagoMontoInput + comisionMonto).toFixed(2));

		pagosRegistrados.push({
			concepto_pago_id: concepto.id,
			concepto_nombre: concepto.nombre,
			monto: Number(pagoMontoInput.toFixed(2)),
			porcentaje_comision: comisionPct,
			monto_comision: comisionMonto,
			monto_cobrado: totalCobrado,
			referencia: concepto.requiere_referencia ? pagoReferenciaInput.trim() : undefined
		});

		selectedConceptoPagoId = '';
		pagoReferenciaInput = '';

		// Recalcular saldo pendiente para el próximo abono si queda remanente
		const nuevoPagado = pagosRegistrados.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
		const nuevoRestante = Math.max(0, Number((montoTotal - nuevoPagado).toFixed(2)));
		pagoMontoInput = nuevoRestante;
	}

	function removePagoRegistrado(index: number) {
		pagosRegistrados.splice(index, 1);
		const nuevoPagado = pagosRegistrados.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
		const nuevoRestante = Math.max(0, Number((montoTotal - nuevoPagado).toFixed(2)));
		pagoMontoInput = nuevoRestante;
	}

	$effect(() => {
		if (form?.success) {
			if (form.action === 'createVenta') {
				if (form.codigo_venta && !form.codigo_venta.startsWith('BOR-')) {
					toast.success(`Venta ${form.codigo_venta} procesada exitosamente`);
				} else {
					toast.success('Borrador de venta guardado exitosamente (sin código asignado)');
				}
				tick().then(() => {
					isPagoModalOpen = false;
					resetForm();
				});
			} else if (form.action === 'createClientFromVenta') {
				toast.success('Cliente creado exitosamente');
				if (form.newClient) {
					addClientesToPool([form.newClient as ProfileWithRelations], true);
				}
				if (form.newClientId) {
					if (targetClientRoleForCreation === 'origen') {
						clienteOrigenId = String(form.newClientId);
					} else {
						clienteDestinoId = String(form.newClientId);
					}
				}
				tick().then(() => {
					isCreateClientOpen = false;
				});
			} else if (form.action === 'updateClientFromVenta') {
				toast.success('Información del cliente actualizada');
				if (form.updatedClient) {
					addClientesToPool([form.updatedClient as ProfileWithRelations], true);
				}
				tick().then(() => {
					isEditClientOpen = false;
				});
			}
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	function resetForm() {
		clienteOrigenId = '';
		clienteDestinoId = '';
		productoId = '';
		tipoTarifaId = '';
		zonaId = '';
		paisDestinoId = '';
		peso = 1;
		pesoReportado = 1;
		alto = 0;
		ancho = 0;
		largo = 0;
		cantidadCajasUnica = 1;
		requiereSeguro = false;
		valorDeclarado = 0;
		porcentajeSeguroManual = 0;
		cargosDescuentosAplicados = [];
		pagosRegistrados = [];
		articulosSeleccionados = [];
		syncValorDeclaradoFromArticulos();
	}

	function openDetail(v: VentaWithRelations) {
		selectedVentaDetail = v;
		isDetailOpen = true;
	}
</script>

<svelte:head>
	<title>Módulo de Ventas y Envíos | Sistema Logístico</title>
</svelte:head>

<div class="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
	<!-- Encabezado Principal -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2.5 bg-primary/10 text-primary rounded-xl">
				<ShoppingCart class="w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					{esVentaCajas ? 'Operación de Venta de Cajas (Sin Traslado)' : 'Operación de Ventas de Envíos'}
				</h1>
				<p class="text-xs text-muted-foreground">
					{esVentaCajas
						? 'Venta directa de cajas en tienda utilizando el precio de venta configurado en cada producto y descuento de inventario.'
						: 'Procesamiento interactivo de envíos, cotización con tarifas, cargos/descuentos y cobro mixto.'}
				</p>
			</div>
		</div>

		<Button href="/ventas/historial" variant="outline" class="gap-2">
			<FileText class="w-4 h-4" /> Historial de Ventas
		</Button>
	</div>

	<!-- BANNER DE EDICIÓN DE VENTA -->
	{#if editingVentaId && data.editingVenta}
		{#if data.editingVenta.estatus_venta === 'realizada'}
			<div class="flex items-center justify-between p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 text-xs">
				<div class="flex items-center gap-2 font-bold">
					<Calendar class="w-4 h-4 text-indigo-600" />
					Modificando Venta Cerrada / Procesada ({data.editingVenta.codigo_venta}) — Solo Administrador
				</div>
				<Button variant="outline" size="sm" href="/ventas/historial" class="text-xs h-7 border-indigo-500/40 hover:bg-indigo-500/20 font-semibold">
					Cancelar / Volver al Historial
				</Button>
			</div>
		{:else}
			<div class="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs">
				<div class="flex items-center gap-2 font-bold">
					<Edit class="w-4 h-4 text-amber-600" />
					Editando Operación de Venta en Borrador ({data.editingVenta.codigo_venta})
				</div>
				<Button variant="outline" size="sm" href="/ventas" class="text-xs h-7 border-amber-500/40 hover:bg-amber-500/20 font-semibold">
					Cancelar Edición / Crear Nueva
				</Button>
			</div>
		{/if}
	{/if}

	<!-- DISPOSICIÓN PRINCIPAL DE VENTAS 80% / 20% -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
		<!-- PANEL IZQUIERDO DE OPERACIÓN DE VENTA (Columna 80% = lg:col-span-9 o 100% para cliente) -->
		<div class={`order-2 lg:order-1 ${isCliente ? 'lg:col-span-12' : 'lg:col-span-9'} space-y-6`}>
			<form method="POST" action="?/createVenta" use:enhance class="space-y-6">
				<!-- Datos serializados para el servidor -->
				<input type="hidden" name="venta_id" value={editingVentaId || ''} />
				<input type="hidden" name="tipo_operacion" value={tipoOperacion} />
				<input type="hidden" name="cliente_origen_id" value={clienteOrigenId} />
				<input type="hidden" name="cliente_destino_id" value={esVentaCajas ? clienteOrigenId : clienteDestinoId} />
				<input type="hidden" name="producto_id" value={productoId} />
				<input type="hidden" name="tipo_tarifa_id" value={tipoTarifaId} />
				<input type="hidden" name="pais_destino_id" value={paisDestinoId} />
				<input type="hidden" name="peso" value={pesoFacturable} />
				<input type="hidden" name="peso_reportado" value={pesoReportado} />
				<input type="hidden" name="alto" value={alto} />
				<input type="hidden" name="ancho" value={ancho} />
				<input type="hidden" name="largo" value={largo} />
				<input type="hidden" name="peso_volumetrico" value={pesoVolumetric} />
				<input type="hidden" name="peso_cobrar" value={pesoFacturable} />
				<input type="hidden" name="requiere_seguro" value={String(esVentaCajas ? false : requiereSeguro)} />
				<input type="hidden" name="valor_declarado" value={esVentaCajas ? 0 : valorDeclarado} />
				<input type="hidden" name="porcentaje_seguro" value={esVentaCajas ? 0 : porcentajeSeguroAplicado} />
				<input type="hidden" name="tipo_entrega" value={esVentaCajas ? 'oficina' : tipoEntrega} />
				<input type="hidden" name="proveedor_id" value={esVentaCajas ? '' : proveedorId} />
				<input type="hidden" name="es_multiple_cajas" value={String(esMultipleCajas)} />
				<input type="hidden" name="total_cajas" value={esMultipleCajas ? cajas.length : (esVentaCajas ? Math.max(1, Number(cantidadCajasUnica) || 1) : 1)} />
				<input type="hidden" name="cajas_json" value={JSON.stringify(cajasPayload)} />
				<input type="hidden" name="descontar_inventario_caja" value={String(descontarInventarioCaja)} />
				<input type="hidden" name="cargos_descuentos_json" value={JSON.stringify(cargosDescuentosPayload)} />
				<input type="hidden" name="pagos_json" value={JSON.stringify(pagosRegistrados)} />
				<input type="hidden" name="articulos_json" value={JSON.stringify(esVentaCajas ? [] : articulosSeleccionados)} />

				<!-- SELECTOR DE MODALIDAD DE OPERACIÓN (SOLO OPERADORES / ADMIN) -->
				{#if !isCliente}
					<div class="p-3.5 rounded-xl border-2 border-primary/20 bg-card shadow-xs space-y-2.5">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<span class="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
								<Boxes class="w-4 h-4 text-primary" /> Modalidad de Operación de Venta
							</span>
							<Badge variant={esVentaCajas ? 'default' : 'outline'} class={esVentaCajas ? 'bg-amber-600 text-white text-[10px] font-bold uppercase' : 'text-[10px] font-bold uppercase text-primary border-primary/40'}>
								{esVentaCajas ? '📦 MODO VENTA DE CAJAS (SIN TRASLADO)' : '🚚 MODO SERVICIO DE TRASLADO / ENVÍO'}
							</Badge>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<button
								type="button"
								onclick={() => { tipoOperacion = 'envio'; }}
								class={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
									!esVentaCajas
										? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
										: 'border-border bg-muted/20 hover:bg-muted/40 opacity-80'
								}`}
							>
								<div class={`p-2 rounded-lg shrink-0 ${!esVentaCajas ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
									<Truck class="w-4 h-4" />
								</div>
								<div>
									<span class="text-xs font-bold block uppercase text-foreground">🚚 Servicio de Traslado / Envío</span>
									<span class="text-[11px] text-muted-foreground leading-tight block mt-0.5">
										Operación logística completa con remitente, consignatario, tarifa por destino, peso y declaración de aduana.
									</span>
								</div>
							</button>

							<button
								type="button"
								onclick={() => { tipoOperacion = 'venta_cajas'; }}
								class={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
									esVentaCajas
										? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500 shadow-xs'
										: 'border-border bg-muted/20 hover:bg-muted/40 opacity-80'
								}`}
							>
								<div class={`p-2 rounded-lg shrink-0 ${esVentaCajas ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
									<Boxes class="w-4 h-4" />
								</div>
								<div>
									<span class="text-xs font-bold block uppercase text-foreground">📦 Venta de Cajas (Sin Traslado)</span>
									<span class="text-[11px] text-muted-foreground leading-tight block mt-0.5">
										Venta directa de cajas en tienda usando el Precio de Venta configurado en el Producto (sin destino ni aduana).
									</span>
								</div>
							</button>
						</div>
					</div>
				{/if}

				<!-- Campo Visible: Fecha de Registro de Venta (Solo Administrador puede modificarla) -->
				<div class="p-4 rounded-xl border bg-card/80 backdrop-blur shadow-sm space-y-3">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
						<div class="flex items-center gap-2">
							<Calendar class="w-4 h-4 text-primary" />
							<span class="text-xs font-bold uppercase tracking-wider text-foreground">
								Fecha de Venta (Registro)
							</span>
							{#if isAdmin}
								<Badge variant="default" class="text-[10px] uppercase font-bold tracking-tight bg-primary text-primary-foreground">
									Editable por Administrador
								</Badge>
							{:else}
								<Badge variant="outline" class="text-[10px] uppercase font-medium text-muted-foreground flex items-center gap-1">
									<Lock class="w-2.5 h-2.5" /> Solo Lectura
								</Badge>
							{/if}
						</div>

						<span class="text-[11px] text-muted-foreground">
							{#if isAdmin}
								Puedes cambiar la fecha y hora oficial de emisión de esta venta.
							{:else}
								Fecha de emisión asignada automáticamente por el sistema.
							{/if}
						</span>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
						<div class="space-y-1 sm:col-span-1">
							<Label for="fecha_venta" class="text-[11px] font-semibold text-muted-foreground block">
								Fecha y Hora de Emisión:
							</Label>
							{#if isAdmin}
								<Input
									type="datetime-local"
									id="fecha_venta"
									name="fecha_venta"
									bind:value={fechaVenta}
									class="h-9 text-xs font-mono bg-background border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary font-bold text-foreground"
								/>
							{:else}
								<Input
									type="datetime-local"
									id="fecha_venta"
									value={fechaVenta}
									disabled
									class="h-9 text-xs font-mono bg-muted/60 text-muted-foreground cursor-not-allowed opacity-80"
								/>
							{/if}
						</div>

						<div class="space-y-1 sm:col-span-1 lg:col-span-2 text-xs">
							<div class="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border text-[11px]">
								{#if isAdmin}
									<span class="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 shrink-0">
										<CheckCircle2 class="w-3.5 h-3.5" /> Rol Administrador Activo:
									</span>
									<span class="text-muted-foreground truncate">
										La venta se guardará con la fecha indicada: <strong class="font-mono text-foreground">{fechaVenta ? new Date(fechaVenta).toLocaleString() : 'Fecha actual'}</strong>
									</span>
								{:else}
									<span class="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1 shrink-0">
										<Lock class="w-3.5 h-3.5" /> Bloqueado:
									</span>
									<span class="text-muted-foreground truncate">
										Solo usuarios con rol Administrador tienen autorización para modificar la fecha de registro.
									</span>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- PASO 1: Remitente, Consignatario y Transporte (ACORDEÓN CON SEMÁFORO) -->
				<Card>
					<CardHeader
						onclick={() => (paso1Open = !paso1Open)}
						class="pb-3 cursor-pointer hover:bg-muted/20 transition-colors border-b select-none flex flex-row items-center justify-between"
					>
						<div class="flex items-center gap-3">
							<!-- Semáforo Indicador -->
							<div class="flex items-center gap-1.5 shrink-0" title={`Estado Paso 1: ${paso1Semaforo.toUpperCase()}`}>
								{#if paso1Semaforo === 'verde'}
									<span class="relative flex h-3 w-3">
										<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
										<span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
									</span>
								{:else if paso1Semaforo === 'amarillo'}
									<span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
								{:else}
									<span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
								{/if}
							</div>

							<CardTitle class="text-base font-semibold flex items-center gap-2">
								<UserCheck class="w-4 h-4 text-primary" />
								{esVentaCajas ? '1. Datos del Cliente Comprador' : '1. Remitente, Consignatario y Transporte'}
							</CardTitle>
						</div>

						<div class="flex items-center gap-2">
							{#if paso1Semaforo === 'verde'}
								<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] uppercase font-bold">
									COMPLETO
								</Badge>
							{:else if paso1Semaforo === 'amarillo'}
								<Badge class="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] uppercase font-bold">
									INCOMPLETO
								</Badge>
							{:else}
								<Badge class="bg-rose-500/10 text-rose-700 border-rose-500/30 text-[10px] uppercase font-bold">
									REQUERIDO
								</Badge>
							{/if}

							<Button type="button" variant="ghost" size="icon" class="h-7 w-7">
								{#if paso1Open}
									<ChevronUp class="w-4 h-4 text-muted-foreground" />
								{:else}
									<ChevronDown class="w-4 h-4 text-muted-foreground" />
								{/if}
							</Button>
						</div>
					</CardHeader>

					{#if paso1Open}
						<CardContent class="space-y-6 pt-4">
							<div class={`grid grid-cols-1 ${esVentaCajas ? '' : 'sm:grid-cols-2'} gap-6`}>
								<!-- Remitente (Origen) / Cliente Comprador -->
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<Label class="text-xs font-semibold">
											{esVentaCajas ? 'Cliente Comprador *' : 'Cliente Origen (Remitente) *'}
										</Label>
										<Button type="button" variant="ghost" size="sm" onclick={() => openCreateClient('origen')} class="h-7 text-xs gap-1 text-primary">
											<UserPlus class="w-3.5 h-3.5" /> + Nuevo
										</Button>
									</div>

									{#if isCliente}
										<div class="h-10 px-3 py-2 rounded-md border bg-muted/40 text-xs font-bold uppercase flex items-center justify-between">
											<span>{data.user?.nombre_completo || 'REMITENTE LOGUEADO'} [{data.user?.codigo || 'S/C'}]</span>
											<Badge variant="secondary" class="text-[9px]">TÚ (REMITENTE)</Badge>
										</div>
										<input type="hidden" name="cliente_origen_id" value={clienteOrigenId} />
									{:else}
										<!-- Buscador Multicriterio de Remitente (Nombre, Celular, Teléfono o Código) -->
										<div class="relative">
											{#if isSearchingOrigen}
												<Loader2 class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary animate-spin pointer-events-none" />
											{:else}
												<Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
											{/if}
											<Input
												type="text"
												placeholder={esVentaCajas ? 'Buscar cliente comprador por nombre, celular o código...' : 'Buscar remitente por nombre, celular o código...'}
												value={searchOrigenQuery}
												oninput={(e) => handleSearchOrigen(e.currentTarget.value)}
												class="h-8 pl-8 pr-7 text-xs bg-muted/20"
											/>
											{#if searchOrigenQuery}
												<button
													type="button"
													onclick={() => { searchOrigenQuery = ''; }}
													class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold p-0.5"
													title="Limpiar búsqueda"
												>
													✕
												</button>
											{/if}
										</div>

										<select
											bind:value={clienteOrigenId}
											required
											class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-xs uppercase font-medium"
										>
											<option value="">
												{searchOrigenQuery.trim()
													? `-- ${filteredClientesOrigen.length} CLIENTES ENCONTRADOS --`
													: (esVentaCajas ? '-- SELECCIONAR CLIENTE COMPRADOR --' : '-- SELECCIONAR REMITENTE --')}
											</option>
											{#each filteredClientesOrigen as c}
												<option value={c.id}>
													{c.nombre_completo.toUpperCase()} [{c.codigo || 'S/C'}]{c.numero_celular ? ` - CEL: ${c.numero_celular}` : (c.telefono ? ` - TEL: ${c.telefono}` : '')}
												</option>
											{/each}
										</select>
									{/if}

									<!-- Tarjeta Informativa del Remitente Seleccionado -->
									{#if clienteOrigenObj}
										<div class="p-3.5 rounded-lg border bg-card/60 shadow-sm space-y-2 text-xs relative group">
											<div class="flex items-center justify-between border-b pb-2">
												<span class="font-bold text-foreground flex items-center gap-1.5 uppercase">
													<UserCheck class="w-3.5 h-3.5 text-primary" /> {clienteOrigenObj.nombre_completo}
												</span>
												<div class="flex items-center gap-1">
													<Badge variant="outline" class="font-mono text-[10px]">{clienteOrigenObj.codigo || 'S/C'}</Badge>
													<Button type="button" variant="ghost" size="icon" class="h-6 w-6" title="Editar Cliente" onclick={() => openEditClient(clienteOrigenObj)}>
														<Edit class="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
													</Button>
													{#if !isCliente}
														<Button
															type="button"
															variant="ghost"
															size="icon"
															class="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															title="Quitar Cliente Seleccionado"
															onclick={() => {
																clienteOrigenId = '';
																searchOrigenQuery = '';
															}}
														>
															<X class="w-3.5 h-3.5" />
														</Button>
													{/if}
												</div>
											</div>

											<div class="grid grid-cols-1 gap-1 text-muted-foreground">
												<div class="flex items-center gap-1.5"><Mail class="w-3 h-3 text-muted-foreground shrink-0" /> {clienteOrigenObj.email || 'SIN CORREO'}</div>
												<div class="flex items-center gap-1.5"><Phone class="w-3 h-3 text-muted-foreground shrink-0" /> {clienteOrigenObj.telefono || clienteOrigenObj.numero_celular || 'SIN TELÉFONO'}</div>
												<div class="flex items-center gap-1.5"><MapPin class="w-3 h-3 text-muted-foreground shrink-0" /> {clienteOrigenObj.pais?.nombre || 'SIN PAÍS'} - {clienteOrigenObj.direccion_1 || 'SIN DIRECCIÓN'}</div>
												{#if clienteOrigenObj.cedula}
													<div class="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400"><IdCard class="w-3 h-3 shrink-0" /> Cédula / RIF: {clienteOrigenObj.cedula}</div>
												{/if}
											</div>
										</div>
									{/if}
								</div>

								{#if !esVentaCajas}
									<!-- Consignatario (Destino) -->
									<div class="space-y-3">
										<div class="flex items-center justify-between">
											<Label class="text-xs font-semibold">Cliente Destino (Consignatario) *</Label>
											<Button type="button" variant="ghost" size="sm" onclick={() => openCreateClient('destino')} class="h-7 text-xs gap-1 text-primary">
												<UserPlus class="w-3.5 h-3.5" /> + Nuevo
											</Button>
										</div>

										{#if isCliente}
											<!-- Casilla exclusiva para clientes: Colocar destinatario en tienda -->
											<div class="flex items-center gap-2 p-2.5 rounded-md border bg-muted/20">
												<input type="checkbox" id="v_dest_tienda" bind:checked={destinatarioEnTienda} class="w-4 h-4 rounded text-primary" />
												<Label for="v_dest_tienda" class="text-xs font-bold cursor-pointer">
													🏢 Colocar destinatario en tienda (Retiro/Entrega en Tienda)
												</Label>
											</div>
											<input type="hidden" name="destinatario_en_tienda" value={destinatarioEnTienda ? 'true' : 'false'} />
										{/if}

										{#if destinatarioEnTienda}
											<div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
												<Sparkles class="w-4 h-4 text-blue-600 shrink-0" />
												<span>Destinatario en tienda seleccionado: El paquete será retirado o entregado directamente en la oficina o tienda receptora.</span>
											</div>
										{:else}
											<!-- Buscador Multicriterio de Consignatario (Nombre, Celular, Teléfono o Código) -->
											<div class="relative">
												{#if isSearchingDestino}
													<Loader2 class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary animate-spin pointer-events-none" />
												{:else}
													<Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
												{/if}
												<Input
													type="text"
													placeholder="Buscar consignatario por nombre, celular o código..."
													value={searchDestinoQuery}
													oninput={(e) => handleSearchDestino(e.currentTarget.value)}
													class="h-8 pl-8 pr-7 text-xs bg-muted/20"
												/>
												{#if searchDestinoQuery}
													<button
														type="button"
														onclick={() => { searchDestinoQuery = ''; }}
														class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold p-0.5"
														title="Limpiar búsqueda"
													>
														✕
													</button>
												{/if}
											</div>

											<select
												bind:value={clienteDestinoId}
												required={!destinatarioEnTienda && !esVentaCajas}
												class="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-xs uppercase font-medium"
											>
												<option value="">
													{searchDestinoQuery.trim()
														? `-- ${filteredClientesDestino.length} CONSIGNATARIOS ENCONTRADOS --`
														: '-- SELECCIONAR CONSIGNATARIO --'}
												</option>
												{#each filteredClientesDestino as c}
													<option value={c.id}>
														{#if isCliente}
															{c.nombre_completo.toUpperCase()} - {c.ciudad ? c.ciudad.toUpperCase() : 'SIN CIUDAD'}, {c.pais?.nombre ? c.pais.nombre.toUpperCase() : 'SIN PAÍS'} (CP: {c.codigo_postal || 'S/N'})
														{:else}
															{c.nombre_completo.toUpperCase()} [{c.codigo || 'S/C'}]{c.numero_celular ? ` - CEL: ${c.numero_celular}` : (c.telefono ? ` - TEL: ${c.telefono}` : '')}
														{/if}
													</option>
												{/each}
											</select>
										{/if}

										<!-- Tarjeta Informativa del Consignatario Seleccionado -->
										{#if clienteDestinoObj && !destinatarioEnTienda}
											<div class="p-3.5 rounded-lg border bg-card/60 shadow-sm space-y-2 text-xs relative group">
												<div class="flex items-center justify-between border-b pb-2">
													<span class="font-bold text-foreground flex items-center gap-1.5 uppercase">
														<UserCheck class="w-3.5 h-3.5 text-primary" /> {clienteDestinoObj.nombre_completo}
													</span>
													<div class="flex items-center gap-1">
														{#if !isCliente}
															<Badge variant="outline" class="font-mono text-[10px]">{clienteDestinoObj.codigo || 'S/C'}</Badge>
															<Button type="button" variant="ghost" size="icon" class="h-6 w-6" title="Editar Cliente Consignatario" onclick={() => openEditClient(clienteDestinoObj)}>
																<Edit class="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
															</Button>
														{/if}
														<Button
															type="button"
															variant="ghost"
															size="icon"
															class="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															title="Quitar Cliente Consignatario Seleccionado"
															onclick={() => {
																clienteDestinoId = '';
																searchDestinoQuery = '';
															}}
														>
															<X class="w-3.5 h-3.5" />
														</Button>
													</div>
												</div>

												{#if isCliente}
													<!-- Para el cliente: Muestra SOLO Nombre, Ciudad, País y Zona Postal -->
													<div class="grid grid-cols-1 gap-1 text-muted-foreground">
														<div class="flex items-center gap-1.5 font-semibold text-foreground">
															<MapPin class="w-3.5 h-3.5 text-primary shrink-0" />
															{clienteDestinoObj.ciudad || 'SIN CIUDAD'}, {clienteDestinoObj.pais?.nombre || 'SIN PAÍS'}
														</div>
														<div class="flex items-center gap-1.5">
															<Tag class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
															Zona / Código Postal: <span class="font-bold text-foreground font-mono">{clienteDestinoObj.codigo_postal || 'SIN CÓDIGO POSTAL'}</span>
														</div>
													</div>
												{:else}
													<!-- Para el operador: Muestra detalles completos de contacto e identificación -->
													<div class="grid grid-cols-1 gap-1 text-muted-foreground">
														<div class="flex items-center gap-1.5"><Mail class="w-3 h-3 text-muted-foreground shrink-0" /> {clienteDestinoObj.email || 'SIN CORREO'}</div>
														<div class="flex items-center gap-1.5"><Phone class="w-3 h-3 text-muted-foreground shrink-0" /> {clienteDestinoObj.telefono || clienteDestinoObj.numero_celular || 'SIN TELÉFONO'}</div>
														<div class="flex items-center gap-1.5"><MapPin class="w-3 h-3 text-muted-foreground shrink-0" /> {clienteDestinoObj.pais?.nombre || 'SIN PAÍS'} - {clienteDestinoObj.direccion_1 || 'SIN DIRECCIÓN'}</div>
														{#if clienteDestinoObj.cedula}
															<div class="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400"><IdCard class="w-3 h-3 shrink-0" /> Cédula / RIF: {clienteDestinoObj.cedula}</div>
														{/if}
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>

							{#if !esVentaCajas}
								<!-- Configuración de Proveedor de Transporte y Tipo de Entrega en Destino -->
								<div class="border-t pt-4 space-y-4">
									<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
										<Label class="text-xs font-bold flex items-center gap-1.5 text-primary">
											<Truck class="w-4 h-4" /> {isCliente ? 'Tipo de Entrega en Destino *' : 'Empresa de Transporte y Tipo de Entrega en Destino *'}
										</Label>
										<div class="flex items-center gap-4">
											<label class="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
												<input type="radio" name="tipo_entrega_radio" value="domicilio" bind:group={tipoEntrega} class="text-primary focus:ring-primary h-3.5 w-3.5" />
												🏠 DOMICILIO (POR DEFECTO)
											</label>
											<label class="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
												<input type="radio" name="tipo_entrega_radio" value="oficina" bind:group={tipoEntrega} class="text-primary focus:ring-primary h-3.5 w-3.5" />
												🏢 RETIRO EN OFICINA / OCURRE
											</label>
										</div>
									</div>

									<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{#if !isCliente}
											<div class="space-y-1.5">
												<Label class="text-xs font-bold block">Empresa Proveedora / Transporte *</Label>
												<select bind:value={proveedorId} required={!esVentaCajas} class="w-full h-9 px-2.5 rounded-md border text-xs uppercase bg-background">
													<option value="">-- SELECCIONAR PROVEEDOR --</option>
													{#each proveedores as p}
														<option value={String(p.id)}>
															{p.nombre} {p.tiene_api ? '(API HABILITADA)' : '(SIN API)'}
														</option>
													{/each}
												</select>
											</div>
										{/if}

										<div class={`space-y-1.5 ${isCliente ? 'sm:col-span-2' : ''}`}>
											<Label class="text-xs font-bold block">Dirección Final de Entrega en Destino</Label>
											<div class="p-2.5 rounded-md border bg-background text-xs space-y-1 min-h-[50px] flex flex-col justify-center">
												<div class="flex items-center justify-between gap-2">
													<span class="font-semibold uppercase text-[11px] text-foreground flex items-center gap-1">
														<MapPin class="w-3.5 h-3.5 text-primary shrink-0" />
														{direccionEntrega || (isCliente ? 'DIRECCIÓN DE ENTREGA REGISTRADA' : 'SELECCIONE PROVEEDOR / CLIENTE DESTINO')}
													</span>
													{#if tipoEntrega === 'oficina' && proveedorObj && !isCliente}
														{#if proveedorObj.tiene_api}
															<Badge class="bg-blue-500/10 text-blue-700 border-blue-500/30 text-[9px] font-extrabold uppercase shrink-0">
																<Sparkles class="w-2.5 h-2.5 text-blue-600" /> API {proveedorObj.nombre}
															</Badge>
														{:else}
															<Badge variant="outline" class="text-[9px] uppercase font-bold shrink-0">
																MAESTRO PROVEEDOR
															</Badge>
														{/if}
													{:else if tipoEntrega === 'domicilio'}
														<Badge variant="outline" class="text-[9px] uppercase font-bold shrink-0">
															DOMICILIO CLIENTE
														</Badge>
													{/if}
												</div>
											</div>
										</div>

										{#if !isCliente}
											{#if proveedorObj?.tiene_api && tipoEntrega === 'oficina'}
												<div class="sm:col-span-2 space-y-2 border-t pt-3">
													<!-- Selector de Ciudades desde la API (Requerimiento 5) -->
													{#if ciudadesProveedorApi.length > 0}
														<div class="space-y-1">
															<Label class="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
																<Sparkles class="w-3.5 h-3.5" /> Ciudad de Destino Oficial (API {proveedorObj.nombre}):
															</Label>
															<select
																bind:value={selectedCiudadApi}
																class="w-full h-9 px-2.5 rounded-md border border-blue-300 dark:border-blue-700 text-xs font-semibold uppercase bg-blue-50/40 dark:bg-blue-950/20"
															>
																{#each ciudadesProveedorApi as cd}
																	<option value={cd}>{cd}</option>
																{/each}
															</select>
														</div>
													{/if}

													{#if zoomOficinasDisponibles.length > 0}
														<div class="space-y-1 pt-1">
															<Label class="text-xs font-bold block text-blue-600 dark:text-blue-400 flex items-center gap-1">
																<MapPin class="w-3.5 h-3.5" /> Seleccionar Oficina de {proveedorObj.nombre} en {selectedCiudadApi || clienteDestinoObj?.ciudad || 'Ciudad Destino'}:
															</Label>
															<select
																bind:value={selectedZoomOficinaCodigo}
																onchange={() => {
																	const selectedOf = zoomOficinasDisponibles.find(o => o.codigo === selectedZoomOficinaCodigo);
																	if (selectedOf) direccionEntrega = `${selectedOf.nombre}: ${selectedOf.direccion}`;
																}}
																class="w-full h-9 px-2.5 rounded-md border border-blue-300 dark:border-blue-700 text-xs font-semibold uppercase bg-blue-50/30 dark:bg-blue-950/20"
															>
																{#each zoomOficinasDisponibles as of}
																	<option value={of.codigo}>
																		{of.nombre} - {of.direccion}
																	</option>
																{/each}
															</select>
														</div>
													{/if}
												</div>
											{/if}

											{#if proveedorObj && !proveedorObj.tiene_api && tipoEntrega === 'oficina'}
												<!-- Selector de Múltiples Direcciones del Proveedor (Requerimiento 4) -->
												{#if proveedorObj.direcciones && proveedorObj.direcciones.length > 0}
													<div class="sm:col-span-2 space-y-1.5 border-t pt-3">
														<Label class="text-xs font-bold text-primary flex items-center gap-1">
															<MapPin class="w-3.5 h-3.5" /> Seleccionar Sucursal / Oficina de Entrega de {proveedorObj.nombre}:
														</Label>
														<select
															bind:value={selectedProveedorDireccionId}
															onchange={() => {
																const d = proveedorObj?.direcciones?.find(dir => String(dir.id) === String(selectedProveedorDireccionId));
																if (d) direccionEntrega = `${d.titulo}: ${d.direccion}${d.ciudad ? ' (' + d.ciudad + ')' : ''}`;
															}}
															class="w-full h-9 px-2.5 rounded-md border text-xs font-semibold uppercase bg-background"
														>
															{#each proveedorObj.direcciones as dir}
																<option value={String(dir.id)}>
																	{dir.titulo.toUpperCase()}: {dir.direccion} {dir.ciudad ? `(${dir.ciudad})` : ''} {dir.es_principal ? '★ PRINCIPAL' : ''}
																</option>
															{/each}
														</select>
													</div>
												{/if}

												<div class="sm:col-span-2 space-y-1.5 border-t pt-3">
													<div class="flex items-center justify-between">
														<Label for="v_guia_manual" class="text-xs font-bold text-amber-700 flex items-center gap-1">
															<Truck class="w-3.5 h-3.5" /> Número de Guía del Proveedor (Manual) *
														</Label>
														<span class="text-[10px] text-muted-foreground font-mono">Máximo 22 números</span>
													</div>
													<Input
														id="v_guia_manual"
														name="guia_proveedor"
														bind:value={guiaProveedorManual}
														required={!esVentaCajas}
														maxlength={22}
														placeholder="Ej: 1234567890123456789012"
														class="text-xs font-mono font-bold uppercase tracking-wider"
														oninput={(e) => {
															const input = e.currentTarget as HTMLInputElement;
															input.value = input.value.replace(/[^0-9]/g, '').slice(0, 22);
															guiaProveedorManual = input.value;
														}}
													/>
												</div>
											{:else if proveedorObj?.tiene_api}
												<input type="hidden" name="guia_proveedor" value={guiaProveedorManual} />
											{/if}
										{/if}
									</div>
								</div>
							{/if}
						</CardContent>
					{/if}
				</Card>

				<!-- PASO 2: Selección de Tipo de Tarifa, Producto y Especificaciones de Carga (ACORDEÓN CON SEMÁFORO) -->
				<Card>
					<CardHeader
						onclick={() => (paso2Open = !paso2Open)}
						class="pb-3 cursor-pointer hover:bg-muted/20 transition-colors border-b select-none flex flex-row items-center justify-between"
					>
						<div class="flex items-center gap-3">
							<!-- Semáforo Indicador -->
							<div class="flex items-center gap-1.5 shrink-0" title={`Estado Paso 2: ${paso2Semaforo.toUpperCase()}`}>
								{#if paso2Semaforo === 'verde'}
									<span class="relative flex h-3 w-3">
										<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
										<span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
									</span>
								{:else if paso2Semaforo === 'amarillo'}
									<span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
								{:else}
									<span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
								{/if}
							</div>

							<CardTitle class="text-base font-semibold flex items-center gap-2">
								<PackageCheck class="w-4 h-4 text-primary" />
								{isCliente
									? '2. Seguro de Envío'
									: esVentaCajas
										? '2. Selección de Caja(s) / Producto y Cantidad'
										: '2. Tipo de Tarifa, Producto y Especificaciones de Carga'}
							</CardTitle>
						</div>

						<div class="flex items-center gap-2">
							{#if paso2Semaforo === 'verde'}
								<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] uppercase font-bold">
									COMPLETO
								</Badge>
							{:else if paso2Semaforo === 'amarillo'}
								<Badge class="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] uppercase font-bold">
									INCOMPLETO
								</Badge>
							{:else}
								<Badge class="bg-rose-500/10 text-rose-700 border-rose-500/30 text-[10px] uppercase font-bold">
									REQUERIDO
								</Badge>
							{/if}

							<Button type="button" variant="ghost" size="icon" class="h-7 w-7">
								{#if paso2Open}
									<ChevronUp class="w-4 h-4 text-muted-foreground" />
								{:else}
									<ChevronDown class="w-4 h-4 text-muted-foreground" />
								{/if}
							</Button>
						</div>
					</CardHeader>

					{#if paso2Open}
						{#if isCliente}
							<CardContent class="space-y-4 pt-4">
								<input type="hidden" name="tipo_tarifa_id" value={tipoTarifaId} />
								<input type="hidden" name="producto_id" value={productoId} />
								<input type="hidden" name="peso_reportado" value={pesoReportado} />

								<div class="space-y-3">
									<Label class="text-xs font-bold text-primary flex items-center gap-1.5">
										<ShieldCheck class="w-4 h-4" /> Configuración de Seguro de Envío
									</Label>

									<div class="space-y-3 border p-4 rounded-lg bg-muted/20">
										<div class="flex items-center gap-2">
											<input type="checkbox" id="v_seguro_cli" bind:checked={requiereSeguro} class="w-4 h-4 rounded text-primary" />
											<Label for="v_seguro_cli" class="text-xs font-bold cursor-pointer">¿Desea solicitar seguro para este envío?</Label>
										</div>

										{#if requiereSeguro}
											<div class="space-y-2 pt-2">
												<Label for="v_declarado_cli" class="text-xs font-semibold">Valor Declarado del Envío ($)</Label>
												<Input id="v_declarado_cli" name="valor_declarado" type="number" step="0.01" min="0" bind:value={valorDeclarado} placeholder="0.00" class="text-xs font-mono font-bold max-w-sm" />
												<input type="hidden" name="porcentaje_seguro" value={porcentajeSeguroManual} />
											</div>
										{/if}
									</div>
								</div>
							</CardContent>
						{:else}
							<CardContent class="space-y-4 pt-4">
								<!-- Selector de Múltiples Cajas -->
								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-primary/5 border-primary/20">
									<div class="flex items-center gap-3">
										<input 
											type="checkbox" 
											id="v_multiples_cajas" 
											bind:checked={esMultipleCajas} 
											onchange={toggleMultipleCajas}
											class="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer" 
										/>
										<Label for="v_multiples_cajas" class="cursor-pointer">
											<span class="text-xs font-bold text-foreground flex items-center gap-1.5">
												<Boxes class="w-4 h-4 text-primary" />
												{esVentaCajas ? 'Combinar Diferentes Modelos de Cajas en esta Venta' : 'Enviar Múltiples Cajas en esta Venta'}
											</span>
											<span class="text-[11px] text-muted-foreground block">
												{esVentaCajas
													? 'Active si el cliente compra cajas de diferentes medidas/precios en una misma operación'
													: 'Active para especificar tarifa, producto, pesos y declaración de artículos por cada caja (001/00N)'}
											</span>
										</Label>
									</div>
									{#if esMultipleCajas}
										<div class="flex items-center gap-2 bg-background p-1.5 px-3 rounded-lg border shadow-xs">
											<Label for="v_num_cajas" class="text-xs font-bold text-foreground whitespace-nowrap">N° de Cajas:</Label>
											<Input 
												id="v_num_cajas" 
												type="number" 
												min="2" 
												max="50" 
												bind:value={numeroCajasInput} 
												oninput={() => syncCajas(numeroCajasInput)}
												class="w-20 h-8 text-xs font-mono font-bold text-center" 
											/>
											<Badge variant="secondary" class="font-mono text-[10px] font-bold">
												{cajas.length} Cajas
											</Badge>
										</div>
									{/if}
								</div>

								{#if esMultipleCajas}
									<!-- MODO MÚLTIPLES CAJAS -->
									<div class="space-y-4 pt-1">
										<div class="flex items-center justify-between">
											<span class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
												<Boxes class="w-3.5 h-3.5 text-primary" /> Especificación Individual de Cajas ({cajas.length} Cajas)
											</span>
											<Button type="button" variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={addCaja}>
												<Plus class="w-3.5 h-3.5" /> Agregar Caja
											</Button>
										</div>

										<div class="space-y-3">
											{#each cajas as caja, cIdx}
												{@const calc = getCajaCalculos(caja)}
												{@const cProd = productos.find((p) => String(p.id) === String(caja.producto_id))}
												{@const cLimitInfo = getLimiteEfectivo(cProd, paisDestinoObj)}
												{@const cIsSobrepeso = !esVentaCajas && cLimitInfo.limite > 0 && calc.pesoFacturable > cLimitInfo.limite}
												<div class="p-4 rounded-xl border bg-card/70 shadow-xs space-y-3.5 relative group">
													<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 gap-2">
														<div class="flex items-center gap-2 flex-wrap">
															<Badge variant="default" class="font-mono font-extrabold text-xs px-2.5 py-0.5 bg-primary text-primary-foreground">
																📦 CAJA {caja.numero}
															</Badge>
															<span class="text-xs text-muted-foreground font-semibold">Caja {cIdx + 1} de {cajas.length}</span>
															{#if !isCliente}
																<label class="flex items-center gap-1.5 cursor-pointer select-none bg-background px-2 py-0.5 rounded-md border text-xs">
																	<input
																		type="checkbox"
																		bind:checked={caja.descontar_inventario}
																		class="w-3.5 h-3.5 rounded text-primary focus:ring-primary cursor-pointer"
																	/>
																	<span class="font-semibold text-[11px] {caja.descontar_inventario !== false ? 'text-foreground' : 'text-amber-600 dark:text-amber-400 font-bold'}">
																		Descontar inventario
																	</span>
																</label>
																{#if caja.descontar_inventario === false}
																	{@const cPrecioVenta = getPrecioVentaProducto(cProd)}
																	<Badge variant="outline" class="text-[9px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-500/10">
																		SIN DESCUENTO DE STOCK (-${cPrecioVenta.toFixed(2)} DTO.)
																	</Badge>
																{/if}
															{/if}
														</div>
														{#if cajas.length > 2}
															<Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onclick={() => removeCaja(cIdx)} title="Eliminar Caja">
																<Trash2 class="w-3.5 h-3.5" />
															</Button>
														{/if}
													</div>

													{#if esVentaCajas}
														<!-- Fila para Venta de Cajas (Sin Traslado): Selección directa de Caja y Precio de Venta -->
														<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
															<div class="sm:col-span-2">
																<Label class="text-xs mb-1 block font-semibold">Caja / Producto *</Label>
																<select
																	bind:value={caja.producto_id}
																	onchange={() => handleCajaProductoChange(caja)}
																	required={esMultipleCajas}
																	class="w-full h-9 px-2.5 rounded-md border text-xs uppercase font-bold bg-background"
																>
																	<option value="">-- SELECCIONAR CAJA / PRODUCTO ({productos.length}) --</option>
																	{#each productos as p}
																		<option value={String(p.id)}>
																			[{p.codigo}] {p.descripcion.toUpperCase()} — ${getPrecioVentaProducto(p).toFixed(2)} (STOCK: {p.stock ?? 0})
																		</option>
																	{/each}
																</select>
															</div>

															<div>
																<Label class="text-xs mb-1 block font-semibold">Precio de Venta ($)</Label>
																<div class="h-9 px-2.5 rounded-md border bg-muted/40 text-xs font-bold flex items-center justify-between">
																	{#if cProd && calc.montoBase > 0}
																		<span class="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
																			${calc.montoBase.toFixed(2)}
																		</span>
																		<Badge variant="outline" class="text-[9px] font-bold text-emerald-700 border-emerald-300 bg-emerald-500/10">
																			PRECIO CAJA
																		</Badge>
																	{:else if cProd}
																		<span class="text-rose-600 text-[11px] font-bold">$0.00 (SIN PRECIO)</span>
																		<Badge variant="destructive" class="text-[9px]">CONFIGURAR</Badge>
																	{:else}
																		<span class="text-muted-foreground text-[11px] italic">SELECCIONE CAJA</span>
																	{/if}
																</div>
															</div>
														</div>
													{:else}
														<!-- Fila 1: Tipo de Tarifa, Producto y Tarifa Encontrada -->
														<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
															<div>
																<Label class="text-xs mb-1 block font-semibold">1. Tipo de Tarifa *</Label>
																<select
																	bind:value={caja.tipo_tarifa_id}
																	required={esMultipleCajas && !esVentaCajas}
																	class="w-full h-9 px-2.5 rounded-md border text-xs uppercase font-bold text-primary bg-background"
																>
																	<option value="">-- SELECCIONAR TIPO TARIFA --</option>
																	{#each tiposTarifa as tt}
																		<option value={String(tt.id)}>{tt.nombre.toUpperCase()}</option>
																	{/each}
																</select>
															</div>

															<div>
																<Label class="text-xs mb-1 block font-semibold">2. Producto *</Label>
																<select
																	bind:value={caja.producto_id}
																	onchange={() => handleCajaProductoChange(caja)}
																	disabled={!caja.tipo_tarifa_id}
																	required={esMultipleCajas}
																	class="w-full h-9 px-2.5 rounded-md border text-xs uppercase bg-background disabled:opacity-50"
																>
																	{#if !caja.tipo_tarifa_id}
																		<option value="">-- SELECCIONE PRIMERO TIPO TARIFA --</option>
																	{:else}
																		{@const prods = getProductosConTarifa(caja.tipo_tarifa_id)}
																		{#if prods.length === 0}
																			<option value="">-- NO HAY PRODUCTOS CON TARIFA ACTIVA --</option>
																		{:else}
																			<option value="">-- SELECCIONAR PRODUCTO ({prods.length}) --</option>
																			{#each prods as p}
																				<option value={String(p.id)}>[{p.codigo}] {p.descripcion.toUpperCase()}</option>
																			{/each}
																		{/if}
																	{/if}
																</select>
															</div>

															<div>
																<Label class="text-xs mb-1 block font-semibold">Tarifa Aplicada</Label>
																<div class="h-9 px-2.5 rounded-md border bg-muted/40 text-xs font-bold flex items-center justify-between">
																	{#if calc.tarifa && calc.esValida}
																		<span class="text-emerald-700 dark:text-emerald-400 font-mono">
																			${calc.tarifa.precio.toFixed(2)}{calc.esPorPeso ? '/lb' : ''}
																		</span>
																		{#if Number(calc.tarifa.precio) === 0 && calc.esPromocion}
																			<Badge variant="outline" class="text-[9px] font-bold text-emerald-700 border-emerald-300 bg-emerald-500/10">
																				PROMOCIÓN ($0)
																			</Badge>
																		{:else}
																			<Badge variant="outline" class="text-[9px] font-bold {calc.esPorPeso ? 'text-amber-700 border-amber-300 bg-amber-500/10' : 'text-emerald-700 border-emerald-300 bg-emerald-500/10'}">
																				{calc.esPorPeso ? 'POR PESO' : 'ÚNICA'}
																			</Badge>
																		{/if}
																	{:else if calc.tarifa && !calc.esValida}
																		<span class="text-rose-600 text-[11px] font-bold">$0.00 (NO PROMO)</span>
																		<Badge variant="destructive" class="text-[9px]">INVÁLIDA</Badge>
																	{:else if caja.tipo_tarifa_id && caja.producto_id}
																		<span class="text-rose-600 text-[11px] font-bold">SIN TARIFA</span>
																		<Badge variant="destructive" class="text-[9px]">ERROR</Badge>
																	{:else}
																		<span class="text-muted-foreground text-[11px] italic">PENDIENTE</span>
																	{/if}
																</div>
															</div>
														</div>
													{/if}

													{#if cProd && cProd.atributos_valores && Object.entries(cProd.atributos_valores).some(([k, v]) => !k.startsWith('__') && String(v ?? '').trim() !== '')}
														<div class="p-2.5 rounded-lg border bg-muted/30 flex items-center flex-wrap gap-2 text-xs">
															<span class="font-bold text-muted-foreground flex items-center gap-1 text-[11px]">
																<Tag class="w-3.5 h-3.5 text-primary" /> Atributos del Producto:
															</span>
															{#each Object.entries(cProd.atributos_valores).filter(([k]) => !k.startsWith('__')) as [k, v]}
																{#if String(v ?? '').trim() !== ''}
																	<Badge variant="outline" class="bg-background gap-1 text-[10px] py-0.5">
																		<span class="font-bold text-muted-foreground">{k}:</span>
																		<span class="font-extrabold text-foreground uppercase">{String(v)}</span>
																	</Badge>
																{/if}
															{/each}
														</div>
													{/if}

													{#if !esVentaCajas}
														<!-- Fila 2: Pesos y Dimensiones de la Caja -->
														<div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
															<div>
																<Label class="text-xs font-semibold">Peso Reportado (LB) *</Label>
																<Input type="number" step="0.1" min="0.1" bind:value={caja.peso_reportado} required={esMultipleCajas && !esVentaCajas} class="text-xs font-mono font-bold" />
															</div>
															<div>
																<Label class="text-xs font-semibold">Alto (in)</Label>
																<Input type="number" step="0.1" min="0" bind:value={caja.alto} class="text-xs font-mono" />
															</div>
															<div>
																<Label class="text-xs font-semibold">Ancho (in)</Label>
																<Input type="number" step="0.1" min="0" bind:value={caja.ancho} class="text-xs font-mono" />
															</div>
															<div>
																<Label class="text-xs font-semibold">Largo (in)</Label>
																<Input type="number" step="0.1" min="0" bind:value={caja.largo} class="text-xs font-mono" />
															</div>
														</div>

														<!-- Resumen de Costos y Pesos de la Caja -->
														<div class="p-2.5 px-3 rounded-lg bg-muted/30 border flex flex-wrap items-center justify-between gap-2 text-xs">
															<div class="flex items-center gap-4 flex-wrap">
																<span class="text-muted-foreground text-[11px]">Volumétrico: <b class="font-mono text-foreground">{calc.pesoVolumetrico} LB</b></span>
																<span class="text-muted-foreground text-[11px]">Facturable Mayor: <b class="font-mono text-primary font-bold">{calc.pesoFacturable} LB</b></span>
																{#if cLimitInfo.limite > 0}
																	<span class="text-[11px] {cIsSobrepeso ? 'text-destructive font-bold' : 'text-muted-foreground'}">
																		Límite: <b class="font-mono">{cLimitInfo.limite} LB</b> {cLimitInfo.esPersonalizado ? '(Producto)' : '(País)'}
																	</span>
																{/if}
															</div>
															<div class="text-right">
																<span class="text-[10px] text-muted-foreground uppercase mr-1">
																	Costo Base Caja {calc.esPorPeso ? `($${calc.tarifa?.precio}/lb x ${caja.peso_reportado || 0} lb)` : '(Fijo)'}:
																</span>
																<span class="font-mono font-extrabold text-foreground text-sm">${calc.montoBase.toFixed(2)}</span>
															</div>
															{#if cIsSobrepeso}
																<div class="w-full pt-1.5 text-destructive font-bold text-[11px] flex items-center gap-1 border-t">
																	<AlertTriangle class="w-3.5 h-3.5 shrink-0" />
																	Esta caja excede el límite máximo de {cLimitInfo.limite} LB ({cLimitInfo.esPersonalizado ? 'por capacidad de carga del producto' : 'tope del país'}).
																</div>
															{/if}
														</div>
													{/if}
												</div>
											{/each}
										</div>

										<!-- Resumen Consolidado de Todas las Cajas -->
										<div class="p-3.5 rounded-xl border bg-primary/10 border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
											<div class="flex items-center gap-2">
												<Boxes class="w-5 h-5 text-primary shrink-0" />
												<div>
													<span class="font-bold text-foreground block">Consolidado Total ({cajas.length} Cajas)</span>
													<span class="text-[11px] text-muted-foreground">
														{esVentaCajas ? 'Suma de precios de venta de las cajas seleccionadas' : 'Suma de pesos facturables y costos base de todas las cajas'}
													</span>
												</div>
											</div>
											<div class="flex items-center gap-4">
												{#if !esVentaCajas}
													<div class="text-right">
														<span class="text-[10px] text-muted-foreground uppercase block">Peso Total Facturable:</span>
														<span class="font-mono font-extrabold text-primary text-sm">{pesoFacturable} LB</span>
													</div>
												{/if}
												<div class="text-right {!esVentaCajas ? 'border-l pl-4' : ''}">
													<span class="text-[10px] text-muted-foreground uppercase block">Costo Base Total:</span>
													<span class="font-mono font-extrabold text-foreground text-base">${montoBase.toFixed(2)}</span>
												</div>
											</div>
										</div>

										{#if isSobrepeso}
											<div class="space-y-1 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
												{#each cajasSobrepeso as prob}
													<p class="text-xs font-bold text-destructive flex items-center gap-1">
														<AlertTriangle class="w-4 h-4 shrink-0" /> ¡Error! La Caja {prob.numero} ({prob.peso} LB) excede el límite máximo permitido ({prob.limite} LB{prob.esPersonalizado ? ' por capacidad de carga del producto' : ' para el país destino'}).
													</p>
												{/each}
											</div>
										{/if}

										{#if !esVentaCajas}
											<!-- Opción de Seguro de Envío -->
											<div class="space-y-2 border p-3 rounded-lg bg-muted/20">
												<div class="flex items-center gap-2">
													<input type="checkbox" id="v_seguro_multi" bind:checked={requiereSeguro} class="w-4 h-4 rounded text-primary" />
													<Label for="v_seguro_multi" class="text-xs font-bold cursor-pointer">¿Requiere Seguro de Envío?</Label>
												</div>

												{#if requiereSeguro}
													<div class="space-y-2 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
														<div>
															<Label for="v_declarado_multi" class="text-xs font-semibold">Valor Declarado ($)</Label>
															<Input id="v_declarado_multi" type="number" step="0.01" min="0" bind:value={valorDeclarado} placeholder="0.00" class="text-xs font-mono font-bold" />
														</div>
														<div>
															<Label for="v_porcentaje_seguro_multi" class="text-xs font-semibold">Porcentaje de Seguro (%)</Label>
															<Input id="v_porcentaje_seguro_multi" type="number" step="0.01" min="0" max="100" bind:value={porcentajeSeguroManual} placeholder="0.00" class="text-xs font-mono font-bold" />
														</div>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{:else}
									<!-- MODO CAJA ÚNICA (PREDETERMINADO) -->
									{#if esVentaCajas}
										<div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
											<!-- 1. Selección Directa de Caja / Producto -->
											<div class="sm:col-span-6">
												<Label class="text-xs mb-1 block font-semibold">1. Caja / Producto *</Label>
												<select
													bind:value={productoId}
													onchange={(e) => handleSingleProductoChange(e.currentTarget.value)}
													required={!esMultipleCajas}
													class="w-full h-9 px-2.5 rounded-md border text-xs uppercase font-bold bg-background"
												>
													<option value="">-- SELECCIONAR CAJA / PRODUCTO ({productos.length} DISPONIBLES) --</option>
													{#each productos as p}
														<option value={String(p.id)}>
															[{p.codigo}] {p.descripcion.toUpperCase()} — ${getPrecioVentaProducto(p).toFixed(2)} (STOCK: {p.stock ?? 0})
														</option>
													{/each}
												</select>
											</div>

											<!-- 2. Cantidad de Cajas -->
											<div class="sm:col-span-3">
												<Label for="v_cant_cajas" class="text-xs mb-1 block font-semibold">2. Cantidad de Cajas *</Label>
												<Input
													id="v_cant_cajas"
													type="number"
													min="1"
													max="500"
													step="1"
													bind:value={cantidadCajasUnica}
													class="h-9 text-xs font-mono font-bold text-center"
												/>
											</div>

											<!-- 3. Precio Unitario -->
											<div class="sm:col-span-3">
												<Label class="text-xs mb-1 block font-semibold">3. Precio Unitario ($)</Label>
												<div class="h-9 px-2.5 rounded-md border bg-muted/40 text-xs font-bold flex items-center justify-between">
													{#if productoObj}
														<span class="font-mono text-sm text-emerald-700 dark:text-emerald-400">
															${getPrecioVentaProducto(productoObj).toFixed(2)}
														</span>
														<Badge variant="outline" class="text-[9px] font-bold text-emerald-700 border-emerald-300 bg-emerald-500/10">
															C/U
														</Badge>
													{:else}
														<span class="text-muted-foreground text-[11px] italic">PENDIENTE</span>
													{/if}
												</div>
											</div>
										</div>

										{#if isTarifaInexistente}
											<div class="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold space-y-1">
												<div class="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-extrabold uppercase">
													<AlertTriangle class="w-4 h-4 shrink-0 text-rose-600" /> ¡Atención! Producto sin Precio de Venta Configurado ($0.00)
												</div>
												<p>El producto seleccionado tiene un Precio de Venta de $0.00. Por favor configure el Precio de Venta ($) en el catálogo de Productos antes de facturar.</p>
											</div>
										{:else if productoObj}
											<div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2">
												<span class="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
													<CheckCircle2 class="w-4 h-4" />
													Precio de Venta Aplicado: ${getPrecioVentaProducto(productoObj).toFixed(2)} × {Math.max(1, Number(cantidadCajasUnica) || 1)} {Math.max(1, Number(cantidadCajasUnica) || 1) === 1 ? 'caja' : 'cajas'} = ${montoBase.toFixed(2)}
												</span>
												<Badge variant="outline" class="text-[10px] font-bold text-emerald-700 border-emerald-300 bg-emerald-500/10">
													STOCK DISPONIBLE: {productoObj.stock ?? 0}
												</Badge>
											</div>
										{/if}

										{#if productoObj && productoObj.atributos_valores && Object.entries(productoObj.atributos_valores).some(([k, v]) => !k.startsWith('__') && String(v ?? '').trim() !== '')}
											<div class="p-3 rounded-lg border bg-muted/30 space-y-2">
												<Label class="text-xs font-bold text-muted-foreground flex items-center gap-1">
													<Tag class="w-3.5 h-3.5 text-primary" /> Atributos y Dimensiones de la Caja:
												</Label>
												<div class="flex flex-wrap gap-2 text-xs">
													{#each Object.entries(productoObj.atributos_valores).filter(([k]) => !k.startsWith('__')) as [k, v]}
														{#if String(v ?? '').trim() !== ''}
															<Badge variant="outline" class="bg-background gap-1 text-[11px] py-1">
																<span class="font-bold text-muted-foreground">{k}:</span>
																<span class="font-extrabold text-foreground uppercase">{String(v)}</span>
															</Badge>
														{/if}
													{/each}
												</div>
											</div>
										{/if}
									{:else}
										<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
											<!-- 1. Tipo de Tarifa (PRIMERO) -->
											<div>
												<Label class="text-xs mb-1 block font-semibold">1. Tipo de Tarifa *</Label>
												<select
													bind:value={tipoTarifaId}
													required={!esMultipleCajas && !esVentaCajas}
													class="w-full h-9 px-2.5 rounded-md border text-xs uppercase font-bold text-primary bg-background"
												>
													<option value="">-- SELECCIONAR TIPO TARIFA PRIMERO --</option>
													{#each tiposTarifa as tt}
														<option value={String(tt.id)}>{tt.nombre.toUpperCase()}</option>
													{/each}
												</select>
											</div>

											<!-- 2. Producto (SOLO PRODUCTOS CON TARIFA ACTIVA PARA EL TIPO DE TARIFA SELECCIONADO) -->
											<div>
												<Label class="text-xs mb-1 block font-semibold">2. Producto *</Label>
												<select
													bind:value={productoId}
													onchange={(e) => handleSingleProductoChange(e.currentTarget.value)}
													disabled={!tipoTarifaId}
													required={!esMultipleCajas}
													class="w-full h-9 px-2.5 rounded-md border text-xs uppercase bg-background disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{#if !tipoTarifaId}
														<option value="">-- SELECCIONE PRIMERO TIPO TARIFA --</option>
													{:else if productosConTarifa.length === 0}
														<option value="">-- NO HAY PRODUCTOS CON ESTA TARIFA ACTIVA --</option>
													{:else}
														<option value="">-- SELECCIONAR PRODUCTO ({productosConTarifa.length} DISPONIBLE/S) --</option>
														{#each productosConTarifa as p}
															<option value={String(p.id)}>[{p.codigo}] {p.descripcion.toUpperCase()}</option>
														{/each}
													{/if}
												</select>
											</div>

											<!-- 3. Zona Logística (SIEMPRE FIJA IGUAL A LA ZONA DEL USUARIO AUTENTICADO) -->
											<div>
												<Label class="text-xs mb-1 block font-semibold">3. Zona Logística (Operador)</Label>
												<div class="h-9 px-2.5 rounded-md border bg-muted/40 text-xs font-bold uppercase flex items-center justify-between">
													<span class="flex items-center gap-1.5 truncate">
														<MapPin class="w-3.5 h-3.5 text-primary shrink-0" />
														{userZonaObj ? userZonaObj.nombre.toUpperCase() : 'ZONA OPERADOR'}
													</span>
													<Badge variant="secondary" class="text-[9px] px-1.5 py-0">FIJA POR USUARIO</Badge>
												</div>
											</div>
										</div>

										{#if isTarifaInexistente}
											<div class="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold space-y-1">
												<div class="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-extrabold uppercase">
													<AlertTriangle class="w-4 h-4 shrink-0 text-rose-600" /> ¡Atención! Tarifa Inválida o No Existe en Sistema
												</div>
												<p>No existe una tarifa válida configurada para la combinación seleccionada (Tipo de Tarifa + Producto + País Destino + Zona Logística). El costo base $0.00 solo se permite cuando el Tipo de Tarifa está definido como Promoción.</p>
											</div>
										{:else if tarifaEncontrada}
											{@const isSinglePromo = esTarifaPromocion(tarifaEncontrada, tipoTarifaId)}
											<div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between">
												<span class="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
													<CheckCircle2 class="w-4 h-4" /> Tarifa Válida Encontrada: ${tarifaEncontrada.precio.toFixed(2)} {Number(tarifaEncontrada.precio) === 0 && isSinglePromo ? '(Tarifa Promocional $0.00)' : esTarifaPorPeso ? '/ LB (Cobro por Peso Reportado)' : '(Tarifa Fija Única por Caja)'}
												</span>
												<Badge variant="outline" class="text-[10px] font-bold {esTarifaPorPeso && !(Number(tarifaEncontrada.precio) === 0 && isSinglePromo) ? 'text-amber-700 border-amber-300 bg-amber-500/10' : 'text-emerald-700 border-emerald-300 bg-emerald-500/10'}">
													{Number(tarifaEncontrada.precio) === 0 && isSinglePromo ? 'PROMOCIÓN ($0)' : esTarifaPorPeso ? 'POR PESO REPORTADO' : 'TARIFA ÚNICA'}
												</Badge>
											</div>
										{/if}

										<!-- Atributos Dinámicos del Producto Seleccionado -->
										{#if productoObj && productoObj.atributos_valores && Object.entries(productoObj.atributos_valores).some(([k, v]) => !k.startsWith('__') && String(v ?? '').trim() !== '')}
											<div class="p-3 rounded-lg border bg-muted/30 space-y-2">
												<Label class="text-xs font-bold text-muted-foreground flex items-center gap-1">
													<Tag class="w-3.5 h-3.5 text-primary" /> Atributos del Producto:
												</Label>
												<div class="flex flex-wrap gap-2 text-xs">
													{#each Object.entries(productoObj.atributos_valores).filter(([k]) => !k.startsWith('__')) as [k, v]}
														{#if String(v ?? '').trim() !== ''}
															<Badge variant="outline" class="bg-background gap-1 text-[11px] py-1">
																<span class="font-bold text-muted-foreground">{k}:</span>
																<span class="font-extrabold text-foreground uppercase">{String(v)}</span>
															</Badge>
														{/if}
													{/each}
												</div>
											</div>
										{/if}

										{#if !isCliente}
											<!-- Control de Descuento de Inventario para Caja Única -->
											<div class="p-3 rounded-lg border {descontarInventarioCaja ? 'bg-muted/20 border-border' : 'bg-amber-500/10 border-amber-500/30'} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div class="flex items-center gap-2.5">
													<input
														type="checkbox"
														id="v_descontar_inv_single"
														bind:checked={descontarInventarioCaja}
														class="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
													/>
													<Label for="v_descontar_inv_single" class="cursor-pointer">
														<span class="text-xs font-bold text-foreground block">
															Descontar caja del inventario de la tienda
														</span>
														<span class="text-[11px] text-muted-foreground block">
															{descontarInventarioCaja
																? 'La caja se restará del stock de inventario. (Marcado por defecto)'
																: 'Caja suministrada por el cliente: NO se descuenta del inventario y se descuenta el precio de venta de la caja de la venta total.'}
														</span>
													</Label>
												</div>
												{#if !descontarInventarioCaja}
													{@const pv = getPrecioVentaProducto(productoObj)}
													<div class="flex items-center gap-1.5 shrink-0 bg-background/80 px-2.5 py-1 rounded-md border border-amber-500/30">
														<Badge variant="outline" class="text-[10px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-500/15">
															SIN DESCUENTO DE STOCK (-${pv.toFixed(2)} DTO.)
														</Badge>
													</div>
												{/if}
											</div>
										{/if}

										<!-- Especificaciones del Paquete / Pesos y Dimensiones -->
										<div class="border-t pt-3 space-y-3">
											<div class="flex items-center justify-between">
												<Label class="text-xs font-bold flex items-center gap-1.5 text-primary">
													<Scale class="w-4 h-4" /> Especificaciones de Carga / Pesos y Dimensiones
												</Label>
												<div class="flex items-center gap-1.5 flex-wrap">
													{#if capacidadMinimaPais > 0}
														<Badge variant="outline" class="text-[10px] font-mono border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20">
															Mín. País: {capacidadMinimaPais} LB
														</Badge>
													{/if}
													{#if limiteInfoSingle.limite > 0}
														<Badge variant={limiteInfoSingle.esPersonalizado ? "default" : "outline"} class={`text-[10px] font-mono ${limiteInfoSingle.esPersonalizado ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700' : ''}`}>
															{limiteInfoSingle.esPersonalizado ? `Máx. Producto: ${limiteInfoSingle.limite} LB` : `Máx. País: ${limiteInfoSingle.limite} LB`}
														</Badge>
													{/if}
												</div>
											</div>

											<div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
												<div>
													<Label for="v_peso_rep" class="text-xs font-semibold">Peso Reportado (LB) *</Label>
													<Input
														id="v_peso_rep"
														type="number"
														step="0.1"
														min="0.1"
														bind:value={pesoReportado}
														required={!esMultipleCajas && !esVentaCajas}
														class="text-xs font-mono font-bold"
													/>
												</div>
												<div>
													<Label for="v_alto" class="text-xs font-semibold">Alto (in)</Label>
													<Input id="v_alto" type="number" step="0.1" min="0" bind:value={alto} class="text-xs font-mono" />
												</div>
												<div>
													<Label for="v_ancho" class="text-xs font-semibold">Ancho (in)</Label>
													<Input id="v_ancho" type="number" step="0.1" min="0" bind:value={ancho} class="text-xs font-mono" />
												</div>
												<div>
													<Label for="v_largo" class="text-xs font-semibold">Largo (in)</Label>
													<Input id="v_largo" type="number" step="0.1" min="0" bind:value={largo} class="text-xs font-mono" />
												</div>
											</div>

											<!-- Banner Comparativo de Pesos (Peso Reportado vs Peso Volumétrico = Peso Mayor Facturable) -->
											<div class="p-3 rounded-lg border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
												<div class="flex items-center gap-4">
													<div>
														<span class="text-muted-foreground text-[11px] block">Peso Reportado:</span>
														<span class="font-mono font-bold text-sm">{pesoReportado} LB</span>
													</div>
													<div class="text-muted-foreground text-sm font-bold">vs</div>
													<div>
														<span class="text-muted-foreground text-[11px] block">Peso Volumétrico:</span>
														<span class="font-mono font-bold text-sm text-primary">{pesoVolumetric} LB</span>
														<span class="text-[9px] text-muted-foreground block">(A×A×L / 166)</span>
													</div>
												</div>

												<div class="p-2 px-3 rounded-md bg-primary/10 border border-primary/30 text-right">
													<span class="text-[10px] uppercase font-bold text-muted-foreground block">Peso Mayor Facturable:</span>
													<span class="font-mono text-base font-extrabold text-primary">{pesoFacturable} LB</span>
												</div>
											</div>

											{#if isSobrepeso}
												<p class="text-xs font-bold text-destructive flex items-center gap-1">
													<AlertTriangle class="w-4 h-4 shrink-0" /> ¡Error! El peso facturable mayor ({pesoFacturable} LB) excede el límite máximo permitido ({limiteInfoSingle.limite} LB{limiteInfoSingle.esPersonalizado ? ' por capacidad de carga del producto' : ' para este país'}).
												</p>
											{/if}

											{#if isBajoPesoMinimo}
												<p class="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
													<AlertTriangle class="w-4 h-4 shrink-0" /> ¡Atención! El peso facturable ({pesoFacturable} LB) es inferior a la capacidad mínima requerida ({capacidadMinimaPais} LB) para este país destino.
												</p>
											{/if}

											<!-- Opción de Seguro de Envío -->
											<div class="space-y-2 border p-3 rounded-lg bg-muted/20">
												<div class="flex items-center gap-2">
													<input type="checkbox" id="v_seguro" bind:checked={requiereSeguro} class="w-4 h-4 rounded text-primary" />
													<Label for="v_seguro" class="text-xs font-bold cursor-pointer">¿Requiere Seguro de Envío?</Label>
												</div>

												{#if requiereSeguro}
													<div class="space-y-2 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
														<div>
															<Label for="v_declarado" class="text-xs font-semibold">Valor Declarado ($)</Label>
															<Input id="v_declarado" type="number" step="0.01" min="0" bind:value={valorDeclarado} placeholder="0.00" class="text-xs font-mono font-bold" />
														</div>
														<div>
															<Label for="v_porcentaje_seguro" class="text-xs font-semibold">Porcentaje de Seguro (%)</Label>
															<Input id="v_porcentaje_seguro" type="number" step="0.01" min="0" max="100" bind:value={porcentajeSeguroManual} placeholder="0.00" class="text-xs font-mono font-bold" />
															{#if productoObj && productoObj.requiere_seguro && productoObj.porcentaje_seguro > 0}
																<span class="text-[10px] text-muted-foreground block mt-0.5">
																	(Sugerido del Producto: {productoObj.porcentaje_seguro}%)
																</span>
															{/if}
														</div>
													</div>
												{/if}
											</div>
										</div>
									{/if}
								{/if}
							</CardContent>
						{/if}
					{/if}
				</Card>

				{#if !esVentaCajas}
					<!-- PASO 3: Declaración de Artículos del Envío (ACORDEÓN CON SEMÁFORO) -->
					<Card>
						<CardHeader
							onclick={() => (paso3Open = !paso3Open)}
							class="pb-3 cursor-pointer hover:bg-muted/20 transition-colors border-b select-none flex flex-row items-center justify-between"
						>
							<div class="flex items-center gap-3">
								<!-- Semáforo Indicador -->
								<div class="flex items-center gap-1.5 shrink-0" title={`Estado Paso 3: ${paso3Semaforo.toUpperCase()}`}>
									{#if paso3Semaforo === 'verde'}
										<span class="relative flex h-3 w-3">
											<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
											<span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
										</span>
									{:else if paso3Semaforo === 'amarillo'}
										<span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
									{:else}
										<span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
									{/if}
								</div>

								<CardTitle class="text-base font-semibold flex items-center gap-2">
									<Boxes class="w-4 h-4 text-primary" /> 3. Declaración de Artículos del Envío
								</CardTitle>
							</div>

							<div class="flex items-center gap-2">
								<Badge variant="outline" class="font-mono text-xs mr-1">
									{articulosSeleccionados.length} {articulosSeleccionados.length === 1 ? 'Artículo' : 'Artículos'}
								</Badge>

								{#if paso3Semaforo === 'verde'}
									<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] uppercase font-bold">
										COMPLETO
									</Badge>
								{:else if paso3Semaforo === 'amarillo'}
									<Badge class="bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px] uppercase font-bold">
										INCOMPLETO
									</Badge>
								{:else}
									<Badge class="bg-rose-500/10 text-rose-700 border-rose-500/30 text-[10px] uppercase font-bold">
										REQUERIDO
									</Badge>
								{/if}

								<Button type="button" variant="ghost" size="icon" class="h-7 w-7">
									{#if paso3Open}
										<ChevronUp class="w-4 h-4 text-muted-foreground" />
									{:else}
										<ChevronDown class="w-4 h-4 text-muted-foreground" />
									{/if}
								</Button>
							</div>
						</CardHeader>

						{#if paso3Open}
							<CardContent class="space-y-4 pt-4">
								<!-- Selector de Caja Destino para el Artículo (si múltiples cajas activo) -->
								{#if esMultipleCajas}
									<div class="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
										<Label class="text-xs font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap">
											<Boxes class="w-3.5 h-3.5 text-primary" /> Asignar Artículo a Caja:
										</Label>
										<select
											bind:value={selectedCajaParaArticulo}
											class="h-8 px-2.5 rounded-md border text-xs font-mono font-bold bg-background text-primary"
										>
											{#each cajas as c}
												<option value={c.numero}>📦 CAJA {c.numero}</option>
											{/each}
										</select>
										<span class="text-[11px] text-muted-foreground">
											Los artículos que agregues se asignarán a la caja seleccionada.
										</span>
									</div>
								{/if}

								<!-- Agregar Artículo desde Maestro o Personalizado -->
								<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 p-3.5 rounded-xl border bg-muted/20">
									<!-- Bloque 1: Seleccionar del Maestro de Artículos (Búsqueda + Desplegable) -->
									<div class="p-3 rounded-lg border bg-card/80 space-y-2">
										<div class="flex items-center justify-between">
											<Label class="text-xs font-bold text-primary flex items-center gap-1.5">
												<Search class="w-3.5 h-3.5" /> Seleccionar del Maestro de Artículos
											</Label>
											<span class="text-[10px] text-muted-foreground font-mono">
												{filteredArticulosMaster.length} de {articulosMaster.length} artículos
											</span>
										</div>

										<div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
											<!-- Combobox Buscable y Desplegable -->
											<div class="sm:col-span-6 relative">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
													Artículo del Maestro
												</Label>
												<div class="relative flex items-center">
													<Search class="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
													<Input
														type="text"
														placeholder="Escribir para buscar o desplegar..."
														bind:value={searchArticuloMasterQuery}
														onfocus={() => (isArticuloMasterDropdownOpen = true)}
														oninput={() => {
															selectedArticuloMasterId = '';
															isArticuloMasterDropdownOpen = true;
														}}
														onkeydown={(e) => {
															if (e.key === 'Escape') {
																isArticuloMasterDropdownOpen = false;
															} else if (e.key === 'Enter' && isArticuloMasterDropdownOpen && filteredArticulosMaster.length > 0) {
																e.preventDefault();
																selectArticuloMasterItem(filteredArticulosMaster[0]);
															}
														}}
														class="h-9 pl-8 pr-14 text-xs uppercase font-semibold bg-background"
													/>
													<div class="absolute right-1 flex items-center gap-0.5">
														{#if searchArticuloMasterQuery || selectedArticuloMasterId}
															<button
																type="button"
																onclick={clearArticuloMasterSelection}
																class="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted"
																title="Limpiar selección"
															>
																<X class="w-3.5 h-3.5" />
															</button>
														{/if}
														<button
															type="button"
															onclick={() => (isArticuloMasterDropdownOpen = !isArticuloMasterDropdownOpen)}
															class="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
															title={isArticuloMasterDropdownOpen ? 'Cerrar lista' : 'Desplegar lista de artículos'}
														>
															{#if isArticuloMasterDropdownOpen}
																<ChevronUp class="w-3.5 h-3.5" />
															{:else}
																<ChevronDown class="w-3.5 h-3.5" />
															{/if}
														</button>
													</div>
												</div>

												{#if isArticuloMasterDropdownOpen}
													<!-- Backdrop invisible para cerrar al hacer clic afuera -->
													<div
														class="fixed inset-0 z-40"
														role="presentation"
														onclick={() => (isArticuloMasterDropdownOpen = false)}
													></div>
													<div class="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-lg divide-y">
														{#if filteredArticulosMaster.length === 0}
															<div class="p-3 text-center text-xs text-muted-foreground italic">
																No se encontraron artículos que coincidan con "{searchArticuloMasterQuery}"
															</div>
														{:else}
															{#each filteredArticulosMaster as a (a.id)}
																<button
																	type="button"
																	onclick={() => selectArticuloMasterItem(a)}
																	class={`w-full text-left px-3 py-2 text-xs uppercase font-medium hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between ${
																		String(selectedArticuloMasterId) === String(a.id)
																			? 'bg-primary/15 text-primary font-bold'
																			: ''
																	}`}
																>
																	<span>{a.nombre}</span>
																	{#if String(selectedArticuloMasterId) === String(a.id)}
																		<CheckCircle2 class="w-3.5 h-3.5 text-primary shrink-0" />
																	{/if}
																</button>
															{/each}
														{/if}
													</div>
												{/if}
											</div>

											<!-- Cantidad Amplia -->
											<div class="sm:col-span-2">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
													Cantidad
												</Label>
												<Input
													type="number"
													min="1"
													step="1"
													placeholder="1"
													bind:value={masterArticuloCantidad}
													class="text-xs font-mono font-bold text-center h-9 w-full bg-background px-2"
													title="Cantidad de unidades"
												/>
											</div>

											<!-- Valor Total ($) Amplio -->
											<div class="sm:col-span-2">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
													Valor Total ($)
												</Label>
												<Input
													type="number"
													step="0.01"
													min="0"
													placeholder="0.00"
													bind:value={masterArticuloValorTotal}
													class="text-xs font-mono font-bold text-right h-9 w-full bg-background px-2"
													title="Valor Total en USD ($)"
												/>
											</div>

											<!-- Botón Añadir -->
											<div class="sm:col-span-2">
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onclick={addArticuloFromMaster}
													class="w-full h-9 text-xs font-bold gap-1"
												>
													<Plus class="w-3.5 h-3.5" /> Añadir
												</Button>
											</div>
										</div>
									</div>

									<!-- Bloque 2: O Crear Artículo Personalizado -->
									<div class="p-3 rounded-lg border bg-card/80 space-y-2">
										<div class="flex items-center justify-between">
											<Label class="text-xs font-bold text-foreground flex items-center gap-1.5">
												<Plus class="w-3.5 h-3.5 text-primary" /> O Crear Artículo Personalizado
											</Label>
											<span class="text-[10px] text-muted-foreground">Ingreso libre</span>
										</div>

										<div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
											<div class="sm:col-span-6">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
													Nombre o Descripción del Artículo
												</Label>
												<Input
													placeholder="EJ. ROPA, ZAPATOS, REPUESTOS..."
													bind:value={customArticuloNombre}
													class="text-xs uppercase font-semibold h-9 w-full bg-background"
												/>
											</div>

											<div class="sm:col-span-2">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
													Cantidad
												</Label>
												<Input
													type="number"
													min="1"
													step="1"
													placeholder="1"
													bind:value={customArticuloCantidad}
													class="text-xs font-mono font-bold text-center h-9 w-full bg-background px-2"
													title="Cantidad de unidades"
												/>
											</div>

											<div class="sm:col-span-2">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
													Valor Total ($)
												</Label>
												<Input
													type="number"
													step="0.01"
													min="0"
													placeholder="0.00"
													bind:value={customArticuloValorTotal}
													class="text-xs font-mono font-bold text-right h-9 w-full bg-background px-2"
													title="Valor Total en USD ($)"
												/>
											</div>

											<div class="sm:col-span-2">
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onclick={addCustomArticulo}
													class="w-full h-9 text-xs font-bold gap-1"
												>
													<Plus class="w-3.5 h-3.5" /> Agregar
												</Button>
											</div>
										</div>
									</div>
								</div>

								<!-- Filtros por Caja (si múltiples cajas activo) -->
								{#if esMultipleCajas}
									<div class="flex items-center gap-1.5 overflow-x-auto pb-1">
										<span class="text-xs font-bold text-muted-foreground mr-1 whitespace-nowrap">Filtrar Cajas:</span>
										<Button
											type="button"
											variant={filtroCajaArticulos === 'TODAS' ? 'default' : 'outline'}
											size="sm"
											class="h-7 text-xs font-bold"
											onclick={() => (filtroCajaArticulos = 'TODAS')}
										>
											Todas ({articulosSeleccionados.length})
										</Button>
										{#each cajas as c}
											{@const cantCaja = articulosSeleccionados.filter((a) => a.caja_numero === c.numero).length}
											<Button
												type="button"
												variant={filtroCajaArticulos === c.numero ? 'default' : 'outline'}
												size="sm"
												class={`h-7 text-xs font-mono font-bold ${cantCaja === 0 ? 'border-amber-400 text-amber-700 dark:text-amber-400' : ''}`}
												onclick={() => (filtroCajaArticulos = c.numero)}
											>
												📦 {c.numero} ({cantCaja})
											</Button>
										{/each}
									</div>
								{/if}

								<!-- Lista de Artículos Incluidos en la Venta -->
								<div class="space-y-2">
									<div class="border rounded-lg overflow-x-auto">
										<table class="w-full text-left text-xs">
											<thead>
												<tr class="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase border-b">
													{#if esMultipleCajas}
														<th class="p-2.5 w-32 text-center">Caja</th>
													{/if}
													<th class="p-2.5">Artículo</th>
													<th class="p-2.5 text-center w-28">Cantidad</th>
													<th class="p-2.5 text-right w-36">Valor Total ($)</th>
													<th class="p-2.5 text-center w-16">Acción</th>
												</tr>
											</thead>
											<tbody class="divide-y">
												{#if articulosParaMostrar.length === 0}
													<tr>
														<td colspan={esMultipleCajas ? 5 : 4} class="p-4 text-center text-muted-foreground italic text-xs">
															{filtroCajaArticulos !== 'TODAS'
																? `No hay artículos declarados para la caja ${filtroCajaArticulos}. Selecciona la caja arriba para añadir artículos a la misma.`
																: 'No se ha agregado ningún artículo al envío. Seleccione del maestro o agregue un artículo personalizado.'}
														</td>
													</tr>
												{:else}
													{#each articulosParaMostrar as item}
														<tr class="hover:bg-muted/20">
															{#if esMultipleCajas}
																<td class="p-2.5 text-center">
																	<select
																		bind:value={item.caja_numero}
																		class="h-8 px-2 rounded-md border text-xs font-mono font-bold bg-background text-primary"
																	>
																		{#each cajas as c}
																			<option value={c.numero}>📦 {c.numero}</option>
																		{/each}
																	</select>
																</td>
															{/if}
															<td class="p-2.5 font-semibold uppercase">
																<Input type="text" bind:value={item.nombre} class="h-8 text-xs uppercase font-semibold" />
															</td>
															<td class="p-2.5 text-center">
																<Input type="number" min="1" step="1" bind:value={item.cantidad} oninput={syncValorDeclaradoFromArticulos} class="h-8 text-xs font-mono font-bold text-center" />
															</td>
															<td class="p-2.5 text-right font-mono font-bold">
																<Input type="number" step="0.01" min="0" bind:value={item.valor_total} oninput={syncValorDeclaradoFromArticulos} class="h-8 text-xs font-mono font-bold text-right" />
															</td>
															<td class="p-2.5 text-center">
																<Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-muted-foreground hover:text-destructive" onclick={() => removeArticuloItem(item)} title="Eliminar Artículo">
																	<Trash2 class="w-3.5 h-3.5" />
																</Button>
															</td>
														</tr>
													{/each}
												{/if}
											</tbody>
										</table>
									</div>

									<div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs gap-2">
										<div>
											<span class="font-bold text-muted-foreground block">Valor Total Acumulado de Artículos:</span>
											{#if esMultipleCajas}
												{@const cajasConArticulos = new Set(articulosSeleccionados.map((a) => a.caja_numero))}
												<span class="text-[11px] text-muted-foreground">
													Declaración completa en: <b class="text-foreground">{cajasConArticulos.size} de {cajas.length} cajas</b>
													{#if cajasConArticulos.size < cajas.length}
														<span class="text-amber-600 dark:text-amber-400 font-semibold ml-1">(Faltan cajas por declarar artículos)</span>
													{/if}
												</span>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											<Badge variant="outline" class="font-mono font-extrabold text-sm bg-primary/10 border-primary/30 text-primary">
												${articulosSeleccionados.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0).toFixed(2)}
											</Badge>
											<span class="text-[10px] text-muted-foreground">(Sincronizado con Valor Declarado)</span>
										</div>
									</div>
								</div>
							</CardContent>
						{/if}
					</Card>
				{/if}

				<!-- PASO 4: Cargos Adicionales y Descuentos (ACORDEÓN CON SEMÁFORO - SOLO OPERADORES) -->
				{#if !isCliente}
					<Card>
						<CardHeader
							onclick={() => (paso4Open = !paso4Open)}
							class="pb-3 cursor-pointer hover:bg-muted/20 transition-colors border-b select-none flex flex-row items-center justify-between"
						>
							<div class="flex items-center gap-3">
								<!-- Semáforo Indicador -->
								<div class="flex items-center gap-1.5 shrink-0" title="Estado Paso 4: COMPLETO">
									<span class="relative flex h-3 w-3">
										<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
										<span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
									</span>
								</div>

								<CardTitle class="text-base font-semibold flex items-center gap-2">
									<Sparkles class="w-4 h-4 text-primary" />
									{esVentaCajas ? '3. Cargos Adicionales y Descuentos (Opcional)' : '4. Cargos Adicionales y Descuentos (Opcional)'}
								</CardTitle>
							</div>

							<div class="flex items-center gap-2">
								<Badge class="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] uppercase font-bold">
									COMPLETO
								</Badge>

								<Button type="button" variant="ghost" size="icon" class="h-7 w-7">
									{#if paso4Open}
										<ChevronUp class="w-4 h-4 text-muted-foreground" />
									{:else}
										<ChevronDown class="w-4 h-4 text-muted-foreground" />
									{/if}
								</Button>
							</div>
						</CardHeader>

						{#if paso4Open}
							<CardContent class="space-y-4 pt-4">
								<!-- Añadir desde el Maestro de la Base de Datos o Personalizado -->
								<div class="space-y-3">
									<div class="flex flex-col sm:flex-row gap-2">
										<select bind:value={selectedCargoDescuentoId} class="flex-1 h-9 px-2.5 rounded-md border text-xs uppercase">
											<option value="">-- SELECCIONAR DEL MAESTRO DE CARGOS Y DESCUENTOS --</option>
											{#each cargosDescuentos as cd}
												<option value={String(cd.id)}>
													[{cd.tipo.toUpperCase()}] {cd.nombre} ({cd.es_porcentaje ? `${cd.monto_defecto}% del valor base` : `$${cd.monto_defecto.toFixed(2)}`})
												</option>
											{/each}
										</select>
										<Button type="button" variant="secondary" size="sm" onclick={addCargoDescuento} disabled={!selectedCargoDescuentoId} class="gap-1">
											<Plus class="w-4 h-4" /> Agregar del Maestro
										</Button>
										<Button
											type="button"
											variant={isCustomCargoOpen ? 'secondary' : 'outline'}
											size="sm"
											onclick={() => (isCustomCargoOpen = !isCustomCargoOpen)}
											class="gap-1 text-xs"
										>
											<Sparkles class="w-3.5 h-3.5 text-primary" />
											{isCustomCargoOpen ? 'Cerrar Personalizado' : '+ Personalizado'}
										</Button>
									</div>

									<!-- Formulario desplegable para concepto personalizado -->
									{#if isCustomCargoOpen}
										<div class="p-3 rounded-lg border bg-muted/30 space-y-3 text-xs">
											<div class="font-bold flex items-center justify-between text-muted-foreground uppercase text-[11px]">
												<span>Agregar Concepto Personalizado a esta Venta</span>
												{#if customCargoEsPorcentaje && montoBase > 0 && customCargoValor > 0}
													<span class="text-indigo-600 font-mono">
														Equivalente actual: ${((montoBase * customCargoValor) / 100).toFixed(2)}
													</span>
												{/if}
											</div>

											<div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
												<div class="sm:col-span-2 space-y-1">
													<label for="custom_cargo_nom" class="text-[11px] font-semibold">Descripción *</label>
													<InputUppercase
														id="custom_cargo_nom"
														bind:value={customCargoNombre}
														placeholder="EJ. EMBALAJE ESPECIAL, DESCUENTO VOLUMEN..."
														class="h-8 text-xs"
													/>
												</div>

												<div class="space-y-1">
													<label for="custom_cargo_tipo" class="text-[11px] font-semibold">Tipo *</label>
													<select
														id="custom_cargo_tipo"
														bind:value={customCargoTipo}
														class="w-full h-8 px-2 rounded-md border bg-background text-xs uppercase"
													>
														<option value="cargo">CARGO (+)</option>
														<option value="descuento">DESCUENTO (-)</option>
													</select>
												</div>

												<div class="space-y-1">
													<label for="custom_cargo_mod" class="text-[11px] font-semibold">Modalidad *</label>
													<select
														id="custom_cargo_mod"
														value={customCargoEsPorcentaje ? 'true' : 'false'}
														onchange={(e) => (customCargoEsPorcentaje = e.currentTarget.value === 'true')}
														class="w-full h-8 px-2 rounded-md border bg-background text-xs"
													>
														<option value="false">Monto Fijo ($)</option>
														<option value="true">Porcentaje (% base)</option>
													</select>
												</div>
											</div>

											<div class="flex flex-col sm:flex-row items-end justify-between gap-2.5 pt-1">
												<div class="w-full sm:w-48 space-y-1">
													<label for="custom_cargo_val" class="text-[11px] font-semibold">
														{customCargoEsPorcentaje ? 'Porcentaje (%) *' : 'Monto Fijo ($) *'}
													</label>
													<Input
														id="custom_cargo_val"
														type="number"
														step="0.01"
														min="0"
														bind:value={customCargoValor}
														placeholder={customCargoEsPorcentaje ? 'Ej. 10 para 10%' : 'Ej. 15.00'}
														class="h-8 text-xs"
													/>
												</div>

												<div class="flex items-center gap-2">
													<Button type="button" variant="ghost" size="sm" class="h-8 text-xs" onclick={() => (isCustomCargoOpen = false)}>
														Cancelar
													</Button>
													<Button type="button" size="sm" class="h-8 text-xs gap-1" onclick={addCustomCargoDescuento}>
														<Plus class="w-3.5 h-3.5" /> Aplicar Concepto
													</Button>
												</div>
											</div>
										</div>
									{/if}
								</div>

								<!-- Lista de Aplicados -->
								{#if cargosDescuentosAplicados.length > 0}
									<div class="border rounded-lg divide-y bg-card">
										{#each cargosDescuentosAplicados as item, index}
											{@const itemMonto = getCargoDescuentoMonto(item)}
											<div class="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
												<div class="flex items-center gap-2 flex-wrap">
													<Badge variant={item.tipo === 'cargo' ? 'default' : 'destructive'} class="text-[10px] uppercase font-bold">
														{item.tipo}
													</Badge>
													<span class="font-bold uppercase">{item.nombre}</span>
													{#if item.es_porcentaje}
														<Badge variant="outline" class="text-[9px] font-bold text-indigo-600 border-indigo-400/40 bg-indigo-500/10">
															% BASE ({item.porcentaje}%)
														</Badge>
														<span class="text-[10px] text-muted-foreground font-mono">
															({item.porcentaje}% de ${montoBase.toFixed(2)})
														</span>
													{:else}
														<Badge variant="secondary" class="text-[9px] font-medium text-muted-foreground">
															$ FIJO
														</Badge>
													{/if}
												</div>

												<div class="flex items-center gap-3">
													<span class={`font-mono font-bold ${item.tipo === 'cargo' ? 'text-emerald-600' : 'text-destructive'}`}>
														{item.tipo === 'cargo' ? '+' : '-'}${itemMonto.toFixed(2)}
													</span>
													<Button type="button" variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-destructive" onclick={() => removeCargoDescuento(index)}>
														<Trash2 class="w-3.5 h-3.5" />
													</Button>
												</div>
											</div>
										{/each}
									</div>
								{/if}

								{#if isTarifaInexistente}
									<div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
										<AlertTriangle class="w-4 h-4 shrink-0 text-rose-600" />
										<span>
											{esVentaCajas
												? 'No se puede procesar ni guardar la venta: el producto seleccionado no tiene Precio de Venta configurado ($0.00).'
												: 'No se puede procesar ni guardar la venta: la tarifa seleccionada no existe o tiene costo $0.00 sin estar definida como Promoción.'}
										</span>
									</div>
								{/if}

								<div class="flex items-center justify-between pt-4 border-t">
									{#if data.editingVenta?.estatus_venta === 'realizada'}
										<Button type="button" variant="outline" href="/ventas/historial" class="gap-1.5 text-xs">
											Cancelar
										</Button>
										<Button type="submit" name="estatus_venta" value="realizada" disabled={isSobrepeso || isTarifaInexistente} class="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
											<CheckCircle2 class="w-4 h-4" /> Guardar Cambios en Venta Realizada
										</Button>
									{:else}
										<Button type="submit" name="estatus_venta" value="borrador" variant="outline" disabled={isTarifaInexistente} class="gap-1.5 text-xs">
											<FileText class="w-4 h-4" /> Guardar Borrador
										</Button>
										<Button type="submit" name="estatus_venta" value="realizada" disabled={isSobrepeso || isTarifaInexistente} class="gap-1.5 text-xs">
											<CheckCircle2 class="w-4 h-4" /> Confirmar {esVentaCajas ? 'Venta de Cajas' : 'Venta Realizada'}
										</Button>
									{/if}
								</div>
							</CardContent>
						{/if}
					</Card>
				{:else}
					<!-- Botón de Confirmación para Cliente -->
					<div class="p-4 rounded-lg bg-card border shadow-sm space-y-3">
						<div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
							<Sparkles class="w-4 h-4 text-blue-600 shrink-0" />
							<span>Como cliente registrado, estás generando una solicitud de envío en Borrador. Nuestro equipo revisará la información y asignará el operador de transporte.</span>
						</div>
						<div class="flex justify-end">
							<Button type="submit" name="estatus_venta" value="borrador" class="gap-2 text-xs font-bold w-full sm:w-auto">
								<FileText class="w-4 h-4" /> Solicitar Envío (Guardar Borrador)
							</Button>
						</div>
					</div>
				{/if}
			</form>
		</div>

		<!-- RESUMEN DE COTIZACIÓN FLOTANTE (Columna Derecha 20% = lg:col-span-3 - Oculto para Rol Cliente) -->
		{#if !isCliente}
			<div class="order-1 lg:order-2 lg:col-span-3 space-y-4 lg:sticky lg:top-20">
				<Card class="border-2 border-primary/20 bg-card shadow-lg">
					<CardHeader class="pb-3 border-b bg-muted/20">
						<div class="flex items-center justify-between">
							<CardTitle class="text-base font-bold flex items-center gap-2">
								<DollarSign class="w-5 h-5 text-primary" /> {esVentaCajas ? 'Resumen Venta Cajas' : 'Resumen Cotización'}
							</CardTitle>
							<Badge variant={estatusPago === 'pagada' ? 'default' : estatusPago === 'parcial' ? 'secondary' : 'outline'} class="uppercase text-[10px] font-bold">
								{estatusPago}
							</Badge>
						</div>
					</CardHeader>

					<CardContent class="p-4 space-y-3 text-sm">
						<!-- Fecha de Venta Registrada -->
						<div class="p-2.5 rounded-lg border bg-muted/20 space-y-1 text-xs">
							<div class="flex justify-between items-center">
								<span class="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
									<Calendar class="w-3.5 h-3.5 text-primary" /> Fecha de Venta:
								</span>
								<span class="font-mono font-bold text-foreground text-[11px]">
									{fechaVenta ? new Date(fechaVenta).toLocaleDateString() : new Date().toLocaleDateString()}
								</span>
							</div>
							<div class="flex justify-between items-center text-[10px] text-muted-foreground">
								<span>Hora: {fechaVenta ? new Date(fechaVenta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
								{#if isAdmin}
									<span class="text-primary font-bold">(Modificable por Admin)</span>
								{/if}
							</div>
						</div>

						{#if esVentaCajas}
							<!-- Resumen de Cajas Seleccionadas en modo Venta de Cajas -->
							<div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
								<div class="flex items-center justify-between font-bold border-b border-amber-500/20 pb-1">
									<span class="flex items-center gap-1 text-amber-800 dark:text-amber-300 uppercase text-[10px]">
										<Boxes class="w-3.5 h-3.5 text-amber-600" /> Detalle de Cajas:
									</span>
									<Badge class="bg-amber-600 text-white text-[9px] font-mono">
										{esMultipleCajas ? cajas.length : Math.max(1, Number(cantidadCajasUnica) || 1)} {(esMultipleCajas ? cajas.length : Math.max(1, Number(cantidadCajasUnica) || 1)) === 1 ? 'CAJA' : 'CAJAS'}
									</Badge>
								</div>
								{#if esMultipleCajas}
									<div class="space-y-1 max-h-32 overflow-y-auto pr-1">
										{#each cajas as c}
											{@const cProd = productos.find((p) => String(p.id) === String(c.producto_id))}
											{@const cPrecio = getPrecioVentaProducto(cProd)}
											<div class="flex justify-between text-[11px]">
												<span class="truncate font-semibold uppercase">{cProd ? `[${cProd.codigo}] ${cProd.descripcion}` : `Caja ${c.numero} (Sin seleccionar)`}</span>
												<span class="font-mono font-bold text-foreground">${cPrecio.toFixed(2)}</span>
											</div>
										{/each}
									</div>
								{:else if productoObj}
									<div class="flex justify-between text-[11px] pt-0.5">
										<span class="font-semibold uppercase truncate">[{productoObj.codigo}] {productoObj.descripcion}</span>
										<span class="font-mono font-bold">x{Math.max(1, Number(cantidadCajasUnica) || 1)}</span>
									</div>
									<div class="flex justify-between text-[10px] text-muted-foreground">
										<span>Precio Unitario:</span>
										<span class="font-mono font-bold text-foreground">${getPrecioVentaProducto(productoObj).toFixed(2)} c/u</span>
									</div>
								{:else}
									<span class="text-[11px] text-muted-foreground italic block">Seleccione una caja en el Paso 2</span>
								{/if}
							</div>
						{:else}
							<!-- Desglose de Pesos y Dimensiones -->
							<div class="p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1 text-xs">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Peso Reportado:</span>
									<span class="font-mono font-bold">{pesoReportado} LB</span>
								</div>
								{#if alto > 0 || ancho > 0 || largo > 0}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Medidas (in):</span>
										<span class="font-mono">{alto} × {ancho} × {largo}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-muted-foreground">Peso Volumétrico:</span>
										<span class="font-mono font-bold">{pesoVolumetric} LB</span>
									</div>
								{/if}
								<div class="flex justify-between border-t pt-1 font-bold text-primary">
									<span>Peso Mayor Facturable:</span>
									<span class="font-mono text-sm">{pesoFacturable} LB</span>
								</div>
							</div>

							<!-- Desglose de Entrega & Proveedor -->
							<div class="p-2.5 rounded-lg border bg-card space-y-1 text-xs">
								<div class="flex justify-between items-center border-b pb-1 font-bold">
									<span class="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
										<Truck class="w-3.5 h-3.5 text-primary" /> Entrega & Transporte:
									</span>
									<Badge variant={tipoEntrega === 'oficina' ? 'secondary' : 'outline'} class="uppercase text-[9px] font-bold">
										{tipoEntrega === 'oficina' ? 'OFICINA / OCURRE' : 'DOMICILIO'}
									</Badge>
								</div>
								{#if !isCliente}
									<div class="text-[11px] pt-0.5">
										<span class="text-muted-foreground block text-[10px] uppercase font-bold">Proveedor:</span>
										<span class="font-bold uppercase text-primary block">{proveedorObj ? proveedorObj.nombre : 'NO SELECCIONADO'}</span>
									</div>
								{/if}
								{#if direccionEntrega}
									<div class="text-[10px] text-muted-foreground border-t pt-1 font-mono">
										<span class="font-bold text-foreground block uppercase font-sans">Dirección Destino:</span>
										{direccionEntrega}
									</div>
								{/if}
							</div>

							<!-- Desglose de Artículos Declarados en el Envío -->
							{#if articulosSeleccionados.length > 0}
								<div class="p-2.5 rounded-lg border bg-card space-y-1.5 text-xs">
									<div class="flex items-center justify-between font-bold border-b pb-1">
										<span class="flex items-center gap-1 text-muted-foreground uppercase text-[10px]">
											<Boxes class="w-3.5 h-3.5 text-primary" /> Artículos ({articulosSeleccionados.length}):
										</span>
										<span class="font-mono text-emerald-600">${valorDeclarado.toFixed(2)}</span>
									</div>
									<div class="space-y-1 max-h-32 overflow-y-auto pr-1">
										{#each articulosSeleccionados as art}
											<div class="flex justify-between text-[11px]">
												<span class="truncate font-semibold uppercase">{art.nombre} (x{art.cantidad})</span>
												<span class="font-mono text-emerald-600">${Number(art.valor_total).toFixed(2)}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}

						<!-- Tarifa Base / Subtotal Cajas -->
						<div class="flex items-center justify-between border-b pb-2">
							<span class="text-xs text-muted-foreground">
								{esVentaCajas ? 'Monto Base Cajas:' : 'Costo Tarifa Base'}
								{#if !esVentaCajas && !esMultipleCajas && esTarifaPorPeso}<span class="text-[10px] text-primary font-bold">(${tarifaEncontrada ? tarifaEncontrada.precio : 0}/LB x {pesoReportado || 0} LB):</span>{/if}
							</span>
							{#if isTarifaInexistente}
								<Badge variant="destructive" class="text-[10px] font-bold uppercase animate-pulse">
									{esVentaCajas ? 'PRECIO $0' : 'TARIFA INVÁLIDA ($0)'}
								</Badge>
							{:else}
								<span class="font-mono font-bold text-sm">${montoBase.toFixed(2)}</span>
							{/if}
						</div>

						{#if isTarifaInexistente}
							<div class="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-[11px] font-bold space-y-1">
								<div class="flex items-center gap-1 text-rose-800 dark:text-rose-300 font-extrabold uppercase text-[10px]">
									<AlertTriangle class="w-3.5 h-3.5 shrink-0 text-rose-600" /> {esVentaCajas ? 'Sin Precio de Venta ($0)' : 'Sin Tarifa Válida ($0)'}
								</div>
								<p class="leading-tight">
									{esVentaCajas
										? 'Configure un Precio de Venta mayor a $0.00 en el catálogo de Productos.'
										: 'El costo base $0.00 solo se acepta si el Tipo de Tarifa está definido como Promoción.'}
								</p>
							</div>
						{/if}

						<!-- Descuento por Cajas no descontadas del inventario -->
						{#if totalDescuentoCajasSinInventario > 0}
							<div class="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1.5 text-xs">
								<div class="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
									<span class="text-[10px] uppercase flex items-center gap-1">
										<Tag class="w-3.5 h-3.5 text-amber-600" /> Cajas del Cliente (Sin Stock):
									</span>
									<span class="font-mono font-bold text-destructive">-${totalDescuentoCajasSinInventario.toFixed(2)}</span>
								</div>
								<div class="space-y-0.5 text-[10px] text-muted-foreground border-t border-amber-500/20 pt-1">
									{#each descuentosCajasSinInventario as dItem}
										<div class="flex justify-between items-center">
											<span class="truncate uppercase font-medium">{dItem.nombre}</span>
											<span class="font-mono font-bold text-destructive shrink-0">-${dItem.monto.toFixed(2)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Desglose de Cargos Adicionales e Individuales -->
						{#if cargosDescuentosAplicados.length > 0}
							<div class="p-2.5 rounded-lg border bg-card space-y-1.5 text-xs">
								<span class="font-bold border-b pb-1 block text-muted-foreground text-[10px] uppercase">Cargos & Descuentos Detallados:</span>
								{#each cargosDescuentosAplicados as cd}
									{@const effectiveMonto = getCargoDescuentoMonto(cd)}
									<div class="flex justify-between items-baseline text-[11px]">
										<div class="flex flex-col">
											<span class={`font-semibold uppercase ${cd.tipo === 'cargo' ? 'text-emerald-600' : 'text-destructive'}`}>
												{cd.tipo === 'cargo' ? '(+)' : '(-)'} {cd.nombre}
											</span>
											{#if cd.es_porcentaje}
												<span class="text-[9px] text-muted-foreground font-mono">
													{cd.porcentaje}% de ${montoBase.toFixed(2)}
												</span>
											{/if}
										</div>
										<span class={`font-mono font-bold ${cd.tipo === 'cargo' ? 'text-emerald-600' : 'text-destructive'}`}>
											{cd.tipo === 'cargo' ? '+' : '-'}${effectiveMonto.toFixed(2)}
										</span>
									</div>
								{/each}
							</div>
						{:else}
							{#if montoTotalCargos > 0}
								<div class="flex items-center justify-between border-b pb-2 text-emerald-600 dark:text-emerald-400">
									<span class="text-xs font-semibold flex items-center gap-1">
										<Plus class="w-3 h-3" /> Cargos Adicionales:
									</span>
									<span class="font-mono font-bold text-sm">+${montoTotalCargos.toFixed(2)}</span>
								</div>
							{/if}
							{#if montoTotalDescuentos > 0}
								<div class="flex items-center justify-between border-b pb-2 text-destructive">
									<span class="text-xs font-semibold flex items-center gap-1">
										- Descuentos:
									</span>
									<span class="font-mono font-bold text-sm">-${montoTotalDescuentos.toFixed(2)}</span>
								</div>
							{/if}
						{/if}

						<!-- Subtotal -->
						<div class="flex items-center justify-between border-b pb-2">
							<span class="text-xs font-semibold">Subtotal:</span>
							<span class="font-mono font-bold text-sm">${montoSubtotal.toFixed(2)}</span>
						</div>

						<!-- Seguro -->
						{#if !esVentaCajas && requiereSeguro}
							<div class="flex items-center justify-between border-b pb-2 text-amber-600 dark:text-amber-400">
								<span class="text-xs font-semibold flex items-center gap-1">
									🛡️ Seguro ({porcentajeSeguroAplicado}%):
								</span>
								<span class="font-mono font-bold text-sm">+${montoSeguro.toFixed(2)}</span>
							</div>
						{/if}

						<!-- TOTAL FINAL -->
						<div class="flex items-center justify-between pt-2 text-lg font-extrabold border-t">
							<span>TOTAL:</span>
							<span class="font-mono text-2xl text-emerald-600 dark:text-emerald-400">${montoTotal.toFixed(2)}</span>
						</div>

						<!-- Desglose de Abonos Registrados y Saldo Pendiente -->
						{#if pagosRegistrados.length > 0}
							<div class="p-2.5 rounded-lg border bg-card space-y-1.5 text-xs">
								<span class="font-bold border-b pb-1 block text-muted-foreground text-[10px] uppercase">Desglose de Abonos Registrados:</span>
								{#each pagosRegistrados as p}
									<div class="flex justify-between text-[11px]">
										<div>
											<span class="font-semibold uppercase text-primary">{p.concepto_nombre}</span>
											{#if (p.porcentaje_comision || 0) > 0}
												<span class="text-[9px] text-indigo-600 block">+{p.porcentaje_comision}% recargo (${(p.monto_comision || 0).toFixed(2)})</span>
											{/if}
										</div>
										<div class="text-right">
											<span class="font-mono font-bold text-emerald-600">${Number(p.monto).toFixed(2)}</span>
											{#if (p.monto_comision || 0) > 0}
												<span class="text-[9px] text-muted-foreground block">Cobro: ${(p.monto_cobrado || p.monto).toFixed(2)}</span>
											{/if}
										</div>
									</div>
								{/each}
								<div class="border-t pt-1 space-y-1 mt-1">
									<div class="flex justify-between font-bold text-xs">
										<span>Total Abonado:</span>
										<span class="font-mono text-emerald-600">${montoPagado.toFixed(2)}</span>
									</div>
									<div class="flex justify-between font-bold text-xs text-destructive">
										<span>Saldo Pendiente:</span>
										<span class="font-mono">${montoPendiente.toFixed(2)}</span>
									</div>
								</div>
							</div>
						{:else if montoPagado > 0}
							<div class="p-2.5 rounded-lg bg-muted/40 space-y-1 text-xs">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Total Abonado:</span>
									<span class="font-mono font-bold text-emerald-600">${montoPagado.toFixed(2)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Saldo Pendiente:</span>
									<span class="font-mono font-bold text-destructive">${montoPendiente.toFixed(2)}</span>
								</div>
							</div>
						{/if}

						<!-- Botones de Acción -->
						<div class="pt-3 space-y-2">
							{#if esVentaCajas ? (!clienteOrigenId || (esMultipleCajas ? (cajas.length === 0 || cajas.some((c) => !c.producto_id)) : !productoId) || isTarifaInexistente) : (!clienteOrigenId || (!clienteDestinoId && !destinatarioEnTienda) || (esMultipleCajas ? (cajas.length === 0 || cajas.some((c) => !c.tipo_tarifa_id || !c.producto_id)) : !productoId) || isSobrepeso || isTarifaInexistente)}
								<div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-semibold flex items-start gap-1.5">
									<AlertTriangle class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
									<div>
										<span class="font-bold block uppercase text-[10px]">Condición pendiente para Registrar Pago:</span>
										{#if !clienteOrigenId}
											<span>• Seleccione el {esVentaCajas ? 'Cliente Comprador' : 'Cliente Remitente'} (Paso 1).</span>
										{:else if !esVentaCajas && !clienteDestinoId && !destinatarioEnTienda}
											<span>• Seleccione el Cliente Consignatario (Paso 1).</span>
										{:else if esVentaCajas && esMultipleCajas && (cajas.length === 0 || cajas.some((c) => !c.producto_id))}
											<span>• Seleccione la Caja / Producto en todas las filas (Paso 2).</span>
										{:else if esVentaCajas && !esMultipleCajas && !productoId}
											<span>• Seleccione la Caja / Producto a vender (Paso 2).</span>
										{:else if !esVentaCajas && esMultipleCajas && (cajas.length === 0 || cajas.some((c) => !c.tipo_tarifa_id || !c.producto_id))}
											<span>• Seleccione Tipo de Tarifa y Producto en todas las cajas (Paso 2).</span>
										{:else if !esVentaCajas && !esMultipleCajas && !productoId}
											<span>• Seleccione el Tipo de Tarifa y Producto (Paso 2).</span>
										{:else if isTarifaInexistente}
											<span>• {esVentaCajas ? 'El producto seleccionado tiene Precio de Venta $0.00 (Paso 2).' : 'La tarifa seleccionada no es válida o es $0.00 sin ser Promoción (Paso 2).'}</span>
										{:else if isSobrepeso}
											<span>• El peso excede el límite máximo permitido (Paso 2).</span>
										{/if}
									</div>
								</div>
							{/if}
							<Button
								type="button"
								onclick={openPagoModal}
								disabled={
									esVentaCajas
										? !clienteOrigenId ||
											(esMultipleCajas ? cajas.length === 0 || cajas.some((c) => !c.producto_id) : !productoId) ||
											isTarifaInexistente
										: !clienteOrigenId ||
											(!clienteDestinoId && !destinatarioEnTienda) ||
											(esMultipleCajas
												? cajas.length === 0 || cajas.some((c) => !c.tipo_tarifa_id || !c.producto_id)
												: !productoId) ||
											isSobrepeso ||
											isTarifaInexistente
								}
								class="w-full gap-2 font-bold py-5 text-sm"
							>
								<CreditCard class="w-4 h-4" /> Registrar Pago / Cobro Mixto
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		{/if}
	</div>

	<!-- Tarjeta Banner de Acceso al Historial -->
	<Card class="mt-8 bg-muted/20 border-dashed">
		<CardContent class="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<FileText class="w-5 h-5 text-primary shrink-0" />
				<div>
					<h3 class="text-sm font-bold">¿Deseas consultar o filtrar el historial completo de operaciones?</h3>
					<p class="text-xs text-muted-foreground">Accede al registro paginado con filtros por estatus de venta y cobro.</p>
				</div>
			</div>
			<Button href="/ventas/historial" variant="outline" size="sm" class="gap-1.5 shrink-0">
				Ir a Historial Ventas <ArrowRight class="w-3.5 h-3.5" />
			</Button>
		</CardContent>
	</Card>
</div>

<!-- MODAL: CREAR NUEVO CLIENTE COMPLETO (Normas de Maestro de Clientes) -->
{#if isCreateClientOpen}
	<Dialog bind:open={isCreateClientOpen}>
		<DialogContent class="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<UserPlus class="w-5 h-5 text-primary" /> Registrar Nuevo Cliente ({targetClientRoleForCreation === 'origen' ? 'Remitente' : 'Consignatario'})
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/createClientFromVenta" use:enhance autocomplete="off" class="space-y-4 py-2">
				<!-- Sección 1: Identificación y Contacto -->
				<div class="p-3.5 rounded-lg border bg-card space-y-3">
					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Nombre Completo *</Label>
							<InputUppercase name="nombre_completo" required bind:value={clientModalNombre} placeholder="EJ. JUAN PÉREZ" class="text-xs" />
						</div>
						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Correo Electrónico (Opcional)</Label>
							<Input name="email" type="email" autocomplete="off" bind:value={clientModalEmail} placeholder="juan@ejemplo.com (o dejar vacío si no posee)" class="text-xs lowercase" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Cédula / RIF / ID</Label>
							<InputUppercase name="cedula" bind:value={clientModalCedula} placeholder="EJ. V-12345678" class="text-xs" />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Número Celular</Label>
							<Input name="numero_celular" type="tel" autocomplete="off" bind:value={clientModalCelular} placeholder="+584141234567" class="text-xs font-mono" />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Teléfono Fijo</Label>
							<Input name="telefono" type="tel" autocomplete="off" bind:value={clientModalTelefono} placeholder="+582121234567" class="text-xs font-mono" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-7">
							<Label class="text-xs font-semibold">Razón Social</Label>
							<InputUppercase name="razon_social" bind:value={clientModalRazonSocial} placeholder="EJ. INVERSIONES PÉREZ C.A. (OPCIONAL)" class="text-xs" />
						</div>
						<div class="space-y-1.5 md:col-span-5">
							<Label class="text-xs font-semibold">Tipo de Adquisición</Label>
							<select name="tipo_adquisicion_id" bind:value={clientModalTipoAdquisicionId} class="w-full h-9 px-2.5 rounded-md border bg-background text-xs uppercase">
								<option value="">-- SELECCIONAR --</option>
								{#each tipoAdquisiciones as ta}
									<option value={String(ta.id)}>{ta.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Sección 2: Geodatos y Direcciones de Ancho Completo (Estilo Proveedor) -->
				<div class="p-3.5 rounded-lg border bg-muted/20 space-y-3">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
							<MapPin class="w-3.5 h-3.5" /> Ubicación Geográfica y Dirección Completa
						</span>
						<span class="text-[11px] text-muted-foreground">Selecciona País + Código Postal y pulsa el icono para autocompletar</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-5">
							<Label class="text-xs font-semibold">País *</Label>
							<select name="pais_id" bind:value={clientModalPaisId} class="w-full h-9 px-2.5 rounded-md border bg-background text-xs uppercase font-medium">
								<option value="">-- SELECCIONAR PAÍS --</option>
								{#each paises as p}
									<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5 md:col-span-3">
							<Label class="text-xs font-semibold">Código Postal</Label>
							<div class="flex gap-1.5">
								<InputUppercase name="codigo_postal" bind:value={clientModalCodigoPostal} class="text-xs h-9 bg-background" />
								<Button type="button" variant="outline" size="icon" class="h-9 w-9 shrink-0" onclick={handleGeoSearch} disabled={searchingGeo} title="Buscar Geolocalización por Código Postal">
									{#if searchingGeo}
										<Loader2 class="w-3.5 h-3.5 animate-spin" />
									{:else}
										<MapPin class="w-3.5 h-3.5 text-primary" />
									{/if}
								</Button>
							</div>
						</div>

						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Estado / Provincia</Label>
							<InputUppercase name="estado" bind:value={clientModalEstado} class="text-xs h-9 bg-background" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Ciudad</Label>
							<InputUppercase name="ciudad" bind:value={clientModalCiudad} class="text-xs h-9 bg-background" />
						</div>

						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Municipio / Condado</Label>
							<InputUppercase name="municipio" bind:value={clientModalMunicipio} class="text-xs h-9 bg-background" />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-semibold">Dirección Principal (Línea 1 - Calle, Av., Urbanización, Edificio, Casa)</Label>
						<InputUppercase name="direccion_1" bind:value={clientModalDireccion1} placeholder="AV. PRINCIPAL, CALLE 2, URBANIZACIÓN, EDIFICIO..." class="text-xs bg-background" />
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-7">
							<Label class="text-xs font-semibold">Dirección Secundaria (Línea 2 - Apto, Piso, Local, Punto de Referencia)</Label>
							<InputUppercase name="direccion_2" bind:value={clientModalDireccion2} placeholder="EDIFICIO A, PISO 3, APTO 3-B..." class="text-xs bg-background" />
						</div>

						<div class="space-y-1.5 md:col-span-5">
							<Label class="text-xs font-semibold">Referencia Adicional</Label>
							<InputUppercase name="referencia" bind:value={clientModalReferencia} class="text-xs bg-background" />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isCreateClientOpen = false)}>Cancelar</Button>
					<Button type="submit">Guardar Cliente</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- MODAL: EDITAR CLIENTE EXISTENTE COMPLETO -->
{#if isEditClientOpen}
	<Dialog bind:open={isEditClientOpen}>
		<DialogContent class="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<Edit class="w-5 h-5 text-primary" /> Editar Datos del Cliente
				</DialogTitle>
			</DialogHeader>

			<form method="POST" action="?/updateClientFromVenta" use:enhance autocomplete="off" class="space-y-4 py-2">
				<input type="hidden" name="id" value={clientModalId} />

				<!-- Sección 1: Identificación y Contacto -->
				<div class="p-3.5 rounded-lg border bg-card space-y-3">
					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Nombre Completo *</Label>
							<InputUppercase name="nombre_completo" required bind:value={clientModalNombre} class="text-xs" />
						</div>
						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Correo Electrónico (Opcional)</Label>
							<Input name="email" type="email" autocomplete="off" bind:value={clientModalEmail} placeholder="correo@ejemplo.com (o vacío)" class="text-xs lowercase" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Cédula / RIF / ID</Label>
							<InputUppercase name="cedula" bind:value={clientModalCedula} class="text-xs" />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Número Celular</Label>
							<Input name="numero_celular" type="tel" autocomplete="off" bind:value={clientModalCelular} class="text-xs font-mono" />
						</div>
						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Teléfono Fijo</Label>
							<Input name="telefono" type="tel" autocomplete="off" bind:value={clientModalTelefono} class="text-xs font-mono" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-7">
							<Label class="text-xs font-semibold">Razón Social</Label>
							<InputUppercase name="razon_social" bind:value={clientModalRazonSocial} class="text-xs" />
						</div>
						<div class="space-y-1.5 md:col-span-5">
							<Label class="text-xs font-semibold">Tipo de Adquisición</Label>
							<select name="tipo_adquisicion_id" bind:value={clientModalTipoAdquisicionId} class="w-full h-9 px-2.5 rounded-md border bg-background text-xs uppercase">
								<option value="">-- SELECCIONAR --</option>
								{#each tipoAdquisiciones as ta}
									<option value={String(ta.id)}>{ta.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Sección 2: Geodatos y Direcciones de Ancho Completo (Estilo Proveedor) -->
				<div class="p-3.5 rounded-lg border bg-muted/20 space-y-3">
					<div class="flex items-center justify-between border-b pb-1.5">
						<span class="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
							<MapPin class="w-3.5 h-3.5" /> Ubicación Geográfica y Dirección Completa
						</span>
						<span class="text-[11px] text-muted-foreground">Selecciona País + Código Postal y pulsa el icono para autocompletar</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-5">
							<Label class="text-xs font-semibold">País *</Label>
							<select name="pais_id" bind:value={clientModalPaisId} class="w-full h-9 px-2.5 rounded-md border bg-background text-xs uppercase font-medium">
								<option value="">-- SELECCIONAR PAÍS --</option>
								{#each paises as p}
									<option value={String(p.id)}>{p.nombre.toUpperCase()}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5 md:col-span-3">
							<Label class="text-xs font-semibold">Código Postal</Label>
							<div class="flex gap-1.5">
								<InputUppercase name="codigo_postal" bind:value={clientModalCodigoPostal} class="text-xs h-9 bg-background" />
								<Button type="button" variant="outline" size="icon" class="h-9 w-9 shrink-0" onclick={handleGeoSearch} disabled={searchingGeo} title="Buscar Geolocalización por Código Postal">
									{#if searchingGeo}
										<Loader2 class="w-3.5 h-3.5 animate-spin" />
									{:else}
										<MapPin class="w-3.5 h-3.5 text-primary" />
									{/if}
								</Button>
							</div>
						</div>

						<div class="space-y-1.5 md:col-span-4">
							<Label class="text-xs font-semibold">Estado / Provincia</Label>
							<InputUppercase name="estado" bind:value={clientModalEstado} class="text-xs h-9 bg-background" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Ciudad</Label>
							<InputUppercase name="ciudad" bind:value={clientModalCiudad} class="text-xs h-9 bg-background" />
						</div>

						<div class="space-y-1.5 md:col-span-6">
							<Label class="text-xs font-semibold">Municipio / Condado</Label>
							<InputUppercase name="municipio" bind:value={clientModalMunicipio} class="text-xs h-9 bg-background" />
						</div>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-semibold">Dirección Principal (Línea 1 - Calle, Av., Urbanización, Edificio, Casa)</Label>
						<InputUppercase name="direccion_1" bind:value={clientModalDireccion1} class="text-xs bg-background" />
					</div>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-3">
						<div class="space-y-1.5 md:col-span-7">
							<Label class="text-xs font-semibold">Dirección Secundaria (Línea 2 - Apto, Piso, Local, Punto de Referencia)</Label>
							<InputUppercase name="direccion_2" bind:value={clientModalDireccion2} class="text-xs bg-background" />
						</div>

						<div class="space-y-1.5 md:col-span-5">
							<Label class="text-xs font-semibold">Referencia Adicional</Label>
							<InputUppercase name="referencia" bind:value={clientModalReferencia} class="text-xs bg-background" />
						</div>
					</div>
				</div>

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditClientOpen = false)}>Cancelar</Button>
					<Button type="submit">Actualizar Datos</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

<!-- MODAL: REGISTRAR PAGO Y COBRO MIXTO -->
{#if isPagoModalOpen}
	<Dialog bind:open={isPagoModalOpen}>
		<DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<CreditCard class="w-5 h-5 text-primary" /> Procesar Cobro Mixto de Venta
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-4 py-2 text-sm">
				<div class="p-3 rounded-lg bg-muted/40 space-y-1">
					<div class="flex justify-between font-bold">
						<span>Monto Total Venta:</span>
						<span class="font-mono text-emerald-600 text-base">${montoTotal.toFixed(2)}</span>
					</div>
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>Total Abonado:</span>
						<span class="font-mono">${montoPagado.toFixed(2)}</span>
					</div>
					<div class="flex justify-between text-xs font-semibold text-destructive">
						<span>Restante Pendiente:</span>
						<span class="font-mono">${montoPendiente.toFixed(2)}</span>
					</div>
				</div>

				<!-- Formulario para agregar métodos de pago -->
				<div class="space-y-3 border p-3 rounded-lg">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<Label class="text-xs mb-1 block">Método de Pago *</Label>
							<select bind:value={selectedConceptoPagoId} class="w-full h-9 px-2.5 rounded-md border text-xs uppercase">
								<option value="">-- SELECCIONAR --</option>
								{#each conceptosPago as cp}
									<option value={String(cp.id)}>
										{cp.nombre}{Number(cp.porcentaje_comision || 0) > 0 ? ` (+${Number(cp.porcentaje_comision).toFixed(1)}% COMISIÓN)` : ''}
									</option>
								{/each}
							</select>
						</div>

						<div>
							<Label class="text-xs mb-1 block">Monto a Abonar ($) *</Label>
							<Input type="number" step="0.01" min="0.01" bind:value={pagoMontoInput} class="h-9 text-xs" />
						</div>
					</div>

					<!-- Referencia bancaria si el concepto la exige -->
					<div>
						<Label class="text-xs mb-1 block">Referencia de Operación (4 a 9 dígitos numéricos)</Label>
						<Input type="text" placeholder="EJ. 1234567" bind:value={pagoReferenciaInput} class="h-9 text-xs font-mono" />
					</div>

					<!-- Desglose de Comisión si el método de pago tiene recargo (ej. Tarjeta de Crédito) -->
					{#if abonoComisionPct > 0 && pagoMontoInput > 0}
						<div class="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/20 text-xs space-y-1">
							<div class="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
								<span class="flex items-center gap-1">
									<Percent class="w-3.5 h-3.5" /> Recargo Comisión ({abonoComisionPct.toFixed(2)}%):
								</span>
								<span class="font-mono font-bold">+${abonoComisionMonto.toFixed(2)}</span>
							</div>
							<div class="flex items-center justify-between border-t border-indigo-200/60 pt-1 font-bold text-foreground">
								<span>Total a Cobrar al Cliente:</span>
								<span class="font-mono text-sm text-indigo-600 dark:text-indigo-400">${abonoTotalCobrado.toFixed(2)}</span>
							</div>
							<p class="text-[10px] text-muted-foreground italic pt-0.5">
								* Amortiza a la deuda de la venta: ${pagoMontoInput.toFixed(2)}. La comisión por {selectedConceptoObj?.nombre} es ${abonoComisionMonto.toFixed(2)}.
							</p>
						</div>
					{/if}

					<Button type="button" variant="secondary" size="sm" onclick={addPagoRegistrado} class="w-full gap-1">
						<Plus class="w-4 h-4" /> Agregar Abono
					</Button>
				</div>

				<!-- Lista de Pagos Agregados -->
				{#if pagosRegistrados.length > 0}
					<div class="border rounded-lg divide-y">
						{#each pagosRegistrados as p, index}
							<div class="p-2.5 flex items-center justify-between text-xs">
								<div>
									<span class="font-bold uppercase block">{p.concepto_nombre}</span>
									{#if (p.porcentaje_comision || 0) > 0}
										<span class="text-[10px] font-semibold text-indigo-600 block">
											Recargo {p.porcentaje_comision}%: +${(p.monto_comision || 0).toFixed(2)} (Cobrado: ${(p.monto_cobrado || p.monto).toFixed(2)})
										</span>
									{/if}
									{#if p.referencia}
										<span class="text-[10px] text-muted-foreground font-mono">Ref: {p.referencia}</span>
									{/if}
								</div>

								<div class="flex items-center gap-3">
									<div class="text-right">
										<span class="font-mono font-bold text-emerald-600 block">${Number(p.monto).toFixed(2)}</span>
										{#if (p.monto_comision || 0) > 0}
											<span class="text-[10px] text-muted-foreground block">Cobrado: ${(p.monto_cobrado || p.monto).toFixed(2)}</span>
										{/if}
									</div>
									<Button type="button" variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-destructive" onclick={() => removePagoRegistrado(index)}>
										<Trash2 class="w-3.5 h-3.5" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<DialogFooter class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isPagoModalOpen = false)}>Cerrar</Button>
				</DialogFooter>
			</div>
		</DialogContent>
	</Dialog>
{/if}

<!-- MODAL: DETALLE DE VENTA -->
{#if isDetailOpen && selectedVentaDetail}
	<Dialog bind:open={isDetailOpen}>
		<DialogContent class="sm:max-w-xl max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle class="text-xl font-bold flex items-center gap-2">
					<FileText class="w-5 h-5 text-primary" /> Detalle de la Venta {selectedVentaDetail.codigo_venta}
				</DialogTitle>
			</DialogHeader>

			<div class="space-y-3 py-2 text-xs">
				<div class="flex justify-between border-b pb-2">
					<span class="text-muted-foreground">Estatus Venta:</span>
					<Badge variant="outline" class="uppercase font-bold">{selectedVentaDetail.estatus_venta}</Badge>
				</div>

				<div class="flex justify-between border-b pb-2">
					<span class="text-muted-foreground">Estatus Pago:</span>
					<Badge variant="outline" class="uppercase font-bold">{selectedVentaDetail.estatus_pago}</Badge>
				</div>

				<div class="border-b pb-2">
					<span class="text-muted-foreground block">Remitente:</span>
					<span class="font-bold uppercase text-sm block">{selectedVentaDetail.cliente_origen?.nombre_completo}</span>
				</div>

				<div class="border-b pb-2">
					<span class="text-muted-foreground block">Consignatario:</span>
					<span class="font-bold uppercase text-sm block">{selectedVentaDetail.cliente_destino?.nombre_completo}</span>
					{#if selectedVentaDetail.cliente_destino?.cedula}
						<span class="text-primary font-mono font-bold">Cédula VE: {selectedVentaDetail.cliente_destino.cedula}</span>
					{/if}
				</div>

				<div class="flex justify-between border-b pb-2 font-bold">
					<span>Total Venta:</span>
					<span class="font-mono text-base text-emerald-600">${selectedVentaDetail.monto_total.toFixed(2)}</span>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={() => (isDetailOpen = false)}>Cerrar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
