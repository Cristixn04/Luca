import type { GarmentCategory, GarmentFlatMeasurements } from '@luca/domain';

export type GarmentStatus = 'owned' | 'wishlist';

export type FormalityLevel = 1 | 2 | 3 | 4 | 5;

export interface GarmentRecord {
  readonly id: string;
  readonly category: GarmentCategory;
  readonly name: string;
  readonly brand: string;
  readonly status: GarmentStatus;
  readonly price?: number;
  readonly purchasedOn?: string;
  readonly elasticity: number;
  readonly formality: FormalityLevel;
  readonly tags: readonly string[];
  readonly dominantColorHex?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SizeOptionRecord {
  readonly id: string;
  readonly garmentId: string;
  readonly label: string;
  readonly flatMeasuresCm: GarmentFlatMeasurements;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GarmentWithSizes {
  readonly garment: GarmentRecord;
  readonly sizes: readonly SizeOptionRecord[];
}

export interface SizeOptionDraft {
  readonly id?: string;
  readonly label: string;
  readonly flatMeasuresCm: GarmentFlatMeasurements;
}

export interface GarmentDraft {
  readonly category: GarmentCategory;
  readonly name: string;
  readonly brand: string;
  readonly status: GarmentStatus;
  readonly price?: number;
  readonly purchasedOn?: string;
  readonly elasticity: number;
  readonly formality: FormalityLevel;
  readonly tags: readonly string[];
  readonly dominantColorHex?: string;
  readonly notes?: string;
  readonly sizes: readonly SizeOptionDraft[];
}

export const CATEGORY_LABELS: Readonly<Record<GarmentCategory, string>> = {
  tshirt: 'Camiseta',
  long_sleeve: 'Manga larga',
  jacket: 'Chaqueta',
  pants: 'Pantalón',
  shorts: 'Short',
  skirt: 'Falda',
  dress: 'Vestido',
};

export const STATUS_LABELS: Readonly<Record<GarmentStatus, string>> = {
  owned: 'Propia',
  wishlist: 'Lista de deseos',
};

export const FORMALITY_LABELS: Readonly<Record<FormalityLevel, string>> = {
  1: '1 · Deportivo / casa',
  2: '2 · Casual',
  3: '3 · Smart casual',
  4: '4 · Oficina / formal',
  5: '5 · Etiqueta',
};

export interface FlatFieldMeta {
  readonly key: keyof GarmentFlatMeasurements;
  readonly label: string;
  readonly shortLabel: string;
  readonly isPerimeter: boolean;
}

export const CATEGORY_FLAT_FIELDS: Readonly<Record<GarmentCategory, readonly FlatFieldMeta[]>> = {
  tshirt: [
    { key: 'chestFlat', label: 'Pecho plano', shortLabel: 'Pecho (×2)', isPerimeter: true },
    { key: 'shoulders', label: 'Hombros', shortLabel: 'Hombros', isPerimeter: false },
    { key: 'backWidth', label: 'Espalda', shortLabel: 'Espalda', isPerimeter: false },
  ],
  long_sleeve: [
    { key: 'chestFlat', label: 'Pecho plano', shortLabel: 'Pecho (×2)', isPerimeter: true },
    { key: 'shoulders', label: 'Hombros', shortLabel: 'Hombros', isPerimeter: false },
    { key: 'backWidth', label: 'Espalda', shortLabel: 'Espalda', isPerimeter: false },
  ],
  jacket: [
    { key: 'chestFlat', label: 'Pecho plano', shortLabel: 'Pecho (×2)', isPerimeter: true },
    { key: 'shoulders', label: 'Hombros', shortLabel: 'Hombros', isPerimeter: false },
    { key: 'backWidth', label: 'Espalda', shortLabel: 'Espalda', isPerimeter: false },
  ],
  pants: [
    { key: 'waistFlat', label: 'Cintura plana', shortLabel: 'Cintura (×2)', isPerimeter: true },
    { key: 'hipFlat', label: 'Cadera plana', shortLabel: 'Cadera (×2)', isPerimeter: true },
    { key: 'inseam', label: 'Entrepierna', shortLabel: 'Entrepierna', isPerimeter: false },
  ],
  shorts: [
    { key: 'waistFlat', label: 'Cintura plana', shortLabel: 'Cintura (×2)', isPerimeter: true },
    { key: 'hipFlat', label: 'Cadera plana', shortLabel: 'Cadera (×2)', isPerimeter: true },
  ],
  skirt: [
    { key: 'waistFlat', label: 'Cintura plana', shortLabel: 'Cintura (×2)', isPerimeter: true },
    { key: 'hipFlat', label: 'Cadera plana', shortLabel: 'Cadera (×2)', isPerimeter: true },
  ],
  dress: [
    { key: 'chestFlat', label: 'Pecho plano', shortLabel: 'Pecho (×2)', isPerimeter: true },
    { key: 'waistFlat', label: 'Cintura plana', shortLabel: 'Cintura (×2)', isPerimeter: true },
    { key: 'hipFlat', label: 'Cadera plana', shortLabel: 'Cadera (×2)', isPerimeter: true },
  ],
};
