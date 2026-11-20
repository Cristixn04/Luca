import { afterEach, describe, expect, it } from 'vitest';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { listInteractionEvents } from '@/infrastructure/storage/eventLog';
import { VaultService } from '@/infrastructure/vault/vaultService';
import {
  createGarment,
  deleteGarment,
  listGarmentsWithSizes,
  seedSampleGarments,
  updateGarment,
  validateGarmentDraft,
} from '../closetService';

const storesToCleanup: DexieLocalStore[] = [];

async function setupEncryptedVault() {
  const dbName = `luca-closet-svc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const store = new DexieLocalStore(dbName);
  storesToCleanup.push(store);
  const vault = new VaultService(store, { kdfIterations: 1_000 });
  await vault.createEncryptedVault('ClosetSeguro2026');
  return { store, vault };
}

afterEach(async () => {
  while (storesToCleanup.length > 0) {
    const store = storesToCleanup.pop()!;
    await store.wipeAll();
    store.close();
  }
});

describe('closetService · CRUD cifrado y eventos (T4.1, T4.2, T4.6)', () => {
  it('crea, lista, edita y elimina prendas con sus tallas cifradas y registra eventos', async () => {
    const { store, vault } = await setupEncryptedVault();

    const created = await createGarment(vault, {
      category: 'tshirt',
      name: 'Camiseta Oxford Secreta',
      brand: 'Atelier Privado',
      status: 'owned',
      price: 45,
      elasticity: 0.05,
      formality: 3,
      tags: ['oficina', 'algodón', 'oficina'],
      dominantColorHex: '#1F5F6B',
      image: {
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8',
        width: 100,
        height: 120,
        source: 'manual',
      },
      sizes: [
        { label: 'S', flatMeasuresCm: { chestFlat: 47, shoulders: 43 } },
        { label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45 } },
      ],
    });

    expect(created.garment.tags).toEqual(['oficina', 'algodón']);
    expect(created.sizes).toHaveLength(2);
    expect(created.image?.source).toBe('manual');

    // Garantiza cifrado en reposo: ningún texto claro ni dataUrl en IndexedDB
    const rawEnvelopes = await store.listAllEnvelopes();
    const rawDump = JSON.stringify(rawEnvelopes);
    expect(rawDump).not.toContain('Camiseta Oxford Secreta');
    expect(rawDump).not.toContain('Atelier Privado');
    expect(rawDump).not.toContain('iVBORw0KGgo');

    // Editar: quitar S, mantener M y añadir L
    const sizeM = created.sizes.find((s) => s.label === 'M')!;
    const updated = await updateGarment(vault, created.garment.id, {
      category: 'tshirt',
      name: 'Camiseta Oxford Editada',
      brand: 'Atelier Privado',
      status: 'wishlist',
      price: 52,
      elasticity: 0.08,
      formality: 4,
      tags: ['formal'],
      dominantColorHex: '#2A9D8F',
      sizes: [
        { id: sizeM.id, label: 'M', flatMeasuresCm: { chestFlat: 51, shoulders: 45.5 } },
        { label: 'L', flatMeasuresCm: { chestFlat: 55, shoulders: 48 } },
      ],
    });

    expect(updated.garment.name).toBe('Camiseta Oxford Editada');
    expect(updated.sizes.map((s) => s.label)).toEqual(['M', 'L']);

    // Verificar cascada al borrar prenda (tallas + foto)
    await deleteGarment(vault, created.garment.id);
    expect(await listGarmentsWithSizes(vault)).toHaveLength(0);
    expect(await store.listEnvelopes('size_option')).toHaveLength(0);
    expect(await store.listEnvelopes('garment_image')).toHaveLength(0);

    // Verificar eventos append-only registrados (T4.6)
    const events = await listInteractionEvents(vault);
    expect(events.map((e) => e.type)).toEqual([
      'garment_added',
      'garment_edited',
      'garment_deleted',
    ]);
  });

  it('siembra prendas de ejemplo válidas', async () => {
    const { vault } = await setupEncryptedVault();
    const seeded = await seedSampleGarments(vault);
    expect(seeded).toHaveLength(2);

    const listed = await listGarmentsWithSizes(vault);
    expect(listed).toHaveLength(2);
  });

  it('valida borradores con errores de nombre, precio, elasticidad, color y tallas duplicadas', () => {
    const errors = validateGarmentDraft({
      category: 'tshirt',
      name: '   ',
      brand: '',
      status: 'owned',
      price: -10,
      elasticity: 0.9,
      formality: 2,
      tags: [],
      dominantColorHex: 'rojo',
      sizes: [
        { label: 'M', flatMeasuresCm: {} },
        { label: 'm', flatMeasuresCm: { chestFlat: 50 } },
      ],
    });

    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});
