<script lang="ts">
	import type { VentaWithRelations, ConfiguracionGeneral } from '$lib/types/database';

	interface Props {
		venta?: VentaWithRelations | null;
		config?: ConfiguracionGeneral | null;
		barcodeSvg?: string;
		invoiceCode?: string;
		isPrintMode?: boolean;
	}

	let { venta = null, config = null, barcodeSvg = '', invoiceCode = '', isPrintMode = false }: Props = $props();

	// Datos derivados con valores por defecto idénticos al documento PDF de referencia
	const remitente = $derived.by(() => {
		if (venta?.cliente_origen) {
			const o = venta.cliente_origen;
			const dirParts = [o.direccion_1, o.ciudad, o.estado, o.codigo_postal, (o as any).pais?.nombre || 'USA'].filter(Boolean);
			return {
				nombre: o.nombre_completo || 'JHONATAN FLORES',
				direccion: dirParts.join(' ') || '48 BROCLYN CHASE JEFFERSON GA 30549 USA',
				email: o.email || '',
				telefono: o.telefono || o.numero_celular || '4706230710'
			};
		}
		return {
			nombre: 'JHONATAN FLORES',
			direccion: '48 BROCLYN CHASE JEFFERSON GA 30549 USA',
			email: '',
			telefono: '4706230710'
		};
	});

	const destinatario = $derived.by(() => {
		if (venta?.cliente_destino) {
			const d = venta.cliente_destino;
			const dirParts = [
				venta.direccion_entrega || d.direccion_1,
				d.ciudad,
				d.estado,
				d.codigo_postal,
				venta.pais_destino?.nombre || (d as any).pais?.nombre || 'MEX'
			].filter(Boolean);
			return {
				nombre: d.nombre_completo || 'ANGELICA CASILDO',
				direccion: dirParts.join(' ') || 'LAGUNA DE TORONTO SN EL NARANJO MANZANILLO COLIMA 28868 MEX',
				email: d.email || '',
				telefono: d.telefono || d.numero_celular || '3141475199'
			};
		}
		return {
			nombre: 'ANGELICA CASILDO',
			direccion: 'LAGUNA DE TORONTO SN EL NARANJO MANZANILLO COLIMA 28868 MEX',
			email: '',
			telefono: '3141475199'
		};
	});

	const trackingNumber = $derived.by(() => {
		const base = venta?.guia_proveedor || invoiceCode || venta?.codigo_venta || '123456789123456789123';
		const cajaNum = (venta as any)?.caja_numero;
		return cajaNum && !String(base).includes(cajaNum) ? `${base} (CAJA ${cajaNum})` : base;
	});

	const agenteNombre = $derived(venta?.vendedor?.nombre_completo || venta?.proveedor?.nombre || 'PRINCIPAL');

	const fechaEmision = $derived.by(() => {
		if (venta?.created_at) {
			const d = new Date(venta.created_at);
			return `${d.toLocaleDateString()}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`;
		}
		return '27/9/2026, 6:34:59 P. M.';
	});

	// Mercancía declarada
	const items = $derived.by(() => {
		if (venta?.articulos_registrados && venta.articulos_registrados.length > 0) {
			return venta.articulos_registrados.map((a: any) => ({
				cantidad: a.cantidad || 1,
				descripcion: a.nombre || 'MERCANCÍA GENERAL',
				valor: Number(a.valor_total || 0).toFixed(2)
			}));
		}
		return [
			{
				cantidad: 1,
				descripcion: 'ALMOHADAS',
				valor: '20'
			}
		];
	});

	// Pesos y Dimensiones
	const peso = $derived(venta?.peso_reportado || venta?.peso || 50);
	const largo = $derived(venta?.largo || 14);
	const alto = $derived(venta?.alto || 14);
	const ancho = $derived(venta?.ancho || 14);
	const pesoVol = $derived.by(() => {
		if (venta?.peso_volumetrico) return Math.round(venta.peso_volumetrico);
		return Math.round((Number(largo) * Number(alto) * Number(ancho)) / 166) || 17;
	});

	// Desglose de Costos
	const montoBase = $derived(Number(venta?.monto_base ?? 125.0).toFixed(2));
	const valorDeclarado = $derived(Number(venta?.valor_declarado ?? 500.0).toFixed(2));
	const porcentajeSeguro = $derived(venta?.porcentaje_seguro_aplicado ?? 7);
	const montoSeguro = $derived(Number(venta?.monto_seguro ?? 35.0).toFixed(2));

	// Cargos específicos
	const montoCaja = $derived.by(() => {
		if (!venta?.cargos_descuentos_aplicados) return '0.00';
		const c = venta.cargos_descuentos_aplicados.find((x: any) => x.nombre?.toLowerCase().includes('caja'));
		return Number(c?.monto || 0).toFixed(2);
	});

	const montoHerramientas = $derived.by(() => {
		if (!venta?.cargos_descuentos_aplicados) return '25.00';
		const c = venta.cargos_descuentos_aplicados.find(
			(x: any) => x.nombre?.toLowerCase().includes('herramienta') || x.nombre?.toLowerCase().includes('wood')
		);
		return Number(c ? c.monto : 25.0).toFixed(2);
	});

	const montoEmpaque = $derived.by(() => {
		if (!venta?.cargos_descuentos_aplicados) return '15.00';
		const c = venta.cargos_descuentos_aplicados.find(
			(x: any) => x.nombre?.toLowerCase().includes('empaque') && !x.nombre?.toLowerCase().includes('reempaque')
		);
		return Number(c ? c.monto : 15.0).toFixed(2);
	});

	const montoReempaque = $derived.by(() => {
		if (!venta?.cargos_descuentos_aplicados) return '25.00';
		const c = venta.cargos_descuentos_aplicados.find(
			(x: any) => x.nombre?.toLowerCase().includes('reempaque') || x.nombre?.toLowerCase().includes('aditional wrap')
		);
		return Number(c ? c.monto : 25.0).toFixed(2);
	});

	const montoCargosAdicionales = $derived.by(() => {
		if (!venta?.cargos_descuentos_aplicados) return '0.00';
		const c = venta.cargos_descuentos_aplicados
			.filter(
				(x: any) =>
					x.tipo === 'cargo' &&
					!x.nombre?.toLowerCase().includes('seguro') &&
					!x.nombre?.toLowerCase().includes('herramienta') &&
					!x.nombre?.toLowerCase().includes('empaque') &&
					!x.nombre?.toLowerCase().includes('reempaque') &&
					!x.nombre?.toLowerCase().includes('caja')
			)
			.reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0);
		return Number(c || 0).toFixed(2);
	});

	const pagoTotal = $derived(Number(venta?.monto_total ?? 225.0).toFixed(2));
	const totalFactura = $derived(pagoTotal);

	// Pagos registrados
	const pagoEfectivo = $derived.by(() => {
		if (!venta?.pagos_registrados) return '0.00';
		const p = venta.pagos_registrados
			.filter((x: any) => x.concepto_nombre?.toLowerCase().includes('efectivo') || x.concepto_nombre?.toLowerCase().includes('cash'))
			.reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0);
		return Number(p || 0).toFixed(2);
	});

	const pagoTarjeta = $derived.by(() => {
		if (!venta?.pagos_registrados) return '0.00';
		const p = venta.pagos_registrados
			.filter(
				(x: any) =>
					x.concepto_nombre?.toLowerCase().includes('tarjeta') ||
					x.concepto_nombre?.toLowerCase().includes('card') ||
					x.concepto_nombre?.toLowerCase().includes('zelle') ||
					x.concepto_nombre?.toLowerCase().includes('transferencia')
			)
			.reduce((acc: number, curr: any) => acc + Number(curr.monto || 0), 0);
		return Number(p || 0).toFixed(2);
	});
