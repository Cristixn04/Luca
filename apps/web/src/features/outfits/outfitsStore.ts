import {
  recommendSize,
  type BodyModel,
  type FitPreference,
  type OutfitGarmentInput,
  type OutfitOccasion,
  type OutfitProposal,
  type OutfitScoreBreakdown,
} from '@luca/domain';
import { create } from 'zustand';
import type { GarmentWithSizes } from '@/features/closet/types';
import { getVaultServiceInstance } from '@/features/vault/vaultStore';
import { appendInteractionEvent } from '@/infrastructure/storage/eventLog';

export interface WearLogRecord {
  readonly id: string;
  readonly garmentId: string;
  readonly outfitId?: string;
  readonly wornOn: string;
  readonly createdAt: string;
}

export interface SavedOutfitRecord {
  readonly id: string;
  readonly name: string;
  readonly occasion: OutfitOccasion;
  readonly temperatureC: number;
  readonly garmentIds: readonly string[];
  readonly favorite: boolean;
  readonly score: OutfitScoreBreakdown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OutfitRenderRecord {
  readonly id: string;
  readonly silhouette: 'female' | 'male';
  readonly garmentIds: readonly string[];
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
  readonly provider: string;
  readonly createdAt: string;
}

export function makeOutfitRenderKey(
  silhouette: 'female' | 'male',
  garmentIds: readonly string[],
): string {
  return `${silhouette}:${[...garmentIds].sort().join('+')}`;
}

function createId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function canAccessVault(): boolean {
  const status = getVaultServiceInstance().getStatus();
  return status === 'unlocked' || status === 'plaintext';
}

export function buildWearStatsByGarment(
  wearLogs: readonly WearLogRecord[],
): Map<string, { count: number; lastWornAt?: string }> {
  const stats = new Map<string, { count: number; lastWornAt?: string }>();
  for (const log of wearLogs) {
    const current = stats.get(log.garmentId) ?? { count: 0 };
    const nextLast =
      !current.lastWornAt || log.wornOn > current.lastWornAt ? log.wornOn : current.lastWornAt;
    stats.set(log.garmentId, {
      count: current.count + 1,
      lastWornAt: nextLast,
    });
  }
  return stats;
}

export function toOutfitGarmentInputs(
  items: readonly GarmentWithSizes[],
  wearLogs: readonly WearLogRecord[],
  bodyModel: BodyModel | null,
  fitPreference: FitPreference,
): OutfitGarmentInput[] {
  const wearStats = buildWearStatsByGarment(wearLogs);

  return items.map(({ garment, sizes }) => {
    let bestFlat = sizes[0]?.flatMeasuresCm;
    if (bodyModel && sizes.length > 0) {
      const rec = recommendSize(
        bodyModel,
        sizes.map((s) => ({
          category: garment.category,
          sizeLabel: s.label,
          elasticity: garment.elasticity,
          flatMeasuresCm: s.flatMeasuresCm,
        })),
        fitPreference,
      );
      const matched = sizes.find((s) => s.label === rec.recommendedSize);
      bestFlat = matched?.flatMeasuresCm ?? bestFlat;
    }

    const effectiveColorHex = garment.visualSpec?.primary_color_hex ?? garment.dominantColorHex;
    const stat = wearStats.get(garment.id);
    return {
      id: garment.id,
      name: garment.name,
      category: garment.category,
      status: garment.status,
      formality: garment.formality,
      elasticity: garment.elasticity,
      ...(effectiveColorHex ? { dominantColorHex: effectiveColorHex } : {}),
      ...(garment.style ? { style: garment.style } : {}),
      ...(garment.pattern ? { pattern: garment.pattern } : {}),
      ...(garment.seasons ? { seasons: garment.seasons } : {}),
      tags: garment.tags,
      ...(garment.price !== undefined ? { price: garment.price } : {}),
      ...(bestFlat ? { flatMeasuresCm: bestFlat } : {}),
      wearCount: stat?.count ?? 0,
      ...(stat?.lastWornAt ? { lastWornAt: stat.lastWornAt } : {}),
    };
  });
}

export interface OutfitsStoreState {
  savedOutfits: SavedOutfitRecord[];
  wearLogs: WearLogRecord[];
  rendersByKey: Record<string, OutfitRenderRecord>;
  loaded: boolean;
  busy: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  saveProposal: (
    proposal: OutfitProposal,
    occasion: OutfitOccasion,
    temperatureC: number,
    options?: { favorite?: boolean; name?: string },
  ) => Promise<SavedOutfitRecord>;
  saveOutfitRender: (record: OutfitRenderRecord) => Promise<OutfitRenderRecord>;
  deleteOutfitRender: (renderKey: string) => Promise<void>;
  toggleFavorite: (outfitId: string) => Promise<void>;
  deleteSavedOutfit: (outfitId: string) => Promise<void>;
  logGarmentWear: (garmentId: string, wornOn?: string, outfitId?: string) => Promise<WearLogRecord>;
  logOutfitWear: (garmentIds: readonly string[], outfitId?: string, wornOn?: string) => Promise<void>;
  clearMemory: () => void;
}

export const useOutfitsStore = create<OutfitsStoreState>((set, get) => ({
  savedOutfits: [],
  wearLogs: [],
  rendersByKey: {},
  loaded: false,
  busy: false,
  error: null,

  loadAll: async () => {
    const vault = getVaultServiceInstance();
    if (!canAccessVault()) {
      set({ savedOutfits: [], wearLogs: [], rendersByKey: {}, loaded: false });
      return;
    }

    set({ busy: true, error: null });
    try {
      const [outfits, logs, renders] = await Promise.all([
        vault.listRecords<SavedOutfitRecord>('outfit'),
        vault.listRecords<WearLogRecord>('wear_log'),
        vault.listRecords<OutfitRenderRecord>('outfit_render'),
      ]);
      outfits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      logs.sort((a, b) => b.wornOn.localeCompare(a.wornOn));
      const rendersByKey: Record<string, OutfitRenderRecord> = {};
      for (const render of renders) {
        rendersByKey[render.id] = render;
      }
      set({ savedOutfits: outfits, wearLogs: logs, rendersByKey, loaded: true, busy: false });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudieron cargar los outfits.',
      });
    }
  },

  saveProposal: async (proposal, occasion, temperatureC, options = {}) => {
    const vault = getVaultServiceInstance();
    const now = new Date().toISOString();
    const existing = get().savedOutfits.find(
      (o) => o.garmentIds.slice().sort().join('+') === proposal.items.map((i) => i.id).sort().join('+'),
    );

    const record: SavedOutfitRecord = {
      id: existing?.id ?? createId('outfit'),
      name:
        options.name?.trim() ||
        existing?.name ||
        proposal.items.map((i) => i.name).slice(0, 2).join(' + '),
      occasion,
      temperatureC: Math.round(temperatureC),
      garmentIds: proposal.items.map((i) => i.id),
      favorite: options.favorite ?? existing?.favorite ?? false,
      score: proposal.score,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (canAccessVault()) {
      await vault.putRecord('outfit', record.id, record);
      await appendInteractionEvent(vault, {
        type: 'outfit_saved',
        payload: {
          outfitId: record.id,
          occasion,
          favorite: record.favorite,
          garmentIds: record.garmentIds,
          scoreTotal: record.score.total,
        },
      });
    }

    set((state) => ({
      savedOutfits: [record, ...state.savedOutfits.filter((o) => o.id !== record.id)],
    }));
    return record;
  },

  saveOutfitRender: async (record) => {
    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await vault.putRecord('outfit_render', record.id, record);
    }
    set((state) => ({
      rendersByKey: {
        ...state.rendersByKey,
        [record.id]: record,
      },
    }));
    return record;
  },

  deleteOutfitRender: async (renderKey) => {
    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await vault.deleteRecord('outfit_render', renderKey);
    }
    set((state) => {
      const next = { ...state.rendersByKey };
      delete next[renderKey];
      return { rendersByKey: next };
    });
  },

