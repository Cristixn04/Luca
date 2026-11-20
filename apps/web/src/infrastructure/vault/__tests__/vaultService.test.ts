import { afterEach, describe, expect, it } from 'vitest';
import { CryptoAuthError } from '../../crypto/webcrypto';
import { DexieLocalStore } from '../../storage/dexieStore';
import {
  appendInteractionEvent,
  compactInteractionEvents,
  listInteractionEvents,
  listTasteSnapshots,
} from '../../storage/eventLog';
import { VaultLockedError, VaultService } from '../vaultService';

const storesToCleanup: DexieLocalStore[] = [];

function createTestVault(): { store: DexieLocalStore; vault: VaultService } {
  const dbName = `luca-vault-test-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const store = new DexieLocalStore(dbName);
  storesToCleanup.push(store);
  // Iteraciones bajas solo en tests unitarios para velocidad; la constante por defecto >= 600.000 se valida en webcrypto.test.ts.
  const vault = new VaultService(store, { kdfIterations: 1_000 });
  return { store, vault };
}

afterEach(async () => {
  while (storesToCleanup.length > 0) {
    const store = storesToCleanup.pop()!;
    await store.wipeAll();
    store.close();
  }
});

describe('VaultService · bóveda, recuperación, eventos y respaldos (T3.3 – T3.8)', () => {
  it('cifra registros en IndexedDB sin exponer texto claro, bloquea y desbloquea con contraseña', async () => {
    const { store, vault } = createTestVault();

    const { recoveryKey } = await vault.createEncryptedVault('MiClaveSegura123');
    expect(recoveryKey).toMatch(/^[0-9A-F]{8}(-[0-9A-F]{8}){7}$/);

    await vault.putRecord('measurement_set', 'current', { chest: 94, waist: 79 });

    // Verifica que el sobre en IndexedDB no contiene texto claro
    const rawEnvelope = await store.getEnvelope('measurement_set', 'current');
    expect(rawEnvelope?.iv).toBeTruthy();
    expect(rawEnvelope?.ciphertext).toBeTruthy();
    expect(rawEnvelope?.plaintext).toBeUndefined();
    expect(JSON.stringify(rawEnvelope)).not.toContain('94');

    // Al bloquear, la DEK sale de memoria y cualquier acceso falla
    vault.lock();
    expect(vault.getStatus()).toBe('locked');
    await expect(vault.getRecord('measurement_set', 'current')).rejects.toThrow(VaultLockedError);

    // Contraseña errónea falla
    await expect(vault.unlockWithPassword('ClaveIncorrecta')).rejects.toThrow(CryptoAuthError);

    // Contraseña correcta restaura el acceso
    await vault.unlockWithPassword('MiClaveSegura123');
    const restored = await vault.getRecord<{ chest: number; waist: number }>(
      'measurement_set',
      'current',
    );
    expect(restored).toEqual({ chest: 94, waist: 79 });
  });

  it('cambia la contraseña reenvolviendo la DEK sin recifrar ningún registro (ADR-004)', async () => {
    const { store, vault } = createTestVault();
    await vault.createEncryptedVault('ClaveInicial123');
    await vault.putRecord('measurement_set', 'current', { chest: 96 });

    const envelopeBefore = await store.getEnvelope('measurement_set', 'current');

    await vault.changePassword('ClaveInicial123', 'ClaveNueva456');

    // El sobre del registro permanece idéntico (cero recifrado)
    const envelopeAfter = await store.getEnvelope('measurement_set', 'current');
    expect(envelopeAfter?.iv).toBe(envelopeBefore?.iv);
    expect(envelopeAfter?.ciphertext).toBe(envelopeBefore?.ciphertext);

    vault.lock();
    await expect(vault.unlockWithPassword('ClaveInicial123')).rejects.toThrow(CryptoAuthError);

    await vault.unlockWithPassword('ClaveNueva456');
    expect(await vault.getRecord('measurement_set', 'current')).toEqual({ chest: 96 });
  });

  it('recupera la bóveda con la clave de recuperación y asigna una nueva contraseña (T3.4)', async () => {
    const { vault } = createTestVault();
    const { recoveryKey } = await vault.createEncryptedVault('ClaveOlvidada123');
    await vault.putRecord('measurement_set', 'current', { hip: 101 });

    vault.lock();
    await vault.recoverWithRecoveryKey(recoveryKey, 'ClaveRecuperada789');

    expect(vault.getStatus()).toBe('unlocked');
    expect(await vault.getRecord('measurement_set', 'current')).toEqual({ hip: 101 });

    vault.lock();
    await vault.unlockWithPassword('ClaveRecuperada789');
    expect(await vault.getRecord('measurement_set', 'current')).toEqual({ hip: 101 });
  });

  it('compacta eventos antiguos en TASTE_SNAPSHOT mensuales preservando los recientes (T3.5)', async () => {
    const { vault } = createTestVault();
    await vault.createEncryptedVault('EventosSeguros123');

    await appendInteractionEvent(vault, {
      type: 'outfit_liked',
      at: '2025-09-10T10:00:00.000Z',
      payload: { features: ['color:earth', 'fit:regular'] },
    });
    await appendInteractionEvent(vault, {
      type: 'outfit_liked',
      at: '2025-09-14T10:00:00.000Z',
      payload: { features: ['color:earth'] },
    });
    await appendInteractionEvent(vault, {
      type: 'wear_logged',
      at: '2025-10-02T10:00:00.000Z',
      payload: { features: ['category:tshirt'] },
    });
    await appendInteractionEvent(vault, {
      type: 'measurements_updated',
      at: '2026-11-18T10:00:00.000Z',
      payload: {},
    });

    const summary = await compactInteractionEvents(vault, '2026-01-01T00:00:00.000Z');
    expect(summary.compactedEvents).toBe(3);
    expect(summary.remainingEvents).toBe(1);
    expect(summary.updatedMonths).toEqual(['2025-09', '2025-10']);

    const remaining = await listInteractionEvents(vault);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.type).toBe('measurements_updated');

    const snapshots = await listTasteSnapshots(vault);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]?.month).toBe('2025-09');
    expect(snapshots[0]?.eventCount).toBe(2);
    expect(snapshots[0]?.featureCounts['color:earth']).toBe(2);
  });

  it('exporta e importa respaldo cifrado en otro almacén con contraseña o clave de recuperación y rechaza manipulación (T3.7)', async () => {
    const { vault: sourceVault } = createTestVault();
    const { recoveryKey } = await sourceVault.createEncryptedVault('RespaldoClave123');
    await sourceVault.putRecord('measurement_set', 'current', { chest: 98, secretTag: 'privado' });

    const exportedJson = await sourceVault.exportEncryptedBackup();
    expect(exportedJson).not.toContain('privado');

    // 1. Restaurar en un navegador/IndexedDB distinto usando contraseña
    const { vault: targetByPassword } = createTestVault();
    const resultPass = await targetByPassword.importEncryptedBackup(
      exportedJson,
      'RespaldoClave123',
      'password',
    );
    expect(resultPass.restoredRecords).toBe(1);
    expect(await targetByPassword.getRecord('measurement_set', 'current')).toEqual({
      chest: 98,
      secretTag: 'privado',
    });

    // 2. Restaurar en otro navegador/IndexedDB usando clave de recuperación
    const { vault: targetByRecovery } = createTestVault();
    const resultRec = await targetByRecovery.importEncryptedBackup(
      exportedJson,
      recoveryKey,
      'recovery',
    );
    expect(resultRec.restoredRecords).toBe(1);
    expect(await targetByRecovery.getRecord('measurement_set', 'current')).toEqual({
      chest: 98,
      secretTag: 'privado',
    });

    // 3. Respaldo manipulado debe fallar antes de tocar el destino
    const parsed = JSON.parse(exportedJson) as { records: Array<{ id: string }> };
    parsed.records[0]!.id = 'otro-id-manipulado';
    await expect(
      targetByPassword.importEncryptedBackup(JSON.stringify(parsed), 'RespaldoClave123', 'password'),
    ).rejects.toThrow(CryptoAuthError);

    // 4. Borrado total
    await sourceVault.wipeAllData();
    expect(sourceVault.getStatus()).toBe('uninitialized');
  });
});
