import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { resetVaultServiceForTests } from '../vaultStore';

let currentStore: DexieLocalStore | null = null;

describe('Flujo UI de bóveda cifrada y Memoria (T3.3 – T3.8)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const dbName = `luca-ui-vault-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    currentStore = new DexieLocalStore(dbName);
    resetVaultServiceForTests(currentStore, { kdfIterations: 1_000 });
  });

  afterEach(async () => {
    if (currentStore) {
      await currentStore.wipeAll();
      currentStore.close();
      currentStore = null;
    }
  });

  it('crea la bóveda, muestra la clave de recuperación una sola vez, bloquea y desbloquea', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Pantalla inicial de creación de bóveda
    const passwordInput = await screen.findByLabelText('Contraseña de la bóveda');
    await user.type(passwordInput, 'MiBovedaSegura99');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // 2. Clave de recuperación única
    const recoveryEl = await screen.findByTestId('recovery-key-value');
    expect(recoveryEl.textContent).toMatch(/^[0-9A-F]{8}(-[0-9A-F]{8}){7}$/);

    const enterButton = screen.getByRole('button', { name: 'Entrar a Luca' });
    expect(enterButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(enterButton).toBeEnabled();
    await user.click(enterButton);

    // 3. Entra a Luca (Probador) y navega a Memoria
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Probador de calce' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Memoria' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Memoria y bóveda local' }),
    ).toBeInTheDocument();

    // 4. Bloquear desde el encabezado y desbloquear con contraseña
    await user.click(screen.getByRole('button', { name: 'Bloquear bóveda' }));
    const unlockInput = await screen.findByLabelText('Contraseña');
    await user.type(unlockInput, 'MiBovedaSegura99');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Memoria y bóveda local' }),
      ).toBeInTheDocument();
    });
  }, 12_000);
});
