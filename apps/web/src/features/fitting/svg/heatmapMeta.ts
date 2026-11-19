import type { FitState } from '@luca/domain';

export const FIT_STATE_LABELS: Readonly<Record<FitState, string>> = {
  tense: 'Tenso',
  tight: 'Ajustado',
  regular: 'Regular',
  loose: 'Holgado',
  oversize: 'Oversize',
};

export const FIT_STATE_HEX: Readonly<Record<FitState, string>> = {
  tense: '#C2410C',
  tight: '#E0A526',
  regular: '#2A9D8F',
  loose: '#5B8DEF',
  oversize: '#7C6FD6',
};

export function getHeatmapPatternId(state: FitState, prefix = 'main'): string {
  return `luca-fit-pattern-${prefix}-${state}`;
}
