import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createGarment, listGarmentsWithSizes } from '@/features/closet/closetService';
import { useClosetStore } from '@/features/closet/closetStore';
import { ClosetView } from '@/features/closet/ClosetView';
import { resetVaultServiceForTests, useVaultStore } from '@/features/vault/vaultStore';
import { CryptoAuthError } from '@/infrastructure/crypto/webcrypto';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { VaultLockedError } from '@/infrastructure/vault/vaultService';

const storesToCleanup: DexieLocalStore[] = [];

afterEach(async () => {
  useClosetStore.getState().clearMemory();
  while (storesToCleanup.length > 0) {
    const store = storesToCleanup.pop()!;
    await store.wipeAll();
    store.close();
  }
});

describe('Auditoría de seguridad de la aplicación web', () => {
  it('index.html aplica CSP estricta sin scripts en línea ni orígenes de terceros y Referrer-Policy no-referrer', () => {
    const htmlPath = resolve(import.meta.dirname, '../../../../index.html');
    const html = readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).toContain("base-uri 'self'");
    expect(html).toContain("connect-src 'self'");
    expect(html).toContain('name="referrer" content="no-referrer"');

    // Prohíbe scripts inline (todo <script> debe tener atributo src)
    const scriptTags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
    expect(scriptTags.length).toBeGreaterThan(0);
    for (const tag of scriptTags) {
      expect(tag).toMatch(/\bsrc="/i);
      expect(tag).toMatch(/><\/script>$/i);
    }

    // Cero URLs externas (fuentes autoalojadas, cero CDNs/analítica)
    expect(html).not.toMatch(/https?:\/\//i);
  });

  it('escapa payloads XSS y previene contaminación de prototipo en el clóset', async () => {
    const dbName = `luca-sec-xss-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const store = new DexieLocalStore(dbName);
    storesToCleanup.push(store);

    const vault = resetVaultServiceForTests(store, { kdfIterations: 1_000 });
    await vault.createEncryptedVault('SeguridadXSS2026');

    const xssPayload = '<img src=x onerror="window.__xssTest=true">';
    const scriptPayload = '<script>window.__xssScript=true</script>';

    await createGarment(vault, {
      category: 'tshirt',
      name: xssPayload,
      brand: scriptPayload,
      status: 'owned',
      elasticity: 0,
      formality: 2,
      tags: ['__proto__', 'constructor', 'prototype'],
      sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 50 } }],
    });

    const { container } = render(<ClosetView onOpenInFitting={() => {}} />);

    // Debe mostrarse como texto inerte escapado y nunca crear nodos <img>/<script> inyectados
    expect(await screen.findByText(xssPayload)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect((window as unknown as Record<string, unknown>).__xssTest).toBeUndefined();
    expect((window as unknown as Record<string, unknown>).__xssScript).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('detecta intercambio de sobres cifrados entre almacenes (AAD) y borra la memoria al bloquear', async () => {
    const dbName = `luca-sec-aad-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const store = new DexieLocalStore(dbName);
    storesToCleanup.push(store);

    const vault = resetVaultServiceForTests(store, { kdfIterations: 1_000 });
    await vault.createEncryptedVault('SeguridadAAD2026');

    const created = await createGarment(vault, {
      category: 'pants',
      name: 'Pantalón Confidencial',
      brand: 'Marca Secreta',
      status: 'owned',
      price: 120,
      elasticity: 0.05,
      formality: 3,
      tags: ['privado'],
      sizes: [{ label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52 } }],
    });

    // Cargar en el store de React y luego bloquear la bóveda
    await useClosetStore.getState().loadCloset();
    expect(useClosetStore.getState().items).toHaveLength(1);

    useVaultStore.getState().lock();
    // Al bloquear: memoria de React vacía y llamadas al servicio rechazadas
    expect(useClosetStore.getState().items).toHaveLength(0);
    await expect(listGarmentsWithSizes(vault)).rejects.toThrow(VaultLockedError);

    // Ataque de intercambio de sobre: copiar ciphertext de garment hacia measurement_set
    const garmentEnvelope = await store.getEnvelope('garment', created.garment.id);
    expect(garmentEnvelope).toBeDefined();
    await store.putEnvelope({
      ...garmentEnvelope!,
      key: 'measurement_set:current',
      id: 'current',
      store: 'measurement_set',
    });

    await vault.unlockWithPassword('SeguridadAAD2026');
    await expect(vault.getRecord('measurement_set', 'current')).rejects.toThrow(CryptoAuthError);
  });
});
