<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import {
		Users,
		ShieldCheck,
		Globe,
		Tag,
		UserCheck,
		ArrowRight,
		DollarSign,
		TrendingUp,
		CreditCard,
		Wallet,
		Banknote,
		BarChart3,
		PieChart,
		Box,
		Layers,
		Calendar,
		Filter,
		RotateCcw,
		Sparkles,
		ShoppingCart,
		CheckCircle2,
		AlertCircle
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const user = $derived(data.user);
	const roles = $derived((data as any).roles || []);
	const isCommercialUser = $derived(data.isCommercialUser || false);
	const dashboard = $derived(data.dashboardData);

	let startDate = $state('');
	let endDate = $state('');

	$effect(() => {
		if (data.dashboardData?.filters) {
			startDate = data.dashboardData.filters.startDate;
			endDate = data.dashboardData.filters.endDate;
		}
	});

	function handleFilter() {
		const params = new URLSearchParams();
		if (startDate) params.set('startDate', startDate);
		if (endDate) params.set('endDate', endDate);
		goto(`?${params.toString()}`);
	}

	function getMondaySunday(d: Date) {
		const target = new Date(d);
		const day = target.getDay();
		const diffToMonday = day === 0 ? 6 : day - 1;
		const mon = new Date(target.getFullYear(), target.getMonth(), target.getDate() - diffToMonday);
		const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
		return {
			start: mon.toISOString().split('T')[0],
			end: sun.toISOString().split('T')[0]
		};
	}

	function setThisWeek() {
		const r = getMondaySunday(new Date());
		startDate = r.start;
		endDate = r.end;
		handleFilter();
	}

	function setPreviousWeek() {
		const prev = new Date();
		prev.setDate(prev.getDate() - 7);
		const r = getMondaySunday(prev);
		startDate = r.start;
		endDate = r.end;
		handleFilter();
	}

	function setToday() {
		const today = new Date().toISOString().split('T')[0];
		startDate = today;
		endDate = today;
		handleFilter();
	}

	function resetCurrentMonth() {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth();
		const start = new Date(y, m, 1).toISOString().split('T')[0];
		const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
		startDate = start;
		endDate = end;
		handleFilter();
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount || 0);
	}

	// Cálculos para Gráficos
	// 1. Gráfico de Barras: Ingreso por Mes
	const maxMesTotal = $derived(
		Math.max(...(dashboard?.ventasPorMes?.map((m: any) => m.total) || [1]), 100)
	);

	// 2. Gráfico de Barras Componentes de Ingreso (Cajas, Adicionales, Seguro)
	const compTotal = $derived(
		(dashboard?.composicionIngresos?.cajasBase || 0) +
		(dashboard?.composicionIngresos?.adicionales || 0) +
		(dashboard?.composicionIngresos?.seguro || 0) || 1
	);

	// 3. Gráfico de Columnas: Ventas por País
	const maxPaisTotal = $derived(
		Math.max(...(dashboard?.ventasPorPais?.map((p: any) => p.total) || [1]), 100)
	);

	// 4. Gráfico de Área / Distribución: Productos Tipo Caja
	const totalProdCajas = $derived(
		dashboard?.productosCaja?.reduce((acc: number, cur: any) => acc + cur.total, 0) || 1
	);
	const maxProdCaja = $derived(
		Math.max(...(dashboard?.productosCaja?.map((p: any) => p.total) || [1]), 100)
	);

	const areaPoints = $derived.by(() => {
		const list = dashboard?.productosCaja || [];
		if (list.length === 0) return [];
		return list.map((p: any, i: number) => {
			const x = list.length > 1 ? (i / (list.length - 1)) * 400 : 200;
			const y = 90 - (p.total / maxProdCaja) * 80;
			return { x, y, p };
		});
	});

	const areaPathD = $derived.by(() => {
		const points = areaPoints;
		if (points.length === 0) return '';
		if (points.length === 1) {
			const y = points[0].y;
			return `M 0,${y} L 400,${y}`;
		}
		return points.reduce((acc: string, pt: any, idx: number) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
	});

	const areaFillD = $derived.by(() => {
		const points = areaPoints;
		if (points.length === 0) return '';
		if (points.length === 1) {
			const y = points[0].y;
			return `M 0,${y} L 400,${y} L 400,100 L 0,100 Z`;
		}
		return `${areaPathD} L 400,100 L 0,100 Z`;
	});
</script>

<svelte:head>
	<title>{isCommercialUser ? 'Dashboard de Resultados Comerciales' : 'Inicio'} - Sistema Logístico</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6 space-y-6">
	<!-- Encabezado / Bienvenida y Filtro de Fechas -->
	<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
					{#if isCommercialUser}
						Tablero Comercial
					{:else}
						¡Hola, {user?.nombre_completo || user?.email || 'Bienvenido'}!
					{/if}
				</h1>
				{#if isCommercialUser}
					<Badge variant="outline" class="bg-primary/10 text-primary border-primary/30 text-[11px] font-bold uppercase">
						Métricas en Vivo
					</Badge>
				{/if}
			</div>
			<p class="text-xs sm:text-sm text-muted-foreground mt-1">
				{#if isCommercialUser}
					Monitoreo analítico de facturación, medios de cobro, distribución geográfica y desempeño de productos en tiempo real.
				{:else}
					Plataforma de gestión operativa de envíos, perfiles de clientes y seguimiento de guías de despacho.
				{/if}
			</p>
		</div>

		{#if isCommercialUser}
			<!-- Filtro de Rango de Fechas con Presets de Lunes a Domingo -->
			<Card class="p-2.5 shadow-sm border bg-card">
				<form onsubmit={(e) => { e.preventDefault(); handleFilter(); }} class="flex flex-col sm:flex-row flex-wrap items-center gap-2">
					<div class="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
						<Calendar class="w-3.5 h-3.5 text-primary" />
						<span>Desde (Lun):</span>
						<Input type="date" bind:value={startDate} class="h-8 text-xs w-36 px-2 font-mono bg-background" />
					</div>
					<div class="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
						<span>Hasta (Dom):</span>
						<Input type="date" bind:value={endDate} class="h-8 text-xs w-36 px-2 font-mono bg-background" />
					</div>
					<div class="flex flex-wrap items-center gap-1.5">
						<Button type="submit" size="sm" class="h-8 text-xs gap-1">
							<Filter class="w-3 h-3" /> Filtrar
						</Button>
						<Button type="button" variant="outline" size="sm" onclick={setThisWeek} class="h-8 text-xs gap-1 font-bold text-primary border-primary/40 bg-primary/5" title="Filtrar semana actual de Lunes a Domingo">
							<Sparkles class="w-3 h-3" /> Esta Semana (Lun-Dom)
						</Button>
						<Button type="button" variant="outline" size="sm" onclick={setPreviousWeek} class="h-8 text-xs gap-1" title="Filtrar semana anterior de Lunes a Domingo">
							Sem. Pasada
						</Button>
						<Button type="button" variant="outline" size="sm" onclick={setToday} class="h-8 text-xs gap-1" title="Filtrar solo operaciones del día de hoy">
							Hoy
						</Button>
						<Button type="button" variant="ghost" size="sm" onclick={resetCurrentMonth} class="h-8 text-xs gap-1" title="Restablecer al mes en curso">
							<RotateCcw class="w-3 h-3" /> Mes
						</Button>
					</div>
				</form>
			</Card>
		{/if}
	</div>

	{#if isCommercialUser && dashboard}
		<!-- ============================================================== -->
		<!-- SECCIÓN 0: MÉTRICAS DIARIAS (HOY) Y RESUMEN SEMANAL LUN-DOM -->
		<!-- ============================================================== -->
		<div class="space-y-4">
			<!-- Banner Métricas Diarias (Hoy) -->
			{#if dashboard.metricasDiarias}
				<Card class="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-background to-card shadow-sm">
					<CardContent class="p-3.5">
						<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2.5 mb-2.5">
							<div class="flex items-center gap-2">
								<div class="p-1.5 rounded-md bg-primary text-primary-foreground font-black text-xs">
									HOY
								</div>
								<div>
									<h2 class="text-sm font-bold uppercase tracking-tight flex items-center gap-1.5">
										Métricas del Día ({dashboard.metricasDiarias.fecha})
									</h2>
									<p class="text-[11px] text-muted-foreground">
										Rendimiento operativo y cobros de la jornada en curso.
									</p>
								</div>
							</div>
							<Badge variant="outline" class="font-mono text-xs font-bold bg-background">
								{dashboard.metricasDiarias.operaciones} {dashboard.metricasDiarias.operaciones === 1 ? 'operación' : 'operaciones'}
							</Badge>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
							<div class="p-2 rounded border bg-card/60">
								<span class="text-[10px] uppercase font-bold text-muted-foreground block">Facturado Hoy:</span>
								<span class="text-base font-extrabold font-mono text-foreground">
									{formatCurrency(dashboard.metricasDiarias.totalFacturado)}
								</span>
							</div>
							<div class="p-2 rounded border bg-card/60">
								<span class="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Cobrado Hoy:</span>
								<span class="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
									{formatCurrency(dashboard.metricasDiarias.totalCobrado)}
								</span>
							</div>
							<div class="p-2 rounded border bg-card/60">
								<span class="text-[10px] uppercase font-bold text-destructive block">Por Cobrar Hoy:</span>
								<span class="text-base font-extrabold font-mono text-destructive">
									{formatCurrency(dashboard.metricasDiarias.totalPorCobrar)}
								</span>
							</div>
							<div class="p-2 rounded border bg-card/60">
								<span class="text-[10px] uppercase font-bold text-primary block">Cajas Procesadas:</span>
								<span class="text-base font-extrabold font-mono text-primary">
									{dashboard.metricasDiarias.totalCajas}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			{/if}

			<!-- Panel de Métricas Semanales (Lunes a Domingo) -->
			{#if dashboard.metricasSemanales}
				<Card class="border shadow-sm">
					<CardHeader class="pb-2.5">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div>
								<CardTitle class="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
									<Calendar class="w-4 h-4 text-primary" /> Desglose Semanal (Lunes a Domingo)
								</CardTitle>
								<CardDescription class="text-xs">
									Ciclo del {dashboard.metricasSemanales.semanaInicio} al {dashboard.metricasSemanales.semanaFin} • Total semana: <strong class="text-foreground">{formatCurrency(dashboard.metricasSemanales.totalSemana)}</strong> ({dashboard.metricasSemanales.totalOperacionesSemana} ops.)
								</CardDescription>
							</div>
							<Badge class="bg-primary/10 text-primary border-primary/30 font-mono text-xs">
								Cobrado: {formatCurrency(dashboard.metricasSemanales.totalCobradoSemana)}
							</Badge>
						</div>
					</CardHeader>
					<CardContent class="pt-0">
						<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
							{#each dashboard.metricasSemanales.dias as d}
								{@const isDayToday = d.fecha === (dashboard.metricasDiarias?.fecha || '')}
								<div class={`p-2.5 rounded-lg border text-center transition-all ${
									isDayToday
										? 'border-primary ring-2 ring-primary/20 bg-primary/5'
										: d.operaciones > 0
											? 'border-border bg-card hover:border-primary/40'
											: 'border-border/60 bg-muted/20 opacity-80'
								}`}>
									<div class="flex items-center justify-center gap-1 mb-1">
										<span class="text-[11px] font-black uppercase text-foreground">{d.dia}</span>
										{#if isDayToday}
											<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Hoy"></span>
										{/if}
									</div>
									<span class="text-[10px] text-muted-foreground font-mono block mb-1.5">{d.fecha.slice(5)}</span>
									<span class="text-xs font-mono font-extrabold block text-foreground">
										{formatCurrency(d.total)}
									</span>
									<span class="text-[10px] text-muted-foreground font-mono block mt-0.5">
										{d.operaciones} ops.
									</span>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			{/if}
		</div>
		<!-- ========================================== -->
		<!-- SECCIÓN 1: TARJETAS KPI FINANCIERAS Y COBROS -->
		<!-- ========================================== -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<!-- KPI 1: TOTAL FACTURADO (INGRESOS), PAGADO Y NO PAGADO -->
			<Card class="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm hover:shadow transition-shadow">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between">
						<CardTitle class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Total Ingresos Facturados
						</CardTitle>
						<div class="p-2 rounded-lg bg-primary/10 text-primary">
							<DollarSign class="w-5 h-5" />
						</div>
					</div>
					<div class="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight mt-1">
						{formatCurrency(dashboard.kpis.totalIngresos)}
					</div>
					<CardDescription class="text-[11px] text-muted-foreground">
						Facturación total en el rango ({dashboard.totalOperaciones} operaciones)
					</CardDescription>
				</CardHeader>
				<CardContent class="pt-0 border-t mt-2">
					<div class="grid grid-cols-2 gap-2 pt-2.5 text-xs">
						<div class="space-y-0.5">
							<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-center gap-1">
								<CheckCircle2 class="w-3 h-3" /> Cobrado:
							</span>
							<span class="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
								{formatCurrency(dashboard.kpis.totalPagado)}
							</span>
							<span class="text-[9px] text-muted-foreground font-mono">
								{dashboard.kpis.totalIngresos > 0 ? ((dashboard.kpis.totalPagado / dashboard.kpis.totalIngresos) * 100).toFixed(1) : '0'}% del total
							</span>
						</div>

						<div class="space-y-0.5 border-l pl-2">
							<span class="text-[10px] text-destructive font-bold uppercase flex items-center gap-1">
								<AlertCircle class="w-3 h-3" /> Por Cobrar:
							</span>
							<span class="font-mono font-bold text-sm text-destructive block">
								{formatCurrency(dashboard.kpis.totalNoPagado)}
							</span>
							<span class="text-[9px] text-muted-foreground font-mono">
								{dashboard.kpis.totalIngresos > 0 ? ((dashboard.kpis.totalNoPagado / dashboard.kpis.totalIngresos) * 100).toFixed(1) : '0'}% pendiente
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- KPI 2: PAGADO EN EFECTIVO -->
			<Card class="hover:border-emerald-500/40 transition-colors shadow-sm">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between">
						<CardTitle class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Pagado en Efectivo
						</CardTitle>
						<div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
							<Banknote class="w-5 h-5" />
						</div>
					</div>
					<div class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
						{formatCurrency(dashboard.kpis.pagadoEfectivo)}
					</div>
					<CardDescription class="text-[11px] text-muted-foreground">
						Abonos captados en taquilla / efectivo
					</CardDescription>
				</CardHeader>
				<CardContent class="pt-0">
					<div class="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
						<div
							class="bg-emerald-500 h-full rounded-full transition-all duration-500"
							style={`width: ${dashboard.kpis.totalPagado > 0 ? (dashboard.kpis.pagadoEfectivo / dashboard.kpis.totalPagado) * 100 : 0}%`}
						></div>
					</div>
					<span class="text-[10px] text-muted-foreground font-mono mt-1 block">
						{dashboard.kpis.totalPagado > 0 ? ((dashboard.kpis.pagadoEfectivo / dashboard.kpis.totalPagado) * 100).toFixed(1) : 0}% del total recaudado
					</span>
				</CardContent>
			</Card>

			<!-- KPI 3: PAGADO EN ZELLE -->
			<Card class="hover:border-purple-500/40 transition-colors shadow-sm">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between">
						<CardTitle class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Pagado en Zelle
						</CardTitle>
						<div class="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
							<Wallet class="w-5 h-5" />
						</div>
					</div>
					<div class="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight mt-1">
						{formatCurrency(dashboard.kpis.pagadoZelle)}
					</div>
					<CardDescription class="text-[11px] text-muted-foreground">
						Transferencias electrónicas Zelle
					</CardDescription>
				</CardHeader>
				<CardContent class="pt-0">
					<div class="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
						<div
							class="bg-purple-500 h-full rounded-full transition-all duration-500"
							style={`width: ${dashboard.kpis.totalPagado > 0 ? (dashboard.kpis.pagadoZelle / dashboard.kpis.totalPagado) * 100 : 0}%`}
						></div>
					</div>
					<span class="text-[10px] text-muted-foreground font-mono mt-1 block">
						{dashboard.kpis.totalPagado > 0 ? ((dashboard.kpis.pagadoZelle / dashboard.kpis.totalPagado) * 100).toFixed(1) : 0}% del total recaudado
					</span>
				</CardContent>
			</Card>

			<!-- KPI 4: OTROS MEDIOS DE PAGO -->
			<Card class="hover:border-blue-500/40 transition-colors shadow-sm">
				<CardHeader class="pb-2">
					<div class="flex items-center justify-between">
						<CardTitle class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Otros Medios de Pago
						</CardTitle>
						<div class="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
							<CreditCard class="w-5 h-5" />
						</div>
					</div>
					<div class="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tracking-tight mt-1">
						{formatCurrency(dashboard.kpis.pagadoOtros)}
					</div>
					<CardDescription class="text-[11px] text-muted-foreground">
						Tarjetas, transferencias y otros conceptos
					</CardDescription>
				</CardHeader>
				<CardContent class="pt-0">
					<div class="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
						<div
							class="bg-blue-500 h-full rounded-full transition-all duration-500"
							style={`width: ${dashboard.kpis.totalPagado > 0 ? (dashboard.kpis.pagadoOtros / dashboard.kpis.totalPagado) * 100 : 0}%`}
						></div>
					</div>
					<span class="text-[10px] text-muted-foreground font-mono mt-1 block">
						{dashboard.kpis.totalPagado > 0 ? ((dashboard.kpis.pagadoOtros / dashboard.kpis.totalPagado) * 100).toFixed(1) : 0}% del total recaudado
					</span>
				</CardContent>
			</Card>
		</div>

		<!-- ========================================== -->
		<!-- SECCIÓN 2: GRÁFICOS ANALÍTICOS (FILA 1)     -->
		<!-- ========================================== -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- GRÁFICO 1: BARRAS - INGRESO POR MES (ÚLTIMOS 6 MESES) -->
			<Card class="shadow-sm">
				<CardHeader class="pb-2 flex flex-row items-center justify-between">
					<div>
						<CardTitle class="text-base font-bold flex items-center gap-2">
							<BarChart3 class="w-4 h-4 text-primary" /> Ingreso por Mes (Tendencia Histórica)
						</CardTitle>
						<CardDescription class="text-xs">
							Evolución de ventas y facturación en los últimos 6 meses.
						</CardDescription>
					</div>
					<Badge variant="outline" class="text-[10px] uppercase font-mono font-bold">Últimos 6 Meses</Badge>
				</CardHeader>
				<CardContent class="pt-4">
					<div class="h-64 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b">
						{#each dashboard.ventasPorMes as mes}
							{@const pct = Math.max(8, (mes.total / maxMesTotal) * 100)}
							<div class="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
								<!-- Tooltip on hover -->
								<div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] font-mono font-bold shadow pointer-events-none z-10 whitespace-nowrap border">
									{mes.label}: {formatCurrency(mes.total)}
								</div>
								<span class="text-[10px] font-mono font-bold text-muted-foreground hidden sm:block">
									{mes.total > 0 ? `$${Math.round(mes.total)}` : '$0'}
								</span>
								<div class="w-full max-w-[48px] bg-primary/20 rounded-t-lg group-hover:bg-primary/40 transition-colors flex items-end overflow-hidden" style={`height: ${pct}%`}>
									<div class="w-full bg-primary rounded-t-lg transition-all duration-500 group-hover:brightness-110" style="height: 100%"></div>
								</div>
								<span class="text-[10px] font-semibold text-muted-foreground uppercase truncate w-full text-center">
									{mes.label.split(' ')[0]}
								</span>
							</div>
						{/each}
					</div>
					<div class="flex items-center justify-between pt-3 text-xs text-muted-foreground">
						<span>Total período semestral:</span>
						<span class="font-mono font-bold text-foreground">
							{formatCurrency(dashboard.ventasPorMes.reduce((acc: number, m: any) => acc + m.total, 0))}
						</span>
					</div>
				</CardContent>
			</Card>

			<!-- GRÁFICO 2: BARRAS - INGRESO POR CAJAS, ADICIONALES Y SEGURO -->
			<Card class="shadow-sm">
				<CardHeader class="pb-2 flex flex-row items-center justify-between">
					<div>
						<CardTitle class="text-base font-bold flex items-center gap-2">
							<Layers class="w-4 h-4 text-emerald-600" /> Composición del Ingreso (Cajas, Adicionales y Seguro)
						</CardTitle>
						<CardDescription class="text-xs">
							Desglose de ingresos por tarifa base, cargos adicionales y primas de seguro.
						</CardDescription>
					</div>
					<Badge variant="outline" class="text-[10px] uppercase font-mono font-bold">Rango Actual</Badge>
				</CardHeader>
				<CardContent class="pt-4 space-y-4">
					<!-- Barra Proporcional Apilada -->
					<div class="space-y-1.5">
						<div class="w-full h-8 rounded-lg overflow-hidden flex shadow-inner border bg-muted/30">
							<div
								class="bg-blue-600 h-full flex items-center justify-center text-white font-mono text-[11px] font-bold transition-all"
								style={`width: ${(dashboard.composicionIngresos.cajasBase / compTotal) * 100}%`}
								title={`Cajas / Tarifa Base: ${formatCurrency(dashboard.composicionIngresos.cajasBase)}`}
							>
								{#if (dashboard.composicionIngresos.cajasBase / compTotal) > 0.15}
									{((dashboard.composicionIngresos.cajasBase / compTotal) * 100).toFixed(0)}%
								{/if}
							</div>
							<div
								class="bg-emerald-600 h-full flex items-center justify-center text-white font-mono text-[11px] font-bold transition-all"
								style={`width: ${(dashboard.composicionIngresos.adicionales / compTotal) * 100}%`}
								title={`Cargos Adicionales: ${formatCurrency(dashboard.composicionIngresos.adicionales)}`}
							>
								{#if (dashboard.composicionIngresos.adicionales / compTotal) > 0.15}
									{((dashboard.composicionIngresos.adicionales / compTotal) * 100).toFixed(0)}%
								{/if}
							</div>
							<div
								class="bg-amber-500 h-full flex items-center justify-center text-white font-mono text-[11px] font-bold transition-all"
								style={`width: ${(dashboard.composicionIngresos.seguro / compTotal) * 100}%`}
								title={`Seguro de Envíos: ${formatCurrency(dashboard.composicionIngresos.seguro)}`}
							>
								{#if (dashboard.composicionIngresos.seguro / compTotal) > 0.15}
									{((dashboard.composicionIngresos.seguro / compTotal) * 100).toFixed(0)}%
								{/if}
							</div>
						</div>
					</div>

					<!-- Desglose en Filas con Barras de Progreso Individuales -->
					<div class="space-y-3 pt-2">
						<!-- Cajas / Base -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-xs">
								<span class="flex items-center gap-1.5 font-bold">
									<span class="w-3 h-3 rounded bg-blue-600 shrink-0"></span>
									Ingreso por Cajas / Tarifa Base
								</span>
								<span class="font-mono font-bold text-foreground">
									{formatCurrency(dashboard.composicionIngresos.cajasBase)}
									<span class="text-muted-foreground text-[10px] font-normal">
										({((dashboard.composicionIngresos.cajasBase / compTotal) * 100).toFixed(1)}%)
									</span>
								</span>
							</div>
							<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
								<div class="bg-blue-600 h-full rounded-full" style={`width: ${(dashboard.composicionIngresos.cajasBase / compTotal) * 100}%`}></div>
							</div>
						</div>

						<!-- Cargos Adicionales -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-xs">
								<span class="flex items-center gap-1.5 font-bold">
									<span class="w-3 h-3 rounded bg-emerald-600 shrink-0"></span>
									Cargos y Servicios Adicionales
								</span>
								<span class="font-mono font-bold text-foreground">
									{formatCurrency(dashboard.composicionIngresos.adicionales)}
									<span class="text-muted-foreground text-[10px] font-normal">
										({((dashboard.composicionIngresos.adicionales / compTotal) * 100).toFixed(1)}%)
									</span>
								</span>
							</div>
							<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
								<div class="bg-emerald-600 h-full rounded-full" style={`width: ${(dashboard.composicionIngresos.adicionales / compTotal) * 100}%`}></div>
							</div>
						</div>

						<!-- Seguro de Envío -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-xs">
								<span class="flex items-center gap-1.5 font-bold">
									<span class="w-3 h-3 rounded bg-amber-500 shrink-0"></span>
									Primas de Seguro de Envío
								</span>
								<span class="font-mono font-bold text-foreground">
									{formatCurrency(dashboard.composicionIngresos.seguro)}
									<span class="text-muted-foreground text-[10px] font-normal">
										({((dashboard.composicionIngresos.seguro / compTotal) * 100).toFixed(1)}%)
									</span>
								</span>
							</div>
							<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
								<div class="bg-amber-500 h-full rounded-full" style={`width: ${(dashboard.composicionIngresos.seguro / compTotal) * 100}%`}></div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		<!-- ========================================== -->
		<!-- SECCIÓN 3: GRÁFICOS ANALÍTICOS (FILA 2)     -->
		<!-- ========================================== -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- GRÁFICO 3: COLUMNAS - VENTAS POR PAÍS -->
			<Card class="shadow-sm">
				<CardHeader class="pb-2 flex flex-row items-center justify-between">
					<div>
						<CardTitle class="text-base font-bold flex items-center gap-2">
							<Globe class="w-4 h-4 text-purple-600" /> Ventas por País Destino
						</CardTitle>
						<CardDescription class="text-xs">
							Comparativa del volumen de facturación y operaciones por país receptor.
						</CardDescription>
					</div>
					<Badge variant="outline" class="text-[10px] uppercase font-mono font-bold">
						{dashboard.ventasPorPais.length} Países
					</Badge>
				</CardHeader>
				<CardContent class="pt-4">
					{#if dashboard.ventasPorPais.length === 0}
						<div class="p-8 text-center text-xs text-muted-foreground">
							No hay ventas registradas en el rango de fechas seleccionado.
						</div>
					{:else}
						<div class="space-y-3">
							{#each dashboard.ventasPorPais as pais}
								{@const pct = (pais.total / maxPaisTotal) * 100}
								<div class="space-y-1">
									<div class="flex items-center justify-between text-xs">
										<span class="font-bold uppercase flex items-center gap-2">
											<span class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-extrabold border border-purple-300/40">
												{pais.codigoIso || 'PAÍS'}
											</span>
											{pais.nombre}
											<span class="text-muted-foreground text-[11px] font-normal">({pais.cantidad} envíos)</span>
										</span>
										<span class="font-mono font-bold text-foreground">
											{formatCurrency(pais.total)}
										</span>
									</div>
									<div class="w-full bg-muted rounded-full h-2.5 overflow-hidden">
										<div
											class="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-all duration-500"
											style={`width: ${pct}%`}
										></div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- GRÁFICO 4: ÁREA / DISTRIBUCIÓN - PRODUCTOS TIPO CAJA -->
			<Card class="shadow-sm">
				<CardHeader class="pb-2 flex flex-row items-center justify-between">
					<div>
						<CardTitle class="text-base font-bold flex items-center gap-2">
							<Box class="w-4 h-4 text-amber-600" /> Desempeño Productos Tipo Caja
						</CardTitle>
						<CardDescription class="text-xs">
							Distribución de facturación y rotación de presentaciones de cajas estándar y a medida.
						</CardDescription>
					</div>
					<Badge variant="outline" class="text-[10px] uppercase font-mono font-bold">
						{dashboard.productosCaja.length} Tipos
					</Badge>
				</CardHeader>
				<CardContent class="pt-4">
					{#if dashboard.productosCaja.length === 0}
						<div class="p-8 text-center text-xs text-muted-foreground">
							No se registraron ventas con productos clasificados como caja en este período.
						</div>
					{:else}
						<!-- Gráfico de Área / Curva SVG Simplificada -->
						<div class="space-y-4">
							<div class="p-3 bg-muted/20 border rounded-lg">
								<div class="flex items-center justify-between text-xs pb-2 border-b">
									<span class="text-muted-foreground font-semibold">Total Facturado en Cajas:</span>
									<span class="font-mono font-extrabold text-foreground text-sm">
										{formatCurrency(totalProdCajas)}
									</span>
								</div>

								<!-- SVG Area Sparkline / Polygon -->
								<div class="h-28 w-full pt-3">
									<svg viewBox="0 0 400 100" class="w-full h-full overflow-visible" preserveAspectRatio="none">
										<defs>
											<linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stop-color="oklch(0.65 0.18 55)" stop-opacity="0.6" />
												<stop offset="100%" stop-color="oklch(0.65 0.18 55)" stop-opacity="0.0" />
											</linearGradient>
										</defs>

										{#if areaFillD}
											<path d={areaFillD} fill="url(#areaGradient)" />
											<path d={areaPathD} fill="none" stroke="oklch(0.65 0.18 55)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

											{#each areaPoints as pt}
												<circle cx={pt.x} cy={pt.y} r="4" class="fill-background stroke-amber-600 stroke-2" />
											{/each}
										{/if}
									</svg>
								</div>
							</div>

							<!-- Lista Desglosada -->
							<div class="space-y-2">
								{#each dashboard.productosCaja as prod}
									<div class="flex items-center justify-between p-2 rounded-md border text-xs bg-card hover:bg-muted/40 transition-colors">
										<div class="flex items-center gap-2">
											<Box class="w-3.5 h-3.5 text-amber-600" />
											<div>
												<span class="font-bold uppercase block">{prod.descripcion}</span>
												<span class="text-[10px] text-muted-foreground">{prod.cantidad} unidades vendidas</span>
											</div>
										</div>
										<div class="text-right">
											<span class="font-mono font-bold text-foreground block">{formatCurrency(prod.total)}</span>
											<span class="text-[10px] text-muted-foreground font-mono">
												{((prod.total / totalProdCajas) * 100).toFixed(1)}%
											</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Enlaces Rápidos a Módulos Operativos -->
		<div class="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
			<div class="text-xs text-muted-foreground flex items-center gap-2">
				<Sparkles class="w-4 h-4 text-primary" />
				<span>Acceso directo a las herramientas operativas del sistema:</span>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button href="/ventas" size="sm" class="gap-1.5 text-xs">
					<ShoppingCart class="w-3.5 h-3.5" /> Nueva Venta / Cotización
				</Button>
				<Button href="/ventas/historial" variant="outline" size="sm" class="gap-1.5 text-xs">
					<BarChart3 class="w-3.5 h-3.5" /> Historial de Operaciones
				</Button>
				<Button href="/admin" variant="outline" size="sm" class="gap-1.5 text-xs">
					Panel Administrativo <ArrowRight class="w-3 h-3" />
				</Button>
			</div>
		</div>
	{:else}
		<!-- ========================================== -->
		<!-- VISTA INSTITUCIONAL (OPERADORES Y OTROS)  -->
		<!-- ========================================== -->
		<div class="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border p-6 md:p-8">
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">
						{#if user}
							¡Hola, {user.nombre_completo || user.email}!
						{:else}
							Bienvenido al Sistema de Gestión Logística
						{/if}
					</h1>
					<p class="mt-2 text-sm text-muted-foreground max-w-xl">
						Plataforma web de administración de usuarios, cotización de envíos y operaciones logísticas.
					</p>
				</div>
				<div class="flex items-center gap-3">
					{#if user}
						<Button href="/ventas/historial" class="gap-2">
							<ShoppingCart class="w-4 h-4" /> Mis Envíos
						</Button>
						<Button href="/perfil" variant="outline" class="gap-2">
							<UserCheck class="w-4 h-4" /> Mi Perfil
						</Button>
					{:else}
						<Button href="/login" class="gap-2">Iniciar Sesión</Button>
						<Button href="/register" variant="outline">Registrarse</Button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Module Grid Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<Card class="hover:border-primary/50 transition-colors">
				<CardHeader class="pb-2">
					<div class="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
						<Users class="w-5 h-5" />
					</div>
					<CardTitle class="text-lg">Usuarios y Perfiles</CardTitle>
					<CardDescription class="text-xs">
						Gestión de usuarios de negocio y cuentas de acceso.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="ghost" size="sm" href={user ? "/perfil" : "/login"} class="w-full justify-between text-xs">
						{user ? "Ver mi perfil" : "Acceder"}
						<ArrowRight class="w-3 h-3" />
					</Button>
				</CardContent>
			</Card>

			<Card class="hover:border-primary/50 transition-colors">
				<CardHeader class="pb-2">
					<div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
						<ShieldCheck class="w-5 h-5" />
					</div>
					<CardTitle class="text-lg">Roles y Permisos</CardTitle>
					<CardDescription class="text-xs">
						Seguridad y asignación de matriz de permisos.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="ghost" size="sm" href="/perfil" class="w-full justify-between text-xs">
						Ver permisos
						<ArrowRight class="w-3 h-3" />
					</Button>
				</CardContent>
			</Card>

			<Card class="hover:border-primary/50 transition-colors">
				<CardHeader class="pb-2">
					<div class="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
						<Globe class="w-5 h-5" />
					</div>
					<CardTitle class="text-lg">Maestro Países</CardTitle>
					<CardDescription class="text-xs">
						Destinos y límites de carga por país.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="ghost" size="sm" href="/ventas/historial" class="w-full justify-between text-xs">
						Ver historial
						<ArrowRight class="w-3 h-3" />
					</Button>
				</CardContent>
			</Card>

			<Card class="hover:border-primary/50 transition-colors">
				<CardHeader class="pb-2">
					<div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
						<Tag class="w-5 h-5" />
					</div>
					<CardTitle class="text-lg">Ventas y Envíos</CardTitle>
					<CardDescription class="text-xs">
						Registro y consulta de operaciones de despacho.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="ghost" size="sm" href="/ventas" class="w-full justify-between text-xs">
						Cotizar Envío
						<ArrowRight class="w-3 h-3" />
					</Button>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
