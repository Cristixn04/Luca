import { solveGarmentSection, type BodyModel, type FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { SideAvatarAnchors } from './sideAnchors';

export interface SidePantsTemplateProps {
  model: BodyModel;
  anchors: SideAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  patternPrefix: string;
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function SidePantsTemplate({
  model,
  anchors,
  fitReport,
  showHeatmap,
  patternPrefix,
}: SidePantsTemplateProps) {
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  let waistOffset = 3;
  if (waistZone) {
    const garmentSec = solveGarmentSection(
      waistZone.garmentMeasureCm / 2,
      model.sections.waist.depthRatio,
    );
    waistOffset = clampVisualEaseOffsetPx(
      (garmentSec.sideDepthCm - model.sections.waist.depthCm) * 2,
      anchors.scale,
    );
  }

  let hipOffset = 4;
  if (hipZone) {
    const garmentSec = solveGarmentSection(
      hipZone.garmentMeasureCm / 2,
      model.sections.hip.depthRatio,
    );
    hipOffset = clampVisualEaseOffsetPx(
      (garmentSec.sideDepthCm - model.sections.hip.depthCm) * 2,
      anchors.scale,
    );
  }

  const wBack = anchors.waistBackX - waistOffset;
  const wFront = anchors.waistFrontX + waistOffset;
  const hBack = anchors.hipBackX - hipOffset;
  const hFront = anchors.hipFrontX + hipOffset;
  const legBack = anchors.legBackX - Math.max(2, hipOffset * 0.6);
  const legFront = anchors.legFrontX + Math.max(2, hipOffset * 0.6);

  const path = [
    `M ${wBack} ${anchors.waistY}`,
    `L ${wFront} ${anchors.waistY}`,
    `Q ${hFront + 2} ${anchors.hipY} ${legFront} ${anchors.crotchY}`,
    `L ${legFront - 2} ${anchors.ankleY}`,
    `L ${legBack + 2} ${anchors.ankleY}`,
    `L ${legBack} ${anchors.crotchY}`,
    `Q ${hBack - 2} ${anchors.hipY} ${wBack} ${anchors.waistY}`,
    'Z',
  ].join(' ');

  return (
    <g data-garment="pants-side" aria-label="Plantilla de pantalón en vista de perfil">
      <path
        d={path}
        fill="var(--accent)"
        fillOpacity={showHeatmap ? 0.08 : 0.16}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {showHeatmap && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={wBack}
            y={anchors.waistY - 2}
            width={Math.max(20, wFront - wBack)}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={anchors.centerX}
            y={anchors.waistY + 13}
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

      {showHeatmap && hipZone && (
        <g data-heatmap-zone="hip" data-fit-state={hipZone.state}>
          <rect
            x={hBack}
            y={anchors.hipY - 12}
            width={Math.max(24, hFront - hBack)}
            height={28}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={anchors.centerX}
            y={anchors.hipY + 6}
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
