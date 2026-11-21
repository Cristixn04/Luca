import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useClosetStore } from '@/features/closet/closetStore';
import { FittingRoom } from '../FittingRoom';
import { DEFAULT_BODY_MEASUREMENTS, DEFAULT_GARMENT_PRESETS, useFittingStore } from '../store';

describe('Probador de calce M2 (T2.1 – T2.7)', () => {
  beforeEach(() => {
    useClosetStore.setState({ items: [], loaded: true });
    useFittingStore.setState({
      unit: 'cm',
      hideNumbers: false,
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      garmentEnabled: true,
      garmentSource: 'quick',
      selectedClosetGarmentId: null,
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
    expect(screen.getByText(/Sin prenda activa en el probador/i)).toBeInTheDocument();
    expect(container.querySelector('[data-garment]')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Probar camiseta/i }));
    expect(container.querySelector('[data-garment="tshirt"]')).not.toBeNull();
  });

  it('muestra desplegable con prendas guardadas del clóset y opción aparte de prenda rápida editable', async () => {
    const user = userEvent.setup();
    const now = '2026-11-20T10:00:00.000Z';
    useClosetStore.setState({
      loaded: true,
      items: [
        {
          garment: {
            id: 'g-shirt',
            category: 'tshirt',
            name: 'Camisa Oxford Blanca',
            brand: 'Norte',
            status: 'owned',
            elasticity: 0.05,
            formality: 3,
            tags: ['oficina'],
            dominantColorHex: '#F3EFE6',
            createdAt: now,
            updatedAt: now,
          },
          sizes: [
            {
              id: 's-m',
              garmentId: 'g-shirt',
              label: 'M',
              flatMeasuresCm: { chestFlat: 50, shoulders: 45 },
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 's-l',
              garmentId: 'g-shirt',
              label: 'L',
              flatMeasuresCm: { chestFlat: 54, shoulders: 47 },
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
        {
          garment: {
            id: 'g-pants',
            category: 'pants',
            name: 'Jean Recto Azul',
            brand: 'Sur',
            status: 'owned',
            elasticity: 0.02,
            formality: 2,
            tags: ['denim'],
            dominantColorHex: '#1F3A68',
            createdAt: now,
            updatedAt: now,
          },
          sizes: [
            {
              id: 's-32',
              garmentId: 'g-pants',
              label: '32',
              flatMeasuresCm: { waistFlat: 41, hipFlat: 52 },
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ],
    });

    const { container } = render(<FittingRoom />);

    // Modo Mi clóset activo automáticamente: selector desplegable, sin input de texto libre "Nombre"
    const garmentSelect = await screen.findByLabelText('Prenda guardada');
    expect(garmentSelect).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();

    // Seleccionar otra prenda guardada del desplegable cambia el avatar a pantalón
    await user.selectOptions(garmentSelect, 'g-pants');
    expect(container.querySelector('[data-garment="pants"]')).not.toBeNull();

    // Cambiar a Prenda rápida habilita edición libre del nombre
    await user.click(screen.getByRole('button', { name: /Prenda rápida/i }));
    const nameInput = screen.getByLabelText('Nombre');
    expect(nameInput).toBeInTheDocument();
    await user.clear(nameInput);
    await user.type(nameInput, 'Prueba tienda');
    expect((nameInput as HTMLInputElement).value).toBe('Prueba tienda');
  });

  it('muestra ambos carruseles espaciales (superior e inferior) y permite combinar prendas sobre el maniquí', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    const upperCarousel = container.querySelector('[data-spatial-carousel="upper"]');
    const lowerCarousel = container.querySelector('[data-spatial-carousel="lower"]');
    expect(upperCarousel).not.toBeNull();
    expect(lowerCarousel).not.toBeNull();

    // Seleccionar un pantalón desde el carrusel inferior mientras la camiseta está activa combina ambas capas
    const pantsCard = within(lowerCarousel as HTMLElement).getByRole('option', {
      name: /Seleccionar Pantalón recto \(inferior\)/i,
    });
    await user.click(pantsCard);

    expect(container.querySelector('[data-garment="tshirt"]')).not.toBeNull();
    expect(container.querySelector('[data-garment="pants"]')).not.toBeNull();

    // Seleccionar un vestido desde el carrusel superior reemplaza la capa inferior
    const dressCard = within(upperCarousel as HTMLElement).getByRole('option', {
      name: /Seleccionar Vestido midi \(superior\)/i,
    });
    await user.click(dressCard);

    expect(container.querySelector('[data-garment="dress"]')).not.toBeNull();
    expect(container.querySelector('[data-garment="pants"]')).toBeNull();
  });
});
