import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { FittingRoom } from '../FittingRoom';
import { DEFAULT_BODY_MEASUREMENTS, DEFAULT_GARMENT_PRESETS, useFittingStore } from '../store';

describe('Probador de calce M2 (T2.1 – T2.7)', () => {
  beforeEach(() => {
    useFittingStore.setState({
      unit: 'cm',
      hideNumbers: false,
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      garmentEnabled: true,
      garmentCategory: 'tshirt',
      garmentName: DEFAULT_GARMENT_PRESETS.tshirt.name,
      garmentSizeLabel: DEFAULT_GARMENT_PRESETS.tshirt.sizeLabel,
      garmentElasticity: DEFAULT_GARMENT_PRESETS.tshirt.elasticity,
      garmentFlatMeasures: { ...DEFAULT_GARMENT_PRESETS.tshirt.flatMeasuresCm },
      fitPreference: 'regular',
      showHeatmap: true,
    });
  });

  it('renderiza avatar de frente, plantilla de camiseta, mapa de calor y leyenda accesible', () => {
    const { container } = render(<FittingRoom />);

    expect(
      screen.getByRole('img', { name: /Avatar paramétrico de frente/i }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-avatar-body="front"]')).not.toBeNull();
    expect(container.querySelector('[data-garment="tshirt"]')).not.toBeNull();

    const chestZone = container.querySelector('[data-heatmap-zone="chest"]');
    expect(chestZone).toHaveAttribute('data-fit-state', 'regular');

    const legend = screen.getByLabelText('Leyenda del mapa de calor');
    expect(within(legend).getByText('Tenso')).toBeInTheDocument();
    expect(within(legend).getByText('Ajustado')).toBeInTheDocument();
    expect(within(legend).getByText('Regular')).toBeInTheDocument();
    expect(within(legend).getByText('Holgado')).toBeInTheDocument();
    expect(within(legend).getByText('Oversize')).toBeInTheDocument();
  });

  it('actualiza la holgura y el estado en tiempo real al modificar pecho en plano', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    const chestFlatInput = screen.getByLabelText('Pecho en plano');
    await user.clear(chestFlatInput);
    await user.type(chestFlatInput, '52');

    // 52 * 2 = 104; 104 - 92 = +12.0 cm -> loose (Holgado)
    const chestZone = container.querySelector('[data-heatmap-zone="chest"]');
    expect(chestZone).toHaveAttribute('data-fit-state', 'loose');
    expect(screen.getByText('+12.0 cm')).toBeInTheDocument();
  });

  it('cambia a plantilla de pantalón y evalúa cintura y cadera', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    await user.click(screen.getByRole('button', { name: 'Pantalón' }));

    expect(container.querySelector('[data-garment="pants"]')).not.toBeNull();
    expect(container.querySelector('[data-heatmap-zone="waist"]')).not.toBeNull();
    expect(container.querySelector('[data-heatmap-zone="hip"]')).not.toBeNull();
  });

  it('convierte medidas entre cm y pulgadas, oculta cifras y muestra estado de error si salen de rango', async () => {
    const user = userEvent.setup();
    render(<FittingRoom />);

    await user.click(screen.getByRole('button', { name: 'in' }));
    const chestInput = screen.getByLabelText('Pecho') as HTMLInputElement;
    expect(Number.parseFloat(chestInput.value)).toBeCloseTo(36.22, 1);

    await user.click(screen.getByRole('button', { name: 'Ocultar cifras' }));
    expect(chestInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: 'Mostrar cifras' }));
    await user.click(screen.getByRole('button', { name: 'cm' }));

    const heightInput = screen.getByLabelText('Altura');
    await user.clear(heightInput);
    await user.type(heightInput, '50');

    expect(
      screen.getByText(/Corrige las medidas fuera de rango para dibujar el avatar/i),
    ).toBeInTheDocument();
  });

  it('abre la guía de medición, cambia preferencia de calce y maneja el estado vacío de prenda', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    await user.click(screen.getByRole('button', { name: /Guía de medición/i }));
    expect(screen.getByText('Guía de medición corporal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Holgado' }));
    expect(screen.getByRole('button', { name: 'Holgado' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Quitar prenda del probador' }));
    expect(screen.getByText('Sin prenda activa en el probador')).toBeInTheDocument();
    expect(container.querySelector('[data-garment]')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Probar camiseta/i }));
    expect(container.querySelector('[data-garment="tshirt"]')).not.toBeNull();
  });
});
