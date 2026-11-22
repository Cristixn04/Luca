import { memo, useId } from 'react';
import { GarmentCardPreviewSvg } from '@/features/fitting/GarmentCardPreviewSvg';
import { isLowerCategory } from '@/features/fitting/svg/FrontAvatarSvg';
import type { GarmentVisualMeta } from '@/features/fitting/svg/garmentVisuals';
import type { GarmentWithSizes } from './types';

export interface HangingGarmentVisualProps {
  item: GarmentWithSizes;
  className?: string;
}

/**
 * Representación visual de una prenda colgada de una percha de madera y gancho metálico.
 * - Prendas superiores y vestidos: percha anatómica de madera cálida bajo los hombros.
 * - Prendas inferiores (pantalón, short, falda): barra de madera con dos pinzas metálicas en cintura.
 * - Renderiza siempre la prenda digital a medida; la foto de referencia subida se inspecciona con el giro 3D.
 */
export const HangingGarmentVisual = memo(function HangingGarmentVisual({
  item,
  className = 'h-full w-full',
}: HangingGarmentVisualProps) {
  const uid = useId();
  const { garment } = item;
  const isLower = isLowerCategory(garment.category);
  const colorHex = garment.visualSpec?.primary_color_hex ?? garment.dominantColorHex ?? '#1F5F6B';

  const visualMeta: GarmentVisualMeta = {
    name: garment.name,
    pattern: garment.pattern,
    style: garment.style,
    tags: garment.tags,
    visualSpec: garment.visualSpec,
  };

  const woodGradId = `wood-${uid}`;
  const hookGradId = `hook-${uid}`;

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Percha con gancho cromado (la curva superior engancha exactamente sobre el riel metálico) */}
      <svg
        viewBox="0 0 180 62"
        className={`pointer-events-none relative w-[76%] shrink-0 overflow-visible ${
          isLower ? 'z-30' : 'z-10'
        }`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={woodGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ddb98c" />
            <stop offset="48%" stopColor="#b98754" />
            <stop offset="100%" stopColor="#855830" />
          </linearGradient>
          <linearGradient id={hookGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#777b82" />
            <stop offset="45%" stopColor="#f5f6f8" />
            <stop offset="100%" stopColor="#6c7077" />
          </linearGradient>
        </defs>

        {/* Gancho metálico curvado */}
        <path
          d="M90 27 L90 20 C90 12, 98 11, 98 5 C98 1, 93 -1, 88 0 C83 1, 81 5, 83 9"
          fill="none"
          stroke={`url(#${hookGradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Base roscada del gancho */}
        <rect x="87.5" y="25" width="5" height="5" rx="1.5" fill={`url(#${hookGradId})`} />

        {isLower ? (
          /* Percha de barra con pinzas metálicas para pantalones, shorts y faldas */
          <g>
            <path
              d="M34 39 C34 34, 42 32, 90 32 C138 32, 146 34, 146 39 L146 44 C146 47, 143 48, 140 48 L40 48 C37 48, 34 47, 34 44 Z"
              fill={`url(#${woodGradId})`}
              stroke="#6b4423"
              strokeWidth="0.9"
            />
            <path
              d="M42 36 Q90 34 138 36"
              fill="none"
              stroke="rgb(255 245 230 / 35%)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Pinza izquierda */}
            <rect
              x="51"
              y="44"
              width="9"
              height="16"
              rx="2"
              fill={`url(#${hookGradId})`}
              stroke="#52565c"
              strokeWidth="0.8"
            />
            {/* Pinza derecha */}
            <rect
              x="120"
              y="44"
              width="9"
              height="16"
              rx="2"
              fill={`url(#${hookGradId})`}
              stroke="#52565c"
              strokeWidth="0.8"
            />
          </g>
        ) : (
          /* Percha anatómica de madera para camisas, chaquetas, buzos y vestidos */
          <g>
            <path
              d="M90 29 C84 29, 77 32, 68 37 L24 54 C19 56, 19 61, 25 61 L41 61 C47 61, 56 54, 73 48 C83 45, 97 45, 107 48 C124 54, 133 61, 139 61 L155 61 C161 61, 161 56, 156 54 L112 37 C103 32, 96 29, 90 29 Z"
              fill={`url(#${woodGradId})`}
              stroke="#6b4423"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <path
              d="M28 55 L74 37 Q90 31 106 37 L152 55"
              fill="none"
              stroke="rgb(255 245 230 / 38%)"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/* Prenda digital colgando directamente de la percha (sin brecha de aire) */}
      <div
        className={`relative z-20 flex w-full flex-1 items-start justify-center ${
          isLower ? '-mt-8' : '-mt-11'
        }`}
      >
        <GarmentCardPreviewSvg
          category={garment.category}
          colorHex={colorHex}
          meta={visualMeta}
          className="h-full w-full"
        />
      </div>
    </div>
  );
});
