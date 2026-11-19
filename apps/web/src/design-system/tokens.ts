import type { FitState } from '@luca/domain';

export interface ThemePalette {
  readonly bg: string;
  readonly surface: string;
  readonly ink: string;
  readonly muted: string;
  readonly accent: string;
  readonly accentInk: string;
  readonly border: string;
}

export const COLOR_TOKENS = {
  light: {
    bg: '#FAF9F7',
    surface: '#FFFFFF',
    ink: '#1B1F23',
    muted: '#5B6670',
    accent: '#1F5F6B',
    accentInk: '#FFFFFF',
    border: '#E4E0DA',
  },
  dark: {
    bg: '#111315',
    surface: '#1A1D20',
    ink: '#ECEEF0',
    muted: '#9AA4AD',
    accent: '#5FB3C0',
    accentInk: '#111315',
    border: '#2A2F34',
  },
} as const satisfies Record<'light' | 'dark', ThemePalette>;

export interface HeatmapToken {
  readonly state: FitState;
  readonly label: string;
  readonly hex: string;
  readonly pattern: 'diagonal-stripes' | 'dots' | 'solid' | 'fine-dots' | 'grid';
  readonly patternLabel: string;
}

export const HEATMAP_TOKENS: readonly HeatmapToken[] = [
  {
    state: 'tense',
    label: 'Tenso',
    hex: '#C2410C',
    pattern: 'diagonal-stripes',
    patternLabel: 'Rayado diagonal',
  },
  {
    state: 'tight',
    label: 'Ajustado',
    hex: '#E0A526',
    pattern: 'dots',
    patternLabel: 'Puntos',
  },
  {
    state: 'regular',
    label: 'Regular',
    hex: '#2A9D8F',
    pattern: 'solid',
    patternLabel: 'Liso',
  },
  {
    state: 'loose',
    label: 'Holgado',
    hex: '#5B8DEF',
    pattern: 'fine-dots',
    patternLabel: 'Puntos finos',
  },
  {
    state: 'oversize',
    label: 'Oversize',
    hex: '#7C6FD6',
    pattern: 'grid',
    patternLabel: 'Cuadrícula',
  },
] as const;

export const TYPE_SCALE_PX = [12, 14, 16, 20, 24, 32] as const;
export const RADII_PX = { sm: 8, md: 12 } as const;
