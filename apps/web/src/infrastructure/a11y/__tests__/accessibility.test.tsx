import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GARMENT_CATEGORIES } from '@luca/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { useClosetStore } from '@/features/closet/closetStore';
import { DEFAULT_BODY_MEASUREMENTS, useFittingStore } from '@/features/fitting/store';
import { resetVaultServiceForTests } from '@/features/vault/vaultStore';
import { useI18nStore } from '@/i18n/i18nStore';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';

describe('Accesibilidad, i18n ES/EN, 7 plantillas 3 vistas, onboarding y privacidad (M11)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    useI18nStore.getState().setLocale('es');
    useClosetStore.getState().clearMemory();
    useFittingStore.setState({
      unit: 'cm',
      viewMode: 'front',
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      optionalMeasurements: {},
      garmentEnabled: true,
      garmentSource: 'quick',
      selectedClosetGarmentId: null,
      garmentCategory: 'tshirt',
    });

    const dbName = `luca-m11-a11y-${Math.random().toString(16).slice(2)}`;
    const store = new DexieLocalStore(dbName);
    const vault = resetVaultServiceForTests(store, { kdfIterations: 1000 });
    await vault.enablePlaintextMode();
  });

  it('cumple landmarks semánticos, alterna ES/EN, abre privacidad y onboarding sin emojis', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole('heading', { level: 1, name: 'Probador de calce' });

    // Landmarks WCAG 2.2 AA
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute(
      'href',
      '#contenido-principal',
    );

    // Alternar a inglés (T11.3)
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('heading', { level: 1, name: 'Fit room' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Closet' })).toBeInTheDocument();

    // Volver a español
    await user.click(screen.getByRole('button', { name: 'Switch language to Spanish' }));
    expect(document.documentElement.lang).toBe('es');

    // Abrir pantalla de privacidad (T11.5)
    await user.click(screen.getByRole('button', { name: 'Cómo se protegen tus datos' }));
    await waitFor(() => {
      expect(screen.getByTestId('privacy-view')).toBeInTheDocument();
    });
    expect(screen.getByText(/Qué nunca sale de tu dispositivo/i)).toBeInTheDocument();

    // Abrir guía de inicio rápido (T11.1)
    await user.click(screen.getByRole('button', { name: 'Guía de inicio rápido' }));
    expect(screen.getByText('1. Tus medidas principales')).toBeInTheDocument();

    // Cero emojis en la interfaz
    const emojiPattern = /\p{Extended_Pictographic}/u;
    expect(container.textContent ?? '').not.toMatch(emojiPattern);
  });

  it('renderiza las 7 categorías de prendas en las 3 vistas coherentes (T11.2)', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole('heading', { level: 1, name: 'Probador de calce' });

    for (const category of GARMENT_CATEGORIES) {
      useFittingStore.getState().setGarmentCategory(category);
      await user.click(screen.getByRole('button', { name: 'Frente' }));
      await waitFor(() => {
        expect(container.querySelector(`[data-garment="${category}"]`)).not.toBeNull();
      });
      await user.click(screen.getByRole('button', { name: 'Perfil' }));
      await waitFor(() => {
        expect(container.querySelector(`[data-garment="${category}-side"]`)).not.toBeNull();
      });
      await user.click(screen.getByRole('button', { name: 'Espalda' }));
      await waitFor(() => {
        expect(container.querySelector(`[data-garment="${category}-back"]`)).not.toBeNull();
      });
    }
  }, 15_000);
});
