-- Migración: Plantilla Oficial PickingList idéntica al documento PDF de paquetería H&H World Group
-- Incluye desglose financiero de 2 páginas con términos legales y firmas de conformidad

UPDATE public.plantillas_documentos
SET 
  nombre = 'PickingList',
  tipo = 'picking',
  encabezado_titulo = 'LISTA DE EMPAQUE / PACKING LIST',
  paper_size = 'letter',
  orientation = 'portrait',
  roles_permitidos = ARRAY['admin', 'gerente', 'operador'],
  es_default = true,
  activo = true,
  contenido_html = '<div class="picking-doc-wrapper font-sans text-black" style="font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; width: 100%;">
  <!-- PÁGINA 1 -->
  <div class="picking-sheet sheet-page-1" style="width: 8.5in; min-height: 11in; padding: 0.42in 0.48in; box-sizing: border-box; background: #ffffff; margin: 0 auto 20px auto; border: 1px solid #000;">
    <!-- Encabezado Superior -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <div style="width: 35%; font-size: 9.5px; line-height: 1.35; color: #1e293b;">
        Plaza Las Américas: 733 Pleasant Hill Rd. Ste 1100 Lilburn,<br>
        GA, 30047
      </div>
      <div style="width: 30%; text-align: center;">
        <img src="/logo.png" alt="H&H WORLD GROUP" style="height: 72px; display: inline-block; object-fit: contain;" />
      </div>
      <div style="width: 35%; text-align: right; font-size: 11px; font-weight: bold; color: #000; padding-top: 36px;">
        www.hhworldgroup.com
      </div>
    </div>

    <!-- Subencabezado: Solicitud a domicilio -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <div style="font-size: 10.5px; font-weight: bold; color: #000; letter-spacing: 0.2px;">
        SOLICITE SU RECOLECCIÓN A DOMICILIO
      </div>
    </div>

    <!-- Título Central -->
    <div style="font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin: 6px 0 10px 0; text-transform: uppercase; text-align: center; color: #000;">
      LISTA DE EMPAQUE / PACKING LIST
    </div>

    <!-- Bloque Remitente / Shipper & Destinatario / Consignee -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9px; margin-bottom: 6px;">
      <tbody>
        <tr>
          <td style="width: 13.5%; border: 1px solid #000; font-weight: bold; vertical-align: top; padding: 6px 4px; line-height: 1.3;">
            Remitente / Shipper
          </td>
          <td style="width: 36.5%; border: 1px solid #000; vertical-align: top; padding: 3px 5px; line-height: 1.35;">
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">NOMBRE</span>
              <span style="font-weight: normal; text-transform: uppercase;">{{remitente_nombre}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">DIRECCIÓN</span>
              <span style="text-transform: uppercase;">{{remitente_direccion}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">E-MAIL</span>
              <span>{{remitente_email}}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">TELÉFONO</span>
              <span>{{remitente_telefono}}</span>
            </div>
          </td>
          <td style="width: 13.5%; border: 1px solid #000; font-weight: bold; vertical-align: top; padding: 6px 4px; line-height: 1.3;">
            Destinatario /<br>Consignee
          </td>
          <td style="width: 36.5%; border: 1px solid #000; vertical-align: top; padding: 3px 5px; line-height: 1.35;">
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">NOMBRE</span>
              <span style="font-weight: normal; text-transform: uppercase;">{{consignatario_nombre}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">DIRECCIÓN</span>
              <span style="text-transform: uppercase;">{{consignatario_direccion}}</span>
            </div>
            <div style="display: flex; margin-bottom: 2px;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">E-MAIL</span>
              <span>{{consignatario_email}}</span>
            </div>
            <div style="display: flex;">
              <span style="font-weight: bold; width: 68px; flex-shrink: 0;">TELÉFONO</span>
              <span>{{consignatario_telefono}}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Fila Operativa -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9px; text-align: center; margin-bottom: 6px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="width: 33.33%; border: 1px solid #000; padding: 3px; font-weight: bold;">Agente / Agent</th>
          <th style="width: 33.33%; border: 1px solid #000; padding: 3px; font-weight: bold;">Fecha / Date</th>
          <th style="width: 33.34%; border: 1px solid #000; padding: 3px; font-weight: bold;">Código de rastreo / Tracking number</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 3.5px; text-transform: uppercase;">{{packer_operador}}</td>
          <td style="border: 1px solid #000; padding: 3.5px;">{{fecha_hora_emision}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-family: monospace; font-size: 10px;">{{codigo_venta}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Tabla Mercancía -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9px; margin-bottom: 6px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="width: 25%; border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Cantidad / Quantity</th>
          <th style="width: 50%; border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Descripción de mercancía / Merchandise description</th>
          <th style="width: 25%; border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Valor / Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: center;">1</td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: center; text-transform: uppercase;">ALMOHADAS</td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 6px; text-align: right; padding-right: 16px;">20</td>
        </tr>
        <tr>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; height: 16px;"></td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; height: 16px;"></td>
          <td style="border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; height: 16px;"></td>
        </tr>
        <tr>
          <td colspan="2" style="border: 1px solid #000; padding: 4px 12px; text-align: right; font-weight: bold;">Total factura / Invoice total</td>
          <td style="border: 1px solid #000; padding: 4px 12px; text-align: right; font-weight: bold;">${{monto_total}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Tabla Dimensiones -->
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 8.5px; text-align: center; margin-bottom: 7px;">
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">PESO / WEIGHT (LBS.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">LARGO / LENGTH (IN.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">ALTO / HEIGHT (IN.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">ANCHO / WIDTH (IN.)</th>
          <th style="width: 20%; border: 1px solid #000; padding: 3px 2px; font-weight: bold;">PESO VOL / VOL. WT.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{peso_facturable}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{dimension_largo}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{dimension_alto}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{dimension_ancho}}</td>
          <td style="border: 1px solid #000; padding: 3.5px; font-size: 9.5px;">{{peso_volumetrico}}</td>
        </tr>
      </tbody>
    </table>

    <!-- Desglose Financiero -->
    <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 8px; line-height: 1.45;">
      <div style="width: 58%;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Peso total / Total weight &nbsp;&nbsp;<strong>{{peso_facturable}}</strong> &nbsp;Lbs. x $ <strong>${{monto_base}}</strong></span>
          <span style="padding-right: 24px;">= $</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Seguro / Insurance (opcional / optional) Caja / Box &nbsp;<strong>${{valor_declarado}}</strong> &nbsp;x {{porcentaje_seguro}}% TV &nbsp;<strong>$0.00</strong> &nbsp;x 10%</span>
          <span style="padding-right: 24px;">= $</span>
        </div>
        <table style="width: 200px; border-collapse: collapse; border: 1px solid #000; text-align: center; font-size: 8.5px; margin-top: 6px;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="width: 50%; border: 1px solid #000; padding: 2.5px; font-weight: bold;">EFECTIVO / CASH</th>
              <th style="width: 50%; border: 1px solid #000; padding: 2.5px; font-weight: bold;">TARJETA / CARD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 2.5px;">${{pago_efectivo}}</td>
              <td style="border: 1px solid #000; padding: 2.5px;">${{pago_tarjeta}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="width: 40%; text-align: right;">
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>= $</span>
          <span style="width: 62px; text-align: right;">${{monto_base}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>= $</span>
          <span style="width: 62px; text-align: right;">${{monto_seguro}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Caja / Box = $</span>
          <span style="width: 62px; text-align: right;">${{monto_caja}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Herramientas / Tools = $</span>
          <span style="width: 62px; text-align: right;">${{monto_herramientas}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Cargos Adicionales / Aditional Chargers = $</span>
          <span style="width: 62px; text-align: right;">${{monto_otros_cargos}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Empaque / Wrap = $</span>
          <span style="width: 62px; text-align: right;">${{monto_empaque}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 1.5px;">
          <span>Reempaque / Aditional Wrap = $</span>
          <span style="width: 62px; text-align: right;">${{monto_reempaque}}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 3px; padding-top: 2px; border-top: 1px solid #d1d5db; font-weight: bold;">
          <span>Pago Total / Total Payment = $</span>
          <span style="width: 62px; text-align: right;">${{monto_total}}</span>
        </div>
      </div>
    </div>

    <!-- Condiciones Generales P1 -->
    <div style="font-size: 7px; line-height: 1.32; color: #1a1a1a; text-align: justify; margin-top: 8px; margin-bottom: 16px;">
      <p style="font-weight: bold; margin: 0 0 2px 0;">CONDICIONES GENERALES DEL ENVÍO</p>
      <p style="margin: 0 0 5px 0;">
        Conozco y estoy de acuerdo con las condiciones para el envío de artículos a través de H&amp;H WORLD GROUP LLC. El envío de armas de cualquier tipo incluidas las de fuego, municiones, bebidas alcohólicas, líquidos corrosivos/flamables documentos ilegales, animales vivos o muertos, pieles exóticas, artículos perecederos, joyería, valores y cualquier otro artículo restringido por la Asociación Internacional de Transporte (IATA) está estrictamente prohibido. El seguro adicional cubre hasta un 80% del bien afectado, siempre y cuando se cumpla con los requisitos que exige la aseguradora. El seguro opcional es del 7% o 10% del valor declarado. Es para artículos nuevos. Si usted no adquiere el seguro opcional, en caso de pérdida o daño H&amp;H WORLD GROUP LLC no será responsable de reembolsar ningún importe al cliente. Los gastos de flete no son reembolsables bajo ninguna circunstancia. Conozco y estoy de acuerdo con las condiciones y la responsabilidad por el contenido de los artículos dentro del envío a través de H&amp;H WORLD GROUP LLC. Todos los envíos están sujetos a inspección por parte de H&amp;H WORLD GROUP LLC o de las autoridades aduanales.
      </p>
      <p style="font-weight: bold; margin: 0 0 2px 0;">GENERAL TERMS OF DELIVERY</p>
      <p style="margin: 0;">
        I do understand H&amp;H WORLD GROUP LLC shipping terms and conditions. Sending firearms, any type of weapons, ammunition, alcoholic beverages, corrosive/flammable liquids, illegal documents, live/dead animals, exotic leathers, perishable items, jewelry, values and any other forbidden items by IATA it is prohibited without exception. The additional insurance covers up to 80% of the affected items, as long as the requirements demanded by the insurer are met. The optional 7% or 10% insurance is of the declared value. Is for new items if you do not purchase the optional insurance, in case of loss or damage H&amp;H WORLD GROUP LLC will not be responsible for refunding any amount to the customer. Freight costs are not refundable under any circumstances. I understand, accept, and agree to the terms and conditions where I am responsible for the content in the shipments I made through H&amp;H WORLD GROUP LLC. For all shipments received at H&amp;H WORLD GROUP LLC, the customs authorities might review and in case of violation confiscate the shipment. It is also in our rights to inspect and review the content of the shipments.
      </p>
    </div>

    <!-- Firmas P1 -->
    <div style="display: flex; justify-content: space-between; font-size: 8.5px; text-align: center; margin-top: 12px;">
      <div style="width: 44%;">
        <div style="border-bottom: 1px solid #000; height: 18px; margin-bottom: 4px;"></div>
        <div>Firma del cliente / Customer''s signature</div>
      </div>
      <div style="width: 44%;">
        <div style="border-bottom: 1px solid #000; height: 18px; margin-bottom: 4px;"></div>
        <div>No quiero seguro adicional / No additional insurance requested</div>
      </div>
    </div>
    <div style="text-align: center; font-size: 8px; font-weight: bold; color: #000; margin-top: 8px;">
      * Por favor firme como se muestra en su identificación / Please sign as shown on your Identification
    </div>
  </div>

  <!-- PÁGINA 2 -->
  <div class="picking-sheet sheet-page-2" style="width: 8.5in; min-height: 11in; padding: 0.55in 0.48in; box-sizing: border-box; background: #ffffff; margin: 0 auto; border: 1px solid #000; page-break-before: always; break-before: page;">
    <div style="font-size: 8.5px; line-height: 1.42; color: #111; text-align: left;">
      <p style="font-weight: bold; font-size: 9px; margin-bottom: 8px;">
        Al momento de realizar su envío, usted declara conocer y acepta las siguientes condiciones:
      </p>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>SI NO ASEGURO SU CAJA EN CASO DE PÉRDIDA O DAÑO EN SU ENVÍO H&amp;H WORLD GROUP LLC NO SERÁ RESPONSABLE DE REEMBOLSAR NINGÚN IMPORTE.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>LOS GASTOS DE ENVÍO NO SON REEMBOLSABLES BAJO NINGUNA CIRCUNSTANCIA.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>SE LE ENTREGARÁ UN CÓDIGO DE RASTREO CON EL QUE USTED PODRÁ RASTREAR SU PAQUETE. EL CLIENTE ES RESPONSABLE DE REALIZAR EL RASTREO DE SU CAJA.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>SI REQUIERE HACER ALGÚN CAMBIO EN LA INFORMACIÓN DE SU PAQUETE CUENTA CON 24 HORAS DESPUÉS QUE HACE SU ENVÍO EN NUESTRAS OFICINAS Y TIENE UN COSTO ADICIONAL DE $20.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>EN CASO DE DAÑOS, PÉRDIDAS, ROBOS O EXTRAVÍOS CON SEGURO USTED CUENTA CON 48 HORAS CONTINUAS DESDE QUE RECIBIÓ SU PAQUETE PARA COMUNICARSE O DIRIGIRSE A LA OFICINA DONDE REALIZÓ SU ENVÍO Y PROCESAR SU RECLAMO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>LOS REQUISITOS PARA PROCESAR UN RECLAMO SON LOS SIGUIENTES: CUALQUIER DOCUMENTO DE IDENTIFICACIÓN DEL REMITENTE (LA MISMA DEBE ESTAR VIGENTE Y QUE CONTENGA LA FIRMA DEL CLIENTE), FACTURAS O COMPROBANTES DE COMPRA DEL BIEN AFECTADO, FOTOS DE LA CAJA QUE RECIBIÓ, FIRMAR UNA CARTA DE RECLAMO ELABORADA POR LA OFICINA DONDE REALIZÓ EL ENVÍO. DEBE CUMPLIR CON TODOS ESTOS REQUISITOS DE LO CONTRARIO NO PODRÁ SER PROCESADO SU RECLAMO.</span>
        </li>
      </ul>

      <p style="font-weight: bold; font-size: 9px; margin-top: 18px; margin-bottom: 8px;">
        Antes de realizar su envío usted debe saber:
      </p>

      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>LAS CAJAS NO PUEDEN PERDER SU FORMA CUADRADA, NO PUEDEN ESTAR ABULTADAS NI ROTAS.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>EL PESO MÁXIMO PERMITIDO SON 150 LIBRAS POR CAJA. NO SE COBRA SOBREPESO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>DEBE REALIZAR UNA LISTA DETALLADA DE LO QUE VA DENTRO DE LA CAJA EN CANTIDAD, DESCRIPCIÓN Y VALOR. H&amp;H WORLD GROUP LLC NO SE HACE RESPONSABLE DE LOS ARTÍCULOS QUE NO ESTÉN DECLARADOS EN SU LISTA DE EMPAQUE, NI POR VALORES QUE NO CORRESPONDAN AL VALOR REAL DEL ARTÍCULO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>NO SE HACEN CARGOS EXTRAS POR ENVIAR ARTÍCULOS NUEVOS O ELECTRÓNICOS.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>AL ENVIAR ARTÍCULOS NUEVOS Y DE VALOR ASEGÚRESE DE GUARDAR SUS RECIBOS O FACTURAS DE COMPRA, ES INDISPENSABLE PARA PODER ASEGURAR SU ENVÍO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>AL ENVIAR ARTÍCULOS ELECTRÓNICOS Y DE VALOR DEBE TRAER LA CAJA ABIERTA YA QUE DICHOS ARTÍCULOS SON REVISADOS ANTES DE EFECTUAR EL ENVÍO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>AL REALIZAR EL ENVÍO DE HERRAMIENTAS DEBE PAGAR UN FEE ADICIONAL, ESTE COBRO ES POR CAJA MÁS NO POR HERRAMIENTA. EL COBRO DEPENDERÁ DEL TAMAÑO DE SU CAJA.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>ASEGÚRESE DE NO ENVIAR NINGÚN ARTÍCULO PROHIBIDO COMO: ARMAS DE CUALQUIER TIPO, DINERO, JOYAS, PLANTAS Y ANIMALES VIVOS O MUERTOS, PRODUCTOS COMBUSTIBLES O INFLAMABLES, BEBIDAS ALCOHÓLICAS, MATERIAL PORNOGRÁFICO, MERCANCÍA FALSIFICADA, ESTUPEFACIENTES Y SUSTANCIAS PSICOTRÓPICAS, OBJETOS MAGNÉTICOS O RADIOACTIVOS, ENTRE OTROS.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>PARA SOLICITAR LA RECOLECCIÓN A DOMICILIO USTED DEBE COMUNICARSE AL XXXXXX. EL SERVICIO DE RECOLECCIÓN TIENE UN COSTO ADICIONAL.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>USTED PODRÁ ASEGURAR SUS ARTÍCULOS NUEVOS Y DE VALOR PAGANDO EL 7% DEL VALOR QUE DECLARE EN SU LISTA DE EMPAQUE Y LA ASEGURANZA LE REEMBOLSARÁ EN CASO DE RECLAMO HASTA EL 80% DEL VALOR DEL BIEN AFECTADO.</span>
        </li>
        <li style="display: flex; align-items: flex-start; margin-bottom: 6.5px;">
          <span style="margin-right: 6px; font-weight: bold;">•</span>
          <span>USTED PUEDE ENVIAR ARTÍCULOS DE VIDRIO, CERÁMICA, CRISTAL O ALGÚN OTRO MATERIAL DELICADO BAJO SU RESPONSABILIDAD, ESTOS PRODUCTOS NO PUEDEN SER ASEGURADOS. USTED ES RESPONSABLE DEL EMBALAJE DE SU CAJA Y DE LOS ARTÍCULOS QUE ENVÍE, RECOMENDAMOS USAR PAPEL DE BURBUJAS PARA PROTEGER SUS ARTÍCULOS YA QUE H&amp;H WORLD GROUP LLC NO SE HACE RESPONSABLE DE LO QUE LLEGUEN QUEBRADO A SU DESTINO.</span>
        </li>
      </ul>
    </div>

    <!-- Firma P2 -->
    <div style="margin-top: 45px; text-align: center; font-size: 8.5px;">
      <div style="border-bottom: 1px solid #000; width: 65%; margin: 0 auto 6px auto; height: 20px;"></div>
      <div style="margin-bottom: 5px;">
        He leído y entiendo los "Términos y Condiciones" / I have read and understood the "Terms and Conditions"
      </div>
      <div style="font-size: 8px; font-weight: bold;">
        * Por favor firme como se muestra en su identificación / Please sign as shown on your Identification
      </div>
    </div>
  </div>
</div>'
WHERE tipo = 'picking' OR nombre = 'PickingList';
