import { createBodyModel } from '../body/model.js';
import type { BodyMeasurements, BodyModel } from '../body/types.js';
import { DEFAULT_FIT_BANDS_CONFIG } from './bands.js';
import { evaluateGarmentFit } from './engine.js';
import type {
  FitBandsConfig,
  FitPreference,
  GarmentSizeInput,
  SizeEvaluation,
  SizeRecommendation,
  ZoneFitResult,
} from './types.js';

const TENSE_PENALTY_BASE = 100;
const TENSE_DISTANCE_MULTIPLIER = 10;
const MISSING_ZONE_PENALTY = 25;

function distanceToTargetBand(zone: ZoneFitResult, preference: FitPreference): number {
  const [minInclusive, maxExclusive] = zone.thresholds[preference];

  // Cuando la elasticidad compensa una holgura negativa y la preferencia es ajustado,
  // la distancia es 0 respecto al borde inferior de tight.
  if (zone.elasticCompensated && preference === 'tight') {
    return 0;
  }

  if (zone.easeCm >= minInclusive && zone.easeCm < maxExclusive) {
    return 0;
  }

  if (zone.easeCm < minInclusive) {
    return Number((minInclusive - zone.easeCm).toFixed(2));
  }

  return Number((zone.easeCm - maxExclusive).toFixed(2));
}

function buildReason(evaluation: Omit<SizeEvaluation, 'reason'>, preference: FitPreference): string {
  const { report, inTargetBandCount } = evaluation;
  if (report.hasTenseZone) {
    const tenseZones = report.evaluatedZones
      .filter((z) => z.state === 'tense')
      .map((z) => z.zone)
      .join(', ');
    return `Queda tensa en ${tenseZones}.`;
  }

  if (inTargetBandCount === report.evaluatedZones.length && report.evaluatedZones.length > 0) {
    return `Todas las zonas evaluadas caen dentro de tu preferencia (${preference}).`;
  }

  return `${inTargetBandCount} de ${report.evaluatedZones.length} zonas dentro de la banda objetivo (${preference}); distancia total ${evaluation.targetDistanceCm} cm.`;
}

function isBodyModel(input: BodyMeasurements | BodyModel): input is BodyModel {
  return 'sections' in input;
}

export function recommendSize(
  body: BodyMeasurements | BodyModel,
  sizes: readonly GarmentSizeInput[],
  preference: FitPreference = 'regular',
  config: FitBandsConfig = DEFAULT_FIT_BANDS_CONFIG,
): SizeRecommendation {
  if (sizes.length === 0) {
    throw new RangeError('Se requiere al menos una talla para recomendar.');
  }

  const model = isBodyModel(body) ? body : createBodyModel(body);

  const evaluated: SizeEvaluation[] = sizes.map((size) => {
    const report = evaluateGarmentFit(model, size, config);

    let targetDistanceCm = 0;
    let penaltyScore = 0;
    let inTargetBandCount = 0;

    for (const zone of report.evaluatedZones) {
      const dist = distanceToTargetBand(zone, preference);
      targetDistanceCm += dist;

      if (dist === 0 && zone.state !== 'tense') {
        inTargetBandCount += 1;
      }

      if (zone.state === 'tense') {
        penaltyScore += TENSE_PENALTY_BASE + dist * TENSE_DISTANCE_MULTIPLIER;
      } else {
        penaltyScore += dist;
      }
    }

    penaltyScore += report.missingZones.length * MISSING_ZONE_PENALTY;

    const base = {
      sizeLabel: size.sizeLabel,
      report,
      targetDistanceCm: Number(targetDistanceCm.toFixed(2)),
      penaltyScore: Number(penaltyScore.toFixed(2)),
      inTargetBandCount,
    };

    return {
      ...base,
      reason: buildReason(base, preference),
    };
  });

  const ranked = [...evaluated].sort((a, b) => {
    if (a.penaltyScore !== b.penaltyScore) {
      return a.penaltyScore - b.penaltyScore;
    }
    if (a.targetDistanceCm !== b.targetDistanceCm) {
      return a.targetDistanceCm - b.targetDistanceCm;
    }
    return a.sizeLabel.localeCompare(b.sizeLabel);
  });

  const best = ranked[0]!;

  return {
    preference,
    recommendedSize: best.sizeLabel,
    best,
    ranked,
  };
}
