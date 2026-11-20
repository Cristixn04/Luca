import { GARMENT_CATEGORIES, type GarmentFlatMeasurements } from '@luca/domain';
import { appendInteractionEvent } from '@/infrastructure/storage/eventLog';
import type { VaultService } from '@/infrastructure/vault/vaultService';
import type {
  GarmentDraft,
  GarmentImageRecord,
  GarmentRecord,
  GarmentWithSizes,
  SizeOptionDraft,
  SizeOptionRecord,
} from './types';

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeFlatMeasures(raw: GarmentFlatMeasurements): GarmentFlatMeasurements {
  const clean: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 300) {
      clean[key] = Number(value.toFixed(2));
    }
  }
  return clean as GarmentFlatMeasurements;
}

function sanitizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim().slice(0, 40);
    if (trimmed.length > 0 && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      out.push(trimmed);
    }
  }
  return out.slice(0, 20);
}

export function validateGarmentDraft(draft: GarmentDraft): string[] {
  const errors: string[] = [];

  if (!GARMENT_CATEGORIES.includes(draft.category)) {
    errors.push('Categoría de prenda no válida.');
  }

  const name = draft.name.trim();
  if (name.length === 0) {
    errors.push('El nombre de la prenda es obligatorio.');
  } else if (name.length > 100) {
    errors.push('El nombre no puede superar 100 caracteres.');
  }

  if (!Number.isFinite(draft.elasticity) || draft.elasticity < 0 || draft.elasticity > 0.35) {
    errors.push('La elasticidad debe estar entre 0 % y 35 %.');
  }

  if (draft.price !== undefined && (!Number.isFinite(draft.price) || draft.price < 0)) {
    errors.push('El precio debe ser un número mayor o igual a 0.');
  }

  if (draft.formality < 1 || draft.formality > 5) {
    errors.push('La formalidad debe estar entre 1 y 5.');
  }

  if (draft.dominantColorHex !== undefined && draft.dominantColorHex.trim() !== '') {
    if (!/^#[0-9A-Fa-f]{6}$/.test(draft.dominantColorHex.trim())) {
      errors.push('El color dominante debe ser un código hexadecimal válido (#RRGGBB).');
    }
  }

  if (draft.sizes.length === 0) {
    errors.push('Agrega al menos una talla con sus medidas en plano.');
  } else {
    const labels = new Set<string>();
    for (const size of draft.sizes) {
      const label = size.label.trim();
      if (!label) {
        errors.push('Cada talla debe tener una etiqueta (ej. S, M, L, 32).');
      } else if (labels.has(label.toUpperCase())) {
        errors.push(`La talla "${label}" está duplicada.`);
      } else {
        labels.add(label.toUpperCase());
      }

      const cleanFlat = sanitizeFlatMeasures(size.flatMeasuresCm);
      if (Object.keys(cleanFlat).length === 0) {
        errors.push(`La talla "${label || '?'}" necesita al menos una medida en plano > 0.`);
      }
    }
  }

  return errors;
}

export async function listGarmentsWithSizes(vault: VaultService): Promise<GarmentWithSizes[]> {
  const [garments, allSizes, allImages] = await Promise.all([
    vault.listRecords<GarmentRecord>('garment'),
    vault.listRecords<SizeOptionRecord>('size_option'),
    vault.listRecords<GarmentImageRecord>('garment_image'),
  ]);

  const sizesByGarment = new Map<string, SizeOptionRecord[]>();
  for (const size of allSizes) {
    const bucket = sizesByGarment.get(size.garmentId) ?? [];
    bucket.push(size);
    sizesByGarment.set(size.garmentId, bucket);
  }

  const imageByGarment = new Map<string, GarmentImageRecord>();
  for (const image of allImages) {
    imageByGarment.set(image.garmentId, image);
  }

  return garments
    .map((garment) => {
      const image = imageByGarment.get(garment.id);
      return {
        garment,
        sizes: (sizesByGarment.get(garment.id) ?? []).sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
        ...(image ? { image } : {}),
      };
    })
    .sort((a, b) => b.garment.updatedAt.localeCompare(a.garment.updatedAt));
}

