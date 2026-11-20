import { describe, expect, it } from 'vitest';
import {
  CryptoAuthError,
  DEFAULT_PBKDF2_ITERATIONS,
  IV_BYTE_LENGTH,
  RECOVERY_KEY_BYTES,
  SALT_BYTE_LENGTH,
  decryptJsonRecord,
  deriveKekFromPassword,
  encryptJsonRecord,
  fromBase64,
  generateDek,
  generateIv,
  generateRecoveryKey,
  generateSalt,
  importRecoveryKek,
  parseRecoveryKey,
  toBase64,
  unwrapDek,
  wrapDek,
} from '../webcrypto';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

describe('Capa criptográfica WebCrypto (T3.2, T3.4, RNF-07)', () => {
  it('cumple parámetros mínimos de seguridad (PBKDF2 >= 600.000, salt 16 B, IV 12 B, recovery 32 B)', () => {
    expect(DEFAULT_PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    expect(SALT_BYTE_LENGTH).toBe(16);
    expect(IV_BYTE_LENGTH).toBe(12);
    expect(RECOVERY_KEY_BYTES).toBe(32);

    expect(generateSalt()).toHaveLength(16);
    expect(generateIv()).toHaveLength(12);
  });

  it('verifica vector conocido NIST SP 800-38D para AES-256-GCM con AAD', async () => {
    // Vector estándar AES-256-GCM (clave 256 bits, IV 96 bits, plaintext + AAD)
    const keyBytes = hexToBytes('feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308');
    const ivBytes = hexToBytes('cafebabefacedbaddecaf888');
    const aadBytes = hexToBytes('feedfacedeadbeeffeedfacedeadbeefabaddad2');
    const plaintext = hexToBytes(
      'd9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a72' +
        '1c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39',
    );
    const expectedCiphertext =
      '522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa' +
      '8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662';
    const expectedTag = '76fc6ece0f4e1768cddf8853bb2d551b';

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: ivBytes.buffer as ArrayBuffer,
          additionalData: aadBytes.buffer as ArrayBuffer,
        },
        key,
        plaintext.buffer as ArrayBuffer,
      ),
    );

    expect(bytesToHex(encrypted)).toBe(expectedCiphertext + expectedTag);
  });

  it('verifica vector conocido RFC 6070 / PBKDF2-HMAC-SHA256', async () => {
    // Vector estándar PBKDF2-HMAC-SHA256("password", "salt", c=1, dkLen=32)
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode('password'), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const derived = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode('salt'), iterations: 1, hash: 'SHA-256' },
        baseKey,
        256,
      ),
    );

    expect(bytesToHex(derived)).toBe(
      '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
    );
  });

  it('cifra con nonce aleatorio único por registro y detecta manipulación de ciphertext, IV o AAD', async () => {
    const dek = await generateDek(true);
    const data = { chest: 92, waist: 78 };

    const enc1 = await encryptJsonRecord(dek, 'measurement_set', 'm1', data);
    const enc2 = await encryptJsonRecord(dek, 'measurement_set', 'm1', data);

    // Nonce aleatorio de 96 bits distinto en cada cifrado
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(fromBase64(enc1.iv)).toHaveLength(12);

    // Descifrado legítimo
    const decoded = await decryptJsonRecord<typeof data>(dek, 'measurement_set', 'm1', enc1);
    expect(decoded).toEqual(data);

    // 1. Manipulación de 1 bit en ciphertext
    const tamperedCt = fromBase64(enc1.ciphertext);
    tamperedCt[0] = (tamperedCt[0]! ^ 0x01) & 0xff;
    await expect(
      decryptJsonRecord(dek, 'measurement_set', 'm1', {
        iv: enc1.iv,
        ciphertext: toBase64(tamperedCt),
      }),
    ).rejects.toThrow(CryptoAuthError);

    // 2. Manipulación de 1 bit en IV
    const tamperedIv = fromBase64(enc1.iv);
    tamperedIv[0] = (tamperedIv[0]! ^ 0x80) & 0xff;
    await expect(
      decryptJsonRecord(dek, 'measurement_set', 'm1', {
        iv: toBase64(tamperedIv),
        ciphertext: enc1.ciphertext,
      }),
    ).rejects.toThrow(CryptoAuthError);

    // 3. Ataque de intercambio de registro (AAD ligado a id y store)
    await expect(
      decryptJsonRecord(dek, 'measurement_set', 'm2', enc1),
    ).rejects.toThrow(CryptoAuthError);
    await expect(decryptJsonRecord(dek, 'garment', 'm1', enc1)).rejects.toThrow(CryptoAuthError);
  });

  it('envuelve y desenvuelve DEK con KEK de contraseña y clave de recuperación de 256 bits', async () => {
    const dek = await generateDek(true);
    const salt = generateSalt();
    const kek = await deriveKekFromPassword('clave-segura-2026', salt, 1_000);
    const wrapped = await wrapDek(dek, kek);

    const unwrapped = await unwrapDek(wrapped, kek, false);
    const payload = await encryptJsonRecord(dek, 'profile', 'p1', { ok: true });
    expect(await decryptJsonRecord(unwrapped, 'profile', 'p1', payload)).toEqual({ ok: true });

    const wrongKek = await deriveKekFromPassword('otra-clave-erronea', salt, 1_000);
    await expect(unwrapDek(wrapped, wrongKek, false)).rejects.toThrow(CryptoAuthError);

    // Clave de recuperación de 256 bits
    const recoveryKey = generateRecoveryKey();
    expect(parseRecoveryKey(recoveryKey.toLowerCase().replace(/-/g, ' '))).toHaveLength(32);
    expect(() => parseRecoveryKey('invalida')).toThrow(CryptoAuthError);

    const recoveryKek = await importRecoveryKek(recoveryKey);
    const wrappedRecovery = await wrapDek(dek, recoveryKek);
    const unwrappedRecovery = await unwrapDek(wrappedRecovery, recoveryKek, false);
    expect(await decryptJsonRecord(unwrappedRecovery, 'profile', 'p1', payload)).toEqual({
      ok: true,
    });
  });
});
