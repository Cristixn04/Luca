import {
  TASTE_EVENT_VALUES,
  TASTE_FEATURE_CATEGORIES,
  buildTasteProfile,
  extractGarmentTasteFeatures,
  serializeTasteKey,
  type OutfitGarmentInput,
  type TasteExplicitRule,
  type TasteFeatureCategory,
  type TasteFeatureKey,
  type TasteInteractionSignal,
  type TasteProfile,
  type TasteSignalType,
  type TasteSnapshotAggregate,
} from '@luca/domain';
import { create } from 'zustand';
import { getVaultServiceInstance } from '@/features/vault/vaultStore';
import {
  appendInteractionEvent,
  compactInteractionEvents,
  listInteractionEvents,
  listTasteSnapshots,
  type CompactionSummary,
  type InteractionEvent,
  type TasteSnapshot,
} from '@/infrastructure/storage/eventLog';

export type RetentionMonths = 6 | 12 | 24;

export interface TastePreferencesRecord {
  readonly id: 'taste';
  readonly learningPaused: boolean;
  readonly retentionMonths: RetentionMonths;
  readonly rules: Readonly<Record<string, TasteExplicitRule>>;
  readonly updatedAt: string;
}

const DEFAULT_PREFS: TastePreferencesRecord = {
  id: 'taste',
  learningPaused: false,
  retentionMonths: 12,
  rules: {},
  updatedAt: '',
};

const VALID_CATEGORIES = new Set<string>(TASTE_FEATURE_CATEGORIES);

function canAccessVault(): boolean {
  const status = getVaultServiceInstance().getStatus();
  return status === 'unlocked' || status === 'plaintext';
}

function parseSerializedFeatureKey(raw: string): TasteFeatureKey | null {
  const idx = raw.indexOf(':');
  if (idx <= 0) return null;
  const cat = raw.slice(0, idx);
  const val = raw.slice(idx + 1).trim();
  if (!VALID_CATEGORIES.has(cat) || !val) return null;
  return { category: cat as TasteFeatureCategory, value: val };
}

function eventsToTasteSignals(events: readonly InteractionEvent[]): TasteInteractionSignal[] {
  const signals: TasteInteractionSignal[] = [];

  for (const event of events) {
    if (!(event.type in TASTE_EVENT_VALUES)) continue;
    const rawFeatures = event.payload.features;
    if (!Array.isArray(rawFeatures)) continue;

    const features: TasteFeatureKey[] = [];
    for (const entry of rawFeatures) {
      if (typeof entry === 'string') {
        const parsed = parseSerializedFeatureKey(entry);
        if (parsed) features.push(parsed);
      }
    }

    if (features.length > 0) {
      signals.push({
        id: event.id,
        type: event.type as TasteSignalType,
        at: event.at,
        features,
      });
    }
  }

  return signals;
}

function snapshotsToAggregates(snapshots: readonly TasteSnapshot[]): TasteSnapshotAggregate[] {
  return snapshots
    .filter((snap) => snap.featurePosNeg && Object.keys(snap.featurePosNeg).length > 0)
    .map((snap) => ({
      month: snap.month,
      eventCount: snap.eventCount,
      featurePosNeg: snap.featurePosNeg!,
    }));
}

function recomputeProfile(
  events: readonly InteractionEvent[],
  snapshots: readonly TasteSnapshot[],
  prefs: TastePreferencesRecord,
): TasteProfile {
  return buildTasteProfile(eventsToTasteSignals(events), {
    snapshots: snapshotsToAggregates(snapshots),
    overrides: { rules: prefs.rules },
  });
}

export interface TasteStoreState {
  prefs: TastePreferencesRecord;
  profile: TasteProfile;
  rawEventCount: number;
  snapshotCount: number;
  loaded: boolean;
  busy: boolean;

  loadTaste: () => Promise<void>;
  recordOutfitFeedback: (
    type: TasteSignalType,
    items: readonly OutfitGarmentInput[],
    fitStatesByGarmentId?: Readonly<Record<string, string>>,
  ) => Promise<boolean>;
  setLearningPaused: (paused: boolean) => Promise<void>;
  setRetentionMonths: (months: RetentionMonths) => Promise<void>;
  setExplicitRule: (
    category: TasteFeatureCategory,
    value: string,
    rule: TasteExplicitRule | null,
  ) => Promise<void>;
  forgetCategory: (category: TasteFeatureCategory) => Promise<void>;
  forgetAllTaste: () => Promise<void>;
  compactByRetention: () => Promise<CompactionSummary>;
  clearMemory: () => void;
}

const EMPTY_PROFILE = buildTasteProfile([]);

