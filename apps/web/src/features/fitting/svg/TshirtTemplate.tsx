import type { FitReport, ZoneFitResult } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export interface TshirtTemplateProps {
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  patternPrefix?: string;
}

function findZone(report: FitReport, zone: 'chest' | 'shoulders'): ZoneFitResult | undefined {
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
  patternPrefix = 'front',
}: TshirtTemplateProps) {
  const chestZone = findZone(fitReport, 'chest');
  const shouldersZone = findZone(fitReport, 'shoulders');

  const chestOffset = chestZone ? clampVisualEaseOffsetPx(chestZone.easeCm, anchors.scale) : 4;
  const shoulderOffset = shouldersZone
    ? clampVisualEaseOffsetPx(shouldersZone.easeCm * 2, anchors.scale)
    : 2;

  const cx = anchors.centerX;
  const shHalf = Math.max(anchors.neckHalfW + 12, anchors.shoulderHalfW + shoulderOffset);
  const chHalf = Math.max(anchors.chestHalfW * 0.85, anchors.chestHalfW + chestOffset);
  const hemHalf = Math.max(anchors.waistHalfW * 0.9, chHalf * 0.96);

  const sleeveOutX = shHalf + 18;
  const sleeveBottomY = anchors.chestY + 12;
  const hemY = anchors.hipY - 4;

  const garmentPath = [
    `M ${cx - anchors.neckHalfW - 4} ${anchors.shoulderY - 3}`,
    `Q ${cx} ${anchors.shoulderY + 14} ${cx + anchors.neckHalfW + 4} ${anchors.shoulderY - 3}`,
    `L ${cx + shHalf} ${anchors.shoulderY + 4}`,
    `L ${cx + sleeveOutX} ${sleeveBottomY}`,
    `L ${cx + chHalf + 6} ${sleeveBottomY + 10}`,
    `L ${cx + chHalf} ${anchors.chestY + 8}`,
    `L ${cx + hemHalf} ${hemY}`,
    `L ${cx - hemHalf} ${hemY}`,
    `L ${cx - chHalf} ${anchors.chestY + 8}`,
    `L ${cx - chHalf - 6} ${sleeveBottomY + 10}`,
    `L ${cx - sleeveOutX} ${sleeveBottomY}`,
    `L ${cx - shHalf} ${anchors.shoulderY + 4}`,
    'Z',
  ].join(' ');

  return (
    <g data-garment="tshirt" aria-label="Plantilla de camiseta sobre el avatar">
      {/* Contorno principal de la camiseta */}
      <path
        d={garmentPath}
        fill="var(--accent)"
        fillOpacity={showHeatmap ? 0.08 : 0.16}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

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
    </g>
  );
}
