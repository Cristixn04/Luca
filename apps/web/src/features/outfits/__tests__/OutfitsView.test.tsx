import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClosetStore } from '@/features/closet/closetStore';
import type { GarmentDraft } from '@/features/closet/types';
import { useColorStore } from '@/features/color/colorStore';
import { resetVaultServiceForTests } from '@/features/vault/vaultStore';
import { setApiConsent } from '@/infrastructure/api-client/client';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { OutfitsView } from '../OutfitsView';
import { useOutfitsStore } from '../outfitsStore';

const USER_CLOSET_FIXTURES: readonly GarmentDraft[] = [
  {
    category: 'tshirt',
    name: 'Camiseta marfil de algodón',
    brand: 'Norte',
    status: 'owned',
    elasticity: 0.05,
    formality: 2,
    style: 'minimalist',
    pattern: 'solid',
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['básico'],
    dominantColorHex: '#F3EFE6',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 } }],
  },
  {
    category: 'long_sleeve',
    name: 'Camisa terracota suave',
    brand: 'Norte',
    status: 'owned',
    elasticity: 0.02,
    formality: 3,
    style: 'classic',
    pattern: 'solid',
    seasons: ['spring', 'autumn', 'winter'],
    tags: ['oficina'],
    dominantColorHex: '#B85D3B',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 51, shoulders: 46, backWidth: 43 } }],
  },
  {
    category: 'pants',
    name: 'Pantalón chino azul marino',
    brand: 'Sur',
    status: 'owned',
    elasticity: 0.02,
    formality: 3,
    style: 'classic',
    pattern: 'solid',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    tags: ['chino'],
    dominantColorHex: '#27324D',
    sizes: [{ label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 79 } }],
  },
  {
    category: 'pants',
    name: 'Pantalón recto arena',
    brand: 'Sur',
    status: 'owned',
    elasticity: 0.02,
    formality: 2,
    style: 'casual',
    pattern: 'solid',
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['casual'],
    dominantColorHex: '#C9B99F',
    sizes: [{ label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 78 } }],
  },
  {
    category: 'jacket',
    name: 'Chaqueta oliva ligera',
    brand: 'Norte',
    status: 'owned',
    elasticity: 0.01,
    formality: 3,
    style: 'minimalist',
    pattern: 'solid',
    seasons: ['autumn', 'winter', 'spring'],
    tags: ['capa'],
    dominantColorHex: '#4B5724',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 54, shoulders: 47, backWidth: 44 } }],
  },
  {
    category: 'dress',
    name: 'Vestido midi petróleo',
    brand: 'Taller',
    status: 'owned',
    elasticity: 0.05,
    formality: 4,
    style: 'classic',
    pattern: 'solid',
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['evento'],
    dominantColorHex: '#1F5F6B',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 49, waistFlat: 40, hipFlat: 51 } }],
  },
];

async function populateUserCloset() {
  for (const draft of USER_CLOSET_FIXTURES) {
    await useClosetStore.getState().addGarment(draft);
  }
}

describe('OutfitsView: sugerir, guardar, favoritos y registrar uso (T9.5–T9.7)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    setApiConsent(false);
    const dbName = `luca-outfits-test-${Math.random().toString(16).slice(2)}`;
    const store = new DexieLocalStore(dbName);
    const vault = resetVaultServiceForTests(store, { kdfIterations: 1000 });
    await vault.enablePlaintextMode();
    useClosetStore.getState().clearMemory();
    useColorStore.getState().clearMemory();
    useOutfitsStore.getState().clearMemory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra estado vacío conectado al Clóset sin prendas de ejemplo y genera propuestas con prendas reales', async () => {
    const user = userEvent.setup();
    const onOpenCloset = vi.fn();
    render(<OutfitsView onOpenCloset={onOpenCloset} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ir al Clóset a añadir prendas/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /ejemplo/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ir al Clóset a añadir prendas/i }));
    expect(onOpenCloset).toHaveBeenCalledTimes(1);

    await populateUserCloset();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Opción 1/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Opción 2/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Opción 3/i })).toBeInTheDocument();
    });

    expect(screen.getByTestId('outfit-breakdown-card')).toHaveTextContent(/Color/i);
    expect(screen.getByTestId('outfit-breakdown-card')).toHaveTextContent(/Calce/i);

    await user.click(screen.getByRole('button', { name: /Guardar outfit/i }));
    await waitFor(() => {
      expect(screen.getByTestId('saved-outfits-card')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Usé este outfit hoy/i }));
    await waitFor(() => {
      expect(useOutfitsStore.getState().wearLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('permite navegar el carrusel con flechas, ticks y activar vista ampliada', async () => {
    const user = userEvent.setup();
    await populateUserCloset();
    render(<OutfitsView />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Opción 1/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /Opción 1/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Opción 2/i })).toHaveAttribute('aria-selected', 'false');

    await user.click(screen.getByRole('button', { name: 'Siguiente outfit' }));
    expect(screen.getByRole('tab', { name: /Opción 2/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'Outfit anterior' }));
    expect(screen.getByRole('tab', { name: /Opción 1/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: /Ampliar Opción 1/i }));
    expect(screen.getByRole('button', { name: 'Salir de vista ampliada' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salir de vista ampliada' }));
    expect(
      screen.queryByRole('button', { name: 'Salir de vista ampliada' }),
    ).not.toBeInTheDocument();
  });

  it('usa exclusivamente el maniquí paramétrico y los modelos digitales de prendas sin botón de render realista IA', async () => {
    await populateUserCloset();
    const { container } = render(<OutfitsView />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Opción 1/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Render realista IA/i })).not.toBeInTheDocument();
    expect(container.querySelector('[data-outfit-ai-render="true"]')).toBeNull();
    expect(container.querySelector('[data-avatar-body="front"]')).not.toBeNull();
  });
});
