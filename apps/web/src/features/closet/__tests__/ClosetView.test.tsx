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

  it('muestra estado vacío sin prendas de prueba, filtra prendas reales del usuario, muestra talla recomendada y navega al probador y detalle', async () => {
    const user = userEvent.setup();
    const onOpenInFitting = vi.fn();

    render(<ClosetView onOpenInFitting={onOpenInFitting} />);

    // 1. Estado vacío inicial (sin botones de prendas de ejemplo)
    expect(await screen.findByText('Tu clóset está vacío')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ejemplo/i })).not.toBeInTheDocument();

    // 2. Añadir prendas reales del usuario al clóset
    await useClosetStore.getState().addGarment({
      category: 'tshirt',
      name: 'Camiseta básica de lino',
      brand: 'Norte',
      status: 'owned',
      elasticity: 0.05,
      formality: 2,
      tags: ['básico'],
      dominantColorHex: '#1F5F6B',
      sizes: [
        { label: 'S', flatMeasuresCm: { chestFlat: 46, shoulders: 42, backWidth: 39 } },
        { label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 } },
        { label: 'L', flatMeasuresCm: { chestFlat: 54, shoulders: 48, backWidth: 45 } },
      ],
    });
    await useClosetStore.getState().addGarment({
      category: 'pants',
      name: 'Pantalón chino recto',
      brand: 'Sur',
      status: 'wishlist',
      elasticity: 0.02,
      formality: 3,
      tags: ['oficina'],
      dominantColorHex: '#2B4263',
      sizes: [
        { label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 79 } },
      ],
    });

    expect(await screen.findByText('Camiseta básica de lino')).toBeInTheDocument();
    expect(screen.getByText('Pantalón chino recto')).toBeInTheDocument();

    // 3. Filtrar por estado "Lista de deseos"
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'wishlist');
    expect(screen.queryByText('Camiseta básica de lino')).not.toBeInTheDocument();
    expect(screen.getByText('Pantalón chino recto')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'all');

    // 4. Antes de seleccionar prenda en el perchero, "Ver calce y tallas" no aparece
    expect(screen.queryByRole('button', { name: /Ver calce y tallas/i })).not.toBeInTheDocument();

    // 5. Seleccionar la camiseta en el perchero -> se abre vista spotlight con talla sugerida M
    await user.click(screen.getByRole('button', { name: 'Seleccionar Camiseta básica de lino' }));
    const spotlight = await screen.findByTestId('closet-spotlight');
    expect(within(spotlight).getByTestId('spotlight-recommended-size')).toHaveTextContent(
      'Talla sugerida: M',
    );

    // 6. Pulsar "Ver calce y tallas" envía directamente al Probador con la prenda cargada
    await user.click(within(spotlight).getByRole('button', { name: /Ver calce y tallas/i }));
    expect(onOpenInFitting).toHaveBeenCalledTimes(1);
    expect(useFittingStore.getState().garmentName).toBe('Camiseta básica de lino');
    expect(useFittingStore.getState().garmentSizeLabel).toBe('M');

    // 7. Desde "Ficha y detalles" sigue disponible la vista completa con cambio de talla
    await user.click(within(spotlight).getByRole('button', { name: /Ficha y detalles/i }));
    const banner = await screen.findByTestId('recommended-size-banner');
    expect(banner).toHaveTextContent('Talla recomendada: M');
    await user.click(within(banner).getByRole('button', { name: 'L' }));
    expect(screen.getByText('Probador · Talla L')).toBeInTheDocument();
  }, 12_000);
});
