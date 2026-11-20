import type { FitReport, ZoneFitResult } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export type LowerGarmentVariant = 'pants' | 'shorts' | 'skirt';

export interface PantsTemplateProps {
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
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
  patternPrefix = 'front',
  variant = 'pants',
}: PantsTemplateProps) {
  const waistZone = findZone(fitReport, 'waist');
  const hipZone = findZone(fitReport, 'hip');

  const waistOffset = waistZone ? clampVisualEaseOffsetPx(waistZone.easeCm, anchors.scale) : 3;
  const hipOffset = hipZone ? clampVisualEaseOffsetPx(hipZone.easeCm, anchors.scale) : 4;

  const cx = anchors.centerX;
  const wHalf = Math.max(anchors.waistHalfW * 0.86, anchors.waistHalfW + waistOffset);
  const hHalf = Math.max(anchors.hipHalfW * 0.88, anchors.hipHalfW + hipOffset);
  const legLength = anchors.ankleY - anchors.crotchY;
  const shortHemY = anchors.crotchY + legLength * 0.28;
  const skirtHemY = anchors.crotchY + legLength * 0.5;
  const ankleOuter = Math.max(anchors.ankleHalfW + 8, hHalf * 0.52);
  const shortOuter = Math.max(hHalf * 0.88, ankleOuter + 6);
  const innerGap = 5;

  const garmentPath =
    variant === 'skirt'
      ? [
          `M ${cx - wHalf} ${anchors.waistY}`,
          `L ${cx + wHalf} ${anchors.waistY}`,
          `Q ${cx + hHalf + 3} ${anchors.hipY} ${cx + hHalf + 8} ${skirtHemY}`,
          `L ${cx - hHalf - 8} ${skirtHemY}`,
          `Q ${cx - hHalf - 3} ${anchors.hipY} ${cx - wHalf} ${anchors.waistY}`,
          'Z',
        ].join(' ')
      : variant === 'shorts'
        ? [
            `M ${cx - wHalf} ${anchors.waistY}`,
            `L ${cx + wHalf} ${anchors.waistY}`,
            `Q ${cx + hHalf + 2} ${anchors.hipY} ${cx + hHalf} ${anchors.crotchY}`,
            `L ${cx + shortOuter} ${shortHemY}`,
            `L ${cx + innerGap + 2} ${shortHemY}`,
            `L ${cx} ${anchors.crotchY + 6}`,
            `L ${cx - innerGap - 2} ${shortHemY}`,
            `L ${cx - shortOuter} ${shortHemY}`,
            `L ${cx - hHalf} ${anchors.crotchY}`,
            `Q ${cx - hHalf - 2} ${anchors.hipY} ${cx - wHalf} ${anchors.waistY}`,
            'Z',
          ].join(' ')
        : [
            `M ${cx - wHalf} ${anchors.waistY}`,
            `L ${cx + wHalf} ${anchors.waistY}`,
            `Q ${cx + hHalf + 2} ${anchors.hipY} ${cx + hHalf} ${anchors.crotchY}`,
            `L ${cx + ankleOuter} ${anchors.ankleY}`,
            `L ${cx + innerGap + 4} ${anchors.ankleY}`,
            `L ${cx} ${anchors.crotchY + 6}`,
            `L ${cx - innerGap - 4} ${anchors.ankleY}`,
            `L ${cx - ankleOuter} ${anchors.ankleY}`,
            `L ${cx - hHalf} ${anchors.crotchY}`,
            `Q ${cx - hHalf - 2} ${anchors.hipY} ${cx - wHalf} ${anchors.waistY}`,
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
