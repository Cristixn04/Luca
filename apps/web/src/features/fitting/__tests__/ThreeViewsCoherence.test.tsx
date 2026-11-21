import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createBodyModel, evaluateGarmentFit } from '@luca/domain';
import { FittingRoom } from '../FittingRoom';
import { DEFAULT_BODY_MEASUREMENTS, DEFAULT_GARMENT_PRESETS, useFittingStore } from '../store';
import { AvatarViewer } from '../svg/AvatarViewer';

describe('Coherencia de las tres vistas y medidas opcionales (M5 · T5.1 – T5.7)', () => {
  beforeEach(() => {
    useFittingStore.setState({
      unit: 'cm',
      hideNumbers: false,
      bodyMeasurements: { ...DEFAULT_BODY_MEASUREMENTS },
      optionalMeasurements: {},
      viewMode: 'all',
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

  it('muestra el mismo estado de calce por zona compartida en frente, perfil y espalda (camiseta y pantalón)', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    // 1. Camiseta: hombros en las 3 vistas y pecho en frente + perfil
    const front = container.querySelector('[data-avatar-view="front"]')!;
    const side = container.querySelector('[data-avatar-view="side"]')!;
    const back = container.querySelector('[data-avatar-view="back"]')!;

    expect(front).not.toBeNull();
    expect(side).not.toBeNull();
    expect(back).not.toBeNull();

    const frontShoulders = front
      .querySelector('[data-heatmap-zone="shoulders"]')
      ?.getAttribute('data-fit-state');
    const sideShoulders = side
      .querySelector('[data-heatmap-zone="shoulders"]')
      ?.getAttribute('data-fit-state');
    const backShoulders = back
      .querySelector('[data-heatmap-zone="shoulders"]')
      ?.getAttribute('data-fit-state');

    expect(frontShoulders).toBe('regular');
    expect(sideShoulders).toBe(frontShoulders);
    expect(backShoulders).toBe(frontShoulders);

    const frontChest = front
      .querySelector('[data-heatmap-zone="chest"]')
      ?.getAttribute('data-fit-state');
    const sideChest = side
      .querySelector('[data-heatmap-zone="chest"]')
      ?.getAttribute('data-fit-state');
    expect(frontChest).toBe('regular');
    expect(sideChest).toBe(frontChest);

    // 2. Cambiar a Pantalón y forzar cintura ajustada/tensa -> las 3 vistas deben coincidir exactamente
    await user.click(screen.getByRole('button', { name: 'Panel de prenda' }));
    await user.click(screen.getByRole('button', { name: 'Pantalón' }));
    const waistFlat = screen.getByLabelText('Cintura en plano');
    await user.clear(waistFlat);
    await user.type(waistFlat, '35'); // 70 - 78 = -8 cm (con 5 % alivio +3.5 -> -4.5 -> tense)

    for (const zone of ['waist', 'hip'] as const) {
      const fState = container
        .querySelector(`[data-avatar-view="front"] [data-heatmap-zone="${zone}"]`)
        ?.getAttribute('data-fit-state');
      const sState = container
        .querySelector(`[data-avatar-view="side"] [data-heatmap-zone="${zone}"]`)
        ?.getAttribute('data-fit-state');
      const bState = container
        .querySelector(`[data-avatar-view="back"] [data-heatmap-zone="${zone}"]`)
        ?.getAttribute('data-fit-state');

      expect(fState).toBeTruthy();
      expect(sState).toBe(fState);
      expect(bState).toBe(fState);
    }

    expect(
      container
        .querySelector('[data-avatar-view="front"] [data-heatmap-zone="waist"]')
        ?.getAttribute('data-fit-state'),
    ).toBe('tense');
  });

  it('marca como "estimado" las vistas sin medidas opcionales y quita la marca al ingresarlas', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    expect(container.querySelector('[data-estimated-badge="front"]')).toHaveTextContent(
      'Torso: estimado',
    );
    expect(container.querySelector('[data-estimated-badge="side"]')).toHaveTextContent(
      'Fondo: estimado',
    );
    expect(container.querySelector('[data-estimated-badge="back"]')).toHaveTextContent(
      'Espalda: estimado',
    );

    // Abrir panel de medidas desde la barra vertical derecha y luego sección de medidas opcionales
    await user.click(screen.getByRole('button', { name: 'Panel de medidas' }));
    await user.click(screen.getByRole('button', { name: /Medidas opcionales/i }));
    await user.type(screen.getByLabelText('Largo de torso'), '50');
    await user.type(screen.getByLabelText('Fondo de pecho'), '23');
    await user.type(screen.getByLabelText('Fondo de cintura'), '20');
    await user.type(screen.getByLabelText('Fondo de cadera'), '25');
    await user.type(container.querySelector('#optional-backWidth') as HTMLElement, '41');
    await user.type(screen.getByLabelText('Largo de espalda'), '48');

    expect(container.querySelector('[data-estimated-badge="front"]')).toBeNull();
    expect(container.querySelector('[data-estimated-badge="side"]')).toBeNull();
    expect(container.querySelector('[data-estimated-badge="back"]')).toBeNull();
  }, 12_000);

  it('mantiene IDs únicos de patrones SVG cuando se muestran las 3 vistas simultáneamente', () => {
    const { container } = render(<FittingRoom />);
    const patterns = Array.from(container.querySelectorAll('pattern[id]'));
    const ids = patterns.map((el) => el.getAttribute('id'));
    const uniqueIds = new Set(ids);

    expect(ids.length).toBeGreaterThan(10);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('permite alternar vistas por botones y por gesto táctil horizontal (swipe)', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    await user.click(screen.getByRole('button', { name: 'Frente' }));
    expect(container.querySelector('[data-avatar-view="front"]')).not.toBeNull();
    expect(container.querySelector('[data-avatar-view="side"]')).toBeNull();

    const stage = screen.getByTestId('avatar-swipe-stage');

    // Deslizar a la izquierda: frente -> perfil
    fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 120 }] });
    expect(container.querySelector('[data-avatar-view="side"]')).not.toBeNull();

    // Deslizar a la izquierda: perfil -> espalda
    fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 120 }] });
    expect(container.querySelector('[data-avatar-view="back"]')).not.toBeNull();

    // Deslizar a la derecha: espalda -> perfil
    fireEvent.touchStart(stage, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 190 }] });
    expect(container.querySelector('[data-avatar-view="side"]')).not.toBeNull();
  });

  it('proyecta la foto frontal y trasera subida dentro de la silueta y rechaza URLs inseguras', () => {
    const model = createBodyModel({ required: DEFAULT_BODY_MEASUREMENTS });
    const fitReport = evaluateGarmentFit(model, {
      category: 'long_sleeve',
      sizeLabel: 'M',
      elasticity: 0.04,
      flatMeasuresCm: DEFAULT_GARMENT_PRESETS.long_sleeve.flatMeasuresCm,
    });
    const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgo=';

    const { container, rerender } = render(
      <AvatarViewer
        model={model}
        garmentCategory="long_sleeve"
        fitReport={fitReport}
        showHeatmap={false}
        garmentColorHex="#2F4858"
        garmentMeta={{
          name: 'Buzo urbano gris',
          imageUrl: fakeDataUrl,
          backImageUrl: fakeDataUrl,
        }}
        viewMode="all"
        onChangeViewMode={() => {}}
      />,
    );

    expect(container.querySelector('[data-garment-photo="front"]')).toHaveAttribute(
      'href',
      fakeDataUrl,
    );
    expect(container.querySelector('[data-garment-photo="back"]')).toHaveAttribute(
      'href',
      fakeDataUrl,
    );

    rerender(
      <AvatarViewer
        model={model}
        garmentCategory="dress"
        fitReport={fitReport}
        showHeatmap={false}
        garmentColorHex="#8B2635"
        garmentMeta={{
          name: 'Vestido midi',
          imageUrl: 'https://evil.example/tracker.png',
        }}
        viewMode="front"
        onChangeViewMode={() => {}}
      />,
    );

    expect(container.querySelector('[data-garment-photo="front"]')).toBeNull();
  });

  it('permite alternar entre maniquí Mujer y Hombre en las 3 vistas manteniendo el calce', async () => {
    const user = userEvent.setup();
    const { container } = render(<FittingRoom />);

    expect(
      container.querySelector('[data-avatar-view="front"]')?.getAttribute('data-mannequin-silhouette'),
    ).toBe('female');

    await user.click(screen.getByRole('button', { name: 'Hombre' }));
    expect(
      container.querySelector('[data-avatar-view="front"]')?.getAttribute('data-mannequin-silhouette'),
    ).toBe('male');
    expect(
      container.querySelector('[data-avatar-view="side"]')?.getAttribute('data-mannequin-silhouette'),
    ).toBe('male');
    expect(
      container.querySelector('[data-avatar-view="back"]')?.getAttribute('data-mannequin-silhouette'),
    ).toBe('male');

    await user.click(screen.getByRole('button', { name: 'Mujer' }));
    expect(
      container.querySelector('[data-avatar-view="front"]')?.getAttribute('data-mannequin-silhouette'),
    ).toBe('female');
  });

  it('aplica la ficha quirúrgica visualSpec (cuello en V, manga 3/4, cremallera y pantalones cargo)', () => {
    const model = createBodyModel({ required: DEFAULT_BODY_MEASUREMENTS });
    const upperFit = evaluateGarmentFit(model, {
      category: 'jacket',
      sizeLabel: 'M',
      elasticity: 0.03,
      flatMeasuresCm: DEFAULT_GARMENT_PRESETS.long_sleeve.flatMeasuresCm,
    });
    const lowerFit = evaluateGarmentFit(model, {
      category: 'pants',
      sizeLabel: '32',
      elasticity: 0.03,
      flatMeasuresCm: DEFAULT_GARMENT_PRESETS.pants.flatMeasuresCm,
    });

    const { container, rerender } = render(
      <AvatarViewer
        model={model}
        garmentCategory="jacket"
        fitReport={upperFit}
        showHeatmap={false}
        garmentColorHex="#3B4D3B"
        garmentMeta={{
          name: 'Chaqueta técnica',
          visualSpec: {
            neckline: 'v_neck',
            sleeve_length: 'three_quarter',
            garment_length: 'hip',
            fit_cut: 'relaxed',
            closure: 'zipper',
            pockets: 'patch',
            has_hood: false,
            has_ribbed_trim: true,
            has_lapels: true,
            has_pleats: false,
            secondary_color_hex: '#1F2937',
            accent_color_hex: '#D1D5DB',
            graphic_position: 'none',
            fabric_texture: 'smooth',
          },
        }}
        viewMode="front"
        onChangeViewMode={() => {}}
      />,
    );

    const upperNode = container.querySelector('[data-garment="jacket"]');
    expect(upperNode).toHaveAttribute('data-neckline', 'v_neck');
    expect(upperNode).toHaveAttribute('data-sleeve', 'three_quarter');
    expect(upperNode).toHaveAttribute('data-closure', 'zipper');

    rerender(
      <AvatarViewer
        model={model}
        garmentCategory="pants"
        fitReport={lowerFit}
        showHeatmap={false}
        garmentColorHex="#354F52"
        garmentMeta={{
          name: 'Pantalón cargo ancho',
          visualSpec: {
            neckline: 'none',
            sleeve_length: 'none',
            garment_length: 'ankle',
            fit_cut: 'wide_leg',
            closure: 'drawstring',
            pockets: 'cargo',
            has_hood: false,
            has_ribbed_trim: false,
            has_lapels: false,
            has_pleats: false,
            graphic_position: 'none',
            fabric_texture: 'smooth',
          },
        }}
        viewMode="front"
        onChangeViewMode={() => {}}
      />,
    );

    const lowerNode = container.querySelector('[data-garment="pants"]');
    expect(lowerNode).toHaveAttribute('data-fit-cut', 'wide_leg');
    expect(lowerNode).toHaveAttribute('data-pockets', 'cargo');
  });
});