</script>

<div class="picking-doc-wrapper font-sans text-black select-none print:select-auto">
	<!-- PÁGINA 1 -->
	<div class="picking-sheet sheet-page-1 bg-white text-black">
		<!-- Encabezado Superior -->
		<div class="header-top flex justify-between items-start">
			<!-- Dirección izquierda -->
			<div class="header-address text-left">
				{config?.direccion_empresa ? config.direccion_empresa : 'Plaza Las Américas: 733 Pleasant Hill Rd. Ste 1100 Lilburn,'}<br />
				{config?.direccion_empresa ? '' : 'GA, 30047'}
			</div>

			<!-- Logo Central -->
			<div class="header-logo text-center">
				<img
					src={config?.logo_url || '/logo.png'}
					alt={config?.nombre_empresa || 'H&H WORLD GROUP'}
					class="logo-img"
				/>
			</div>

			<!-- Sitio Web Derecho -->
			<div class="header-web text-right">
				www.hhworldgroup.com
			</div>
		</div>

		<!-- Subencabezado: Solicitud a domicilio -->
		<div class="sub-header flex justify-between items-center">
			<div class="pickup-notice">
				SOLICITE SU RECOLECCIÓN A DOMICILIO
			</div>
		</div>

		<!-- Título Central: LISTA DE EMPAQUE / PACKING LIST -->
		<div class="doc-title text-center">
			LISTA DE EMPAQUE / PACKING LIST {(venta as any)?.caja_numero ? `— CAJA ${(venta as any).caja_numero}` : ''}
		</div>

		<!-- Bloque Remitente / Shipper & Destinatario / Consignee -->
		<table class="table-shipper-consignee">
			<tbody>
				<tr>
					<!-- Columna Remitente Título -->
					<td class="col-shipper-title">
						Remitente / Shipper
					</td>
					<!-- Columna Remitente Info -->
					<td class="col-shipper-info">
						<div class="field-row">
							<span class="field-lbl">NOMBRE</span>
							<span class="field-val font-normal">{remitente.nombre}</span>
						</div>
						<div class="field-row">
							<span class="field-lbl">DIRECCIÓN</span>
							<span class="field-val">{remitente.direccion}</span>
						</div>
						<div class="field-row">
							<span class="field-lbl">E-MAIL</span>
							<span class="field-val">{remitente.email}</span>
						</div>
						<div class="field-row">
							<span class="field-lbl">TELÉFONO</span>
							<span class="field-val">{remitente.telefono}</span>
						</div>
					</td>

					<!-- Columna Destinatario Título -->
					<td class="col-consignee-title">
						Destinatario /<br />Consignee
					</td>
					<!-- Columna Destinatario Info -->
					<td class="col-consignee-info">
						<div class="field-row">
							<span class="field-lbl">NOMBRE</span>
							<span class="field-val font-normal">{destinatario.nombre}</span>
						</div>
						<div class="field-row">
							<span class="field-lbl">DIRECCIÓN</span>
							<span class="field-val">{destinatario.direccion}</span>
						</div>
						<div class="field-row">
							<span class="field-lbl">E-MAIL</span>
							<span class="field-val">{destinatario.email}</span>
						</div>
						<div class="field-row">
							<span class="field-lbl">TELÉFONO</span>
							<span class="field-val">{destinatario.telefono}</span>
						</div>
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Fila Operativa: Agente / Fecha / Código de Rastreo -->
		<table class="table-operational text-center">
			<thead>
				<tr>
					<th class="w-1/3">Agente / Agent</th>
					<th class="w-1/3">Fecha / Date</th>
					<th class="w-1/3">Código de rastreo / Tracking number</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="uppercase">{agenteNombre}</td>
					<td>{fechaEmision}</td>
					<td class="tracking-code font-mono">{trackingNumber}</td>
				</tr>
			</tbody>
		</table>

		<!-- Tabla de Artículos / Mercancía -->
		<table class="table-items">
			<thead>
				<tr>
					<th class="col-qty text-center">Cantidad / Quantity</th>
					<th class="col-desc text-center">Descripción de mercancía / Merchandise description</th>
					<th class="col-val text-center">Valor / Value</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item}
					<tr class="item-row">
						<td class="text-center">{item.cantidad}</td>
						<td class="text-center uppercase">{item.descripcion}</td>
						<td class="text-right pr-4">{item.valor}</td>
					</tr>
				{/each}
				<!-- Fila espaciadora de altura para respetar proporciones exactas del PDF -->
				<tr class="spacer-row">
					<td></td>
					<td></td>
					<td></td>
				</tr>
				<!-- Fila Total Factura -->
				<tr class="total-row">
					<td colspan="2" class="text-right font-bold pr-3">
						Total factura / Invoice total
					</td>
					<td class="text-right font-bold pr-3">
						${totalFactura}
					</td>
				</tr>
			</tbody>
		</table>

		<!-- Tabla Dimensiones y Pesos -->
		<table class="table-dimensions text-center">
			<thead>
				<tr>
					<th>PESO / WEIGHT (LBS.)</th>
					<th>LARGO / LENGTH (IN.)</th>
					<th>ALTO / HEIGHT (IN.)</th>
					<th>ANCHO / WIDTH (IN.)</th>
					<th>PESO VOL / VOL. WT.</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>{peso}</td>
					<td>{largo}</td>
					<td>{alto}</td>
					<td>{ancho}</td>
					<td>{pesoVol}</td>
				</tr>
			</tbody>
		</table>

		<!-- Desglose Financiero -->
		<div class="financial-section flex justify-between">
			<!-- Lado Izquierdo: Fórmulas de peso y seguro + Caja de pago -->
			<div class="financial-left">
				<div class="formula-row flex justify-between items-center">
					<span>
						Peso total / Total weight &nbsp;&nbsp;<strong>{peso}</strong> &nbsp;Lbs. x $ <strong>${montoBase}</strong>
					</span>
					<span class="equal-sign pr-6">= $</span>
				</div>
				<div class="formula-row flex justify-between items-center">
					<span>
						Seguro / Insurance (opcional / optional) Caja / Box &nbsp;<strong>${valorDeclarado}</strong> &nbsp;x {porcentajeSeguro}% TV &nbsp;<strong>$0.00</strong> &nbsp;x 10%
					</span>
					<span class="equal-sign pr-6">= $</span>
				</div>

				<!-- Subtabla Métodos de Pago -->
				<table class="table-payment text-center">
					<thead>
						<tr>
							<th class="w-1/2">EFECTIVO / CASH</th>
							<th class="w-1/2">TARJETA / CARD</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>${pagoEfectivo}</td>
							<td>${pagoTarjeta}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Lado Derecho: Columna de Importes -->
			<div class="financial-right text-right">
				<div class="amount-row">
					<span class="amount-label">= $</span>
					<span class="amount-val">${montoBase}</span>
				</div>
				<div class="amount-row">
					<span class="amount-label">= $</span>
					<span class="amount-val">${montoSeguro}</span>
				</div>
				<div class="amount-row">
					<span class="amount-label">Caja / Box = $</span>
					<span class="amount-val">${montoCaja}</span>
				</div>
				<div class="amount-row">
					<span class="amount-label">Herramientas / Tools = $</span>
					<span class="amount-val">${montoHerramientas}</span>
				</div>
				<div class="amount-row">
					<span class="amount-label">Cargos Adicionales / Aditional Chargers = $</span>
					<span class="amount-val">${montoCargosAdicionales}</span>
				</div>
				<div class="amount-row">
					<span class="amount-label">Empaque / Wrap = $</span>
					<span class="amount-val">${montoEmpaque}</span>
				</div>
				<div class="amount-row">
					<span class="amount-label">Reempaque / Aditional Wrap = $</span>
					<span class="amount-val">${montoReempaque}</span>
				</div>
				<div class="amount-row total-payment-row font-bold">
					<span class="amount-label">Pago Total / Total Payment = $</span>
					<span class="amount-val">${pagoTotal}</span>
				</div>
			</div>
		</div>

		<!-- Condiciones Generales de Envío (Página 1) -->
		<div class="legal-text-p1 text-justify">
			<p class="legal-heading">CONDICIONES GENERALES DEL ENVÍO</p>
			<p class="legal-paragraph">
				Conozco y estoy de acuerdo con las condiciones para el envío de artículos a través de H&H WORLD GROUP LLC. El envío de armas de cualquier tipo incluidas las de fuego, municiones, bebidas alcohólicas, líquidos corrosivos/flamables documentos ilegales, animales vivos o muertos, pieles exóticas, artículos perecederos, joyería, valores y cualquier otro artículo restringido por la Asociación Internacional de Transporte (IATA) está estrictamente prohibido. El seguro adicional cubre hasta un 80% del bien afectado, siempre y cuando se cumpla con los requisitos que exige la aseguradora. El seguro opcional es del 7% o 10% del valor declarado. Es para artículos nuevos. Si usted no adquiere el seguro opcional, en caso de pérdida o daño H&H WORLD GROUP LLC no será responsable de reembolsar ningún importe al cliente. Los gastos de flete no son reembolsables bajo ninguna circunstancia. Conozco y estoy de acuerdo con las condiciones y la responsabilidad por el contenido de los artículos dentro del envío a través de H&H WORLD GROUP LLC. Todos los envíos están sujetos a inspección por parte de H&H WORLD GROUP LLC o de las autoridades aduanales.
			</p>

			<p class="legal-heading">GENERAL TERMS OF DELIVERY</p>
			<p class="legal-paragraph">
				I do understand H&H WORLD GROUP LLC shipping terms and conditions. Sending firearms, any type of weapons, ammunition, alcoholic beverages, corrosive/flammable liquids, illegal documents, live/dead animals, exotic leathers, perishable items, jewelry, values and any other forbidden items by IATA it is prohibited without exception. The additional insurance covers up to 80% of the affected items, as long as the requirements demanded by the insurer are met. The optional 7% or 10% insurance is of the declared value. Is for new items if you do not purchase the optional insurance, in case of loss or damage H&H WORLD GROUP LLC will not be responsible for refunding any amount to the customer. Freight costs are not refundable under any circumstances. I understand, accept, and agree to the terms and conditions where I am responsible for the content in the shipments I made through H&H WORLD GROUP LLC. For all shipments received at H&H WORLD GROUP LLC, the customs authorities might review and in case of violation confiscate the shipment. It is also in our rights to inspect and review the content of the shipments.
			</p>
		</div>

		<!-- Bloque de Firmas (Página 1) -->
		<div class="signatures-p1 flex justify-between text-center">
			<div class="sig-box">
				<div class="sig-line"></div>
				<div class="sig-label">Firma del cliente / Customer's signature</div>
			</div>
			<div class="sig-box">
				<div class="sig-line"></div>
				<div class="sig-label">No quiero seguro adicional / No additional insurance requested</div>
			</div>
		</div>

		<div class="id-notice text-center font-bold">
			* Por favor firme como se muestra en su identificación / Please sign as shown on your Identification
		</div>
	</div>

	<!-- PÁGINA 2 -->
	<div class="picking-sheet sheet-page-2 bg-white text-black">
		<div class="terms-content text-left">
			<p class="terms-header font-bold">
				Al momento de realizar su envío, usted declara conocer y acepta las siguientes condiciones:
			</p>

			<ul class="terms-list">
				<li>
					<span class="bullet">•</span>
					<span>SI NO ASEGURO SU CAJA EN CASO DE PÉRDIDA O DAÑO EN SU ENVÍO H&H WORLD GROUP LLC NO SERÁ RESPONSABLE DE REEMBOLSAR NINGÚN IMPORTE.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>LOS GASTOS DE ENVÍO NO SON REEMBOLSABLES BAJO NINGUNA CIRCUNSTANCIA.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>SE LE ENTREGARÁ UN CÓDIGO DE RASTREO CON EL QUE USTED PODRÁ RASTREAR SU PAQUETE. EL CLIENTE ES RESPONSABLE DE REALIZAR EL RASTREO DE SU CAJA.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>SI REQUIERE HACER ALGÚN CAMBIO EN LA INFORMACIÓN DE SU PAQUETE CUENTA CON 24 HORAS DESPUÉS QUE HACE SU ENVÍO EN NUESTRAS OFICINAS Y TIENE UN COSTO ADICIONAL DE $20.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>EN CASO DE DAÑOS, PÉRDIDAS, ROBOS O EXTRAVÍOS CON SEGURO USTED CUENTA CON 48 HORAS CONTINUAS DESDE QUE RECIBIÓ SU PAQUETE PARA COMUNICARSE O DIRIGIRSE A LA OFICINA DONDE REALIZÓ SU ENVÍO Y PROCESAR SU RECLAMO.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>LOS REQUISITOS PARA PROCESAR UN RECLAMO SON LOS SIGUIENTES: CUALQUIER DOCUMENTO DE IDENTIFICACIÓN DEL REMITENTE (LA MISMA DEBE ESTAR VIGENTE Y QUE CONTENGA LA FIRMA DEL CLIENTE), FACTURAS O COMPROBANTES DE COMPRA DEL BIEN AFECTADO, FOTOS DE LA CAJA QUE RECIBIÓ, FIRMAR UNA CARTA DE RECLAMO ELABORADA POR LA OFICINA DONDE REALIZÓ EL ENVÍO. DEBE CUMPLIR CON TODOS ESTOS REQUISITOS DE LO CONTRARIO NO PODRÁ SER PROCESADO SU RECLAMO.</span>
				</li>
			</ul>

			<p class="terms-header font-bold mt-5">
				Antes de realizar su envío usted debe saber:
			</p>

			<ul class="terms-list">
				<li>
					<span class="bullet">•</span>
					<span>LAS CAJAS NO PUEDEN PERDER SU FORMA CUADRADA, NO PUEDEN ESTAR ABULTADAS NI ROTAS.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>EL PESO MÁXIMO PERMITIDO SON 150 LIBRAS POR CAJA. NO SE COBRA SOBREPESO.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>DEBE REALIZAR UNA LISTA DETALLADA DE LO QUE VA DENTRO DE LA CAJA EN CANTIDAD, DESCRIPCIÓN Y VALOR. H&H WORLD GROUP LLC NO SE HACE RESPONSABLE DE LOS ARTÍCULOS QUE NO ESTÉN DECLARADOS EN SU LISTA DE EMPAQUE, NI POR VALORES QUE NO CORRESPONDAN AL VALOR REAL DEL ARTÍCULO.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>NO SE HACEN CARGOS EXTRAS POR ENVIAR ARTÍCULOS NUEVOS O ELECTRÓNICOS.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>AL ENVIAR ARTÍCULOS NUEVOS Y DE VALOR ASEGÚRESE DE GUARDAR SUS RECIBOS O FACTURAS DE COMPRA, ES INDISPENSABLE PARA PODER ASEGURAR SU ENVÍO.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>AL ENVIAR ARTÍCULOS ELECTRÓNICOS Y DE VALOR DEBE TRAER LA CAJA ABIERTA YA QUE DICHOS ARTÍCULOS SON REVISADOS ANTES DE EFECTUAR EL ENVÍO.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>AL REALIZAR EL ENVÍO DE HERRAMIENTAS DEBE PAGAR UN FEE ADICIONAL, ESTE COBRO ES POR CAJA MÁS NO POR HERRAMIENTA. EL COBRO DEPENDERÁ DEL TAMAÑO DE SU CAJA.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>ASEGÚRESE DE NO ENVIAR NINGÚN ARTÍCULO PROHIBIDO COMO: ARMAS DE CUALQUIER TIPO, DINERO, JOYAS, PLANTAS Y ANIMALES VIVOS O MUERTOS, PRODUCTOS COMBUSTIBLES O INFLAMABLES, BEBIDAS ALCOHÓLICAS, MATERIAL PORNOGRÁFICO, MERCANCÍA FALSIFICADA, ESTUPEFACIENTES Y SUSTANCIAS PSICOTRÓPICAS, OBJETOS MAGNÉTICOS O RADIOACTIVOS, ENTRE OTROS.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>PARA SOLICITAR LA RECOLECCIÓN A DOMICILIO USTED DEBE COMUNICARSE AL XXXXXX. EL SERVICIO DE RECOLECCIÓN TIENE UN COSTO ADICIONAL.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>USTED PODRÁ ASEGURAR SUS ARTÍCULOS NUEVOS Y DE VALOR PAGANDO EL 7% DEL VALOR QUE DECLARE EN SU LISTA DE EMPAQUE Y LA ASEGURANZA LE REEMBOLSARÁ EN CASO DE RECLAMO HASTA EL 80% DEL VALOR DEL BIEN AFECTADO.</span>
				</li>
				<li>
					<span class="bullet">•</span>
					<span>USTED PUEDE ENVIAR ARTÍCULOS DE VIDRIO, CERÁMICA, CRISTAL O ALGÚN OTRO MATERIAL DELICADO BAJO SU RESPONSABILIDAD, ESTOS PRODUCTOS NO PUEDEN SER ASEGURADOS. USTED ES RESPONSABLE DEL EMBALAJE DE SU CAJA Y DE LOS ARTÍCULOS QUE ENVÍE, RECOMENDAMOS USAR PAPEL DE BURBUJAS PARA PROTEGER SUS ARTÍCULOS YA QUE H&H WORLD GROUP LLC NO SE HACE RESPONSABLE DE LO QUE LLEGUEN QUEBRADO A SU DESTINO.</span>
				</li>
			</ul>
		</div>

		<!-- Firma Página 2 -->
		<div class="signature-p2 text-center">
			<div class="sig-line-p2"></div>
			<div class="sig-label-p2">
				He leído y entiendo los "Términos y Condiciones" / I have read and understood the "Terms and Conditions"
			</div>
			<div class="id-notice-p2 font-bold">
				* Por favor firme como se muestra en su identificación / Please sign as shown on your Identification
			</div>
		</div>
	</div>
