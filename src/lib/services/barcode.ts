/**
 * Generador de Código de Barras 1D (Code 128B) en SVG puro y ligero en TypeScript.
 * No depende de paquetes externos ni de librerías del cliente.
 */

// Tabla de patrones Code 128 (valores de 0 a 106)
const CODE128_PATTERNS: string[] = [
	'212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
	'221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
	'221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
	'212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
	'231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
	'231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
	'314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
	'112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
	'111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
	'214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
	'114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (Start A, Start B, Start C, Stop)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Genera un código de barras en formato SVG utilizando codificación Code 128B.
 * @param text Texto o código alfanumérico a codificar (ej. 'INV-00001')
 * @param height Altura de las barras en píxeles (default: 60)
 * @param barWidth Ancho del módulo unitario de barra en píxeles (default: 2)
 * @param showText Si se debe mostrar el texto legible debajo de las barras (default: true)
 */
export function generateBarcodeSVG(
	text: string,
	height: number = 60,
	barWidth: number = 2,
	showText: boolean = true
): string {
	const sanitizedText = (text || 'INV-000000').trim();

	// Construir array de códigos
	const codes: number[] = [START_CODE_B];
	let checksum = START_CODE_B;

	for (let i = 0; i < sanitizedText.length; i++) {
		const charCode = sanitizedText.charCodeAt(i);
		const codeValue = charCode - 32; // Code 128B mapea ASCII 32..127 restando 32
		if (codeValue >= 0 && codeValue <= 95) {
			codes.push(codeValue);
			checksum += codeValue * (i + 1);
		}
	}

	// Agregar Checksum y Stop
	codes.push(checksum % 103);
	codes.push(STOP_CODE);

	// Convertir códigos a módulos de barras y espacios
	let patternString = '';
	for (const code of codes) {
		patternString += CODE128_PATTERNS[code] || '';
	}

	// Convertir el patrón numérico en anchos de rectángulos (1=barra, 2=espacio, 3=barra...)
	let x = 10; // Margen izquierdo
	let rects = '';
	let isBar = true;

	for (let i = 0; i < patternString.length; i++) {
		const widthInUnits = parseInt(patternString[i], 10);
		const currentWidth = widthInUnits * barWidth;

		if (isBar) {
			rects += `<rect x="${x}" y="0" width="${currentWidth}" height="${height}" fill="#000000" />`;
		}

		x += currentWidth;
		isBar = !isBar;
	}

	const totalWidth = x + 10;
	const totalHeight = showText ? height + 16 : height;
	const textY = height + 12;

	let textElement = '';
	if (showText) {
		textElement = `<text x="${totalWidth / 2}" y="${textY}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="#000000">${sanitizedText}</text>`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" class="barcode-128-svg"><rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />${rects}${textElement}</svg>`;
}

/**
 * Genera el código de barras como Data URL en SVG para usar directamente en etiquetas <img>.
 */
export function generateBarcodeDataURL(
	text: string,
	height: number = 60,
	barWidth: number = 2,
	showText: boolean = true
): string {
	const svg = generateBarcodeSVG(text, height, barWidth, showText);
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
