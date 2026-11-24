import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createBodyModel } from '@luca/domain';
import { DEFAULT_BODY_MEASUREMENTS } from '../../store';
import { useColorStore } from '@/features/color/colorStore';
import { resolveAvatarPalette } from '../avatarPalette';
import { FrontAvatarSvg } from '../FrontAvatarSvg';
import { SideAvatarSvg } from '../SideAvatarSvg';
import { BackAvatarSvg } from '../BackAvatarSvg';

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

describe('avatarPalette y sincronización en vivo con el apartado Color', () => {
  beforeEach(() => {
    useColorStore.setState({
      profile: null,
      draftSwatches: null,
      loaded: true,
    });
  });

  it('deriva tokens válidos de piel, cabello, cejas e iris desde tonos muy claros hasta profundos', () => {
    const light = resolveAvatarPalette({
      skinHex: '#F3D6C6',
      hairHex: '#D8B778',
      eyeHex: '#5B87B0',
    });
    const deep = resolveAvatarPalette({
      skinHex: '#5A3422',
      hairHex: '#181412',
      eyeHex: '#2F6F4E',
    });

    for (const palette of [light, deep]) {
      expect(palette.skinHighlight).toMatch(HEX_PATTERN);
      expect(palette.skinMid).toMatch(HEX_PATTERN);
      expect(palette.skinShadow).toMatch(HEX_PATTERN);
      expect(palette.hairDark).toMatch(HEX_PATTERN);
      expect(palette.hairMid).toMatch(HEX_PATTERN);
      expect(palette.hairHighlight).toMatch(HEX_PATTERN);
      expect(palette.browColor).toMatch(HEX_PATTERN);
      expect(palette.irisBase).toMatch(HEX_PATTERN);
      expect(palette.irisRim).toMatch(HEX_PATTERN);
      expect(palette.irisGlow).toMatch(HEX_PATTERN);
    }

    expect(light.skinMid).toBe('#f3d6c6');
    expect(light.irisBase).toBe('#5b87b0');
    expect(deep.skinMid).toBe('#5a3422');
    expect(deep.irisBase).toBe('#2f6f4e');
    // Cejas en cabello rubio claro deben mantenerse más oscuras que el cabello base para legibilidad
    expect(light.browColor).not.toBe(light.hairMid);
  });

  it('respalda valores hex inválidos sin romper el renderizado', () => {
    const fallback = resolveAvatarPalette({
      skinHex: 'invalid',
      hairHex: '',
      eyeHex: '#xyz',
    });

    expect(fallback.skinMid).toMatch(HEX_PATTERN);
    expect(fallback.hairMid).toMatch(HEX_PATTERN);
    expect(fallback.irisBase).toMatch(HEX_PATTERN);
  });

  it('aplica los colores seleccionados en Color en tiempo real sobre Frente, Perfil y Espalda', () => {
    const model = createBodyModel({ required: DEFAULT_BODY_MEASUREMENTS });

    const { container: frontC } = render(
      <FrontAvatarSvg
        model={model}
        garmentCategory="tshirt"
        fitReport={null}
        showHeatmap={false}
      />,
    );
    const { container: sideC } = render(
      <SideAvatarSvg
        model={model}
        garmentCategory="tshirt"
        fitReport={null}
        showHeatmap={false}
      />,
    );
    const { container: backC } = render(
      <BackAvatarSvg
        model={model}
        garmentCategory="tshirt"
        fitReport={null}
        showHeatmap={false}
      />,
    );

    act(() => {
      useColorStore.getState().setDraftSwatches({
        skinHex: '#8D5538',
        hairHex: '#D8B778',
        eyeHex: '#3B7EA1',
      });
    });

    for (const c of [frontC, sideC, backC]) {
      const svg = c.querySelector('svg') as SVGSVGElement;
      expect(svg).not.toBeNull();
      expect(svg.style.getPropertyValue('--mannequin-mid')).toBe('#8d5538');
      expect(svg.style.getPropertyValue('--avatar-hair-mid')).toBe('#d8b778');
      expect(svg.style.getPropertyValue('--avatar-iris')).toBe('#3b7ea1');
    }

    // Verifica que la cabeza esculpida está presente en las 3 vistas
    expect(frontC.querySelector('[data-editorial-head="front"]')).not.toBeNull();
    expect(sideC.querySelector('[data-editorial-head="side"]')).not.toBeNull();
    expect(backC.querySelector('[data-editorial-head="back"]')).not.toBeNull();
  });
});
