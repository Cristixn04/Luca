import { solveGarmentSection, type BodyModel, type FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { SideAvatarAnchors } from './sideAnchors';
import type { UpperGarmentVariant } from './TshirtTemplate';

export interface SideTshirtTemplateProps {
  model: BodyModel;
  anchors: SideAvatarAnchors;
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

export function SideTshirtTemplate({
  model,
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  patternPrefix,
  variant = 'tshirt',
}: SideTshirtTemplateProps) {
  const chestZone = fitReport.evaluatedZones.find((item) => item.zone === 'chest');
  const shouldersZone = fitReport.evaluatedZones.find((item) => item.zone === 'shoulders');
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  let chestDepthOffset = 4;
  if (chestZone) {
    const flatWidth = chestZone.garmentMeasureCm / 2;
    const garmentSection = solveGarmentSection(flatWidth, model.sections.chest.depthRatio);
    const depthDiffCm = garmentSection.sideDepthCm - model.sections.chest.depthCm;
    chestDepthOffset = clampVisualEaseOffsetPx(depthDiffCm * 2, anchors.scale);
  }

  const jacketBoost = variant === 'jacket' ? 3 : 0;
  const backX = anchors.chestBackX - chestDepthOffset - jacketBoost;
  const frontX = anchors.chestFrontX + chestDepthOffset + jacketBoost;
  const hemY =
    variant === 'dress'
      ? anchors.crotchY + (anchors.ankleY - anchors.crotchY) * 0.54
      : variant === 'jacket'
        ? anchors.hipY + 6
        : anchors.hipY - 4;
  const hemBackX =
    variant === 'dress'
      ? anchors.hipBackX - chestDepthOffset - 4
      : Math.min(anchors.waistBackX - chestDepthOffset * 0.85, backX + 2);
  const hemFrontX =
    variant === 'dress'
      ? anchors.hipFrontX + chestDepthOffset + 4
      : Math.max(anchors.waistFrontX + chestDepthOffset * 0.85, frontX - 2);

  const path = [
    `M ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 2}`,
    `L ${anchors.shoulderFrontX + 2} ${anchors.shoulderY - 2}`,
    `Q ${frontX + 3} ${anchors.chestY} ${hemFrontX} ${hemY}`,
    `L ${hemBackX} ${hemY}`,
    `Q ${backX - 2} ${anchors.chestY} ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 2}`,
    'Z',
  ].join(' ');

  const isLongSleeve = variant === 'long_sleeve' || variant === 'jacket';
  const sleeveBottomY = isLongSleeve ? anchors.hipY + 6 : anchors.chestY + 18;

  return (
    <g data-garment={`${variant}-side`} aria-label={`Plantilla de ${variant} en vista de perfil`}>
      <path
        d={path}
        fill={garmentColorHex ?? 'var(--accent)'}
        fillOpacity={showHeatmap ? 0.1 : 0.36}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Manga lateral estilizada */}
      <path
        d={`M ${anchors.centerX - 10} ${anchors.shoulderY + 6} L ${anchors.centerX + 12} ${anchors.shoulderY + 6} L ${anchors.centerX + 9} ${sleeveBottomY} L ${anchors.centerX - 10} ${sleeveBottomY} Z`}
        fill="var(--surface)"
        fillOpacity="0.65"
        stroke="var(--ink)"
        strokeWidth="1.25"
      />

      {showHeatmap && shouldersZone && (
        <g data-heatmap-zone="shoulders" data-fit-state={shouldersZone.state}>
          <rect
            x={anchors.shoulderBackX - 3}
            y={anchors.shoulderY - 4}
            width={anchors.shoulderFrontX - anchors.shoulderBackX + 6}
            height={14}
            rx={5}
            fill={`url(#${getHeatmapPatternId(shouldersZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[shouldersZone.state]}
            strokeWidth="1.5"
          />
        </g>
      )}

      {showHeatmap && chestZone && (
        <g data-heatmap-zone="chest" data-fit-state={chestZone.state}>
          <rect
            x={backX}
            y={anchors.chestY - 12}
            width={Math.max(24, frontX - backX)}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(chestZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[chestZone.state]}
            strokeWidth="1.75"
          />
          <text
            x={anchors.centerX}
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
            x={anchors.waistBackX - 4}
            y={anchors.waistY - 4}
            width={Math.max(20, anchors.waistFrontX - anchors.waistBackX + 8)}
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
            x={anchors.hipBackX - 4}
            y={anchors.hipY - 12}
            width={Math.max(24, anchors.hipFrontX - anchors.hipBackX + 8)}
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
