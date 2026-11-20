import {
  CryptoAuthError,
  DEFAULT_PBKDF2_ITERATIONS,
  decryptJsonRecord,
  deriveKekFromPassword,
  encryptJsonRecord,
  fromBase64,
  generateDek,
  generateRecoveryKey,
  generateSalt,
  importRecoveryKek,
  toBase64,
  unwrapDek,
  wrapDek,
} from '../crypto/webcrypto';
import {
  makeEnvelopeKey,
  type LocalStore,
  type StoreName,
  type StoredEnvelope,
  type VaultMetaRecord,
} from '../storage/ports';

export const MIN_PASSWORD_LENGTH = 8;
export const DEFAULT_AUTO_LOCK_MINUTES = 15;
export const BACKUP_FORMAT_ID = 'luca-encrypted-backup' as const;
export const BACKUP_FORMAT_VERSION = 1 as const;

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked' | 'plaintext';

export interface LucaEncryptedBackup {
  readonly format: typeof BACKUP_FORMAT_ID;
  readonly version: typeof BACKUP_FORMAT_VERSION;
  readonly exportedAt: string;
  readonly vaultMeta: VaultMetaRecord;
  readonly records: readonly StoredEnvelope[];
}

export class VaultLockedError extends Error {
  constructor(message = 'La bóveda está bloqueada. Desbloquéala antes de acceder a los datos.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}

export interface VaultServiceOptions {
  readonly kdfIterations?: number;
}

export class VaultService {
  private readonly store: LocalStore;
  private readonly kdfIterations: number;
  private activeDek: CryptoKey | null = null;
  private cachedMeta: VaultMetaRecord | null = null;

  constructor(store: LocalStore, options: VaultServiceOptions = {}) {
    this.store = store;
    this.kdfIterations = options.kdfIterations ?? DEFAULT_PBKDF2_ITERATIONS;
  }

  async initialize(): Promise<{ status: VaultStatus; meta: VaultMetaRecord | null }> {
    const meta = await this.store.getVaultMeta();
    this.cachedMeta = meta ?? null;

    if (!meta) {
      this.activeDek = null;
      return { status: 'uninitialized', meta: null };
    }

    if (meta.mode === 'plaintext') {
      this.activeDek = null;
      return { status: 'plaintext', meta };
    }

    return {
      status: this.activeDek ? 'unlocked' : 'locked',
      meta,
    };
  }

  getStatus(): VaultStatus {
    if (!this.cachedMeta) {
      return 'uninitialized';
    }
    if (this.cachedMeta.mode === 'plaintext') {
      return 'plaintext';
    }
    return this.activeDek ? 'unlocked' : 'locked';
  }

  getMeta(): VaultMetaRecord | null {
    return this.cachedMeta;
  }

  async createEncryptedVault(
    password: string,
    autoLockMinutes = DEFAULT_AUTO_LOCK_MINUTES,
  ): Promise<{ recoveryKey: string; meta: VaultMetaRecord }> {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new RangeError(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }

    const salt = generateSalt();
    const recoveryKey = generateRecoveryKey();

    const extractableDek = await generateDek(true);
    const passwordKek = await deriveKekFromPassword(password, salt, this.kdfIterations);
    const recoveryKek = await importRecoveryKek(recoveryKey);

    const wrappedDekPassword = await wrapDek(extractableDek, passwordKek);
    const wrappedDekRecovery = await wrapDek(extractableDek, recoveryKek);

    // En sesión mantenemos la DEK no exportable en memoria.
    const sessionDek = await unwrapDek(wrappedDekPassword, passwordKek, false);

    const now = new Date().toISOString();
    const meta: VaultMetaRecord = {
      id: 'primary',
      mode: 'encrypted',
      schemaVersion: this.store.schemaVersion,
      kdfParams: {
        algorithm: 'PBKDF2-HMAC-SHA256',
        iterations: this.kdfIterations,
      },
      salt: toBase64(salt),
      wrappedDekPassword,
      wrappedDekRecovery,
      autoLockMinutes,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.saveVaultMeta(meta);
    this.cachedMeta = meta;
    this.activeDek = sessionDek;

    return { recoveryKey, meta };
  }

  async enablePlaintextMode(): Promise<VaultMetaRecord> {
    const now = new Date().toISOString();
    const meta: VaultMetaRecord = {
      id: 'primary',
      mode: 'plaintext',
      schemaVersion: this.store.schemaVersion,
      autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.saveVaultMeta(meta);
    this.cachedMeta = meta;
    this.activeDek = null;
    return meta;
  }

  async unlockWithPassword(password: string): Promise<void> {
    const meta = await this.requireEncryptedMeta();
    const salt = fromBase64(meta.salt!);
    const iterations = meta.kdfParams?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;

    const kek = await deriveKekFromPassword(password, salt, iterations);
    const dek = await unwrapDek(meta.wrappedDekPassword!, kek, false);

    this.cachedMeta = meta;
    this.activeDek = dek;
  }

  lock(): void {
    this.activeDek = null;
  }

  /**
   * Cambia la contraseña reenvolviendo únicamente la DEK (ADR-004):
   * ningún registro en IndexedDB requiere recifrado.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<VaultMetaRecord> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new RangeError(
        `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }

    const meta = await this.requireEncryptedMeta();
    const currentSalt = fromBase64(meta.salt!);
    const currentIterations = meta.kdfParams?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;

    const currentKek = await deriveKekFromPassword(currentPassword, currentSalt, currentIterations);
    const extractableDek = await unwrapDek(meta.wrappedDekPassword!, currentKek, true);

    const nextSalt = generateSalt();
    const nextKek = await deriveKekFromPassword(newPassword, nextSalt, this.kdfIterations);
    const nextWrappedPassword = await wrapDek(extractableDek, nextKek);
    const sessionDek = await unwrapDek(nextWrappedPassword, nextKek, false);

    const updatedMeta: VaultMetaRecord = {
      ...meta,
      kdfParams: {
        algorithm: 'PBKDF2-HMAC-SHA256',
        iterations: this.kdfIterations,
      },
      salt: toBase64(nextSalt),
      wrappedDekPassword: nextWrappedPassword,
      updatedAt: new Date().toISOString(),
    };

    await this.store.saveVaultMeta(updatedMeta);
    this.cachedMeta = updatedMeta;
    this.activeDek = sessionDek;

    return updatedMeta;
  }

  /**
   * Recupera acceso con la clave de recuperación de 256 bits y asigna una nueva contraseña.
   */
  async recoverWithRecoveryKey(recoveryKey: string, newPassword: string): Promise<VaultMetaRecord> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new RangeError(
        `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }

    const meta = await this.requireEncryptedMeta();
    const recoveryKek = await importRecoveryKek(recoveryKey);
    const extractableDek = await unwrapDek(meta.wrappedDekRecovery!, recoveryKek, true);

    const nextSalt = generateSalt();
    const nextKek = await deriveKekFromPassword(newPassword, nextSalt, this.kdfIterations);
    const nextWrappedPassword = await wrapDek(extractableDek, nextKek);
    const sessionDek = await unwrapDek(nextWrappedPassword, nextKek, false);

    const updatedMeta: VaultMetaRecord = {
      ...meta,
      kdfParams: {
        algorithm: 'PBKDF2-HMAC-SHA256',
        iterations: this.kdfIterations,
      },
      salt: toBase64(nextSalt),
      wrappedDekPassword: nextWrappedPassword,
      updatedAt: new Date().toISOString(),
    };

    await this.store.saveVaultMeta(updatedMeta);
    this.cachedMeta = updatedMeta;
    this.activeDek = sessionDek;

    return updatedMeta;
  }

  async putRecord<T>(storeName: StoreName, id: string, data: T): Promise<void> {
    const status = this.getStatus();
    if (status === 'uninitialized' || status === 'locked') {
      throw new VaultLockedError();
    }

    const now = new Date().toISOString();
    const key = makeEnvelopeKey(storeName, id);

    if (status === 'plaintext') {
      await this.store.putEnvelope({
        key,
        id,
        store: storeName,
        plaintext: data,
        updatedAt: now,
      });
      return;
    }

    const encrypted = await encryptJsonRecord(this.activeDek!, storeName, id, data);
    await this.store.putEnvelope({
      key,
      id,
      store: storeName,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      updatedAt: now,
    });
  }

  async getRecord<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    const status = this.getStatus();
    if (status === 'uninitialized' || status === 'locked') {
      throw new VaultLockedError();
    }

    const envelope = await this.store.getEnvelope(storeName, id);
    if (!envelope) {
      return undefined;
    }

    return this.decodeEnvelope<T>(envelope, status);
  }

  async listRecords<T>(storeName: StoreName): Promise<T[]> {
    const status = this.getStatus();
    if (status === 'uninitialized' || status === 'locked') {
      throw new VaultLockedError();
    }

    const envelopes = await this.store.listEnvelopes(storeName);
    const results: T[] = [];
    for (const envelope of envelopes) {
      results.push(await this.decodeEnvelope<T>(envelope, status));
    }
    return results;
  }

  async deleteRecord(storeName: StoreName, id: string): Promise<void> {
    const status = this.getStatus();
    if (status === 'uninitialized' || status === 'locked') {
      throw new VaultLockedError();
    }
    await this.store.deleteEnvelope(storeName, id);
  }

  async exportEncryptedBackup(): Promise<string> {
    const meta = await this.requireEncryptedMeta();
    if (!this.activeDek) {
      throw new VaultLockedError('Desbloquea la bóveda antes de exportar un respaldo.');
    }

    const exportedAt = new Date().toISOString();
    const records = await this.store.listAllEnvelopes();

    // Verifica que ningún registro incluya datos en claro antes de exportar.
    const encryptedOnly: StoredEnvelope[] = records.map((rec) => {
      if (!rec.iv || !rec.ciphertext) {
        throw new CryptoAuthError(`El registro ${rec.key} no está cifrado.`);
      }
      return {
        key: rec.key,
        id: rec.id,
        store: rec.store,
        iv: rec.iv,
        ciphertext: rec.ciphertext,
        updatedAt: rec.updatedAt,
      };
    });

    const updatedMeta: VaultMetaRecord = {
      ...meta,
      lastBackupAt: exportedAt,
      updatedAt: exportedAt,
    };
    await this.store.saveVaultMeta(updatedMeta);
    this.cachedMeta = updatedMeta;

    const backup: LucaEncryptedBackup = {
      format: BACKUP_FORMAT_ID,
      version: BACKUP_FORMAT_VERSION,
      exportedAt,
      vaultMeta: updatedMeta,
      records: encryptedOnly,
    };

    return JSON.stringify(backup, null, 2);
  }

  async importEncryptedBackup(
    rawJson: string,
    credential: string,
    method: 'password' | 'recovery',
  ): Promise<{ restoredRecords: number; meta: VaultMetaRecord }> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new CryptoAuthError('El archivo de respaldo no es un JSON válido.');
    }

    if (!isValidBackupShape(parsed)) {
      throw new CryptoAuthError('Formato de respaldo cifrado de Luca no reconocido.');
    }

    const { vaultMeta, records } = parsed;
    if (
      vaultMeta.mode !== 'encrypted' ||
      !vaultMeta.salt ||
      !vaultMeta.wrappedDekPassword ||
      !vaultMeta.wrappedDekRecovery
    ) {
      throw new CryptoAuthError('Los metadatos criptográficos del respaldo están incompletos.');
    }

    // 1. Verifica la credencial contra la DEK envuelta del respaldo antes de tocar IndexedDB.
    let sessionDek: CryptoKey;
    if (method === 'password') {
      const salt = fromBase64(vaultMeta.salt);
      const iterations = vaultMeta.kdfParams?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
      const kek = await deriveKekFromPassword(credential, salt, iterations);
      sessionDek = await unwrapDek(vaultMeta.wrappedDekPassword, kek, false);
    } else {
      const recoveryKek = await importRecoveryKek(credential);
      sessionDek = await unwrapDek(vaultMeta.wrappedDekRecovery, recoveryKek, false);
    }

    // 2. Verifica la integridad AES-GCM + AAD de TODOS los registros del respaldo antes de reemplazar.
    for (const rec of records) {
      if (!rec.iv || !rec.ciphertext) {
        throw new CryptoAuthError(`El respaldo contiene un registro sin cifrar (${rec.key}).`);
      }
      await decryptJsonRecord(sessionDek, rec.store, rec.id, {
        iv: rec.iv,
        ciphertext: rec.ciphertext,
      });
    }

    // 3. Reemplaza atómicamente los datos locales y deja la bóveda desbloqueada.
    await this.store.replaceAllData(vaultMeta, records);
    this.cachedMeta = vaultMeta;
    this.activeDek = sessionDek;

    return {
      restoredRecords: records.length,
      meta: vaultMeta,
    };
  }

  async wipeAllData(): Promise<void> {
    this.activeDek = null;
    this.cachedMeta = null;
    await this.store.wipeAll();
  }

  private async decodeEnvelope<T>(
    envelope: StoredEnvelope,
    status: 'unlocked' | 'plaintext',
  ): Promise<T> {
    if (status === 'plaintext') {
      return envelope.plaintext as T;
    }

    if (!envelope.iv || !envelope.ciphertext) {
      throw new CryptoAuthError(`Registro corrupto o sin cifrar: ${envelope.key}`);
    }

    return decryptJsonRecord<T>(this.activeDek!, envelope.store, envelope.id, {
      iv: envelope.iv,
      ciphertext: envelope.ciphertext,
    });
  }

  private async requireEncryptedMeta(): Promise<VaultMetaRecord> {
    const meta = this.cachedMeta ?? (await this.store.getVaultMeta()) ?? null;
    if (
      !meta ||
      meta.mode !== 'encrypted' ||
      !meta.salt ||
      !meta.wrappedDekPassword ||
      !meta.wrappedDekRecovery
    ) {
      throw new CryptoAuthError('No existe una bóveda cifrada configurada.');
    }
    return meta;
  }
}

function isValidBackupShape(value: unknown): value is LucaEncryptedBackup {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LucaEncryptedBackup>;
  return (
    candidate.format === BACKUP_FORMAT_ID &&
    candidate.version === BACKUP_FORMAT_VERSION &&
    typeof candidate.exportedAt === 'string' &&
    Boolean(candidate.vaultMeta) &&
    Array.isArray(candidate.records)
  );
}