export const useTasteStore = create<TasteStoreState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  profile: EMPTY_PROFILE,
  rawEventCount: 0,
  snapshotCount: 0,
  loaded: false,
  busy: false,

  loadTaste: async () => {
    const vault = getVaultServiceInstance();
    if (!canAccessVault()) {
      set({
        prefs: DEFAULT_PREFS,
        profile: EMPTY_PROFILE,
        rawEventCount: 0,
        snapshotCount: 0,
        loaded: false,
      });
      return;
    }

    set({ busy: true });
    try {
      const [savedPrefs, events, snapshots] = await Promise.all([
        vault.getRecord<TastePreferencesRecord>('preferences', 'taste'),
        listInteractionEvents(vault),
        listTasteSnapshots(vault),
      ]);
      const prefs = savedPrefs ?? DEFAULT_PREFS;
      const profile = recomputeProfile(events, snapshots, prefs);
      set({
        prefs,
        profile,
        rawEventCount: events.length,
        snapshotCount: snapshots.length,
        loaded: true,
        busy: false,
      });
    } catch {
      set({ busy: false, loaded: true });
    }
  },

  recordOutfitFeedback: async (type, items, fitStatesByGarmentId) => {
    const { prefs } = get();
    // Regla sección 10.6: al pausar el aprendizaje, los eventos nuevos no puntúan ni se registran.
    if (prefs.learningPaused || items.length === 0) {
      return false;
    }

    const serializedFeatures = Array.from(
      new Set(
        items.flatMap((item) =>
          extractGarmentTasteFeatures(item, fitStatesByGarmentId?.[item.id]).map((f) =>
            serializeTasteKey(f.category, f.value),
          ),
        ),
      ),
    );

    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await appendInteractionEvent(vault, {
        type,
        payload: {
          garmentIds: items.map((i) => i.id),
          features: serializedFeatures,
        },
      });
      await get().loadTaste();
    }
    return true;
  },

  setLearningPaused: async (paused) => {
    const nextPrefs: TastePreferencesRecord = {
      ...get().prefs,
      learningPaused: paused,
      updatedAt: new Date().toISOString(),
    };
    if (canAccessVault()) {
      await getVaultServiceInstance().putRecord('preferences', 'taste', nextPrefs);
    }
    set({ prefs: nextPrefs });
  },

  setRetentionMonths: async (retentionMonths) => {
    const nextPrefs: TastePreferencesRecord = {
      ...get().prefs,
      retentionMonths,
      updatedAt: new Date().toISOString(),
    };
    if (canAccessVault()) {
      await getVaultServiceInstance().putRecord('preferences', 'taste', nextPrefs);
    }
    set({ prefs: nextPrefs });
  },

  setExplicitRule: async (category, value, rule) => {
    const key = serializeTasteKey(category, value);
    const nextRules: Record<string, TasteExplicitRule> = { ...get().prefs.rules };
    if (rule === null) {
      delete nextRules[key];
    } else {
      nextRules[key] = rule;
    }
    const nextPrefs: TastePreferencesRecord = {
      ...get().prefs,
      rules: nextRules,
      updatedAt: new Date().toISOString(),
    };

    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await vault.putRecord('preferences', 'taste', nextPrefs);
      const [events, snapshots] = await Promise.all([
        listInteractionEvents(vault),
        listTasteSnapshots(vault),
      ]);
      set({
        prefs: nextPrefs,
        profile: recomputeProfile(events, snapshots, nextPrefs),
      });
      return;
    }

    set({
      prefs: nextPrefs,
      profile: buildTasteProfile([], { overrides: { rules: nextRules } }),
    });
  },

  forgetCategory: async (category) => {
    const prefix = `${category}:`;
    const nextRules: Record<string, TasteExplicitRule> = {};
    for (const [k, v] of Object.entries(get().prefs.rules)) {
      if (!k.startsWith(prefix)) nextRules[k] = v;
    }
    const nextPrefs: TastePreferencesRecord = {
      ...get().prefs,
      rules: nextRules,
      updatedAt: new Date().toISOString(),
    };

    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await vault.putRecord('preferences', 'taste', nextPrefs);

      const [events, snapshots] = await Promise.all([
        listInteractionEvents(vault),
        listTasteSnapshots(vault),
      ]);

      for (const evt of events) {
        const raw = evt.payload.features;
        if (!Array.isArray(raw)) continue;
        const filtered = raw.filter((f) => typeof f === 'string' && !f.startsWith(prefix));
        if (filtered.length !== raw.length) {
          await vault.putRecord('interaction_event', evt.id, {
            ...evt,
            payload: { ...evt.payload, features: filtered },
          });
        }
      }

      for (const snap of snapshots) {
        if (!snap.featurePosNeg) continue;
        const nextPosNeg: Record<string, { pos: number; neg: number; count: number }> = {};
        let changed = false;
        for (const [k, v] of Object.entries(snap.featurePosNeg)) {
          if (k.startsWith(prefix)) {
            changed = true;
          } else {
            nextPosNeg[k] = v;
          }
        }
        if (changed) {
          await vault.putRecord('taste_snapshot', snap.id, {
            ...snap,
            featurePosNeg: nextPosNeg,
          });
        }
      }

      await get().loadTaste();
      return;
    }

    set({
      prefs: nextPrefs,
      profile: buildTasteProfile([], { overrides: { rules: nextRules } }),
    });
  },

  forgetAllTaste: async () => {
    const nextPrefs: TastePreferencesRecord = {
      ...get().prefs,
      rules: {},
      updatedAt: new Date().toISOString(),
    };

    const vault = getVaultServiceInstance();
    if (canAccessVault()) {
      await vault.putRecord('preferences', 'taste', nextPrefs);
      const [events, snapshots] = await Promise.all([
        listInteractionEvents(vault),
        listTasteSnapshots(vault),
      ]);

      for (const evt of events) {
        if (evt.type in TASTE_EVENT_VALUES) {
          await vault.deleteRecord('interaction_event', evt.id);
        }
      }
      for (const snap of snapshots) {
        await vault.deleteRecord('taste_snapshot', snap.id);
      }
    }

    set({
      prefs: nextPrefs,
      profile: EMPTY_PROFILE,
      rawEventCount: 0,
      snapshotCount: 0,
    });
  },

  compactByRetention: async () => {
    const vault = getVaultServiceInstance();
    const months = get().prefs.retentionMonths;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const summary = await compactInteractionEvents(vault, cutoffDate.toISOString());
    await get().loadTaste();
    return summary;
  },

  clearMemory: () =>
    set({
      prefs: DEFAULT_PREFS,
      profile: EMPTY_PROFILE,
      rawEventCount: 0,
      snapshotCount: 0,
      loaded: false,
      busy: false,
    }),
}));
