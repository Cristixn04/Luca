import type { FitReport, ZoneFitResult } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentButtonColor,
  resolveGarmentSeamColor,
  resolveLowerSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export type LowerGarmentVariant = 'pants' | 'shorts' | 'skirt';

export interface PantsTemplateProps {
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  garmentMeta?: GarmentVisualMeta;
  patternPrefix?: string;
  variant?: LowerGarmentVariant;
}

function findZone(report: FitReport, zone: 'waist' | 'hip'): ZoneFitResult | undefined {
  return report.evaluatedZones.find((item) => item.zone === zone);
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function PantsTemplate({
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix = 'front',
  variant = 'pants',
}: PantsTemplateProps) {
  const waistZone = findZone(fitReport, 'waist');
  const hipZone = findZone(fitReport, 'hip');

  const waistOffset = waistZone ? clampVisualEaseOffsetPx(waistZone.easeCm, anchors.scale) : 3;
  const hipOffset = hipZone ? clampVisualEaseOffsetPx(hipZone.easeCm, anchors.scale) : 4;

  const subtype = resolveLowerSubtype(variant, garmentMeta);
  const cx = anchors.centerX;
  const wHalf = Math.max(anchors.waistHalfW * 0.9, anchors.waistHalfW + waistOffset);
  const hHalf = Math.max(anchors.hipHalfW * 0.92, anchors.hipHalfW + hipOffset);
  const legLength = anchors.ankleY - anchors.crotchY;
  const shortHemY = anchors.crotchY + legLength * 0.28;
  const skirtHemY =
    subtype === 'skirt_mini'
      ? anchors.crotchY + legLength * 0.26
      : subtype === 'skirt_maxi'
        ? anchors.ankleY - 12
        : anchors.crotchY + legLength * 0.54;
  const pantsHemY = anchors.ankleY - 6;
  const ankleOuter = Math.max(anchors.ankleHalfW + 10, hHalf * 0.56);
  const kneeOuter = Math.max(ankleOuter + 3, hHalf * 0.72);
  const shortOuter = Math.max(hHalf * 0.88, ankleOuter + 6);
  const innerGap = 4.5;
  const skirtFlare = subtype === 'skirt_maxi' ? 16 : subtype === 'skirt_mini' ? 6 : 11;

  const garmentPath =
    variant === 'skirt'
      ? [
          `M ${cx - wHalf} ${anchors.waistY}`,
          `Q ${cx} ${anchors.waistY + 3} ${cx + wHalf} ${anchors.waistY}`,
          `C ${cx + hHalf + 2} ${anchors.hipY - 4}, ${cx + hHalf + skirtFlare} ${skirtHemY - 28}, ${cx + hHalf + skirtFlare} ${skirtHemY}`,
          `Q ${cx} ${skirtHemY + 6} ${cx - hHalf - skirtFlare} ${skirtHemY}`,
          `C ${cx - hHalf - skirtFlare} ${skirtHemY - 28}, ${cx - hHalf - 2} ${anchors.hipY - 4}, ${cx - wHalf} ${anchors.waistY}`,
          'Z',
        ].join(' ')
      : variant === 'shorts'
        ? [
            `M ${cx - wHalf} ${anchors.waistY}`,
            `Q ${cx} ${anchors.waistY + 2.5} ${cx + wHalf} ${anchors.waistY}`,
            `C ${cx + hHalf + 2} ${anchors.hipY - 4}, ${cx + hHalf + 1} ${anchors.crotchY - 4}, ${cx + hHalf} ${anchors.crotchY}`,
            `L ${cx + shortOuter} ${shortHemY}`,
            `Q ${cx + (shortOuter + innerGap) * 0.5} ${shortHemY + 2} ${cx + innerGap + 1.5} ${shortHemY}`,
            `L ${cx} ${anchors.crotchY + 5}`,
            `L ${cx - innerGap - 1.5} ${shortHemY}`,
            `Q ${cx - (shortOuter + innerGap) * 0.5} ${shortHemY + 2} ${cx - shortOuter} ${shortHemY}`,
            `L ${cx - hHalf} ${anchors.crotchY}`,
            `C ${cx - hHalf - 1} ${anchors.crotchY - 4}, ${cx - hHalf - 2} ${anchors.hipY - 4}, ${cx - wHalf} ${anchors.waistY}`,
            'Z',
          ].join(' ')
        : [
            `M ${cx - wHalf} ${anchors.waistY}`,
            `Q ${cx} ${anchors.waistY + 2.5} ${cx + wHalf} ${anchors.waistY}`,
            `C ${cx + hHalf + 2} ${anchors.hipY - 4}, ${cx + hHalf + 1} ${anchors.crotchY - 2}, ${cx + hHalf} ${anchors.crotchY}`,
            `C ${cx + kneeOuter + 1} ${anchors.kneeY - 20}, ${cx + kneeOuter} ${anchors.kneeY + 12}, ${cx + ankleOuter} ${pantsHemY}`,
            `Q ${cx + (ankleOuter + innerGap + 4) * 0.5} ${pantsHemY + 2.5} ${cx + innerGap + 4} ${pantsHemY}`,
            `C ${cx + innerGap + 3} ${anchors.kneeY + 10}, ${cx + innerGap + 1} ${anchors.kneeY - 24}, ${cx} ${anchors.crotchY + 6}`,
            `C ${cx - innerGap - 1} ${anchors.kneeY - 24}, ${cx - innerGap - 3} ${anchors.kneeY + 10}, ${cx - innerGap - 4} ${pantsHemY}`,
            `Q ${cx - (ankleOuter + innerGap + 4) * 0.5} ${pantsHemY + 2.5} ${cx - ankleOuter} ${pantsHemY}`,
            `C ${cx - kneeOuter} ${anchors.kneeY + 12}, ${cx - kneeOuter - 1} ${anchors.kneeY - 20}, ${cx - hHalf} ${anchors.crotchY}`,
            `C ${cx - hHalf - 1} ${anchors.crotchY - 2}, ${cx - hHalf - 2} ${anchors.hipY - 4}, ${cx - wHalf} ${anchors.waistY}`,
            'Z',
          ].join(' ');

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const buttonColor = resolveGarmentButtonColor(garmentColorHex);
  const hasPhoto = isSafeDataImageUrl(garmentMeta?.imageUrl);
  const clipId = `${patternPrefix}-${variant}-clip`;

  const hemBottom = variant === 'skirt' ? skirtHemY : variant === 'shorts' ? shortHemY : pantsHemY;
  const maxHalfX = Math.max(hHalf + skirtFlare, hHalf + 4);
  const imgX = cx - maxHalfX;
  const imgY = anchors.waistY - 2;
  const imgW = maxHalfX * 2;
  const imgH = hemBottom - anchors.waistY + 10;

  const patternId =
    !hasPhoto &&
    (garmentMeta?.pattern === 'striped' ||
      garmentMeta?.pattern === 'plaid' ||
      garmentMeta?.pattern === 'textured')
      ? `${patternPrefix}-pat-${garmentMeta.pattern}`
      : null;

  return (
    <g data-garment={variant} aria-label={`Plantilla de ${variant} sobre el avatar`}>
      <defs>
        <clipPath id={clipId}>
          <path d={garmentPath} />
        </clipPath>
      </defs>

      {/* Capa base de tela */}
      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.95} />

      {/* Proyección real de foto subida */}
      {hasPhoto && (
        <image
          href={garmentMeta.imageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={showHeatmap ? 0.3 : 0.96}
          data-garment-photo="front"
        />
      )}

      {/* Patrón procedural si no hay foto */}
      {patternId && !showHeatmap && (
        <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.85" />
      )}

      {/* Volumen 3D y sombra natural de caída */}
      {!showHeatmap && (
        <>
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.62" />
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.48" />
        </>
      )}

      {/* Contorno de prenda */}
      <path
        d={garmentPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      {/* Detalles de sastrería: pretina, bragueta, bolsillos, pliegues */}
      {!showHeatmap && (
        <g pointerEvents="none">
          {/* Pretina superior */}
          <path
            d={`M ${cx - wHalf + 1} ${anchors.waistY + 8} Q ${cx} ${anchors.waistY + 10.5} ${cx + wHalf - 1} ${anchors.waistY + 8}`}
            fill="none"
            stroke={seamColor}
            strokeWidth="1.05"
          />

          {variant !== 'skirt' ? (
            <>
              {/* Botón y bragueta frontal */}
              <circle cx={cx} cy={anchors.waistY + 4.5} r="1.8" fill={buttonColor} opacity="0.8" />
              <path
                d={`M ${cx} ${anchors.waistY + 9} L ${cx} ${anchors.crotchY - 3} Q ${cx - 4} ${anchors.crotchY - 2} ${cx - 5} ${anchors.crotchY - 9}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="1"
              />
              {/* Bolsillos laterales (curvos en jeans, diagonales en chino/pantalón) */}
              {subtype === 'jeans' ? (
                <>
                  <path
                    d={`M ${cx - wHalf + 3} ${anchors.waistY + 9} Q ${cx - wHalf + 11} ${anchors.waistY + 20} ${cx - hHalf + 2} ${anchors.waistY + 23}`}
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="1"
                  />
                  <path
                    d={`M ${cx + wHalf - 3} ${anchors.waistY + 9} Q ${cx + wHalf - 11} ${anchors.waistY + 20} ${cx + hHalf - 2} ${anchors.waistY + 23}`}
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="1"
                  />
                </>
              ) : (
                <>
                  <line
                    x1={cx - wHalf + 6}
                    y1={anchors.waistY + 10}
                    x2={cx - hHalf + 3}
                    y2={anchors.waistY + 27}
                    stroke={seamColor}
                    strokeWidth="1"
                  />
                  <line
                    x1={cx + wHalf - 6}
                    y1={anchors.waistY + 10}
                    x2={cx + hHalf - 3}
                    y2={anchors.waistY + 27}
                    stroke={seamColor}
                    strokeWidth="1"
                  />
                </>
              )}
              {/* Pliegue sutil de planchado/caída en piernas */}
              {variant === 'pants' && (
                <>
                  <line
                    x1={cx - hHalf * 0.52}
                    y1={anchors.hipY + 8}
                    x2={cx - (ankleOuter + innerGap) * 0.52}
                    y2={pantsHemY - 8}
                    stroke={seamColor}
                    strokeWidth="0.75"
                    opacity="0.45"
                  />
                  <line
                    x1={cx + hHalf * 0.52}
                    y1={anchors.hipY + 8}
                    x2={cx + (ankleOuter + innerGap) * 0.52}
                    y2={pantsHemY - 8}
                    stroke={seamColor}
                    strokeWidth="0.75"
                    opacity="0.45"
                  />
                </>
              )}
            </>
          ) : (
            /* Pliegues verticales naturales de falda */
            <>
              <path
                d={`M ${cx - wHalf * 0.42} ${anchors.waistY + 12} Q ${cx - hHalf * 0.46} ${anchors.hipY + 18} ${cx - (hHalf + skirtFlare) * 0.46} ${skirtHemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.95"
                opacity="0.65"
              />
              <path
                d={`M ${cx + wHalf * 0.42} ${anchors.waistY + 12} Q ${cx + hHalf * 0.46} ${anchors.hipY + 18} ${cx + (hHalf + skirtFlare) * 0.46} ${skirtHemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.95"
                opacity="0.65"
              />
            </>
          )}
        </g>
      )}

      {/* Zona de cintura */}
      {showHeatmap && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={cx - wHalf}
            y={anchors.waistY - 2}
            width={wHalf * 2}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={anchors.waistY + 13}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Cintura {formatEase(waistZone.easeCm)}
          </text>
        </g>
      )}

      {/* Zona de cadera */}
      {showHeatmap && hipZone && (
        <g data-heatmap-zone="hip" data-fit-state={hipZone.state}>
          <rect
            x={cx - hHalf}
            y={anchors.hipY - 12}
            width={hHalf * 2}
            height={28}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={anchors.hipY + 6}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Cadera {formatEase(hipZone.easeCm)}
          </text>
        </g>
      )}
    </g>
  );
}
