import {
  FIT_ZONES,
  type FitBandsConfig,
  type FitZone,
  type GarmentCategory,
  type ZoneBandThresholds,
} from './types.js';

export const DEFAULT_FIT_BANDS_CONFIG: FitBandsConfig = {
  version: '1.0.0',
  defaultBands: {
    chest: {
      tight: [0, 4],
      regular: [4, 12],
      loose: [12, 20],
      oversizeMin: 20,
    },
    waist: {
      tight: [0, 2],
      regular: [2, 6],
      loose: [6, 10],
      oversizeMin: 10,
    },
    hip: {
      tight: [0, 4],
      regular: [4, 10],
      loose: [10, 18],
      oversizeMin: 18,
    },
    shoulders: {
      tight: [-1, 1],
      regular: [1, 3],
      loose: [3, 6],
      oversizeMin: 6,
    },
    back: {
      tight: [0, 2],
      regular: [2, 5],
      loose: [5, 9],
      oversizeMin: 9,
    },
  },
  categoryOffsets: {
    jacket: {
      chest: 4,
    },
  },
  relevantZones: {
    tshirt: ['chest', 'shoulders', 'back'],
    long_sleeve: ['chest', 'shoulders', 'back'],
    jacket: ['chest', 'shoulders', 'back'],
    pants: ['waist', 'hip'],
    shorts: ['waist', 'hip'],
    skirt: ['waist', 'hip'],
    dress: ['chest', 'waist', 'hip'],
  },
};

export function validateFitBandsConfig(config: FitBandsConfig): void {
  for (const zone of FIT_ZONES) {
    const band = config.defaultBands[zone];
    if (band.tight[0] >= band.tight[1]) {
      throw new RangeError(`Banda tight inválida en ${zone}: [${band.tight[0]}, ${band.tight[1]})`);
    }
    if (band.tight[1] !== band.regular[0]) {
      throw new RangeError(`Hueco o solapamiento entre tight y regular en ${zone}.`);
    }
    if (band.regular[0] >= band.regular[1]) {
      throw new RangeError(`Banda regular inválida en ${zone}.`);
    }
    if (band.regular[1] !== band.loose[0]) {
      throw new RangeError(`Hueco o solapamiento entre regular y loose en ${zone}.`);
    }
    if (band.loose[0] >= band.loose[1]) {
      throw new RangeError(`Banda loose inválida en ${zone}.`);
    }
    if (band.loose[1] !== band.oversizeMin) {
      throw new RangeError(`Hueco o solapamiento entre loose y oversize en ${zone}.`);
    }
  }
}

export function getZoneThresholds(
  category: GarmentCategory,
  zone: FitZone,
  config: FitBandsConfig = DEFAULT_FIT_BANDS_CONFIG,
): ZoneBandThresholds {
  const base = config.defaultBands[zone];
  const offset = config.categoryOffsets[category]?.[zone] ?? 0;

  if (offset === 0) {
    return base;
  }

  return {
    tight: [base.tight[0] + offset, base.tight[1] + offset],
    regular: [base.regular[0] + offset, base.regular[1] + offset],
    loose: [base.loose[0] + offset, base.loose[1] + offset],
    oversizeMin: base.oversizeMin + offset,
  };
}

export function getRelevantZones(
  category: GarmentCategory,
  config: FitBandsConfig = DEFAULT_FIT_BANDS_CONFIG,
): readonly FitZone[] {
  return config.relevantZones[category];
}
