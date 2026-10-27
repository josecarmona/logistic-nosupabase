import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRolesForUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	const roles = user ? await getRolesForUser(locals, user) : [];

	// Redirección si el usuario sólo es cliente
	const isClienteOnly = roles.includes('cliente') && !roles.includes('admin') && !roles.includes('gerente') && !roles.includes('operador');
	if (isClienteOnly) {
		throw redirect(303, '/ventas/historial');
	}

	const isCommercialUser = roles.includes('admin') || roles.includes('gerente') || roles.includes('operador');

	if (!isCommercialUser) {
		return {
			isCommercialUser: false,
			dashboardData: null
		};
	}

	// Helper para calcular ciclo semanal exacto de Lunes a Domingo
	const now = new Date();
	const todayISO = now.toISOString().split('T')[0];

	function getWeekRangeMondaySunday(d: Date) {
		const target = new Date(d);
		const day = target.getDay(); // 0 = Domingo, 1 = Lunes, ...
		const diffToMonday = day === 0 ? 6 : day - 1;
		const mon = new Date(target.getFullYear(), target.getMonth(), target.getDate() - diffToMonday);
		const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
		return {
			start: mon.toISOString().split('T')[0],
			end: sun.toISOString().split('T')[0],
			mondayDate: mon
		};
	}

	// 1. Obtener Rango de Fechas (por defecto: Semana en curso de Lunes a Domingo)
	const currentWeek = getWeekRangeMondaySunday(now);
	const startDate = url.searchParams.get('startDate') || currentWeek.start;
	const endDate = url.searchParams.get('endDate') || currentWeek.end;

	const startISO = `${startDate}T00:00:00.000Z`;
	const endISO = `${endDate}T23:59:59.999Z`;

	// 2. Consultar Ventas en el Rango de Fechas (Ventas no anuladas)
	const { data: ventasRaw, error: vErr } = await locals.supabase
		.from('ventas')
		.select(`
			id,
			codigo_venta,
			created_at,
			monto_base,
			monto_total_cargos,
			monto_total_descuentos,
			monto_seguro,
			monto_total,
			monto_pagado,
			estatus_venta,
			estatus_pago,
			producto_id,
			producto:productos(id, codigo, descripcion, tipo_producto:tipos_producto(id, nombre, prefijo)),
			pais_destino:paises(id, nombre, codigo_iso2, codigo_iso3),
			pagos:venta_pagos(id, concepto_nombre, monto)
		`)
		.neq('estatus_venta', 'anulada')
		.gte('created_at', startISO)
		.lte('created_at', endISO)
		.order('created_at', { ascending: true });

	if (vErr) {
		console.error('Error al cargar ventas para el dashboard comercial:', vErr.message);
	}

	const ventas = (ventasRaw || []) as any[];

	const year = now.getFullYear();
	const month = now.getMonth();

	// 2.5 Consultar Métricas Diarias (Hoy)
	const todayStartISO = `${todayISO}T00:00:00.000Z`;
	const todayEndISO = `${todayISO}T23:59:59.999Z`;
	const { data: ventasHoyRaw } = await locals.supabase
		.from('ventas')
		.select('id, monto_total, monto_pagado, estatus_pago, total_cajas, es_multiple_cajas')
		.neq('estatus_venta', 'anulada')
		.gte('created_at', todayStartISO)
		.lte('created_at', todayEndISO);

	const ventasHoy = (ventasHoyRaw || []) as any[];
	let hoyTotalFacturado = 0;
	let hoyTotalCobrado = 0;
	let hoyTotalCajas = 0;
	for (const vh of ventasHoy) {
		hoyTotalFacturado += Number(vh.monto_total) || 0;
		hoyTotalCobrado += Number(vh.monto_pagado) || 0;
		hoyTotalCajas += vh.es_multiple_cajas ? (Number(vh.total_cajas) || 1) : 1;
	}
	const metricasDiarias = {
		fecha: todayISO,
		operaciones: ventasHoy.length,
		totalFacturado: hoyTotalFacturado,
		totalCobrado: hoyTotalCobrado,
		totalPorCobrar: Math.max(0, hoyTotalFacturado - hoyTotalCobrado),
		totalCajas: hoyTotalCajas
	};

	// 3. Consultar histórico para Gráfico de Ingresos por Mes (últimos 6 meses)
	const sixMonthsAgo = new Date(year, month - 5, 1).toISOString();
	const { data: ventasHistRaw } = await locals.supabase
		.from('ventas')
		.select('id, created_at, monto_total')
		.neq('estatus_venta', 'anulada')
		.gte('created_at', sixMonthsAgo)
		.order('created_at', { ascending: true });

	const ventasHist = (ventasHistRaw || []) as any[];

	// (A) KPI 1: Totales de Ingresos, Pagado y No Pagado
	let totalIngresos = 0;
	let totalPagado = 0;
	let totalNoPagado = 0;

	// (B) KPIs Medios de Pago
	let pagadoEfectivo = 0;
	let pagadoZelle = 0;
	let pagadoOtros = 0;

	// (C) Componentes de Ingresos: Cajas / Base, Adicionales (Cargos - Descuentos), Seguro
	let totalCajasBase = 0;
	let totalAdicionales = 0;
	let totalSeguro = 0;

	// (D) Ventas por País
	const ventasPorPaisMap: Record<string, { nombre: string; total: number; cantidad: number; codigoIso: string }> = {};

	// (E) Productos Tipo Caja
	const productosCajaMap: Record<string, { descripcion: string; total: number; cantidad: number }> = {};

	for (const v of ventas) {
		const mTotal = Number(v.monto_total) || 0;
		const mPagado = Number(v.monto_pagado) || 0;
		const mPendiente = Math.max(0, mTotal - mPagado);

		totalIngresos += mTotal;
		totalPagado += mPagado;
		totalNoPagado += mPendiente;

		// Componentes de ingreso
		const mBase = Number(v.monto_base) || 0;
		const mCargos = Number(v.monto_total_cargos) || 0;
		const mDesc = Number(v.monto_total_descuentos) || 0;
		const mSeguro = Number(v.monto_seguro) || 0;

		totalCajasBase += mBase;
		totalAdicionales += Math.max(0, mCargos - mDesc);
		totalSeguro += mSeguro;

		// Medios de pago en base a venta_pagos registrados
		if (v.pagos && v.pagos.length > 0) {
			for (const p of v.pagos) {
				const cNombre = (p.concepto_nombre || '').toLowerCase();
				const pMonto = Number(p.monto) || 0;

				if (cNombre.includes('efectivo') || cNombre.includes('cash')) {
					pagadoEfectivo += pMonto;
				} else if (cNombre.includes('zelle')) {
					pagadoZelle += pMonto;
				} else {
					pagadoOtros += pMonto;
				}
			}
		}

		// Ventas por País
		const paisNombre = v.pais_destino?.nombre || 'SIN ASIGNAR';
		const codigoIso = v.pais_destino?.codigo_iso3 || 'N/A';
		if (!ventasPorPaisMap[paisNombre]) {
			ventasPorPaisMap[paisNombre] = { nombre: paisNombre, total: 0, cantidad: 0, codigoIso };
		}
		ventasPorPaisMap[paisNombre].total += mTotal;
		ventasPorPaisMap[paisNombre].cantidad += 1;

		// Productos Tipo Caja
		const tipoProdNombre = (v.producto?.tipo_producto?.nombre || '').toLowerCase();
		const prodDesc = (v.producto?.descripcion || '').toLowerCase();
		const isCaja = tipoProdNombre.includes('caja') || prodDesc.includes('caja') || prodDesc.includes('box');

		if (isCaja && v.producto) {
			const pKey = v.producto.descripcion || `PRODUCTO #${v.producto.id}`;
			if (!productosCajaMap[pKey]) {
				productosCajaMap[pKey] = { descripcion: pKey, total: 0, cantidad: 0 };
			}
			productosCajaMap[pKey].total += mTotal;
			productosCajaMap[pKey].cantidad += 1;
		}
	}

	// (F) Agrupar Ventas Históricas por Mes (últimos 6 meses)
	const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
	const mesesMap: Record<string, { label: string; total: number; yearMonth: string }> = {};

	for (let i = 5; i >= 0; i--) {
		const d = new Date(year, month - i, 1);
		const y = d.getFullYear();
		const m = d.getMonth();
		const key = `${y}-${String(m + 1).padStart(2, '0')}`;
		mesesMap[key] = {
			label: `${mesesNombres[m]} ${y}`,
			total: 0,
			yearMonth: key
		};
	}

	for (const vh of ventasHist) {
		const d = new Date(vh.created_at);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		if (mesesMap[key]) {
			mesesMap[key].total += Number(vh.monto_total) || 0;
		}
	}

	// Estructura de los 7 días de la semana (Lunes a Domingo) para la semana en curso/filtrada
	const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
	const monDate = currentWeek.mondayDate;
	const semanaDesglose = diasNombres.map((nombre, i) => {
		const dayDate = new Date(monDate.getFullYear(), monDate.getMonth(), monDate.getDate() + i);
		const fStr = dayDate.toISOString().split('T')[0];
		return {
			dia: nombre,
			fecha: fStr,
			operaciones: 0,
			total: 0,
			pagado: 0
		};
	});

	for (const v of ventas) {
		const vFecha = (v.created_at || '').split('T')[0];
		const item = semanaDesglose.find((d) => d.fecha === vFecha);
		if (item) {
			item.operaciones += 1;
			item.total += Number(v.monto_total) || 0;
			item.pagado += Number(v.monto_pagado) || 0;
		}
	}

	const metricasSemanales = {
		semanaInicio: currentWeek.start,
		semanaFin: currentWeek.end,
		dias: semanaDesglose,
		totalSemana: semanaDesglose.reduce((acc, d) => acc + d.total, 0),
		totalCobradoSemana: semanaDesglose.reduce((acc, d) => acc + d.pagado, 0),
		totalOperacionesSemana: semanaDesglose.reduce((acc, d) => acc + d.operaciones, 0)
	};

	const ventasPorMes = Object.values(mesesMap);
	const ventasPorPais = Object.values(ventasPorPaisMap).sort((a, b) => b.total - a.total);
	const productosCaja = Object.values(productosCajaMap).sort((a, b) => b.total - a.total);

	return {
		isCommercialUser,
		dashboardData: {
			filters: {
				startDate,
				endDate
			},
			kpis: {
				totalIngresos,
				totalPagado,
				totalNoPagado,
				pagadoEfectivo,
				pagadoZelle,
				pagadoOtros
			},
			composicionIngresos: {
				cajasBase: totalCajasBase,
				adicionales: totalAdicionales,
				seguro: totalSeguro
			},
			metricasDiarias,
			metricasSemanales,
			ventasPorMes,
			ventasPorPais,
			productosCaja,
			totalOperaciones: ventas.length
		}
	};
};
