import type { BodySection, EllipseSection } from './types.js';

export const DEFAULT_DEPTH_RATIOS: Readonly<Record<BodySection, number>> = {
  chest: 0.65,
  waist: 0.7,
  hip: 0.7,
};

/**
 * Aproximación de Ramanujan para el perímetro de una elipse con semiejes a y b:
 * P = π · [ 3(a + b) − √((3a + b)(a + 3b)) ]
 */
export function ramanujanPerimeter(semiA: number, semiB: number): number {
  if (!Number.isFinite(semiA) || !Number.isFinite(semiB) || semiA < 0 || semiB < 0) {
    throw new RangeError('Los semiejes de la elipse deben ser números finitos ≥ 0.');
  }
  const term = 3 * (semiA + semiB) - Math.sqrt((3 * semiA + semiB) * (semiA + 3 * semiB));
  return Math.PI * term;
}

/**
 * Resuelve la elipse de una sección corporal dado su perímetro P y un fondo opcional d.
 * - Sin fondo medido: usa relación b = r · a y fórmula cerrada.
 * - Con fondo medido d: fija b = d / 2 y resuelve a por bisección (P es estrictamente creciente en a).
 */
export function solveEllipseSection(
  section: BodySection,
  perimeterCm: number,
  measuredDepthCm?: number,
): EllipseSection {
  if (!Number.isFinite(perimeterCm) || perimeterCm <= 0) {
    throw new RangeError(`El perímetro de ${section} debe ser un número finito > 0.`);
  }

  let semiA: number;
  let semiB: number;
  let depthEstimated: boolean;

  if (measuredDepthCm === undefined) {
    const r = DEFAULT_DEPTH_RATIOS[section];
    const factor = Math.PI * (3 * (1 + r) - Math.sqrt((3 + r) * (1 + 3 * r)));
    semiA = perimeterCm / factor;
    semiB = r * semiA;
    depthEstimated = true;
  } else {
    if (!Number.isFinite(measuredDepthCm) || measuredDepthCm <= 0) {
      throw new RangeError(`El fondo medido de ${section} debe ser un número finito > 0.`);
    }
    semiB = measuredDepthCm / 2;
    const minPerimeter = ramanujanPerimeter(0, semiB);
    if (perimeterCm <= minPerimeter) {
      throw new RangeError(
        `El fondo medido (${measuredDepthCm} cm) es incompatible con el perímetro (${perimeterCm} cm) en ${section}.`,
      );
    }

    let low = 0;
    let high = perimeterCm / 2;
    for (let i = 0; i < 64; i += 1) {
      const mid = (low + high) / 2;
      const candidate = ramanujanPerimeter(mid, semiB);
      if (candidate < perimeterCm) {
        low = mid;
      } else {
        high = mid;
      }
    }
    semiA = (low + high) / 2;
    depthEstimated = false;
  }

  const reconstructed = ramanujanPerimeter(semiA, semiB);
  const relativeError = Math.abs(reconstructed - perimeterCm) / perimeterCm;

  return {
    section,
    perimeterCm,
    semiWidthA: semiA,
    semiDepthB: semiB,
    widthCm: semiA * 2,
    depthCm: semiB * 2,
    depthRatio: semiB / semiA,
    depthEstimated,
    relativeError,
  };
}

/**
 * Sección transversal de una prenda: en perfil/espalda conserva la relación
 * fondo/ancho del cuerpo con perímetro = ancho_plano × 2.
 */
export function solveGarmentSection(
  flatWidthCm: number,
  bodyDepthRatio: number,
): { frontWidthCm: number; sideDepthCm: number; circumferenceCm: number } {
  if (!Number.isFinite(flatWidthCm) || flatWidthCm <= 0) {
    throw new RangeError('El ancho plano de la prenda debe ser un número finito > 0.');
  }
  if (!Number.isFinite(bodyDepthRatio) || bodyDepthRatio <= 0) {
    throw new RangeError('La relación fondo/ancho debe ser un número finito > 0.');
  }

  const circumferenceCm = flatWidthCm * 2;
  const r = bodyDepthRatio;
  const factor = Math.PI * (3 * (1 + r) - Math.sqrt((3 + r) * (1 + 3 * r)));
  const semiA = circumferenceCm / factor;
  const semiB = r * semiA;

  return {
    frontWidthCm: flatWidthCm,
    sideDepthCm: semiB * 2,
    circumferenceCm,
  };
}
