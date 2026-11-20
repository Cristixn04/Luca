import type { BodyModel, FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export interface BackTshirtTemplateProps {
  model: BodyModel;
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  patternPrefix: string;
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
  patternPrefix,
}: BackTshirtTemplateProps) {
  const chestZone = fitReport.evaluatedZones.find((item) => item.zone === 'chest');
  const shouldersZone = fitReport.evaluatedZones.find((item) => item.zone === 'shoulders');
  const backZone = fitReport.evaluatedZones.find((item) => item.zone === 'back');

  const bodyOffset = chestZone ? clampVisualEaseOffsetPx(chestZone.easeCm, anchors.scale) : 4;
  const shoulderOffset = shouldersZone
    ? clampVisualEaseOffsetPx(shouldersZone.easeCm * 2, anchors.scale)
    : 2;

  const cx = anchors.centerX;
  const shHalf = Math.max(anchors.neckHalfW + 12, anchors.shoulderHalfW + shoulderOffset);
  const backBodyHalf = (model.backWidthCm / 2) * anchors.scale;
  const chHalf = Math.max(anchors.chestHalfW * 0.85, Math.max(anchors.chestHalfW, backBodyHalf) + bodyOffset);
  const hemHalf = Math.max(anchors.waistHalfW * 0.9, chHalf * 0.96);

  const sleeveOutX = shHalf + 18;
  const sleeveBottomY = anchors.chestY + 12;
  const hemY = anchors.hipY - 4;

  // Escote trasero más alto que el delantero
  const garmentPath = [
    `M ${cx - anchors.neckHalfW - 4} ${anchors.shoulderY - 4}`,
    `Q ${cx} ${anchors.shoulderY + 3} ${cx + anchors.neckHalfW + 4} ${anchors.shoulderY - 4}`,
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
    <g data-garment="tshirt-back" aria-label="Plantilla de camiseta en vista de espalda">
      <path
        d={garmentPath}
        fill="var(--accent)"
        fillOpacity={showHeatmap ? 0.08 : 0.16}
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

      {/* Si no se midió ancho de espalda en la prenda, refleja pecho para coherencia visual */}
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
    </g>
  );
}
