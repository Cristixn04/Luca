export function dataUrlToBlob(dataUrl: string | undefined): Blob | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64$/i.exec(header);
  if (!mimeMatch) return null;

  try {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeMatch[1] });
  } catch {
    return null;
  }
}

export async function captureMannequinSvgToPngBlob(
  svgElement: SVGSVGElement | null,
): Promise<Blob | null> {
  if (!svgElement || typeof window === 'undefined' || typeof XMLSerializer === 'undefined') {
    return null;
  }

  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serialized = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo rasterizar el SVG del maniquí.'));
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const aspect = (img.naturalWidth || 260) / (img.naturalHeight || 540);
      const targetH = canvas.height * 0.9;
      const targetW = targetH * aspect;
      const dx = (canvas.width - targetW) / 2;
      const dy = (canvas.height - targetH) / 2;
      ctx.drawImage(img, dx, dy, targetW, targetH);

      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}
