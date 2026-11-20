import type { OptionalBodyMeasurements, RequiredBodyMeasurements } from '@luca/domain';
import { create } from 'zustand';
import { DEFAULT_BODY_MEASUREMENTS, useFittingStore } from '@/features/fitting/store';
import { useClosetStore } from '@/features/closet/closetStore';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import {
  appendInteractionEvent,
  compactInteractionEvents,
  listInteractionEvents,
  listTasteSnapshots,
  type CompactionSummary,
} from '@/infrastructure/storage/eventLog';
import {
  getStoragePersistenceInfo,
  requestPersistentStorage,
  type StoragePersistenceInfo,
} from '@/infrastructure/storage/persistence';
import type { LocalStore, VaultMetaRecord } from '@/infrastructure/storage/ports';
import {
  VaultService,
  type VaultServiceOptions,
  type VaultStatus,
} from '@/infrastructure/vault/vaultService';

export interface PersistedMeasurementSet {
  readonly id: 'current';
  readonly measuredOn: string;
  readonly requiredCm: RequiredBodyMeasurements;
  readonly optionalCm?: OptionalBodyMeasurements;
}

export type UiVaultStatus = 'loading' | VaultStatus;

let activeStore: LocalStore = new DexieLocalStore();
let activeVault: VaultService = new VaultService(activeStore);

export function getVaultServiceInstance(): VaultService {
  return activeVault;
}

export function resetVaultServiceForTests(
  store: LocalStore,
  options?: VaultServiceOptions,
): VaultService {
  activeStore = store;
  activeVault = new VaultService(store, options);
  useVaultStore.setState({
    status: 'loading',
    meta: null,
    pendingRecoveryKey: null,
    persistence: null,
    eventCount: 0,
    snapshotCount: 0,
    busy: false,
    error: null,
  });
  return activeVault;
}

async function hydrateFromVault(): Promise<{ eventCount: number; snapshotCount: number }> {
  const saved = await activeVault.getRecord<PersistedMeasurementSet>('measurement_set', 'current');
  if (saved?.requiredCm) {
    useFittingStore.setState({
      bodyMeasurements: { ...saved.requiredCm },
      optionalMeasurements: saved.optionalCm ? { ...saved.optionalCm } : {},
    });
  }

  const [events, snapshots] = await Promise.all([
    listInteractionEvents(activeVault),
    listTasteSnapshots(activeVault),
  ]);

  return {
    eventCount: events.length,
    snapshotCount: snapshots.length,
  };
}

export interface VaultStoreState {
  status: UiVaultStatus;
  meta: VaultMetaRecord | null;
  pendingRecoveryKey: string | null;
  persistence: StoragePersistenceInfo | null;
  eventCount: number;
  snapshotCount: number;
  busy: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  createVault: (password: string) => Promise<void>;
  confirmRecoveryKeySaved: () => void;
  continueWithoutVault: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  recover: (recoveryKey: string, newPassword: string) => Promise<void>;
  lock: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  persistCurrentMeasurements: (
    measures: RequiredBodyMeasurements,
    optional?: OptionalBodyMeasurements,
  ) => Promise<void>;
  exportBackup: () => Promise<string>;
  importBackup: (
    rawJson: string,
    credential: string,
    method: 'password' | 'recovery',
  ) => Promise<number>;
  compactEventsBefore: (cutoffIso?: string) => Promise<CompactionSummary>;
  requestPersistence: () => Promise<boolean>;
  refreshPersistence: () => Promise<void>;
  wipeAll: () => Promise<void>;
  clearError: () => void;
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  status: 'loading',
  meta: null,
  pendingRecoveryKey: null,
  persistence: null,
  eventCount: 0,
  snapshotCount: 0,
  busy: false,
  error: null,

  bootstrap: async () => {
    set({ busy: true, error: null });
    try {
      const { status, meta } = await activeVault.initialize();
      let eventCount = 0;
      let snapshotCount = 0;

      if (status === 'unlocked' || status === 'plaintext') {
        const stats = await hydrateFromVault();
        eventCount = stats.eventCount;
        snapshotCount = stats.snapshotCount;
      }

      const persistence = await getStoragePersistenceInfo(meta?.lastBackupAt);
      set({
        status,
        meta,
        eventCount,
        snapshotCount,
        persistence,
        busy: false,
      });
    } catch (err) {
      set({
        status: 'uninitialized',
        busy: false,
        error: err instanceof Error ? err.message : 'Error al inicializar el almacenamiento local.',
      });
    }
  },

