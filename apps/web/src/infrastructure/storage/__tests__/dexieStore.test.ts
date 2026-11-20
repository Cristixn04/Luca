import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, DexieLocalStore } from '../dexieStore';
import {
  detectIosNonStandalone,
  evaluateBackupReminder,
  formatBytes,
  getStoragePersistenceInfo,
} from '../persistence';
import { makeEnvelopeKey, type StoredEnvelope, type VaultMetaRecord } from '../ports';

function uniqueDbName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

describe('DexieLocalStore y migraciones versionadas (T3.1, RNF-08)', () => {
  it('migra de esquema v1 a v2 sin pérdida de datos y crea respaldo previo automático', async () => {
    const dbName = uniqueDbName('luca-migration-test');

    // 1. Crear base de datos en versión 1 y sembrar datos
    const v1Db = new Dexie(dbName);
    v1Db.version(1).stores({
      vault_meta: 'id',
      records: 'key, store, id, updatedAt',
      migration_backups: 'id, createdAt',
    });

    const v1Meta: VaultMetaRecord = {
      id: 'primary',
      mode: 'encrypted',
      schemaVersion: 1,
      autoLockMinutes: 15,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    };

    const v1Record: StoredEnvelope = {
      key: makeEnvelopeKey('measurement_set', 'current'),
      id: 'current',
      store: 'measurement_set',
      iv: 'dummy-iv',
      ciphertext: 'dummy-ciphertext',
      updatedAt: '2026-11-01T00:00:00.000Z',
    };

    await v1Db.table('vault_meta').put(v1Meta);
    await v1Db.table('records').put(v1Record);
    v1Db.close();

    // 2. Abrir con DexieLocalStore (versión 2) y verificar migración + respaldo previo
    const store = new DexieLocalStore(dbName);
    const migratedMeta = await store.getVaultMeta();
    const migratedRecord = await store.getEnvelope('measurement_set', 'current');
    const backups = await store.listMigrationBackups();

    expect(migratedMeta?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migratedRecord).toEqual(v1Record);
    expect(backups).toHaveLength(1);
    expect(backups[0]?.fromVersion).toBe(1);
    expect(backups[0]?.toVersion).toBe(2);
    expect(backups[0]?.records).toHaveLength(1);

    await store.wipeAll();
    store.close();
  });

  it('soporta replaceAllData atómico y wipeAll completo', async () => {
    const store = new DexieLocalStore(uniqueDbName('luca-crud-test'));
    const meta: VaultMetaRecord = {
      id: 'primary',
      mode: 'plaintext',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      autoLockMinutes: 15,
      createdAt: '2026-11-19T00:00:00.000Z',
      updatedAt: '2026-11-19T00:00:00.000Z',
    };

    await store.replaceAllData(meta, [
      {
        key: makeEnvelopeKey('garment', 'g1'),
        id: 'g1',
        store: 'garment',
        plaintext: { name: 'Camiseta' },
        updatedAt: '2026-11-19T00:00:00.000Z',
      },
    ]);

    expect(await store.listEnvelopes('garment')).toHaveLength(1);
    await store.wipeAll();
    expect(await store.getVaultMeta()).toBeUndefined();
    expect(await store.listAllEnvelopes()).toHaveLength(0);
    store.close();
  });
});

describe('Persistencia, aviso iOS y recordatorio de respaldo (T3.6)', () => {
  it('detecta Safari iOS sin instalar y omite escritorio o PWA instalada', () => {
    const iosUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
    const desktopUa = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0';

    expect(detectIosNonStandalone(iosUa, false)).toBe(true);
    expect(detectIosNonStandalone(iosUa, true)).toBe(false);
    expect(detectIosNonStandalone(desktopUa, false)).toBe(false);
  });

  it('evalúa correctamente cuándo vence el recordatorio de respaldo', () => {
    const now = new Date('2026-11-20T00:00:00.000Z');
    expect(evaluateBackupReminder(undefined, now)).toEqual({ due: true, daysSinceBackup: null });
    expect(evaluateBackupReminder('2026-11-15T00:00:00.000Z', now)).toEqual({
      due: false,
      daysSinceBackup: 5,
    });
    expect(evaluateBackupReminder('2026-10-01T00:00:00.000Z', now)).toEqual({
      due: true,
      daysSinceBackup: 50,
    });
  });

  it('formatea bytes y consulta el estado de almacenamiento sin fallar en jsdom', async () => {
    expect(formatBytes(null)).toBe('No disponible');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');

    const info = await getStoragePersistenceInfo(undefined);
    expect(info.backupReminderDue).toBe(true);
  });
});
