import { fromCm, toCm, type MeasurementUnit } from '../units.js';
import type {
  BodyMeasurements,
  OptionalBodyMeasurements,
  RequiredBodyMeasurements,
  ValidationIssue,
  ValidationResult,
} from './types.js';

export interface MeasurementRangeCm {
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

export const REQUIRED_RANGES_CM: Readonly<Record<keyof RequiredBodyMeasurements, MeasurementRangeCm>> =
  {
    height: { min: 120, max: 230, label: 'altura' },
    shoulders: { min: 28, max: 70, label: 'ancho de hombros' },
    chest: { min: 55, max: 180, label: 'pecho' },
    waist: { min: 45, max: 170, label: 'cintura' },
    hip: { min: 60, max: 190, label: 'cadera' },
    inseam: { min: 45, max: 120, label: 'entrepierna' },
  };

export const OPTIONAL_RANGES_CM: Readonly<Record<keyof OptionalBodyMeasurements, MeasurementRangeCm>> =
  {
    torsoLength: { min: 30, max: 80, label: 'largo de torso' },
    chestDepth: { min: 10, max: 55, label: 'fondo de pecho' },
    waistDepth: { min: 10, max: 55, label: 'fondo de cintura' },
    hipDepth: { min: 12, max: 60, label: 'fondo de cadera' },
    backWidth: { min: 25, max: 65, label: 'ancho de espalda' },
    backLength: { min: 28, max: 75, label: 'largo de espalda' },
  };

function checkRange(
  field: string,
  value: number,
  range: MeasurementRangeCm,
  errors: ValidationIssue[],
): void {
  if (!Number.isFinite(value)) {
    errors.push({
      field,
      code: 'NON_FINITE',
      severity: 'error',
      message: `El valor de ${range.label} debe ser un número válido.`,
    });
    return;
  }

  if (value < range.min || value > range.max) {
    errors.push({
      field,
      code: 'OUT_OF_RANGE',
      severity: 'error',
      message: `El valor de ${range.label} (${value} cm) está fuera del rango esperado (${range.min}–${range.max} cm).`,
    });
  }
}

export function validateBodyMeasurements(measurements: BodyMeasurements): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const { required, optional } = measurements;

  for (const key of Object.keys(REQUIRED_RANGES_CM) as Array<keyof RequiredBodyMeasurements>) {
    checkRange(`required.${key}`, required[key], REQUIRED_RANGES_CM[key], errors);
  }

  if (optional) {
    for (const key of Object.keys(OPTIONAL_RANGES_CM) as Array<keyof OptionalBodyMeasurements>) {
      const value = optional[key];
      if (value !== undefined) {
        checkRange(`optional.${key}`, value, OPTIONAL_RANGES_CM[key], errors);
      }
    }
  }

  // Verificaciones relacionales solo si los rangos básicos son válidos.
  // El lenguaje describe siempre la captura de la medida, nunca emite juicios sobre el cuerpo.
  if (errors.length === 0) {
    if (required.inseam >= required.height * 0.6) {
      warnings.push({
        field: 'required.inseam',
        code: 'INSEAM_HEIGHT_RATIO',
        severity: 'warning',
        message:
          'La entrepierna registrada supera el 60 % de la altura; verifica que se haya medido desde el tiro hasta el tobillo.',
      });
    }

    if (required.shoulders >= required.chest * 0.75) {
      warnings.push({
        field: 'required.shoulders',
        code: 'SHOULDERS_CHEST_RATIO',
        severity: 'warning',
        message:
          'El ancho de hombros es muy cercano al perímetro de pecho; confirma que hombros se haya tomado de forma lineal y pecho como contorno completo.',
      });
    }

    if (required.waist > required.chest * 1.35) {
      warnings.push({
        field: 'required.waist',
        code: 'WAIST_CHEST_RATIO',
        severity: 'warning',
        message:
          'La diferencia entre cintura y pecho es inusual; revisa ambas medidas para descartar un error de escritura.',
      });
    }

    if (optional?.chestDepth !== undefined && optional.chestDepth * 2 >= required.chest) {
      errors.push({
        field: 'optional.chestDepth',
        code: 'DEPTH_EXCEEDS_PERIMETER',
        severity: 'error',
        message:
          'El fondo de pecho no puede ser igual o mayor a la mitad del perímetro de pecho.',
      });
    }

    if (optional?.waistDepth !== undefined && optional.waistDepth * 2 >= required.waist) {
      errors.push({
        field: 'optional.waistDepth',
        code: 'DEPTH_EXCEEDS_PERIMETER',
        severity: 'error',
        message:
          'El fondo de cintura no puede ser igual o mayor a la mitad del perímetro de cintura.',
      });
    }

    if (optional?.hipDepth !== undefined && optional.hipDepth * 2 >= required.hip) {
      errors.push({
        field: 'optional.hipDepth',
        code: 'DEPTH_EXCEEDS_PERIMETER',
        severity: 'error',
        message:
          'El fondo de cadera no puede ser igual o mayor a la mitad del perímetro de cadera.',
      });
    }

    if (
      optional?.torsoLength !== undefined &&
      optional.torsoLength + required.inseam > required.height * 0.92
    ) {
      warnings.push({
        field: 'optional.torsoLength',
        code: 'TORSO_INSEAM_SUM',
        severity: 'warning',
        message:
          'La suma de largo de torso y entrepierna es muy cercana a la altura total; verifica los puntos de referencia.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function convertBodyMeasurements(
  measurements: BodyMeasurements,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
): BodyMeasurements {
  if (fromUnit === toUnit) {
    return measurements;
  }

  const convert = (val: number): number => fromCm(toCm(val, fromUnit), toUnit);

  const required: RequiredBodyMeasurements = {
    height: convert(measurements.required.height),
    shoulders: convert(measurements.required.shoulders),
    chest: convert(measurements.required.chest),
    waist: convert(measurements.required.waist),
    hip: convert(measurements.required.hip),
    inseam: convert(measurements.required.inseam),
  };

  if (!measurements.optional) {
    return { required };
  }

  const opt = measurements.optional;
  const optional: OptionalBodyMeasurements = {
    ...(opt.torsoLength !== undefined ? { torsoLength: convert(opt.torsoLength) } : {}),
    ...(opt.chestDepth !== undefined ? { chestDepth: convert(opt.chestDepth) } : {}),
    ...(opt.waistDepth !== undefined ? { waistDepth: convert(opt.waistDepth) } : {}),
    ...(opt.hipDepth !== undefined ? { hipDepth: convert(opt.hipDepth) } : {}),
    ...(opt.backWidth !== undefined ? { backWidth: convert(opt.backWidth) } : {}),
    ...(opt.backLength !== undefined ? { backLength: convert(opt.backLength) } : {}),
  };

  return { required, optional };
}
