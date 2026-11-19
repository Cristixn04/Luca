import type {
  FitPreference,
  GarmentFlatMeasurements,
  MeasurementUnit,
  RequiredBodyMeasurements,
} from '@luca/domain';
import { create } from 'zustand';

export type M2GarmentCategory = 'tshirt' | 'pants';

export const DEFAULT_BODY_MEASUREMENTS: RequiredBodyMeasurements = {
  height: 175,
  shoulders: 44,
  chest: 92,
  waist: 78,
  hip: 98,
  inseam: 80,
};

export const DEFAULT_GARMENT_PRESETS: Record<
  M2GarmentCategory,
  {
    name: string;
    sizeLabel: string;
    elasticity: number;
    flatMeasuresCm: GarmentFlatMeasurements;
  }
> = {
  tshirt: {
    name: 'Camiseta de lino',
    sizeLabel: 'M',
    elasticity: 0.05,
    flatMeasuresCm: {
      chestFlat: 50,
      shoulders: 45.5,
      backWidth: 42,
      length: 68,
    },
  },
  pants: {
    name: 'Pantalón recto',
    sizeLabel: '32',
    elasticity: 0.05,
    flatMeasuresCm: {
      waistFlat: 41,
      hipFlat: 52,
      inseam: 78,
    },
  },
};

export interface FittingState {
  unit: MeasurementUnit;
  hideNumbers: boolean;
  bodyMeasurements: RequiredBodyMeasurements;
  garmentEnabled: boolean;
  garmentCategory: M2GarmentCategory;
  garmentName: string;
  garmentSizeLabel: string;
  garmentElasticity: number;
  garmentFlatMeasures: GarmentFlatMeasurements;
  fitPreference: FitPreference;
  showHeatmap: boolean;

  setUnit: (unit: MeasurementUnit) => void;
  toggleHideNumbers: () => void;
  setBodyMeasure: (field: keyof RequiredBodyMeasurements, valueCm: number) => void;
  resetBodyMeasures: () => void;
  setGarmentCategory: (category: M2GarmentCategory) => void;
  setGarmentName: (name: string) => void;
  setGarmentSizeLabel: (sizeLabel: string) => void;
  setGarmentElasticity: (elasticity: number) => void;
  setGarmentFlatMeasure: (field: keyof GarmentFlatMeasurements, valueCm: number | undefined) => void;
  clearGarment: () => void;
  restoreDefaultGarment: (category?: M2GarmentCategory) => void;
  setFitPreference: (preference: FitPreference) => void;
  toggleHeatmap: () => void;
}

export const useFittingStore = create<FittingState>((set) => ({
  unit: 'cm',
  hideNumbers: false,
  bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
  garmentEnabled: true,
  garmentCategory: 'tshirt',
  garmentName: DEFAULT_GARMENT_PRESETS.tshirt.name,
  garmentSizeLabel: DEFAULT_GARMENT_PRESETS.tshirt.sizeLabel,
  garmentElasticity: DEFAULT_GARMENT_PRESETS.tshirt.elasticity,
  garmentFlatMeasures: { ...DEFAULT_GARMENT_PRESETS.tshirt.flatMeasuresCm },
  fitPreference: 'regular',
  showHeatmap: true,

  setUnit: (unit) => set({ unit }),
  toggleHideNumbers: () => set((state) => ({ hideNumbers: !state.hideNumbers })),
  setBodyMeasure: (field, valueCm) =>
    set((state) => ({
      bodyMeasurements: {
        ...state.bodyMeasurements,
        [field]: valueCm,
      },
    })),
  resetBodyMeasures: () => set({ bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS } }),

  setGarmentCategory: (category) => {
    const preset = DEFAULT_GARMENT_PRESETS[category];
    set({
      garmentEnabled: true,
      garmentCategory: category,
      garmentName: preset.name,
      garmentSizeLabel: preset.sizeLabel,
      garmentElasticity: preset.elasticity,
      garmentFlatMeasures: { ...preset.flatMeasuresCm },
    });
  },
  setGarmentName: (garmentName) => set({ garmentName }),
  setGarmentSizeLabel: (garmentSizeLabel) => set({ garmentSizeLabel }),
  setGarmentElasticity: (garmentElasticity) => set({ garmentElasticity }),
  setGarmentFlatMeasure: (field, valueCm) =>
    set((state) => {
      const next = { ...state.garmentFlatMeasures };
      if (valueCm === undefined) {
        delete next[field];
      } else {
        next[field] = valueCm;
      }
      return { garmentEnabled: true, garmentFlatMeasures: next };
    }),
  clearGarment: () => set({ garmentEnabled: false }),
  restoreDefaultGarment: (category) =>
    set((state) => {
      const target = category ?? state.garmentCategory;
      const preset = DEFAULT_GARMENT_PRESETS[target];
      return {
        garmentEnabled: true,
        garmentCategory: target,
        garmentName: preset.name,
        garmentSizeLabel: preset.sizeLabel,
        garmentElasticity: preset.elasticity,
        garmentFlatMeasures: { ...preset.flatMeasuresCm },
      };
    }),
  setFitPreference: (fitPreference) => set({ fitPreference }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
}));
