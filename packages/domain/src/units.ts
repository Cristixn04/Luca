export const MEASUREMENT_UNITS = ['cm', 'in'] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const CM_PER_INCH = 2.54;

function assertValidMeasurement(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} debe ser un número finito mayor o igual a 0.`);
  }
}

export function cmToInches(cm: number): number {
  assertValidMeasurement(cm, 'cm');
  return Number((cm / CM_PER_INCH).toFixed(2));
}

export function inchesToCm(inches: number): number {
  assertValidMeasurement(inches, 'inches');
  return Number((inches * CM_PER_INCH).toFixed(2));
}

export function toCm(value: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? (assertValidMeasurement(value, 'value'), value) : inchesToCm(value);
}

export function fromCm(cm: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? (assertValidMeasurement(cm, 'cm'), Number(cm.toFixed(2))) : cmToInches(cm);
}
