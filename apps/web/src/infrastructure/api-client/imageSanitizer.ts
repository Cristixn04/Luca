export const MAX_UPLOAD_DIMENSION = 1024;

export interface CropRectNormalized {
  /** Fracción [0..0.45] recortada desde cada borde */
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface SanitizedPhotoResult {
  readonly blob: Blob;
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
  readonly localColorHex: string;
  readonly exifStripped: true;
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension = MAX_UPLOAD_DIMENSION,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    throw new RangeError('Las dimensiones de imagen deben ser positivas.');
  }
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Elimina segmentos APP1..APP15 (EXIF, GPS, XMP, ICC de cámara) de un JPEG binario.
 * Defensa adicional complementaria a la re-codificación vía Canvas.
 */
export function stripJpegExifSegments(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;

  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      chunks.push(bytes.slice(offset));
      break;
    }

    const marker = bytes[offset + 1]!;
    // Start of Scan (0xDA) o End of Image (0xD9): copia el resto tal cual
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(bytes.slice(offset));
      break;
    }

    if (offset + 3 >= bytes.length) {
      chunks.push(bytes.slice(offset));
      break;
    }

    const segLength = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    const segEnd = Math.min(bytes.length, offset + 2 + segLength);

    // Omite segmentos APP1 (EXIF/XMP: 0xE1) y APP2..APP15 (0xE2..0xEF) y COM (0xFE)
    const isMetadataSegment = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataSegment) {
      chunks.push(bytes.slice(offset, segEnd));
    }

    offset = segEnd;
  }

  const totalLength = chunks.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of chunks) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function extractCenterAverageHex(ctx: CanvasRenderingContext2D, width: number, height: number): string {
  try {
    const sx = Math.floor(width * 0.25);
    const sy = Math.floor(height * 0.25);
    const sw = Math.max(1, Math.floor(width * 0.5));
    const sh = Math.max(1, Math.floor(height * 0.5));
    const data = ctx.getImageData(sx, sy, sw, sh).data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] ?? 255;
      if (alpha >= 128) {
        rSum += data[i] ?? 0;
        gSum += data[i + 1] ?? 0;
        bSum += data[i + 2] ?? 0;
        count += 1;
      }
    }

    if (count === 0) return '#1F5F6B';
    return rgbToHex(rSum / count, gSum / count, bSum / count);
  } catch {
    return '#1F5F6B';
  }
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
    img.src = src;
  });
}

/**
 * Reduce la imagen a <= 1024 px, aplica recorte rectangular opcional y re-codifica vía Canvas
 * eliminando por completo los metadatos EXIF/GPS antes de guardar o enviar a la API (T6.6, T6.8).
 */
export async function sanitizeImageForUpload(
  file: Blob,
  options: { maxDimension?: number; crop?: CropRectNormalized } = {},
): Promise<SanitizedPhotoResult> {
  const maxDimension = options.maxDimension ?? MAX_UPLOAD_DIMENSION;
  const crop = options.crop ?? { top: 0, right: 0, bottom: 0, left: 0 };

  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(sourceDataUrl);

  const srcX = Math.floor(img.naturalWidth * Math.max(0, Math.min(0.45, crop.left)));
  const srcY = Math.floor(img.naturalHeight * Math.max(0, Math.min(0.45, crop.top)));
  const srcW = Math.max(
    1,
    Math.floor(img.naturalWidth * (1 - Math.max(0, Math.min(0.45, crop.left)) - Math.max(0, Math.min(0.45, crop.right)))),
  );
  const srcH = Math.max(
    1,
    Math.floor(img.naturalHeight * (1 - Math.max(0, Math.min(0.45, crop.top)) - Math.max(0, Math.min(0.45, crop.bottom)))),
  );

  const scaled = computeScaledDimensions(srcW, srcH, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = scaled.width;
  canvas.height = scaled.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D no disponible para procesar la imagen.');
  }

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, scaled.width, scaled.height);
  const localColorHex = extractCenterAverageHex(ctx, scaled.width, scaled.height);

  const outDataUrl = canvas.toDataURL('image/png');
  const outBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen procesada.'));
      },
      'image/png',
    );
  });

  return {
    blob: outBlob,
    dataUrl: outDataUrl,
    width: scaled.width,
    height: scaled.height,
    localColorHex,
    exifStripped: true,
  };
}
