import type { BodyModel, FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { UpperGarmentVariant } from './TshirtTemplate';

export interface BackTshirtTemplateProps {
  model: BodyModel;
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  patternPrefix: string;
  variant?: UpperGarmentVariant;
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function BackTshirtTemplate({
  model,
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  patternPrefix,
  variant = 'tshirt',
}: BackTshirtTemplateProps) {
  const chestZone = fitReport.evaluatedZones.find((item) => item.zone === 'chest');
  const shouldersZone = fitReport.evaluatedZones.find((item) => item.zone === 'shoulders');
  const backZone = fitReport.evaluatedZones.find((item) => item.zone === 'back');
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  const bodyOffset = chestZone ? clampVisualEaseOffsetPx(chestZone.easeCm, anchors.scale) : 4;
  const shoulderOffset = shouldersZone
    ? clampVisualEaseOffsetPx(shouldersZone.easeCm * 2, anchors.scale)
    : 2;

  const cx = anchors.centerX;
  const jacketBoost = variant === 'jacket' ? 4 : 0;
  const shHalf = Math.max(anchors.neckHalfW + 12, anchors.shoulderHalfW + shoulderOffset + jacketBoost * 0.5);
  const backBodyHalf = (model.backWidthCm / 2) * anchors.scale;
  const chHalf = Math.max(
    anchors.chestHalfW * 0.85,
    Math.max(anchors.chestHalfW, backBodyHalf) + bodyOffset + jacketBoost,
  );
  const wHalf = Math.max(anchors.waistHalfW * 0.88, anchors.waistHalfW + 3);
  const hHalf = Math.max(anchors.hipHalfW * 0.9, anchors.hipHalfW + 4);
  const hemHalf = variant === 'dress' ? hHalf + 10 : Math.max(anchors.waistHalfW * 0.9, chHalf * 0.96);

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
          `M ${cx - anchors.neckHalfW - 4} ${anchors.shoulderY - 4}`,
          `Q ${cx} ${anchors.shoulderY + 3} ${cx + anchors.neckHalfW + 4} ${anchors.shoulderY - 4}`,
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
          `M ${cx - anchors.neckHalfW - 4} ${anchors.shoulderY - 4}`,
          `Q ${cx} ${anchors.shoulderY + 3} ${cx + anchors.neckHalfW + 4} ${anchors.shoulderY - 4}`,
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
    <g data-garment={`${variant}-back`} aria-label={`Plantilla de ${variant} en vista de espalda`}>
      <path
        d={garmentPath}
        fill={garmentColorHex ?? 'var(--accent)'}
        fillOpacity={showHeatmap ? 0.1 : 0.36}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

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
        </g>
      )}

      {showHeatmap && backZone && (
        <g
          data-heatmap-zone="back"
          data-fit-state={backZone.state}
          data-estimated={model.backWidthEstimated ? 'true' : 'false'}
        >
          <rect
            x={cx - chHalf}
            y={anchors.chestY - 12}
            width={chHalf * 2}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(backZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[backZone.state]}
            strokeWidth="1.75"
            strokeDasharray={model.backWidthEstimated ? '4 3' : undefined}
          />
          <text
            x={cx}
            y={anchors.chestY + 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Espalda {formatEase(backZone.easeCm)}
          </text>
        </g>
      )}

      {showHeatmap && !backZone && chestZone && (
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
            fontSize="11"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Pecho {formatEase(chestZone.easeCm)}
          </text>
        </g>
      )}

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
        </g>
      )}
    </g>
  );
}
