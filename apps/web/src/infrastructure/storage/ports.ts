import type { KdfParams, WrappedKeyEnvelope } from '../crypto/webcrypto';

export const STORE_NAMES = [
  'profile',
  'measurement_set',
  'color_profile',
  'garment',
  'garment_image',
  'size_option',
  'wear_log',
  'outfit',
  'outfit_item',
  'interaction_event',
  'taste_snapshot',
  'preferences',
] as const;

export type StoreName = (typeof STORE_NAMES)[number];

export type VaultMode = 'encrypted' | 'plaintext';

export interface VaultMetaRecord {
  readonly id: 'primary';
  readonly mode: VaultMode;
  readonly schemaVersion: number;
  readonly kdfParams?: KdfParams;
  /** Base64 de sal de 16 bytes */
  readonly salt?: string;
  readonly wrappedDekPassword?: WrappedKeyEnvelope;
  readonly wrappedDekRecovery?: WrappedKeyEnvelope;
  readonly autoLockMinutes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastBackupAt?: string;
}

export interface StoredEnvelope {
  readonly key: string;
  readonly id: string;
  readonly store: StoreName;
  readonly iv?: string;
  readonly ciphertext?: string;
  readonly plaintext?: unknown;
  readonly updatedAt: string;
}

export interface MigrationBackupRecord {
  readonly id: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly createdAt: string;
  readonly vaultMeta?: VaultMetaRecord;
  readonly records: readonly StoredEnvelope[];
}

export function makeEnvelopeKey(store: StoreName, id: string): string {
  return `${store}:${id}`;
}

export interface LocalStore {
  readonly schemaVersion: number;
  getVaultMeta(): Promise<VaultMetaRecord | undefined>;
  saveVaultMeta(meta: VaultMetaRecord): Promise<void>;
  putEnvelope(envelope: StoredEnvelope): Promise<void>;
  getEnvelope(store: StoreName, id: string): Promise<StoredEnvelope | undefined>;
  listEnvelopes(store: StoreName): Promise<StoredEnvelope[]>;
  listAllEnvelopes(): Promise<StoredEnvelope[]>;
  deleteEnvelope(store: StoreName, id: string): Promise<void>;
  replaceAllData(meta: VaultMetaRecord, envelopes: readonly StoredEnvelope[]): Promise<void>;
  listMigrationBackups(): Promise<MigrationBackupRecord[]>;
  wipeAll(): Promise<void>;
  close(): void;
}