  toggleFavorite: async (outfitId) => {
    const vault = getVaultServiceInstance();
    const target = get().savedOutfits.find((o) => o.id === outfitId);
    if (!target) return;

    const updated: SavedOutfitRecord = {
      ...target,
      favorite: !target.favorite,
      updatedAt: new Date().toISOString(),
    };

    if (canAccessVault()) {
      await vault.putRecord('outfit', updated.id, updated);
    }

    set((state) => ({
      savedOutfits: state.savedOutfits.map((o) => (o.id === outfitId ? updated : o)),
    }));
  },

  deleteSavedOutfit: async (outfitId) => {
    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await vault.deleteRecord('outfit', outfitId);
    }
    set((state) => ({
      savedOutfits: state.savedOutfits.filter((o) => o.id !== outfitId),
    }));
  },

  logGarmentWear: async (garmentId, wornOn, outfitId) => {
    const vault = getVaultServiceInstance();
    const now = new Date().toISOString();
    const dateStr = wornOn ?? now.slice(0, 10);
    const record: WearLogRecord = {
      id: createId('wear'),
      garmentId,
      ...(outfitId ? { outfitId } : {}),
      wornOn: dateStr,
      createdAt: now,
    };

    if (canAccessVault()) {
      await vault.putRecord('wear_log', record.id, record);
      await appendInteractionEvent(vault, {
        type: 'wear_logged',
        payload: {
          garmentId,
          ...(outfitId ? { outfitId } : {}),
          wornOn: dateStr,
        },
      });
    }

    set((state) => ({
      wearLogs: [record, ...state.wearLogs],
    }));
    return record;
  },

  logOutfitWear: async (garmentIds, outfitId, wornOn) => {
    for (const garmentId of garmentIds) {
      await get().logGarmentWear(garmentId, wornOn, outfitId);
    }
  },

  clearMemory: () =>
    set({
      savedOutfits: [],
      wearLogs: [],
      rendersByKey: {},
      loaded: false,
      busy: false,
      error: null,
    }),
}));
