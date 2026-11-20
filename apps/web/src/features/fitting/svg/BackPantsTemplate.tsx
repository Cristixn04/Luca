import type { FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export interface BackPantsTemplateProps {
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  patternPrefix: string;
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function BackPantsTemplate({
  anchors,
  fitReport,
  showHeatmap,
  patternPrefix,
}: BackPantsTemplateProps) {
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  const waistOffset = waistZone ? clampVisualEaseOffsetPx(waistZone.easeCm, anchors.scale) : 3;
  const hipOffset = hipZone ? clampVisualEaseOffsetPx(hipZone.easeCm, anchors.scale) : 4;

  const cx = anchors.centerX;
  const wHalf = Math.max(anchors.waistHalfW * 0.86, anchors.waistHalfW + waistOffset);
  const hHalf = Math.max(anchors.hipHalfW * 0.88, anchors.hipHalfW + hipOffset);
  const ankleOuter = Math.max(anchors.ankleHalfW + 8, hHalf * 0.52);
  const innerGap = 5;

  const pantsPath = [
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
    <g data-garment="pants-back" aria-label="Plantilla de pantalón en vista de espalda">
      <path
        d={pantsPath}
        fill="var(--accent)"
        fillOpacity={showHeatmap ? 0.08 : 0.16}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Costura trasera y bolsillos posteriores sutiles */}
      <line
        x1={cx}
        y1={anchors.waistY + 4}
        x2={cx}
        y2={anchors.crotchY + 4}
        stroke="var(--muted)"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      <rect
        x={cx - hHalf * 0.68}
        y={anchors.hipY - 8}
        width={hHalf * 0.48}
        height={18}
        rx={2}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="1"
      />
      <rect
        x={cx + hHalf * 0.2}
        y={anchors.hipY - 8}
        width={hHalf * 0.48}
        height={18}
        rx={2}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="1"
      />

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
