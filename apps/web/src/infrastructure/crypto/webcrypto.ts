export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;
export const RECOVERY_KEY_BYTES = 32;

export interface KdfParams {
  readonly algorithm: 'PBKDF2-HMAC-SHA256';
  readonly iterations: number;
}

export interface WrappedKeyEnvelope {
  /** Base64 de IV aleatorio de 96 bits */
  readonly iv: string;
  /** Base64 de la DEK envuelta con AES-GCM */
  readonly wrappedKey: string;
}

export interface EncryptedPayload {
  /** Base64 de IV aleatorio de 96 bits único por registro */
  readonly iv: string;
  /** Base64 del texto cifrado AES-256-GCM (incluye etiqueta de autenticación de 128 bits) */
  readonly ciphertext: string;
}

export class CryptoAuthError extends Error {
  constructor(message = 'No se pudo autenticar o descifrar el contenido.') {
    super(message);
    this.name = 'CryptoAuthError';
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto API (crypto.subtle) no está disponible en este entorno.');
  }
  return subtle;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function generateSalt(): Uint8Array {
  return generateRandomBytes(SALT_BYTE_LENGTH);
}

export function generateIv(): Uint8Array {
  return generateRandomBytes(IV_BYTE_LENGTH);
}

/**
 * Datos asociados (AAD) que ligan cada texto cifrado a su almacén e ID,
 * evitando ataques de intercambio de sobres entre registros.
 */
export function buildRecordAad(store: string, id: string): Uint8Array {
  return textEncoder.encode(`luca:v1:${store}:${id}`);
}

/**
 * Genera una clave de recuperación aleatoria de 256 bits (32 bytes)
 * formateada en 8 bloques de 8 caracteres hexadecimales en mayúsculas.
 */
export function generateRecoveryKey(): string {
  const bytes = generateRandomBytes(RECOVERY_KEY_BYTES);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < hex.length; i += 8) {
    chunks.push(hex.slice(i, i + 8));
  }
  return chunks.join('-');
}

export function parseRecoveryKey(formatted: string): Uint8Array {
  const clean = formatted.replace(/[\s-]+/g, '').toUpperCase();
  if (!/^[0-9A-F]{64}$/.test(clean)) {
    throw new CryptoAuthError(
      'La clave de recuperación debe tener exactamente 64 caracteres hexadecimales (256 bits).',
    );
  }

  const bytes = new Uint8Array(RECOVERY_KEY_BYTES);
  for (let i = 0; i < RECOVERY_KEY_BYTES; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function generateDek(extractable = true): Promise<CryptoKey> {
  return getSubtle().generateKey({ name: 'AES-GCM', length: 256 }, extractable, [
    'encrypt',
    'decrypt',
  ]);
}

export async function deriveKekFromPassword(
  password: string,
  salt: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (password.length === 0) {
    throw new CryptoAuthError('La contraseña no puede estar vacía.');
  }

  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(password)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

export async function importRecoveryKek(recoveryKey: string): Promise<CryptoKey> {
  const raw = parseRecoveryKey(recoveryKey);
  return getSubtle().importKey('raw', toArrayBuffer(raw), { name: 'AES-GCM', length: 256 }, false, [
    'wrapKey',
    'unwrapKey',
  ]);
}

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<WrappedKeyEnvelope> {
  const iv = generateIv();
  const wrapped = await getSubtle().wrapKey('raw', dek, kek, {
    name: 'AES-GCM',
    iv: toArrayBuffer(iv),
  });

  return {
    iv: toBase64(iv),
    wrappedKey: toBase64(new Uint8Array(wrapped)),
  };
}

export async function unwrapDek(
  envelope: WrappedKeyEnvelope,
  kek: CryptoKey,
  extractable = false,
): Promise<CryptoKey> {
  try {
    const iv = fromBase64(envelope.iv);
    const wrapped = fromBase64(envelope.wrappedKey);
    return await getSubtle().unwrapKey(
      'raw',
      toArrayBuffer(wrapped),
      kek,
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt'],
    );
  } catch {
    throw new CryptoAuthError('Credencial inválida o clave envuelta corrupta.');
  }
}

export async function encryptJsonRecord(
  dek: CryptoKey,
  store: string,
  id: string,
  data: unknown,
): Promise<EncryptedPayload> {
  const iv = generateIv();
  const aad = buildRecordAad(store, id);
  const plaintext = textEncoder.encode(JSON.stringify(data));

  const encrypted = await getSubtle().encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aad),
    },
    dek,
    toArrayBuffer(plaintext),
  );

  return {
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptJsonRecord<T>(
  dek: CryptoKey,
  store: string,
  id: string,
  payload: EncryptedPayload,
): Promise<T> {
  try {
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.ciphertext);
    const aad = buildRecordAad(store, id);

    const decrypted = await getSubtle().decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv),
        additionalData: toArrayBuffer(aad),
      },
      dek,
      toArrayBuffer(ciphertext),
    );

    const json = textDecoder.decode(new Uint8Array(decrypted));
    return JSON.parse(json) as T;
  } catch {
    throw new CryptoAuthError(
      `Fallo de integridad o descifrado en el registro ${store}:${id}.`,
    );
  }
}
