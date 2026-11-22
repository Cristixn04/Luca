import { memo, useId } from 'react';
import type { GarmentCategory } from '@luca/domain';
import {
  resolveGarmentAccentStroke,
  resolveGarmentButtonColor,
  resolveGarmentSeamColor,
  resolveLowerBlueprint,
  resolveUpperBlueprint,
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
  const patId = `preview-pat-${category}-${uid}`;
  const clipId = `preview-clip-${category}-${uid}`;

  const isLower = category === 'pants' || category === 'shorts' || category === 'skirt';
  const upperBp = !isLower ? resolveUpperBlueprint(category, meta) : null;
  const lowerBp = isLower ? resolveLowerBlueprint(category, meta) : null;

  const primaryHex = upperBp?.primaryColorHex ?? lowerBp?.primaryColorHex ?? colorHex;
  const secondaryHex = upperBp?.secondaryColorHex ?? lowerBp?.secondaryColorHex;
  const accentHex = upperBp?.accentColorHex ?? lowerBp?.accentColorHex;
  const patternType = upperBp?.patternType ?? lowerBp?.patternType ?? 'solid';
  const stripeDensity = upperBp?.stripeDensity ?? lowerBp?.stripeDensity ?? 'medium';
  const colorblockLayout = upperBp?.colorblockLayout ?? 'none';

  const stroke = resolveGarmentAccentStroke(primaryHex);
  const seam = resolveGarmentSeamColor(primaryHex);
  const buttonCol = accentHex ?? resolveGarmentButtonColor(primaryHex);
  const stripeColor = secondaryHex ?? 'rgb(255 255 255 / 35%)';
  const stripeStep = stripeDensity === 'fine' ? 7 : stripeDensity === 'wide' ? 16 : 11;
  const hasPattern =
    patternType === 'horizontal_stripes' ||
    patternType === 'vertical_stripes' ||
    patternType === 'plaid' ||
    patternType === 'dots' ||
    patternType === 'ribbed';

  const isHoodie = Boolean(upperBp?.hasHood);
  const isVNeck = upperBp?.neckline === 'v_neck';
  const isTurtleneck = upperBp?.neckline === 'turtleneck';
  const isCollar = upperBp?.neckline === 'shirt_collar' || upperBp?.neckline === 'polo';
  const isSleeveless = upperBp?.sleeveLength === 'sleeveless';

  const mainPath = (() => {
    if (category === 'tshirt') {
      if (isSleeveless) {
        return 'M45 18 Q60 32 75 18 L84 22 L85 112 Q60 116 35 112 L36 22 Z';
      }
      return isVNeck
        ? 'M44 18 L60 35 L76 18 L92 24 L108 46 L94 56 L86 45 L86 112 Q60 116 34 112 L34 45 L26 56 L12 46 L28 24 Z'
        : 'M44 18 Q60 28 76 18 L92 24 L108 46 L94 56 L86 45 L86 112 Q60 116 34 112 L34 45 L26 56 L12 46 L28 24 Z';
    }
    if (category === 'long_sleeve') {
      return isVNeck
        ? 'M45 18 L60 34 L75 18 L90 24 L109 86 L97 90 L85 48 L85 112 Q60 116 35 112 L35 48 L23 90 L11 86 L30 24 Z'
        : 'M45 18 Q60 27 75 18 L90 24 L109 86 L97 90 L85 48 L85 112 Q60 116 35 112 L35 48 L23 90 L11 86 L30 24 Z';
    }
    if (category === 'jacket') {
      return 'M44 16 Q60 24 76 16 L92 22 L110 88 L97 92 L86 48 L87 114 L33 114 L34 48 L23 92 L10 88 L28 22 Z';
    }
    if (category === 'dress') {
      return 'M45 14 Q60 27 75 14 L87 22 L95 40 L84 44 L78 36 L75 56 C84 74, 92 98, 96 118 Q60 124 24 118 C28 98, 36 74, 45 56 L42 36 L36 44 L25 40 L33 22 Z';
    }
    if (category === 'pants') {
      const wide = lowerBp?.fitCut === 'wide_leg' || lowerBp?.fitCut === 'oversized';
      return wide
        ? 'M37 16 L83 16 L88 46 L93 118 L65 118 L60 56 L55 118 L27 118 L32 46 Z'
        : 'M38 16 L82 16 L86 46 L83 118 L65 118 L60 56 L55 118 L37 118 L34 46 Z';
    }
    if (category === 'shorts') {
      return 'M36 22 L84 22 L90 54 L88 86 L64 86 L60 60 L56 86 L32 86 L30 54 Z';
    }
    // skirt
    const midi = lowerBp?.garmentLength === 'midi' || lowerBp?.garmentLength === 'maxi';
    return midi
      ? 'M42 18 Q60 22 78 18 L94 112 Q60 118 26 112 Z'
      : 'M40 22 Q60 26 80 22 L94 94 Q60 100 26 94 Z';
  })();

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
        <clipPath id={clipId}>
          <path d={mainPath} />
        </clipPath>
        {hasPattern && patternType === 'horizontal_stripes' && (
          <pattern id={patId} width="20" height={stripeStep} patternUnits="userSpaceOnUse">
            <rect width="20" height={stripeStep * 0.38} fill={stripeColor} opacity="0.84" />
          </pattern>
        )}
        {hasPattern && patternType === 'vertical_stripes' && (
          <pattern id={patId} width={stripeStep} height="20" patternUnits="userSpaceOnUse">
            <rect width={stripeStep * 0.34} height="20" fill={stripeColor} opacity="0.82" />
          </pattern>
        )}
        {hasPattern && patternType === 'plaid' && (
          <pattern id={patId} width={stripeStep * 1.4} height={stripeStep * 1.4} patternUnits="userSpaceOnUse">
            <rect width={stripeStep * 1.4} height={stripeStep * 0.28} fill={stripeColor} opacity="0.65" />
            <rect width={stripeStep * 0.28} height={stripeStep * 1.4} fill={stripeColor} opacity="0.65" />
          </pattern>
        )}
        {hasPattern && patternType === 'dots' && (
          <pattern id={patId} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.7" fill={stripeColor} opacity="0.86" />
            <circle cx="9.5" cy="9.5" r="1.7" fill={stripeColor} opacity="0.86" />
          </pattern>
        )}
        {hasPattern && patternType === 'ribbed' && (
          <pattern id={patId} width="4" height="12" patternUnits="userSpaceOnUse">
            <line x1="1" y1="0" x2="1" y2="12" stroke="rgb(255 255 255 / 16%)" strokeWidth="0.8" />
            <line x1="2.8" y1="0" x2="2.8" y2="12" stroke="rgb(0 0 0 / 15%)" strokeWidth="0.8" />
          </pattern>
        )}
      </defs>

      {/* Capucha superior */}
      {isHoodie && (
        <path
          d="M42 20 C39 8, 52 5, 60 8 C68 5, 81 8, 78 20 Q60 28 42 20 Z"
          fill={secondaryHex ?? primaryHex}
          stroke={stroke}
          strokeWidth="1.3"
        />
      )}

      {/* Cuello alto / turtleneck */}
      {isTurtleneck && (
        <path
          d="M48 20 L48 10 Q60 8 72 10 L72 20 Q60 25 48 20 Z"
          fill={upperBp?.collarContrast && secondaryHex ? secondaryHex : primaryHex}
          stroke={stroke}
          strokeWidth="1.2"
        />
      )}

      {/* Silueta base */}
      <path d={mainPath} fill={primaryHex} />

      {/* Bloques de color (colorblock) */}
      {!isLower && secondaryHex && colorblockLayout !== 'none' && (
        <g clipPath={`url(#${clipId})`}>
          {colorblockLayout === 'raglan_sleeves' && (
            <>
              <rect x="0" y="0" width="35" height="132" fill={secondaryHex} />
              <rect x="85" y="0" width="35" height="132" fill={secondaryHex} />
            </>
          )}
          {colorblockLayout === 'top_bottom_split' && (
            <rect x="0" y="64" width="120" height="68" fill={secondaryHex} />
          )}
          {colorblockLayout === 'chest_band' && (
            <rect x="0" y="42" width="120" height="20" fill={secondaryHex} />
          )}
          {colorblockLayout === 'side_panels' && (
            <>
              <rect x="30" y="34" width="10" height="86" fill={secondaryHex} />
              <rect x="80" y="34" width="10" height="86" fill={secondaryHex} />
            </>
          )}
        </g>
      )}

      {/* Patrón simple (rayas, cuadros, lunares, canalé) */}
      {hasPattern && <path d={mainPath} fill={`url(#${patId})`} />}

      {/* Volumen de luz de estudio */}
      <path d={mainPath} fill={`url(#${gradId})`} />

      {/* Contorno nítido */}
      <path d={mainPath} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />

      {/* Detalles de confección (cuellos, cierres, botones, bolsillos, cintura) */}
      {!isLower && (
        <g pointerEvents="none">
          {isCollar && (
            <path
              d="M45 18 L54 31 L60 24 L66 31 L75 18"
              fill={upperBp?.collarContrast && secondaryHex ? secondaryHex : primaryHex}
              stroke={stroke}
              strokeWidth="1.15"
              strokeLinejoin="round"
            />
          )}
          {upperBp?.hasLapels && (
            <path
              d="M44 16 L49 44 L60 54 L71 44 L76 16"
              fill="rgb(0 0 0 / 8%)"
              stroke={stroke}
              strokeWidth="1.2"
            />
          )}
          {upperBp?.closure === 'zipper' && (
            <line x1="60" y1="24" x2="60" y2="112" stroke={buttonCol} strokeWidth="1.4" strokeDasharray="2 1.2" />
          )}
          {upperBp?.closure === 'buttons' && (
            <>
              <line x1="60" y1="25" x2="60" y2={category === 'tshirt' ? 46 : 110} stroke={seam} strokeWidth="1" />
              {[32, 46, 60, 74, 88].slice(0, category === 'tshirt' ? 2 : 5).map((by) => (
                <circle key={by} cx="60" cy={by} r="1.45" fill={buttonCol} />
              ))}
            </>
          )}
          {upperBp?.pockets === 'kangaroo' && (
            <path
              d="M44 82 L76 82 L80 102 L40 102 Z"
              fill="rgb(0 0 0 / 8%)"
              stroke={seam}
              strokeWidth="1.1"
            />
          )}
          {upperBp?.pockets === 'chest' && (
            <rect x="66" y="42" width="12" height="13" rx="1.5" fill="rgb(0 0 0 / 6%)" stroke={seam} strokeWidth="1" />
          )}
          {upperBp?.hasRibbedTrim && category !== 'dress' && (
            <rect x="35" y="106" width="50" height="6" rx="1" fill="rgb(0 0 0 / 10%)" stroke={seam} strokeWidth="0.8" />
          )}
          {isHoodie && (
            <>
              <line x1="55" y1="25" x2="55" y2="45" stroke={buttonCol} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="65" y1="25" x2="65" y2="45" stroke={buttonCol} strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}

      {isLower && (
        <g pointerEvents="none">
          <line x1="38" y1="24" x2="82" y2="24" stroke={seam} strokeWidth="1.15" />
          {category !== 'skirt' && <line x1="60" y1="24" x2="60" y2="52" stroke={seam} strokeWidth="1.1" />}
          {lowerBp?.pockets === 'cargo' && (
            <>
              <rect x="33" y="54" width="9" height="14" rx="1.5" fill="rgb(0 0 0 / 8%)" stroke={seam} strokeWidth="0.9" />
              <rect x="78" y="54" width="9" height="14" rx="1.5" fill="rgb(0 0 0 / 8%)" stroke={seam} strokeWidth="0.9" />
            </>
          )}
          {category === 'skirt' && lowerBp?.hasPleats && (
            <>
              <line x1="50" y1="28" x2="45" y2="94" stroke={seam} strokeWidth="0.9" opacity="0.7" />
              <line x1="60" y1="28" x2="60" y2="96" stroke={seam} strokeWidth="0.9" opacity="0.7" />
              <line x1="70" y1="28" x2="75" y2="94" stroke={seam} strokeWidth="0.9" opacity="0.7" />
            </>
          )}
        </g>
      )}
    </svg>
  );
});
