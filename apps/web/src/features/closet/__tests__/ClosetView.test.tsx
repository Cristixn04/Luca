import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BODY_MEASUREMENTS, useFittingStore } from '@/features/fitting/store';
import { resetVaultServiceForTests } from '@/features/vault/vaultStore';
import { DexieLocalStore } from '@/infrastructure/storage/dexieStore';
import { useClosetStore } from '../closetStore';
import { ClosetView } from '../ClosetView';

let testStore: DexieLocalStore | null = null;

describe('ClosetView y GarmentDetailView (T4.3 – T4.5)', () => {
  beforeEach(async () => {
    const dbName = `luca-closet-ui-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    testStore = new DexieLocalStore(dbName);
    const vault = resetVaultServiceForTests(testStore, { kdfIterations: 1_000 });
    await vault.createEncryptedVault('ClaveClosetUI123');
    useClosetStore.getState().clearMemory();
    useClosetStore.getState().resetFilters();
    useFittingStore.setState({
      unit: 'cm',
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      fitPreference: 'regular',
    });
  });

  afterEach(async () => {
    useClosetStore.getState().clearMemory();
    if (testStore) {
      await testStore.wipeAll();
      testStore.close();
      testStore = null;
    }
  });

  it('muestra estado vacío, carga ejemplos, filtra, muestra talla recomendada y navega al detalle', async () => {
    const user = userEvent.setup();
    const onOpenInFitting = vi.fn();

    render(<ClosetView onOpenInFitting={onOpenInFitting} />);

    // 1. Estado vacío inicial
    expect(await screen.findByText('Tu clóset está vacío')).toBeInTheDocument();

    // 2. Cargar prendas de ejemplo
    await user.click(screen.getByRole('button', { name: /Cargar 2 prendas de ejemplo/i }));
    expect(await screen.findByText('Camiseta básica de lino')).toBeInTheDocument();
    expect(screen.getByText('Pantalón chino recto')).toBeInTheDocument();

    // 3. Filtrar por estado "Lista de deseos"
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'wishlist');
    expect(screen.queryByText('Camiseta básica de lino')).not.toBeInTheDocument();
    expect(screen.getByText('Pantalón chino recto')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'all');

    // 4. Abrir detalle de la camiseta y verificar talla recomendada M
    const shirtHeading = screen.getByText('Camiseta básica de lino');
    const shirtCard = shirtHeading.closest('div[class*="rounded"]');
    expect(shirtCard).not.toBeNull();
    await user.click(within(shirtCard as HTMLElement).getByRole('button', { name: /Ver calce y tallas/i }));

    const banner = await screen.findByTestId('recommended-size-banner');
    expect(banner).toHaveTextContent('Talla recomendada: M');

    // 5. Cambiar a talla L y verificar que actualiza el encabezado del probador
    await user.click(within(banner).getByRole('button', { name: 'L' }));
    expect(screen.getByText('Probador · Talla L')).toBeInTheDocument();

    // 6. Abrir en Probador
    await user.click(screen.getByRole('button', { name: /Abrir en Probador/i }));
    expect(onOpenInFitting).toHaveBeenCalledTimes(1);
  });
});