function buildSizeRecords(
  garmentId: string,
  drafts: readonly SizeOptionDraft[],
  now: string,
  existingMap?: ReadonlyMap<string, SizeOptionRecord>,
): SizeOptionRecord[] {
  return drafts.map((draft) => {
    const existing = draft.id ? existingMap?.get(draft.id) : undefined;
    return {
      id: existing?.id ?? createId('size'),
      garmentId,
      label: draft.label.trim().slice(0, 16),
      flatMeasuresCm: sanitizeFlatMeasures(draft.flatMeasuresCm),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  });
}

export async function createGarment(
  vault: VaultService,
  draft: GarmentDraft,
): Promise<GarmentWithSizes> {
  const errors = validateGarmentDraft(draft);
  if (errors.length > 0) {
    throw new RangeError(errors[0]);
  }

  const now = new Date().toISOString();
  const garmentId = createId('garment');

  const garment: GarmentRecord = {
    id: garmentId,
    category: draft.category,
    name: draft.name.trim(),
    brand: draft.brand.trim().slice(0, 60),
    status: draft.status,
    ...(draft.price !== undefined ? { price: Number(draft.price.toFixed(2)) } : {}),
    ...(draft.purchasedOn ? { purchasedOn: draft.purchasedOn } : {}),
    elasticity: Number(draft.elasticity.toFixed(3)),
    formality: draft.formality,
    ...(draft.pattern ? { pattern: draft.pattern } : {}),
    ...(draft.style ? { style: draft.style } : {}),
    ...(draft.seasons && draft.seasons.length > 0 ? { seasons: [...new Set(draft.seasons)] } : {}),
    tags: sanitizeTags(draft.tags),
    ...(draft.dominantColorHex?.trim() ? { dominantColorHex: draft.dominantColorHex.trim() } : {}),
    ...(draft.notes?.trim() ? { notes: draft.notes.trim().slice(0, 500) } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const sizes = buildSizeRecords(garmentId, draft.sizes, now);

  await vault.putRecord('garment', garment.id, garment);
  for (const size of sizes) {
    await vault.putRecord('size_option', size.id, size);
  }

  let savedImage: GarmentImageRecord | undefined;
  if (draft.image?.dataUrl) {
    savedImage = {
      id: garment.id,
      garmentId: garment.id,
      dataUrl: draft.image.dataUrl,
      ...(draft.image.backDataUrl ? { backDataUrl: draft.image.backDataUrl } : {}),
      width: draft.image.width ?? 0,
      height: draft.image.height ?? 0,
      source: draft.image.source,
      createdAt: now,
    };
    await vault.putRecord('garment_image', savedImage.id, savedImage);
  }

  await appendInteractionEvent(vault, {
    type: 'garment_added',
    payload: {
      garmentId: garment.id,
      category: garment.category,
      status: garment.status,
      sizeCount: sizes.length,
      hasPhoto: Boolean(savedImage),
    },
  });

  return { garment, sizes, ...(savedImage ? { image: savedImage } : {}) };
}

export async function updateGarment(
  vault: VaultService,
  garmentId: string,
  draft: GarmentDraft,
): Promise<GarmentWithSizes> {
  const existing = await vault.getRecord<GarmentRecord>('garment', garmentId);
  if (!existing) {
    throw new Error('La prenda que intentas editar no existe.');
  }

  const errors = validateGarmentDraft(draft);
  if (errors.length > 0) {
    throw new RangeError(errors[0]);
  }

  const now = new Date().toISOString();
  const updated: GarmentRecord = {
    id: existing.id,
    category: draft.category,
    name: draft.name.trim(),
    brand: draft.brand.trim().slice(0, 60),
    status: draft.status,
    ...(draft.price !== undefined ? { price: Number(draft.price.toFixed(2)) } : {}),
    ...(draft.purchasedOn ? { purchasedOn: draft.purchasedOn } : {}),
    elasticity: Number(draft.elasticity.toFixed(3)),
    formality: draft.formality,
    ...(draft.pattern ? { pattern: draft.pattern } : {}),
    ...(draft.style ? { style: draft.style } : {}),
    ...(draft.seasons && draft.seasons.length > 0 ? { seasons: [...new Set(draft.seasons)] } : {}),
    tags: sanitizeTags(draft.tags),
    ...(draft.dominantColorHex?.trim() ? { dominantColorHex: draft.dominantColorHex.trim() } : {}),
    ...(draft.notes?.trim() ? { notes: draft.notes.trim().slice(0, 500) } : {}),
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const allSizes = await vault.listRecords<SizeOptionRecord>('size_option');
  const existingSizes = allSizes.filter((s) => s.garmentId === garmentId);
  const existingMap = new Map(existingSizes.map((s) => [s.id, s]));

  const nextSizes = buildSizeRecords(garmentId, draft.sizes, now, existingMap);
  const nextIds = new Set(nextSizes.map((s) => s.id));

  await vault.putRecord('garment', updated.id, updated);
  for (const oldSize of existingSizes) {
    if (!nextIds.has(oldSize.id)) {
      await vault.deleteRecord('size_option', oldSize.id);
    }
  }
  for (const size of nextSizes) {
    await vault.putRecord('size_option', size.id, size);
  }

  let savedImage = await vault.getRecord<GarmentImageRecord>('garment_image', garmentId);
  if (draft.image === null) {
    await vault.deleteRecord('garment_image', garmentId);
    savedImage = undefined;
  } else if (draft.image?.dataUrl) {
    savedImage = {
      id: garmentId,
      garmentId,
      dataUrl: draft.image.dataUrl,
      ...(draft.image.backDataUrl ? { backDataUrl: draft.image.backDataUrl } : {}),
      width: draft.image.width ?? 0,
      height: draft.image.height ?? 0,
      source: draft.image.source,
      createdAt: now,
    };
    await vault.putRecord('garment_image', savedImage.id, savedImage);
  }

  await appendInteractionEvent(vault, {
    type: 'garment_edited',
    payload: {
      garmentId: updated.id,
      category: updated.category,
      status: updated.status,
      sizeCount: nextSizes.length,
    },
  });

  return { garment: updated, sizes: nextSizes, ...(savedImage ? { image: savedImage } : {}) };
}

export async function deleteGarment(vault: VaultService, garmentId: string): Promise<void> {
  const existing = await vault.getRecord<GarmentRecord>('garment', garmentId);
  if (!existing) {
    return;
  }

  const allSizes = await vault.listRecords<SizeOptionRecord>('size_option');
  const ownedSizes = allSizes.filter((s) => s.garmentId === garmentId);

  for (const size of ownedSizes) {
    await vault.deleteRecord('size_option', size.id);
  }
  await vault.deleteRecord('garment_image', garmentId);
  await vault.deleteRecord('garment', garmentId);

  await appendInteractionEvent(vault, {
    type: 'garment_deleted',
    payload: {
      garmentId,
      category: existing.category,
    },
  });
}

export async function seedSampleGarments(vault: VaultService): Promise<GarmentWithSizes[]> {
  const shirt = await createGarment(vault, {
    category: 'tshirt',
    name: 'Camiseta básica de lino',
    brand: 'Taller Norte',
    status: 'owned',
    price: 38,
    purchasedOn: new Date().toISOString().slice(0, 10),
    elasticity: 0.05,
    formality: 2,
    pattern: 'solid',
    style: 'minimalist',
    seasons: ['spring', 'summer'],
    tags: ['verano', 'lino', 'básico'],
    dominantColorHex: '#2A9D8F',
    sizes: [
      { label: 'S', flatMeasuresCm: { chestFlat: 47, shoulders: 43.5, backWidth: 40 } },
      { label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45.5, backWidth: 42 } },
      { label: 'L', flatMeasuresCm: { chestFlat: 54, shoulders: 47.5, backWidth: 44.5 } },
    ],
  });

  const pants = await createGarment(vault, {
    category: 'pants',
    name: 'Pantalón chino recto',
    brand: 'Estudio Sur',
    status: 'wishlist',
    price: 72,
    elasticity: 0.05,
    formality: 3,
    pattern: 'solid',
    style: 'classic',
    seasons: ['spring', 'autumn', 'winter'],
    tags: ['oficina', 'algodón', 'recto'],
    dominantColorHex: '#1F5F6B',
    sizes: [
      { label: '30', flatMeasuresCm: { waistFlat: 38, hipFlat: 49, inseam: 78 } },
      { label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 79 } },
      { label: '34', flatMeasuresCm: { waistFlat: 44, hipFlat: 55, inseam: 80 } },
    ],
  });

  return [shirt, pants];
}
