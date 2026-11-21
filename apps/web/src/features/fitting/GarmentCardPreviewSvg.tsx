import { memo, useId } from 'react';
import type { GarmentCategory } from '@luca/domain';
import {
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  type GarmentVisualMeta,
} from './svg/garmentVisuals';

export interface GarmentCardPreviewSvgProps {
  category: GarmentCategory;
  colorHex?: string;
  meta?: GarmentVisualMeta;
  className?: string;
}

export const GarmentCardPreviewSvg = memo(function GarmentCardPreviewSvg({
  category,
  colorHex = '#1F5F6B',
  meta,
  className = 'h-full w-full',
}: GarmentCardPreviewSvgProps) {
  const uid = useId();
  const gradId = `preview-shade-${category}-${uid}`;
  const stroke = resolveGarmentAccentStroke(colorHex);
  const seam = resolveGarmentSeamColor(colorHex);
  const isHoodie =
    meta?.visualSpec?.has_hood ||
    /\b(hoodie|buzo|capucha|sudadera)\b/i.test(`${meta?.name ?? ''} ${(meta?.tags ?? []).join(' ')}`);

  return (
    <svg
      viewBox="0 0 120 132"
      className={className}
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 12px 12px rgba(40, 30, 20, 0.22))' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(0 0 0 / 16%)" />
          <stop offset="28%" stopColor="rgb(255 255 255 / 14%)" />
          <stop offset="56%" stopColor="rgb(255 255 255 / 4%)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 20%)" />
        </linearGradient>
      </defs>

      {category === 'tshirt' && (
        <g>
          <path
            d="M44 18 Q60 28 76 18 L92 24 L108 46 L94 56 L86 45 L86 112 Q60 116 34 112 L34 45 L26 56 L12 46 L28 24 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M44 18 Q60 28 76 18 L92 24 L108 46 L94 56 L86 45 L86 112 Q60 116 34 112 L34 45 L26 56 L12 46 L28 24 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M44 21 Q60 31 76 21" fill="none" stroke={seam} strokeWidth="1.2" />
        </g>
      )}

      {category === 'long_sleeve' && (
        <g>
          {isHoodie && (
            <path
              d="M42 20 C39 8, 52 5, 60 8 C68 5, 81 8, 78 20 Q60 28 42 20 Z"
              fill={colorHex}
              stroke={stroke}
              strokeWidth="1.3"
            />
          )}
          <path
            d="M45 18 Q60 27 75 18 L90 24 L109 86 L97 90 L85 48 L85 112 Q60 116 35 112 L35 48 L23 90 L11 86 L30 24 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M45 18 Q60 27 75 18 L90 24 L109 86 L97 90 L85 48 L85 112 Q60 116 35 112 L35 48 L23 90 L11 86 L30 24 Z"
            fill={`url(#${gradId})`}
          />
          {!isHoodie && <line x1="60" y1="24" x2="60" y2="112" stroke={seam} strokeWidth="1.1" />}
          {isHoodie && (
            <path
              d="M44 82 L76 82 L80 102 L40 102 Z"
              fill="rgb(0 0 0 / 8%)"
              stroke={seam}
              strokeWidth="1.1"
            />
          )}
        </g>
      )}

      {category === 'jacket' && (
        <g>
          <path
            d="M44 16 Q60 24 76 16 L92 22 L110 88 L97 92 L86 48 L87 114 L62 114 L62 34 L58 34 L58 114 L33 114 L34 48 L23 92 L10 88 L28 22 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M44 16 Q60 24 76 16 L92 22 L110 88 L97 92 L86 48 L87 114 L33 114 L34 48 L23 92 L10 88 L28 22 Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M44 16 L49 44 L60 54 L71 44 L76 16"
            fill="rgb(0 0 0 / 8%)"
            stroke={stroke}
            strokeWidth="1.2"
          />
          <line x1="60" y1="54" x2="60" y2="114" stroke={stroke} strokeWidth="1.3" />
        </g>
      )}

      {category === 'dress' && (
        <g>
          <path
            d="M45 14 Q60 27 75 14 L87 22 L95 40 L84 44 L78 36 L75 56 C84 74, 92 98, 96 118 Q60 124 24 118 C28 98, 36 74, 45 56 L42 36 L36 44 L25 40 L33 22 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M45 14 Q60 27 75 14 L87 22 L95 40 L84 44 L78 36 L75 56 C84 74, 92 98, 96 118 Q60 124 24 118 C28 98, 36 74, 45 56 L42 36 L36 44 L25 40 L33 22 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M45 56 Q60 60 75 56" fill="none" stroke={seam} strokeWidth="1.15" />
          <path d="M48 62 Q43 90 40 118" fill="none" stroke={seam} strokeWidth="0.9" opacity="0.7" />
          <path d="M72 62 Q77 90 80 118" fill="none" stroke={seam} strokeWidth="0.9" opacity="0.7" />
        </g>
      )}

      {category === 'pants' && (
        <g>
          <path
            d="M36 16 Q60 20 84 16 L88 48 L84 118 L66 118 L60 56 L54 118 L36 118 L32 48 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M36 16 Q60 20 84 16 L88 48 L84 118 L66 118 L60 56 L54 118 L36 118 L32 48 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M36 25 Q60 28 84 25" fill="none" stroke={seam} strokeWidth="1.1" />
          <line x1="60" y1="26" x2="60" y2="52" stroke={seam} strokeWidth="1.1" />
        </g>
      )}

      {category === 'shorts' && (
        <g>
          <path
            d="M34 28 Q60 32 86 28 L92 86 L65 88 L60 66 L55 88 L28 86 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M34 28 Q60 32 86 28 L92 86 L65 88 L60 66 L55 88 L28 86 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M34 37 Q60 40 86 37" fill="none" stroke={seam} strokeWidth="1.1" />
          <line x1="60" y1="38" x2="60" y2="62" stroke={seam} strokeWidth="1.1" />
        </g>
      )}

      {category === 'skirt' && (
        <g>
          <path
            d="M40 22 Q60 26 80 22 C86 48, 94 78, 98 106 Q60 113 22 106 C26 78, 34 48, 40 22 Z"
            fill={colorHex}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M40 22 Q60 26 80 22 C86 48, 94 78, 98 106 Q60 113 22 106 C26 78, 34 48, 40 22 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M40 30 Q60 33 80 30" fill="none" stroke={seam} strokeWidth="1.1" />
          <path d="M48 34 Q44 70 40 106" fill="none" stroke={seam} strokeWidth="0.95" opacity="0.65" />
          <path d="M72 34 Q76 70 80 106" fill="none" stroke={seam} strokeWidth="0.95" opacity="0.65" />
        </g>
      )}
    </svg>
  );
});
