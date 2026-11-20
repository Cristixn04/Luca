import {
  classifyColorProfile,
  type ColorProfileResult,
  type ColorSeasonId,
  type ColorSwatchesInput,
} from '@luca/domain';
import { create } from 'zustand';
import { appendInteractionEvent } from '@/infrastructure/storage/eventLog';
import { getVaultServiceInstance } from '@/features/vault/vaultStore';

export interface PersistedColorProfile extends ColorSwatchesInput {
  readonly id: 'current';
  readonly overrideSeasonId?: ColorSeasonId;
  readonly ignored: boolean;
  readonly updatedAt: string;
}

export const DEFAULT_COLOR_SWATCHES: ColorSwatchesInput = {
  skinHex: '#D7BA98',
  hairHex: '#5A4336',
  eyeHex: '#6E523E',
};

export function resolveColorResult(profile: PersistedColorProfile | null): ColorProfileResult | null {
  if (!profile) return null;
  return classifyColorProfile({
    skinHex: profile.skinHex,
    hairHex: profile.hairHex,
    eyeHex: profile.eyeHex,
  });
}

export function getActiveSeasonId(profile: PersistedColorProfile | null): ColorSeasonId | null {
  if (!profile || profile.ignored) return null;
  if (profile.overrideSeasonId) return profile.overrideSeasonId;
  return classifyColorProfile({
    skinHex: profile.skinHex,
    hairHex: profile.hairHex,
    eyeHex: profile.eyeHex,
  }).primary.seasonId;
}

export interface ColorStoreState {
  profile: PersistedColorProfile | null;
  loaded: boolean;
  busy: boolean;
  error: string | null;

  loadProfile: () => Promise<void>;
  saveProfile: (input: {
    skinHex: string;
    hairHex: string;
    eyeHex: string;
    overrideSeasonId?: ColorSeasonId;
    ignored?: boolean;
  }) => Promise<PersistedColorProfile>;
  setOverrideSeason: (seasonId: ColorSeasonId | undefined) => Promise<void>;
  setIgnored: (ignored: boolean) => Promise<void>;
  deleteProfile: () => Promise<void>;
  clearMemory: () => void;
}

function canAccessVault(): boolean {
  const status = getVaultServiceInstance().getStatus();
  return status === 'unlocked' || status === 'plaintext';
}

export const useColorStore = create<ColorStoreState>((set, get) => ({
  profile: null,
  loaded: false,
  busy: false,
  error: null,

  loadProfile: async () => {
    const vault = getVaultServiceInstance();
    if (!canAccessVault()) {
      set({ profile: null, loaded: false });
      return;
    }

    set({ busy: true, error: null });
    try {
      const saved = await vault.getRecord<PersistedColorProfile>('color_profile', 'current');
      set({ profile: saved ?? null, loaded: true, busy: false });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo cargar tu perfil de color.',
      });
    }
  },

  saveProfile: async (input) => {
    const vault = getVaultServiceInstance();
    const existing = get().profile;
    const record: PersistedColorProfile = {
      id: 'current',
      skinHex: input.skinHex.toUpperCase(),
      hairHex: input.hairHex.toUpperCase(),
      eyeHex: input.eyeHex.toUpperCase(),
      ...(input.overrideSeasonId ? { overrideSeasonId: input.overrideSeasonId } : {}),
      ignored: input.ignored ?? existing?.ignored ?? false,
      updatedAt: new Date().toISOString(),
    };

    set({ busy: true, error: null });
    try {
      if (canAccessVault()) {
        await vault.putRecord('color_profile', 'current', record);
        const result = classifyColorProfile(record);
        await appendInteractionEvent(vault, {
          type: 'preference_updated',
          payload: {
            kind: 'color_profile',
            primarySeason: result.primary.seasonId,
            secondarySeason: result.secondary.seasonId,
            activeSeason: record.overrideSeasonId ?? result.primary.seasonId,
            confidence: result.confidence,
            ignored: record.ignored,
          },
        });
      }
      set({ profile: record, loaded: true, busy: false });
      return record;
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo guardar tu perfil de color.',
      });
      throw err;
    }
  },

  setOverrideSeason: async (seasonId) => {
    const current = get().profile;
    if (!current) return;
    await get().saveProfile({
      skinHex: current.skinHex,
      hairHex: current.hairHex,
      eyeHex: current.eyeHex,
      overrideSeasonId: seasonId,
      ignored: current.ignored,
    });
  },

  setIgnored: async (ignored) => {
    const current = get().profile;
    if (!current) {
      await get().saveProfile({
        ...DEFAULT_COLOR_SWATCHES,
        ignored,
      });
      return;
    }
    await get().saveProfile({
      skinHex: current.skinHex,
      hairHex: current.hairHex,
      eyeHex: current.eyeHex,
      overrideSeasonId: current.overrideSeasonId,
      ignored,
    });
  },

  deleteProfile: async () => {
    const vault = getVaultServiceInstance();
    set({ busy: true, error: null });
    try {
      if (canAccessVault()) {
        await vault.deleteRecord('color_profile', 'current');
      }
      set({ profile: null, loaded: true, busy: false });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo borrar tu perfil de color.',
      });
    }
  },

  clearMemory: () =>
    set({
      profile: null,
      loaded: false,
      busy: false,
      error: null,
    }),
}));
