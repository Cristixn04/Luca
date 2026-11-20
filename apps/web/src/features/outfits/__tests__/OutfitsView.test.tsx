import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useClosetStore } from '@/features/closet/closetStore';
import { useColorStore } from '@/features/color/colorStore';
import { resetVaultServiceForTests } from '@/features/vault/vaultStore';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { OutfitsView } from '../OutfitsView';
import { useOutfitsStore } from '../outfitsStore';

describe('OutfitsView: sugerir, guardar, favoritos y registrar uso (T9.5–T9.7)', () => {
  beforeEach(async () => {
    const dbName = `luca-outfits-test-${Math.random().toString(16).slice(2)}`;
    const store = new DexieLocalStore(dbName);
    const vault = resetVaultServiceForTests(store, { kdfIterations: 1000 });
    await vault.enablePlaintextMode();
    useClosetStore.getState().clearMemory();
    useColorStore.getState().clearMemory();
    useOutfitsStore.getState().clearMemory();
  });

  it('carga prendas de ejemplo, genera 3 propuestas diversas, guarda favorito y registra uso', async () => {
    const user = userEvent.setup();
    render(<OutfitsView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cargar 6 prendas de ejemplo/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Cargar 6 prendas de ejemplo/i }));

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
    render(<OutfitsView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cargar 6 prendas de ejemplo/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Cargar 6 prendas de ejemplo/i }));

    await waitFor(() => {
      expect(useClosetStore.getState().items).toHaveLength(6);
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
});
