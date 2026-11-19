import { solveEllipseSection } from './ellipse.js';
import type { BodyMeasurements, BodyModel, VerticalLandmarksCm } from './types.js';
import { validateBodyMeasurements } from './validation.js';

const DEFAULT_HEAD_TO_SHOULDER_RATIO = 0.18;
const DEFAULT_TORSO_TO_HEIGHT_RATIO = 0.29;
const DEFAULT_BACK_TO_SHOULDERS_RATIO = 0.9;

function computeVerticalLandmarks(
  heightCm: number,
  inseamCm: number,
  torsoLengthCm?: number,
): VerticalLandmarksCm {
  const torsoEstimated = torsoLengthCm === undefined;
  const shoulderY = heightCm * DEFAULT_HEAD_TO_SHOULDER_RATIO;
  const crotchY = heightCm - inseamCm;
  const effectiveTorso = torsoLengthCm ?? heightCm * DEFAULT_TORSO_TO_HEIGHT_RATIO;

  // Asegura orden vertical coherente desde cabeza hasta piso (Y crece hacia abajo).
  const rawWaistY = shoulderY + effectiveTorso;
  const waistY = Math.min(rawWaistY, crotchY - heightCm * 0.06);
  const chestY = shoulderY + (waistY - shoulderY) * 0.36;
  const hipY = waistY + (crotchY - waistY) * 0.58;

  return {
    headTopY: 0,
    shoulderY,
    chestY,
    waistY,
    hipY,
    crotchY,
    floorY: heightCm,
    torsoEstimated,
  };
}

export function createBodyModel(measurements: BodyMeasurements): BodyModel {
  const validation = validateBodyMeasurements(measurements);
  if (!validation.valid) {
    const summary = validation.errors.map((err) => `${err.field}: ${err.message}`).join('; ');
    throw new RangeError(`Medidas corporales inválidas: ${summary}`);
  }

  const { required, optional } = measurements;

  const chest = solveEllipseSection('chest', required.chest, optional?.chestDepth);
  const waist = solveEllipseSection('waist', required.waist, optional?.waistDepth);
  const hip = solveEllipseSection('hip', required.hip, optional?.hipDepth);

  const landmarks = computeVerticalLandmarks(
    required.height,
    required.inseam,
    optional?.torsoLength,
  );

  const backWidthEstimated = optional?.backWidth === undefined;
  const backWidthCm =
    optional?.backWidth ?? Number((required.shoulders * DEFAULT_BACK_TO_SHOULDERS_RATIO).toFixed(2));

  const backLengthEstimated = optional?.backLength === undefined;
  const backLengthCm =
    optional?.backLength ?? Number((landmarks.waistY - landmarks.shoulderY).toFixed(2));

  const estimatedFields: string[] = [];
  if (chest.depthEstimated) estimatedFields.push('chestDepth');
  if (waist.depthEstimated) estimatedFields.push('waistDepth');
  if (hip.depthEstimated) estimatedFields.push('hipDepth');
  if (landmarks.torsoEstimated) estimatedFields.push('torsoLength');
  if (backWidthEstimated) estimatedFields.push('backWidth');
  if (backLengthEstimated) estimatedFields.push('backLength');

  return {
    heightCm: required.height,
    shouldersWidthCm: required.shoulders,
    backWidthCm,
    backWidthEstimated,
    backLengthCm,
    backLengthEstimated,
    sections: { chest, waist, hip },
    landmarks,
    estimatedFields,
  };
}
