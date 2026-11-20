import type { FitReport, ZoneFitResult } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export type UpperGarmentVariant = 'tshirt' | 'long_sleeve' | 'jacket' | 'dress';

export interface TshirtTemplateProps {
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  patternPrefix?: string;
  variant?: UpperGarmentVariant;
}

function findZone(
  report: FitReport,
  zone: 'chest' | 'shoulders' | 'waist' | 'hip',
): ZoneFitResult | undefined {
  return report.evaluatedZones.find((item) => item.zone === zone);
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function TshirtTemplate({
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  patternPrefix = 'front',
  variant = 'tshirt',
}: TshirtTemplateProps) {
  const chestZone = findZone(fitReport, 'chest');
  const shouldersZone = findZone(fitReport, 'shoulders');
  const waistZone = findZone(fitReport, 'waist');
  const hipZone = findZone(fitReport, 'hip');

  const chestOffset = chestZone ? clampVisualEaseOffsetPx(chestZone.easeCm, anchors.scale) : 4;
  const shoulderOffset = shouldersZone
    ? clampVisualEaseOffsetPx(shouldersZone.easeCm * 2, anchors.scale)
    : 2;
  const waistOffset = waistZone ? clampVisualEaseOffsetPx(waistZone.easeCm, anchors.scale) : 3;
  const hipOffset = hipZone ? clampVisualEaseOffsetPx(hipZone.easeCm, anchors.scale) : 4;

  const cx = anchors.centerX;
  const jacketBoost = variant === 'jacket' ? 4 : 0;
  const shHalf = Math.max(anchors.neckHalfW + 12, anchors.shoulderHalfW + shoulderOffset + jacketBoost * 0.5);
  const chHalf = Math.max(anchors.chestHalfW * 0.85, anchors.chestHalfW + chestOffset + jacketBoost);
  const wHalf = Math.max(anchors.waistHalfW * 0.88, anchors.waistHalfW + waistOffset);
  const hHalf = Math.max(anchors.hipHalfW * 0.9, anchors.hipHalfW + hipOffset);
  const hemHalf =
    variant === 'dress'
      ? hHalf + 10
      : Math.max(anchors.waistHalfW * 0.9, chHalf * 0.96);

  const isLongSleeve = variant === 'long_sleeve' || variant === 'jacket';
  const sleeveOutX = isLongSleeve ? shHalf + 24 : shHalf + 18;
  const sleeveBottomY = isLongSleeve ? anchors.hipY + 8 : anchors.chestY + 12;
  const sleeveInnerBottomX = isLongSleeve ? chHalf + 12 : chHalf + 6;
  const hemY =
    variant === 'dress'
      ? anchors.crotchY + (anchors.ankleY - anchors.crotchY) * 0.54
      : variant === 'jacket'
        ? anchors.hipY + 6
        : anchors.hipY - 4;

  const garmentPath =
    variant === 'dress'
      ? [
          `M ${cx - anchors.neckHalfW - 4} ${anchors.shoulderY - 3}`,
          `Q ${cx} ${anchors.shoulderY + 14} ${cx + anchors.neckHalfW + 4} ${anchors.shoulderY - 3}`,
          `L ${cx + shHalf} ${anchors.shoulderY + 4}`,
          `L ${cx + shHalf + 12} ${anchors.chestY + 6}`,
          `L ${cx + chHalf} ${anchors.chestY + 8}`,
          `L ${cx + wHalf} ${anchors.waistY}`,
          `Q ${cx + hHalf + 3} ${anchors.hipY} ${cx + hemHalf} ${hemY}`,
          `L ${cx - hemHalf} ${hemY}`,
          `Q ${cx - hHalf - 3} ${anchors.hipY} ${cx - wHalf} ${anchors.waistY}`,
          `L ${cx - chHalf} ${anchors.chestY + 8}`,
          `L ${cx - shHalf - 12} ${anchors.chestY + 6}`,
          `L ${cx - shHalf} ${anchors.shoulderY + 4}`,
          'Z',
        ].join(' ')
      : [
          `M ${cx - anchors.neckHalfW - 4} ${anchors.shoulderY - 3}`,
          `Q ${cx} ${anchors.shoulderY + 14} ${cx + anchors.neckHalfW + 4} ${anchors.shoulderY - 3}`,
          `L ${cx + shHalf} ${anchors.shoulderY + 4}`,
          `L ${cx + sleeveOutX} ${sleeveBottomY}`,
          `L ${cx + sleeveInnerBottomX} ${sleeveBottomY + 8}`,
          `L ${cx + chHalf} ${anchors.chestY + 8}`,
          `L ${cx + hemHalf} ${hemY}`,
          `L ${cx - hemHalf} ${hemY}`,
          `L ${cx - chHalf} ${anchors.chestY + 8}`,
          `L ${cx - sleeveInnerBottomX} ${sleeveBottomY + 8}`,
          `L ${cx - sleeveOutX} ${sleeveBottomY}`,
          `L ${cx - shHalf} ${anchors.shoulderY + 4}`,
          'Z',
        ].join(' ');

  return (
    <g data-garment={variant} aria-label={`Plantilla de ${variant} sobre el avatar`}>
      <path
        d={garmentPath}
        fill={garmentColorHex ?? 'var(--accent)'}
        fillOpacity={showHeatmap ? 0.1 : 0.36}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Solapas y apertura frontal de chaqueta */}
      {variant === 'jacket' && (
        <>
          <line
            x1={cx}
            y1={anchors.shoulderY + 12}
            x2={cx}
            y2={hemY}
            stroke="var(--ink)"
            strokeWidth="1.4"
          />
          <path
            d={`M ${cx - anchors.neckHalfW - 2} ${anchors.shoulderY} L ${cx - 12} ${anchors.chestY + 6} L ${cx} ${anchors.chestY + 12} L ${cx + 12} ${anchors.chestY + 6} L ${cx + anchors.neckHalfW + 2} ${anchors.shoulderY}`}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1.2"
          />
        </>
      )}

      {/* Zona de hombros */}
      {showHeatmap && shouldersZone && (
        <g data-heatmap-zone="shoulders" data-fit-state={shouldersZone.state}>
          <rect
            x={cx - shHalf}
            y={anchors.shoulderY - 4}
            width={shHalf * 2}
            height={16}
            rx={6}
            fill={`url(#${getHeatmapPatternId(shouldersZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[shouldersZone.state]}
            strokeWidth="1.5"
          />
          <text
            x={cx + shHalf + 8}
            y={anchors.shoulderY + 8}
            fontSize="11"
            fontWeight="600"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Hombros {formatEase(shouldersZone.easeCm)}
          </text>
        </g>
      )}

      {/* Zona de pecho */}
      {showHeatmap && chestZone && (
        <g data-heatmap-zone="chest" data-fit-state={chestZone.state}>
          <rect
            x={cx - chHalf}
            y={anchors.chestY - 12}
            width={chHalf * 2}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(chestZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[chestZone.state]}
            strokeWidth="1.75"
          />
          <text
            x={cx}
            y={anchors.chestY + 10}
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Pecho {formatEase(chestZone.easeCm)}
          </text>
        </g>
      )}

      {/* Zonas adicionales para vestido (cintura y cadera) */}
      {showHeatmap && variant === 'dress' && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={cx - wHalf}
            y={anchors.waistY - 4}
            width={wHalf * 2}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={anchors.waistY + 11}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Cintura {formatEase(waistZone.easeCm)}
          </text>
        </g>
      )}

      {showHeatmap && variant === 'dress' && hipZone && (
        <g data-heatmap-zone="hip" data-fit-state={hipZone.state}>
          <rect
            x={cx - hHalf}
            y={anchors.hipY - 12}
            width={hHalf * 2}
            height={26}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={anchors.hipY + 5}
            textAnchor="middle"
            fontSize="10.5"
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
