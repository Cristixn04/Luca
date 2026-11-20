import type {
  AvatarView,
  FitPreference,
  GarmentCategory,
  GarmentFlatMeasurements,
  MeasurementUnit,
  OptionalBodyMeasurements,
  RequiredBodyMeasurements,
} from '@luca/domain';
import { create } from 'zustand';

export type M2GarmentCategory = GarmentCategory;
export type ViewerMode = AvatarView | 'all';
export type FittingGarmentSource = 'closet' | 'quick';
export type MannequinSilhouette = 'female' | 'male';

const SILHOUETTE_STORAGE_KEY = 'luca-mannequin-silhouette';

function readStoredSilhouette(): MannequinSilhouette {
  try {
    const raw = window.localStorage.getItem(SILHOUETTE_STORAGE_KEY);
    if (raw === 'female' || raw === 'male') return raw;
  } catch {
    // Entorno sin almacenamiento disponible
  }
  return 'female';
}

export const DEFAULT_BODY_MEASUREMENTS: RequiredBodyMeasurements = {
  height: 175,
  shoulders: 44,
  chest: 92,
  waist: 78,
  hip: 98,
  inseam: 80,
};

export const DEFAULT_GARMENT_PRESETS: Record<
  GarmentCategory,
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
    flatMeasuresCm: { chestFlat: 50, shoulders: 45.5, backWidth: 42, length: 68 },
  },
  long_sleeve: {
    name: 'Camisa manga larga',
    sizeLabel: 'M',
    elasticity: 0.02,
    flatMeasuresCm: { chestFlat: 51, shoulders: 45.5, backWidth: 42.5, length: 71 },
  },
  jacket: {
    name: 'Chaqueta estructurada',
    sizeLabel: 'M',
    elasticity: 0,
    flatMeasuresCm: { chestFlat: 54, shoulders: 46.5, backWidth: 43.5, length: 72 },
  },
  pants: {
    name: 'Pantalón recto',
    sizeLabel: '32',
    elasticity: 0.05,
    flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 78 },
  },
  shorts: {
    name: 'Short de algodón',
    sizeLabel: 'M',
    elasticity: 0.04,
    flatMeasuresCm: { waistFlat: 41, hipFlat: 52 },
  },
  skirt: {
    name: 'Falda midi recta',
    sizeLabel: 'M',
    elasticity: 0.03,
    flatMeasuresCm: { waistFlat: 40, hipFlat: 52 },
  },
  dress: {
    name: 'Vestido midi',
    sizeLabel: 'M',
    elasticity: 0.05,
    flatMeasuresCm: { chestFlat: 49, waistFlat: 41, hipFlat: 52 },
  },
};

export interface FittingState {
  unit: MeasurementUnit;
  hideNumbers: boolean;
  mannequinSilhouette: MannequinSilhouette;
  bodyMeasurements: RequiredBodyMeasurements;
  optionalMeasurements: OptionalBodyMeasurements;
  viewMode: ViewerMode;
  garmentEnabled: boolean;
  garmentSource: FittingGarmentSource;
  selectedClosetGarmentId: string | null;
  garmentCategory: GarmentCategory;
  garmentName: string;
  garmentColorHex: string;
  garmentSizeLabel: string;
  garmentElasticity: number;
  garmentFlatMeasures: GarmentFlatMeasurements;
  fitPreference: FitPreference;
  showHeatmap: boolean;

  setUnit: (unit: MeasurementUnit) => void;
  toggleHideNumbers: () => void;
  setMannequinSilhouette: (silhouette: MannequinSilhouette) => void;
  setBodyMeasure: (field: keyof RequiredBodyMeasurements, valueCm: number) => void;
  setOptionalMeasure: (field: keyof OptionalBodyMeasurements, valueCm: number | undefined) => void;
  resetBodyMeasures: () => void;
  setViewMode: (mode: ViewerMode) => void;
  setGarmentSource: (source: FittingGarmentSource) => void;
  setSelectedClosetGarmentId: (id: string | null) => void;
  setGarmentCategory: (category: GarmentCategory) => void;
  setGarmentName: (name: string) => void;
  setGarmentSizeLabel: (sizeLabel: string) => void;
  setGarmentElasticity: (elasticity: number) => void;
  setGarmentFlatMeasure: (field: keyof GarmentFlatMeasurements, valueCm: number | undefined) => void;
  clearGarment: () => void;
  restoreDefaultGarment: (category?: GarmentCategory) => void;
  setFitPreference: (preference: FitPreference) => void;
  toggleHeatmap: () => void;
}

export const useFittingStore = create<FittingState>((set) => ({
  unit: 'cm',
  hideNumbers: false,
  mannequinSilhouette: readStoredSilhouette(),
  bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
  optionalMeasurements: {},
  viewMode: 'front',
  garmentEnabled: true,
  garmentSource: 'quick',
  selectedClosetGarmentId: null,
  garmentCategory: 'tshirt',
  garmentName: DEFAULT_GARMENT_PRESETS.tshirt.name,
  garmentColorHex: '#1F5F6B',
  garmentSizeLabel: DEFAULT_GARMENT_PRESETS.tshirt.sizeLabel,
  garmentElasticity: DEFAULT_GARMENT_PRESETS.tshirt.elasticity,
  garmentFlatMeasures: { ...DEFAULT_GARMENT_PRESETS.tshirt.flatMeasuresCm },
  fitPreference: 'regular',
  showHeatmap: true,

  setUnit: (unit) => set({ unit }),
  toggleHideNumbers: () => set((state) => ({ hideNumbers: !state.hideNumbers })),
  setMannequinSilhouette: (mannequinSilhouette) => {
    try {
      window.localStorage.setItem(SILHOUETTE_STORAGE_KEY, mannequinSilhouette);
    } catch {
      // Ignora error si almacenamiento está bloqueado
    }
    set({ mannequinSilhouette });
  },
  setBodyMeasure: (field, valueCm) =>
    set((state) => ({
      bodyMeasurements: {
        ...state.bodyMeasurements,
        [field]: valueCm,
      },
    })),
  setOptionalMeasure: (field, valueCm) =>
    set((state) => {
      const next = { ...state.optionalMeasurements };
      if (valueCm === undefined) {
        delete next[field];
      } else {
        next[field] = valueCm;
      }
      return { optionalMeasurements: next };
    }),
  resetBodyMeasures: () =>
    set({ bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS }, optionalMeasurements: {} }),
  setViewMode: (viewMode) => set({ viewMode }),
  setGarmentSource: (garmentSource) => set({ garmentSource }),
  setSelectedClosetGarmentId: (selectedClosetGarmentId) => set({ selectedClosetGarmentId }),

  setGarmentCategory: (category) => {
    const preset = DEFAULT_GARMENT_PRESETS[category];
    set({
      garmentEnabled: true,
      garmentSource: 'quick',
      selectedClosetGarmentId: null,
      garmentCategory: category,
      garmentName: preset.name,
      garmentColorHex: '#1F5F6B',
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
