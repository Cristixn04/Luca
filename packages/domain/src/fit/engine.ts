import { createBodyModel } from '../body/model.js';
import type { BodyMeasurements, BodyModel } from '../body/types.js';
import { DEFAULT_FIT_BANDS_CONFIG, getRelevantZones, getZoneThresholds } from './bands.js';
import type {
  FitBandsConfig,
  FitReport,
  FitState,
  FitZone,
  GarmentCategory,
  GarmentFlatMeasurements,
  GarmentSizeInput,
  ZoneFitResult,
} from './types.js';

const CIRCUMFERENCE_ZONES: ReadonlySet<FitZone> = new Set(['chest', 'waist', 'hip']);

export interface EvaluateZoneInput {
  readonly category: GarmentCategory;
  readonly zone: FitZone;
  readonly bodyMeasureCm: number;
  readonly garmentMeasureCm: number;
  readonly elasticity: number;
  readonly bodyMeasureEstimated?: boolean;
  readonly config?: FitBandsConfig;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function evaluateZoneFit(input: EvaluateZoneInput): ZoneFitResult {
  const {
    category,
    zone,
    bodyMeasureCm,
    garmentMeasureCm,
    elasticity,
    bodyMeasureEstimated = false,
    config = DEFAULT_FIT_BANDS_CONFIG,
  } = input;

  if (!Number.isFinite(bodyMeasureCm) || bodyMeasureCm <= 0) {
    throw new RangeError(`Medida corporal inválida en ${zone}: ${bodyMeasureCm}`);
  }
  if (!Number.isFinite(garmentMeasureCm) || garmentMeasureCm <= 0) {
    throw new RangeError(`Medida de prenda inválida en ${zone}: ${garmentMeasureCm}`);
  }
  if (!Number.isFinite(elasticity) || elasticity < 0 || elasticity > 0.5) {
    throw new RangeError(`Elasticidad fuera de rango [0, 0.5]: ${elasticity}`);
  }

  const thresholds = getZoneThresholds(category, zone, config);
  const mode = CIRCUMFERENCE_ZONES.has(zone) ? 'circumference' : 'linear';

  const easeCm = round2(garmentMeasureCm - bodyMeasureCm);
  const elasticReliefCm = round2(garmentMeasureCm * elasticity);
  const effectiveEaseCm = round2(easeCm + elasticReliefCm);

  // Límite físico de tensión: -1 cm en hombros, 0 cm en el resto de zonas.
  const baseThreshold = config.defaultBands[zone].tight[0];
  const physicalMin = Math.min(0, baseThreshold);

  let state: FitState;
  let elasticCompensated = false;

  if (effectiveEaseCm < physicalMin) {
    state = 'tense';
  } else if (easeCm < physicalMin) {
    state = 'tight';
    elasticCompensated = true;
  } else if (easeCm < thresholds.tight[1]) {
    state = 'tight';
  } else if (easeCm < thresholds.regular[1]) {
    state = 'regular';
  } else if (easeCm < thresholds.loose[1]) {
    state = 'loose';
  } else {
    state = 'oversize';
  }

  return {
    zone,
    mode,
    bodyMeasureCm: round2(bodyMeasureCm),
    garmentMeasureCm: round2(garmentMeasureCm),
    easeCm,
    elasticReliefCm,
    effectiveEaseCm,
    state,
    elasticCompensated,
    bodyMeasureEstimated,
    thresholds,
  };
}

function getGarmentMeasureForZone(
  zone: FitZone,
  flat: GarmentFlatMeasurements,
): number | undefined {
  switch (zone) {
    case 'chest':
      return flat.chestFlat !== undefined ? flat.chestFlat * 2 : undefined;
    case 'waist':
      return flat.waistFlat !== undefined ? flat.waistFlat * 2 : undefined;
    case 'hip':
      return flat.hipFlat !== undefined ? flat.hipFlat * 2 : undefined;
    case 'shoulders':
      return flat.shoulders;
    case 'back':
      return flat.backWidth;
  }
}

function getBodyMeasureForZone(
  zone: FitZone,
  model: BodyModel,
): { value: number; estimated: boolean } {
  switch (zone) {
    case 'chest':
      return { value: model.sections.chest.perimeterCm, estimated: false };
    case 'waist':
      return { value: model.sections.waist.perimeterCm, estimated: false };
    case 'hip':
      return { value: model.sections.hip.perimeterCm, estimated: false };
    case 'shoulders':
      return { value: model.shouldersWidthCm, estimated: false };
    case 'back':
      return { value: model.backWidthCm, estimated: model.backWidthEstimated };
  }
}

function isBodyModel(input: BodyMeasurements | BodyModel): input is BodyModel {
  return 'sections' in input;
}

const STATE_SEVERITY: Readonly<Record<FitState, number>> = {
  tense: 3,
  oversize: 2,
  tight: 1,
  loose: 1,
  regular: 0,
};

function computeOverallState(evaluatedZones: readonly ZoneFitResult[]): FitState {
  if (evaluatedZones.length === 0) {
    return 'regular';
  }

  const tenseZone = evaluatedZones.find((item) => item.state === 'tense');
  if (tenseZone) {
    return 'tense';
  }

  let dominant = evaluatedZones[0]!;
  for (const current of evaluatedZones.slice(1)) {
    if (STATE_SEVERITY[current.state] > STATE_SEVERITY[dominant.state]) {
      dominant = current;
    }
  }
  return dominant.state;
}

export function evaluateGarmentFit(
  body: BodyMeasurements | BodyModel,
  garment: GarmentSizeInput,
  config: FitBandsConfig = DEFAULT_FIT_BANDS_CONFIG,
): FitReport {
  const model = isBodyModel(body) ? body : createBodyModel(body);
  const relevantZones = getRelevantZones(garment.category, config);

  const evaluatedZones: ZoneFitResult[] = [];
  const missingZones: FitZone[] = [];

  for (const zone of relevantZones) {
    const garmentMeasure = getGarmentMeasureForZone(zone, garment.flatMeasuresCm);
    if (garmentMeasure === undefined) {
      missingZones.push(zone);
      continue;
    }

    const bodyMeasure = getBodyMeasureForZone(zone, model);
    evaluatedZones.push(
      evaluateZoneFit({
        category: garment.category,
        zone,
        bodyMeasureCm: bodyMeasure.value,
        garmentMeasureCm: garmentMeasure,
        elasticity: garment.elasticity,
        bodyMeasureEstimated: bodyMeasure.estimated,
        config,
      }),
    );
  }

  const hasTenseZone = evaluatedZones.some((zone) => zone.state === 'tense');
  const overallState = computeOverallState(evaluatedZones);

  return {
    category: garment.category,
    sizeLabel: garment.sizeLabel,
    relevantZones,
    evaluatedZones,
    missingZones,
    overallState,
    hasTenseZone,
  };
}
