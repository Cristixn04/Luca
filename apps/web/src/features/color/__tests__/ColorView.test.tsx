import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useClosetStore } from '@/features/closet/closetStore';
import { resetVaultServiceForTests } from '@/features/vault/vaultStore';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { ColorView } from '../ColorView';
import { getActiveSeasonId, useColorStore } from '../colorStore';

describe('ColorView y persistencia local de colorimetría (T8.2, T8.7)', () => {
  beforeEach(async () => {
    const dbName = `luca-color-test-${Math.random().toString(16).slice(2)}`;
    const store = new DexieLocalStore(dbName);
    const vault = resetVaultServiceForTests(store, { kdfIterations: 1000 });
    await vault.enablePlaintextMode();
    useColorStore.getState().clearMemory();
    useClosetStore.getState().clearMemory();
  });

  it('calcula Top 2 con confianza, renderiza 14 colores de paleta, guarda y permite ignorar colorimetría', async () => {
    const user = userEvent.setup();
    render(<ColorView />);

    await waitFor(() => {
      expect(screen.getByTestId('color-result-card')).toBeInTheDocument();
    });

    // Seleccionar perfil frío/claro: Porcelana rosada + Rubio platino + Azul hielo
    await user.click(screen.getByRole('button', { name: /Porcelana rosada/i }));
    await user.click(screen.getByRole('button', { name: /Rubio platino/i }));
    await user.click(screen.getByRole('button', { name: /Azul hielo/i }));

    expect(screen.getByTestId('color-result-card')).toHaveTextContent(/Verano Claro/i);
    expect(screen.getByTestId('color-result-card')).toHaveTextContent(/Confianza/i);
    expect(screen.getByTestId('season-palette-grid').children.length).toBe(14);

    // Guardar perfil cifrado/local
    await user.click(screen.getByRole('button', { name: /Guardar perfil de color/i }));
    await waitFor(() => {
      expect(screen.getByText(/Perfil de color guardado/i)).toBeInTheDocument();
    });

    expect(getActiveSeasonId(useColorStore.getState().profile)).toBe('light_summer');

    // Activar "Ignorar colorimetría"
    await user.click(screen.getByRole('button', { name: /Ignorar colorimetría/i }));
    await waitFor(() => {
      expect(screen.getByTestId('color-ignored-banner')).toBeInTheDocument();
    });
    expect(getActiveSeasonId(useColorStore.getState().profile)).toBeNull();
  });
});
