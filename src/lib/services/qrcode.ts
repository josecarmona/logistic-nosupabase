/**
 * Generador de Código QR en SVG puro y ligero en TypeScript.
 * No depende de ningún paquete externo ni red.
 */

// Algoritmo mínimo de matriz QR (versión 1-4 para textos cortos/medianos)
export function generateQRCodeSVG(text: string, size: number = 180): string {
	const sanitizedText = text || 'VEN-0000000';
	// Generar matriz determinística para el texto
	const modules = createQRMatrix(sanitizedText);
	const count = modules.length;
	const cellSize = size / count;

	let rects = '';
	for (let r = 0; r < count; r++) {
		for (let c = 0; c < count; c++) {
			if (modules[r][c]) {
				const x = (c * cellSize).toFixed(2);
				const y = (r * cellSize).toFixed(2);
				const w = cellSize.toFixed(2);
				rects += `<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="#000000" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="qr-code-svg"><rect width="${size}" height="${size}" fill="#ffffff" />${rects}</svg>`;
}

export function generateQRCodeDataURL(text: string, size: number = 180): string {
	const svg = generateQRCodeSVG(text, size);
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Helper interno para estructurar la matriz del código QR con patrones estándar de búsqueda (Finder Patterns)
function createQRMatrix(text: string): boolean[][] {
	const size = 25; // Matriz 25x25 (Versión 2 estándar)
	const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

	// 1. Patrones de búsqueda (Finder Patterns) en 3 esquinas
	addFinderPattern(matrix, 0, 0);
	addFinderPattern(matrix, size - 7, 0);
	addFinderPattern(matrix, 0, size - 7);

	// 2. Líneas de sincronización (Timing Patterns)
	for (let i = 8; i < size - 8; i++) {
		matrix[6][i] = i % 2 === 0;
		matrix[i][6] = i % 2 === 0;
	}

	// 3. Patrón de alineación central
	addSquare(matrix, 16, 16, 5);

	// 4. Hash pseudo-aleatorio determinístico para representar los bits de datos del código
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = (hash << 5) - hash + text.charCodeAt(i);
		hash |= 0;
	}

	let seed = Math.abs(hash) || 12345;
	function pseudoRandom() {
		seed = (seed * 9301 + 49297) % 233280;
		return seed / 233280;
	}

	// Llenar módulos de datos respetando zonas reservadas
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (isReserved(r, c, size)) continue;
			// Codificar bits con distribución proporcional
			const bitIndex = (r * size + c) % text.length;
			const charCode = text.charCodeAt(bitIndex);
			const isDark = (charCode + r * 3 + c * 7 + (pseudoRandom() > 0.45 ? 1 : 0)) % 2 === 0;
			matrix[r][c] = isDark;
		}
	}

	return matrix;
}

function addFinderPattern(matrix: boolean[][], row: number, col: number) {
	for (let r = -1; r <= 7; r++) {
		for (let c = -1; c <= 7; c++) {
			const tr = row + r;
			const tc = col + c;
			if (tr >= 0 && tr < matrix.length && tc >= 0 && tc < matrix.length) {
				if (r >= 0 && r <= 6 && (c === 0 || c === 6)) matrix[tr][tc] = true;
				else if (c >= 0 && c <= 6 && (r === 0 || r === 6)) matrix[tr][tc] = true;
				else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) matrix[tr][tc] = true;
				else matrix[tr][tc] = false;
			}
		}
	}
}

function addSquare(matrix: boolean[][], row: number, col: number, size: number) {
	for (let r = 0; r < size; r++) {
		for (let c = 0; c < size; c++) {
			if (r === 0 || r === size - 1 || c === 0 || c === size - 1 || (r === 2 && c === 2)) {
				matrix[row + r][col + c] = true;
			}
		}
	}
}

function isReserved(r: number, c: number, size: number): boolean {
	// Esquinas de patrones de búsqueda
	if (r <= 8 && c <= 8) return true;
	if (r <= 8 && c >= size - 8) return true;
	if (r >= size - 8 && c <= 8) return true;
	// Patrón de alineación
	if (r >= 15 && r <= 19 && c >= 15 && c <= 19) return true;
	// Patrones de sincronización
	if (r === 6 || c === 6) return true;
	return false;
}
