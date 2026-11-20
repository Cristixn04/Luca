import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetVaultServiceForTests } from '@/features/vault/vaultStore';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { TasteMemorySection } from '../TasteMemorySection';
import { useTasteStore } from '../tasteStore';

describe('TasteMemorySection y privacidad local de gustos (T10.5–T10.8)', () => {
  beforeEach(async () => {
    const dbName = `luca-taste-ui-${Math.random().toString(16).slice(2)}`;
    const store = new DexieLocalStore(dbName);
    const vault = resetVaultServiceForTests(store, { kdfIterations: 1000 });
    await vault.enablePlaintextMode();
    useTasteStore.getState().clearMemory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('permite ver afinidades, pausar aprendizaje, fijar/vetar colores, olvidar y nunca toca la red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();

    await useTasteStore.getState().recordOutfitFeedback('outfit_liked', [
      {
        id: 'g1',
        name: 'Camisa terracota',
        category: 'tshirt',
        status: 'owned',
        formality: 2,
        elasticity: 0.05,
        dominantColorHex: '#C45733',
        pattern: 'solid',
      },
    ]);

    render(<TasteMemorySection />);

    await waitFor(() => {
      expect(screen.getByTestId('taste-memory-section')).toBeInTheDocument();
      expect(screen.getByText(/Aprendiendo \(1 \/ 10\)/i)).toBeInTheDocument();
    });

    // Fijar color Cálido -> activa el motor inmediatamente por regla explícita
    await user.click(screen.getByRole('button', { name: /Fijar color Cálido/i }));
    await waitFor(() => {
      expect(useTasteStore.getState().profile.activeInScoring).toBe(true);
      expect(useTasteStore.getState().profile.affinitiesByKey['color_family:calido']?.affinity).toBe(1);
    });

    // Pausar aprendizaje impide registrar nuevos eventos
    await user.click(screen.getByRole('button', { name: /Pausar aprendizaje/i }));
    const recordedWhilePaused = await useTasteStore.getState().recordOutfitFeedback('outfit_liked', [
      {
        id: 'g2',
        name: 'Camisa azul',
        category: 'tshirt',
        status: 'owned',
        formality: 2,
        elasticity: 0.05,
        dominantColorHex: '#1F5F6B',
      },
    ]);
    expect(recordedWhilePaused).toBe(false);

    // Olvidar todos mis gustos elimina por completo la influencia
    await user.click(screen.getByRole('button', { name: /Olvidar todos mis gustos/i }));
    await waitFor(() => {
      expect(useTasteStore.getState().profile.activeInScoring).toBe(false);
      expect(useTasteStore.getState().profile.rankedAffinities).toHaveLength(0);
    });

    // Privacidad: cero peticiones de red durante todo el ciclo de memoria
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
