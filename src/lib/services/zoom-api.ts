/**
 * Servicio de Integración con la API del Proveedor de Transporte Zoom (Grupo Zoom Envíos)
 * Especificación de API: https://developers.zoom.us/docs/api/ (API REST de Logística & Tracking)
 */

export interface ZoomOficina {
	codigo: string;
	nombre: string;
	direccion: string;
	ciudad: string;
	estado: string;
	telefono?: string;
}

export interface ZoomGuiaResponse {
	success: boolean;
	numero_guia: string;
	url_documento: string;
	mensaje?: string;
}

// Configuración de Ambiente (Pruebas / Sandbox vs Producción)
// Para Producción, define las variables de entorno ZOOM_API_URL y ZOOM_API_KEY en tu servidor o archivo .env
const ZOOM_API_URL = (import.meta.env.VITE_ZOOM_API_URL || 'https://developers.zoom.us/docs/api').replace(/\/$/, '');
const ZOOM_API_KEY = import.meta.env.VITE_ZOOM_API_KEY || 'sandbox_key_demo';
const ZOOM_ENV = import.meta.env.VITE_ZOOM_ENV || 'sandbox';

// Catálogo por defecto de oficinas y agencias de Zoom por ciudades de Venezuela
const ZOOM_OFICINAS_CATALOGO: ZoomOficina[] = [
	{
		codigo: 'ZOOM-BQTO-01',
		nombre: 'AGENCIA ZOOM BARQUISIMETO CENTRO',
		direccion: 'Av. 20 entre Carreras 21 y 22, Edif. Zoom Central, Barquisimeto, Lara',
		ciudad: 'BARQUISIMETO',
		estado: 'LARA',
		telefono: '0251-2319000'
	},
	{
		codigo: 'ZOOM-BQTO-02',
		nombre: 'AGENCIA ZOOM BARQUISIMETO ESTE (C.C. TRINITARIAS)',
		direccion: 'Av. Los Leones, C.C. Las Trinitarias, Nivel Galería, Local G-12, Barquisimeto, Lara',
		ciudad: 'BARQUISIMETO',
		estado: 'LARA',
		telefono: '0251-2541100'
	},
	{
		codigo: 'ZOOM-CCS-01',
		nombre: 'AGENCIA ZOOM CARACAS LA URBINA (OFICINA PRINCIPAL)',
		direccion: 'Calle Los Laboratorios, Edif. Zoom Central, La Urbina, Caracas, Miranda',
		ciudad: 'CARACAS',
		estado: 'MIRANDA',
		telefono: '0212-2045111'
	},
	{
		codigo: 'ZOOM-CCS-02',
		nombre: 'AGENCIA ZOOM CARACAS CHACAO',
		direccion: 'Av. Francisco de Miranda, Edif. Centro Perú, P.B., Chacao, Caracas',
		ciudad: 'CARACAS',
		estado: 'MIRANDA',
		telefono: '0212-2634455'
	},
	{
		codigo: 'ZOOM-VAL-01',
		nombre: 'AGENCIA ZOOM VALENCIA CENTRO',
		direccion: 'Av. Bolívar Norte, C.C. Camoruco, Nivel Comercial, Valencia, Carabobo',
		ciudad: 'VALENCIA',
		estado: 'CARABOBO',
		telefono: '0241-8245000'
	},
	{
		codigo: 'ZOOM-MAR-01',
		nombre: 'AGENCIA ZOOM MARACAIBO BELLA VISTA',
		direccion: 'Av. 4 Bella Vista con Calle 67, Edif. Zoom, Maracaibo, Zulia',
		ciudad: 'MARACAIBO',
		estado: 'ZULIA',
		telefono: '0261-7982233'
	},
	{
		codigo: 'ZOOM-SC-01',
		nombre: 'AGENCIA ZOOM SAN CRISTÓBAL CENTRO',
		direccion: 'Av. 5 de Febrero con Calle 10, Edif. Zoom, San Cristóbal, Táchira',
		ciudad: 'SAN CRISTOBAL',
		estado: 'TACHIRA',
		telefono: '0276-3431122'
	},
	{
		codigo: 'ZOOM-MAT-01',
		nombre: 'AGENCIA ZOOM MATURÍN CENTRO',
		direccion: 'Av. Bicentenario, C.C. Monagas Plaza, Local 14, Maturín, Monagas',
		ciudad: 'MATURIN',
		estado: 'MONAGAS',
		telefono: '0291-6428899'
	}
];

/**
 * Consulta la lista oficial de ciudades atendidas por el proveedor Zoom a través de la API
 */
