import Dexie, { type Table } from 'dexie';
import {
  makeEnvelopeKey,
  type LocalStore,
  type MigrationBackupRecord,
  type StoreName,
  type StoredEnvelope,
  type VaultMetaRecord,
} from './ports';

export const CURRENT_SCHEMA_VERSION = 2;
export const DEFAULT_DB_NAME = 'luca-local-vault';

export class LucaDatabase extends Dexie {
  vault_meta!: Table<VaultMetaRecord, 'primary'>;
  records!: Table<StoredEnvelope, string>;
  migration_backups!: Table<MigrationBackupRecord, string>;

  constructor(dbName = DEFAULT_DB_NAME) {
    super(dbName);

    // Esquema v1: tablas base para metadatos de bóveda, sobres de registros y respaldos de migración.
    this.version(1).stores({
      vault_meta: 'id',
      records: 'key, store, id, updatedAt',
      migration_backups: 'id, createdAt',
    });

    // Esquema v2: índice compuesto [store+updatedAt] con respaldo automático previo a la migración (RNF-08).
    this.version(2)
      .stores({
        vault_meta: 'id',
        records: 'key, store, id, updatedAt, [store+updatedAt]',
        migration_backups: 'id, createdAt',
      })
      .upgrade(async (tx) => {
        const metaTable = tx.table<VaultMetaRecord, 'primary'>('vault_meta');
        const recordsTable = tx.table<StoredEnvelope, string>('records');
        const backupsTable = tx.table<MigrationBackupRecord, string>('migration_backups');

        const existingMeta = await metaTable.get('primary');
        const existingRecords = await recordsTable.toArray();

        if (existingMeta || existingRecords.length > 0) {
          const now = new Date().toISOString();
          await backupsTable.put({
            id: `v1-to-v2-${now}`,
            fromVersion: 1,
            toVersion: 2,
            createdAt: now,
            ...(existingMeta ? { vaultMeta: existingMeta } : {}),
            records: existingRecords,
          });
        }

        if (existingMeta) {
          await metaTable.put({
            ...existingMeta,
            schemaVersion: 2,
            updatedAt: new Date().toISOString(),
          });
        }
      });
  }
}

export class DexieLocalStore implements LocalStore {
  readonly schemaVersion = CURRENT_SCHEMA_VERSION;
  private readonly db: LucaDatabase;

  constructor(dbName = DEFAULT_DB_NAME) {
    this.db = new LucaDatabase(dbName);
  }

  async getVaultMeta(): Promise<VaultMetaRecord | undefined> {
    return this.db.vault_meta.get('primary');
  }

  async saveVaultMeta(meta: VaultMetaRecord): Promise<void> {
    await this.db.vault_meta.put(meta);
  }

  async putEnvelope(envelope: StoredEnvelope): Promise<void> {
    await this.db.records.put(envelope);
  }

  async getEnvelope(store: StoreName, id: string): Promise<StoredEnvelope | undefined> {
    return this.db.records.get(makeEnvelopeKey(store, id));
  }

  async listEnvelopes(store: StoreName): Promise<StoredEnvelope[]> {
    return this.db.records.where('store').equals(store).toArray();
  }

  async listAllEnvelopes(): Promise<StoredEnvelope[]> {
    return this.db.records.toArray();
  }

  async deleteEnvelope(store: StoreName, id: string): Promise<void> {
    await this.db.records.delete(makeEnvelopeKey(store, id));
  }

  async replaceAllData(meta: VaultMetaRecord, envelopes: readonly StoredEnvelope[]): Promise<void> {
    await this.db.transaction('rw', this.db.vault_meta, this.db.records, async () => {
      await this.db.records.clear();
      await this.db.vault_meta.clear();
      await this.db.vault_meta.put(meta);
      if (envelopes.length > 0) {
        await this.db.records.bulkPut([...envelopes]);
      }
    });
  }

  async listMigrationBackups(): Promise<MigrationBackupRecord[]> {
    return this.db.migration_backups.toArray();
  }

  async wipeAll(): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.vault_meta,
      this.db.records,
      this.db.migration_backups,
      async () => {
        await this.db.records.clear();
        await this.db.vault_meta.clear();
        await this.db.migration_backups.clear();
      },
    );
  }

  close(): void {
    this.db.close();
  }
}