  createVault: async (password) => {
    set({ busy: true, error: null });
    try {
      const { recoveryKey, meta } = await activeVault.createEncryptedVault(password);
      const currentMeasures = useFittingStore.getState().bodyMeasurements;
      const currentOptionals = useFittingStore.getState().optionalMeasurements;

      await activeVault.putRecord<PersistedMeasurementSet>('measurement_set', 'current', {
        id: 'current',
        measuredOn: new Date().toISOString().slice(0, 10),
        requiredCm: currentMeasures,
        ...(Object.keys(currentOptionals).length > 0 ? { optionalCm: currentOptionals } : {}),
      });

      await appendInteractionEvent(activeVault, {
        type: 'measurements_updated',
        payload: { source: 'vault_setup' },
      });

      await requestPersistentStorage();
      const persistence = await getStoragePersistenceInfo(meta.lastBackupAt);

      set({
        status: 'unlocked',
        meta,
        pendingRecoveryKey: recoveryKey,
        eventCount: 1,
        snapshotCount: 0,
        persistence,
        busy: false,
      });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo crear la bóveda.',
      });
    }
  },

  confirmRecoveryKeySaved: () => set({ pendingRecoveryKey: null }),

  continueWithoutVault: async () => {
    set({ busy: true, error: null });
    try {
      const meta = await activeVault.enablePlaintextMode();
      const currentMeasures = useFittingStore.getState().bodyMeasurements;
      await activeVault.putRecord<PersistedMeasurementSet>('measurement_set', 'current', {
        id: 'current',
        measuredOn: new Date().toISOString().slice(0, 10),
        requiredCm: currentMeasures,
      });

      const persistence = await getStoragePersistenceInfo(meta.lastBackupAt);
      set({
        status: 'plaintext',
        meta,
        pendingRecoveryKey: null,
        persistence,
        busy: false,
      });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo activar el modo sin cifrado.',
      });
    }
  },

  unlock: async (password) => {
    set({ busy: true, error: null });
    try {
      await activeVault.unlockWithPassword(password);
      const meta = activeVault.getMeta();
      const { eventCount, snapshotCount } = await hydrateFromVault();
      const persistence = await getStoragePersistenceInfo(meta?.lastBackupAt);

      set({
        status: 'unlocked',
        meta,
        eventCount,
        snapshotCount,
        persistence,
        busy: false,
      });
    } catch (err) {
      set({
        busy: false,
        error:
          err instanceof Error
            ? err.message
            : 'Contraseña incorrecta. Verifica e intenta de nuevo.',
      });
    }
  },

  recover: async (recoveryKey, newPassword) => {
    set({ busy: true, error: null });
    try {
      const meta = await activeVault.recoverWithRecoveryKey(recoveryKey, newPassword);
      const { eventCount, snapshotCount } = await hydrateFromVault();
      const persistence = await getStoragePersistenceInfo(meta.lastBackupAt);

      set({
        status: 'unlocked',
        meta,
        eventCount,
        snapshotCount,
        persistence,
        busy: false,
      });
    } catch (err) {
      set({
        busy: false,
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo recuperar la bóveda con esa clave.',
      });
    }
  },

  lock: () => {
    activeVault.lock();
    // Limpia las medidas y el clóset descifrado en memoria al bloquear la bóveda.
    useFittingStore.setState({
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      optionalMeasurements: {},
    });
    useClosetStore.getState().clearMemory();
    set({
      status: activeVault.getStatus(),
      pendingRecoveryKey: null,
      error: null,
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ busy: true, error: null });
    try {
      const meta = await activeVault.changePassword(currentPassword, newPassword);
      set({ meta, busy: false });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.',
      });
      throw err;
    }
  },

  persistCurrentMeasurements: async (measures, optional) => {
    const status = get().status;
    if (status !== 'unlocked' && status !== 'plaintext') {
      return;
    }

    const hasOptionals = optional && Object.keys(optional).length > 0;

    await activeVault.putRecord<PersistedMeasurementSet>('measurement_set', 'current', {
      id: 'current',
      measuredOn: new Date().toISOString().slice(0, 10),
      requiredCm: measures,
      ...(hasOptionals ? { optionalCm: optional } : {}),
    });

    await appendInteractionEvent(activeVault, {
      type: 'measurements_updated',
      payload: {
        fields: Object.keys(measures),
        optionalFields: hasOptionals ? Object.keys(optional) : [],
      },
    });

    set((state) => ({ eventCount: state.eventCount + 1 }));
  },

  exportBackup: async () => {
    const json = await activeVault.exportEncryptedBackup();
    const meta = activeVault.getMeta();
    const persistence = await getStoragePersistenceInfo(meta?.lastBackupAt);
    set({ meta, persistence });
    return json;
  },

  importBackup: async (rawJson, credential, method) => {
    set({ busy: true, error: null });
    try {
      const { restoredRecords, meta } = await activeVault.importEncryptedBackup(
        rawJson,
        credential,
        method,
      );
      const { eventCount, snapshotCount } = await hydrateFromVault();
      const persistence = await getStoragePersistenceInfo(meta.lastBackupAt);

      set({
        status: 'unlocked',
        meta,
        pendingRecoveryKey: null,
        eventCount,
        snapshotCount,
        persistence,
        busy: false,
      });
      return restoredRecords;
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo restaurar el respaldo cifrado.',
      });
      throw err;
    }
  },

  compactEventsBefore: async (cutoffIso) => {
    const targetCutoff = cutoffIso ?? new Date().toISOString();
    const summary = await compactInteractionEvents(activeVault, targetCutoff);
    const snapshots = await listTasteSnapshots(activeVault);
    set({
      eventCount: summary.remainingEvents,
      snapshotCount: snapshots.length,
    });
    return summary;
  },

  requestPersistence: async () => {
    const granted = await requestPersistentStorage();
    const persistence = await getStoragePersistenceInfo(get().meta?.lastBackupAt);
    set({ persistence });
    return granted;
  },

  refreshPersistence: async () => {
    const persistence = await getStoragePersistenceInfo(get().meta?.lastBackupAt);
    set({ persistence });
  },

  wipeAll: async () => {
    set({ busy: true, error: null });
    await activeVault.wipeAllData();
    useFittingStore.setState({
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      optionalMeasurements: {},
    });
    useClosetStore.getState().clearMemory();
    const persistence = await getStoragePersistenceInfo(undefined);
    set({
      status: 'uninitialized',
      meta: null,
      pendingRecoveryKey: null,
      eventCount: 0,
      snapshotCount: 0,
      persistence,
      busy: false,
    });
  },

  clearError: () => set({ error: null }),
}));