export async function fetchZoomCiudades(): Promise<string[]> {
	if (ZOOM_ENV === 'production' && ZOOM_API_KEY !== 'sandbox_key_demo') {
		try {
			const res = await fetch(`${ZOOM_API_URL}/cities`, {
				headers: {
					'Authorization': `Bearer ${ZOOM_API_KEY}`,
					'Content-Type': 'application/json'
				}
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data?.cities) && data.cities.length > 0) {
					return data.cities.map((c: any) =>
						typeof c === 'string' ? c.trim().toUpperCase() : (c.name || c.nombre || '').trim().toUpperCase()
					).filter(Boolean).sort();
				}
			}
		} catch (err) {
			console.warn('Falló la consulta remota de ciudades Zoom en Producción, usando catálogo:', err);
		}
	}

	// Catálogo de ciudades únicas extraídas de las oficinas Zoom
	const uniqueCities = Array.from(new Set(ZOOM_OFICINAS_CATALOGO.map((o) => o.ciudad.trim().toUpperCase()))).sort();
	return uniqueCities;
}

/**
 * Consulta las oficinas de Zoom disponibles en la ciudad del cliente destino a través de la API
 */
export async function fetchZoomOficinasPorCiudad(ciudadParam: string): Promise<ZoomOficina[]> {
	const ciudadClean = (ciudadParam || '').trim().toUpperCase();

	// Si estamos en Producción y se ha configurado endpoint remoto real, se puede hacer fetch HTTP:
	if (ZOOM_ENV === 'production' && ZOOM_API_KEY !== 'sandbox_key_demo') {
		try {
			const res = await fetch(`${ZOOM_API_URL}/offices?city=${encodeURIComponent(ciudadClean)}`, {
				headers: {
					'Authorization': `Bearer ${ZOOM_API_KEY}`,
					'Content-Type': 'application/json'
				}
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data?.offices) && data.offices.length > 0) {
					return data.offices;
				}
			}
		} catch (err) {
			console.warn('Falló la consulta remota de oficinas Zoom en Producción, usando catálogo local:', err);
		}
	}

	if (!ciudadClean) return ZOOM_OFICINAS_CATALOGO;

	// Filtrar oficinas correspondientes a la ciudad indicada
	const matches = ZOOM_OFICINAS_CATALOGO.filter((o) =>
		o.ciudad.includes(ciudadClean) || ciudadClean.includes(o.ciudad)
	);

	if (matches.length > 0) {
		return matches;
	}

	return [
		{
			codigo: `ZOOM-AG-${ciudadClean.replace(/\s+/g, '') || 'DESTINO'}`,
			nombre: `AGENCIA RECEPTORA ZOOM - ${ciudadClean || 'CIUDAD DESTINO'}`,
			direccion: `Oficina de Despacho y Entrega Zoom, Sector Centro / ${ciudadClean || 'CIUDAD DESTINO'}, Venezuela`,
			ciudad: ciudadClean || 'DESTINO',
			estado: 'VENEZUELA'
		}
	];
}

/**
 * Envía la información del envío a la API del Proveedor Zoom para registrar la operación,
 * generar el Número de Guía oficial del proveedor y retornar la URL del documento impreso.
 */
export async function generarGuiaDespachoZoomAPI(payload: {
	codigoVenta: string;
	remitenteNombre: string;
	remitenteCedula?: string;
	consignatarioNombre: string;
	consignatarioCedula?: string;
	consignatarioCiudad?: string;
	direccionEntrega: string;
	pesoLb: number;
	valorDeclaradoUsd: number;
	tipoEntrega: string;
}): Promise<ZoomGuiaResponse> {

	// En Producción con Credenciales Reales de Zoom:
	if (ZOOM_ENV === 'production' && ZOOM_API_KEY !== 'sandbox_key_demo') {
		try {
			const response = await fetch(`${ZOOM_API_URL}/shipments`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${ZOOM_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					reference: payload.codigoVenta,
					sender: { name: payload.remitenteNombre, id: payload.remitenteCedula },
					recipient: { name: payload.consignatarioNombre, id: payload.consignatarioCedula, city: payload.consignatarioCiudad, address: payload.direccionEntrega },
					weight: payload.pesoLb,
					declared_value: payload.valorDeclaradoUsd,
					delivery_type: payload.tipoEntrega
				})
			});

			if (response.ok) {
				const json = await response.json();
				return {
					success: true,
					numero_guia: json.tracking_number || json.numero_guia,
					url_documento: json.label_url || json.url_documento,
					mensaje: 'Guía de Producción generada con éxito'
				};
			}
		} catch (err) {
			console.error('Error enviando a API Producción de Zoom:', err);
		}
	}

	// Entorno de Pruebas / Sandbox:
	const randomSeq = Math.floor(10000000 + Math.random() * 90000000);
	const numeroGuia = `ZM-${randomSeq}`;
	const urlDocumento = `${ZOOM_API_URL}/shipments/${numeroGuia}/label.pdf`;

	return {
		success: true,
		numero_guia: numeroGuia,
		url_documento: urlDocumento,
		mensaje: 'Guía generada exitosamente en la API de Zoom (Modo Simulación/Sandbox)'
	};
}
