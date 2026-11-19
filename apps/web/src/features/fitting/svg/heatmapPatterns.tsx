import { getHeatmapPatternId } from './heatmapMeta';

export function HeatmapPatternDefs({ prefix = 'main' }: { prefix?: string }) {
  return (
    <defs>
      {/* Tenso: rayado diagonal */}
      <pattern
        id={getHeatmapPatternId('tense', prefix)}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill="#C2410C" fillOpacity="0.22" />
        <line x1="0" y1="0" x2="0" y2="8" stroke="#C2410C" strokeWidth="2.5" strokeOpacity="0.72" />
      </pattern>

      {/* Ajustado: puntos */}
      <pattern
        id={getHeatmapPatternId('tight', prefix)}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <rect width="8" height="8" fill="#E0A526" fillOpacity="0.22" />
        <circle cx="4" cy="4" r="1.6" fill="#E0A526" fillOpacity="0.85" />
      </pattern>

      {/* Regular: liso */}
      <pattern
        id={getHeatmapPatternId('regular', prefix)}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <rect width="8" height="8" fill="#2A9D8F" fillOpacity="0.26" />
      </pattern>

      {/* Holgado: puntos finos */}
      <pattern
        id={getHeatmapPatternId('loose', prefix)}
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <rect width="6" height="6" fill="#5B8DEF" fillOpacity="0.2" />
        <circle cx="3" cy="3" r="0.95" fill="#5B8DEF" fillOpacity="0.82" />
      </pattern>

      {/* Oversize: cuadrícula */}
      <pattern
        id={getHeatmapPatternId('oversize', prefix)}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
      >
        <rect width="8" height="8" fill="#7C6FD6" fillOpacity="0.2" />
        <path
          d="M 8 0 L 0 0 0 8"
          fill="none"
          stroke="#7C6FD6"
          strokeWidth="1.1"
          strokeOpacity="0.7"
        />
      </pattern>
    </defs>
  );
}