</div>

<style>
	/* CONTENEDOR PRINCIPAL */
	.picking-doc-wrapper {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: transparent;
		font-family: Arial, Helvetica, sans-serif;
		color: #000000;
	}

	/* HOJAS CARTA */
	.picking-sheet {
		width: 8.5in;
		min-height: 11in;
		box-sizing: border-box;
		background: #ffffff;
		margin: 0 auto 24px auto;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		border: 1px solid #e2e8f0;
	}

	.sheet-page-1 {
		padding: 0.42in 0.48in;
	}

	.sheet-page-2 {
		padding: 0.55in 0.48in;
	}

	/* ENCABEZADO */
	.header-address {
		width: 35%;
		font-size: 9.5px;
		line-height: 1.35;
		color: #1e293b;
	}

	.header-logo {
		width: 30%;
	}

	.logo-img {
		height: 72px;
		display: inline-block;
		object-fit: contain;
	}

	.header-web {
		width: 35%;
		font-size: 11px;
		font-weight: 700;
		color: #000000;
		padding-top: 36px;
	}

	.pickup-notice {
		font-size: 10.5px;
		font-weight: 700;
		color: #000000;
		margin-top: 4px;
		margin-bottom: 4px;
		letter-spacing: 0.2px;
	}

	.doc-title {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.5px;
		margin: 6px 0 10px 0;
		text-transform: uppercase;
		color: #000000;
	}

	/* TABLAS */
	table {
		width: 100%;
		border-collapse: collapse;
		border: 1px solid #000000;
		font-size: 9px;
		color: #000000;
	}

	th,
	td {
		border: 1px solid #000000;
		padding: 3.5px 4px;
		vertical-align: middle;
	}

	th {
		font-weight: 700;
		background-color: #ffffff;
	}

	/* TABLA REMITENTE Y DESTINATARIO */
	.table-shipper-consignee {
		margin-bottom: 6px;
	}

	.col-shipper-title,
	.col-consignee-title {
		width: 13.5%;
		font-weight: 700;
		vertical-align: top;
		padding: 6px 4px;
		line-height: 1.3;
	}

	.col-shipper-info,
	.col-consignee-info {
		width: 36.5%;
		vertical-align: top;
		padding: 3px 5px;
		line-height: 1.35;
	}

	.field-row {
		display: flex;
		align-items: flex-start;
		margin-bottom: 2px;
	}

	.field-lbl {
		font-weight: 700;
		width: 68px;
		flex-shrink: 0;
	}

	.field-val {
		flex-grow: 1;
		word-break: break-word;
	}

	/* TABLA OPERATIVA */
	.table-operational {
		margin-bottom: 6px;
	}

	.table-operational th {
		padding: 3px;
	}

	.table-operational td {
		padding: 3.5px;
	}

	.tracking-code {
		font-size: 10px;
		letter-spacing: 0.5px;
	}

	/* TABLA MERCANCÍA */
	.table-items {
		margin-bottom: 6px;
	}

	.table-items th {
		padding: 4px;
	}

	.col-qty {
		width: 25%;
	}

	.col-desc {
		width: 50%;
	}

	.col-val {
		width: 25%;
	}

	.item-row td {
		padding: 3px 6px;
	}

	.spacer-row td {
		height: 16px;
		border-top: none;
		border-bottom: 1px solid #000000;
	}

	.total-row td {
		padding: 4px 6px;
	}

	/* TABLA DIMENSIONES */
	.table-dimensions {
		margin-bottom: 7px;
	}

	.table-dimensions th {
		font-size: 8.5px;
		padding: 3px 2px;
		width: 20%;
	}

	.table-dimensions td {
		padding: 3.5px;
		font-size: 9.5px;
	}

	/* SECCIÓN FINANCIERA */
	.financial-section {
		font-size: 9px;
		margin-bottom: 8px;
		line-height: 1.45;
	}

	.financial-left {
		width: 58%;
	}

	.formula-row {
		margin-bottom: 4px;
	}

	.table-payment {
		width: 200px;
		margin-top: 6px;
		font-size: 8.5px;
	}

	.table-payment th,
	.table-payment td {
		padding: 2.5px;
	}

	.financial-right {
		width: 40%;
	}

	.amount-row {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 12px;
		margin-bottom: 1.5px;
	}

	.amount-label {
		text-align: right;
	}

	.amount-val {
		width: 62px;
		text-align: right;
	}

	.total-payment-row {
		margin-top: 3px;
		padding-top: 2px;
		border-top: 1px solid #d1d5db;
	}

	/* CONDICIONES GENERALES P1 */
	.legal-text-p1 {
		font-size: 7px;
		line-height: 1.32;
		color: #1a1a1a;
		margin-top: 8px;
		margin-bottom: 16px;
	}

	.legal-heading {
		font-weight: 700;
		margin: 0 0 2px 0;
	}

	.legal-paragraph {
		margin: 0 0 5px 0;
	}

	/* FIRMAS P1 */
	.signatures-p1 {
		font-size: 8.5px;
		margin-top: 12px;
	}

	.sig-box {
		width: 44%;
	}

	.sig-line {
		border-bottom: 1px solid #000000;
		height: 18px;
		margin-bottom: 4px;
	}

	.id-notice {
		font-size: 8px;
		color: #000000;
		margin-top: 8px;
	}

	/* PÁGINA 2 TÉRMINOS */
	.terms-content {
		font-size: 8.5px;
		line-height: 1.42;
		color: #111111;
	}

	.terms-header {
		font-size: 9px;
		margin-bottom: 8px;
	}

	.terms-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.terms-list li {
		display: flex;
		align-items: flex-start;
		margin-bottom: 6.5px;
	}

	.terms-list .bullet {
		margin-right: 6px;
		font-weight: 700;
		flex-shrink: 0;
	}

	/* FIRMA P2 */
	.signature-p2 {
		margin-top: 45px;
		font-size: 8.5px;
	}

	.sig-line-p2 {
		border-bottom: 1px solid #000000;
		width: 65%;
		margin: 0 auto 6px auto;
		height: 20px;
	}

	.sig-label-p2 {
		margin-bottom: 5px;
	}

	.id-notice-p2 {
		font-size: 8px;
	}

	/* IMPRESIÓN OFICIAL */
	@media print {
		@page {
			size: letter portrait;
			margin: 0;
		}

		:global(body) {
			background: #ffffff !important;
			color: #000000 !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		.picking-doc-wrapper {
			width: 100% !important;
			margin: 0 !important;
			padding: 0 !important;
		}

		.picking-sheet {
			box-shadow: none !important;
			border: none !important;
			margin: 0 !important;
			width: 8.5in !important;
			height: 11in !important;
			max-height: 11in !important;
			page-break-after: always !important;
			break-after: page !important;
			page-break-inside: avoid !important;
			break-inside: avoid !important;
		}

		.sheet-page-1 {
			padding: 0.35in 0.45in !important;
		}

		.sheet-page-2 {
			padding: 0.5in 0.45in !important;
			page-break-before: always !important;
			break-before: page !important;
		}
	}
</style>
