import { solveGarmentSection, type BodyModel, type FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx } from './anchors';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { SideAvatarAnchors } from './sideAnchors';

export interface SideTshirtTemplateProps {
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

export function SideTshirtTemplate({
  model,
  anchors,
  fitReport,
  showHeatmap,
  patternPrefix,
}: SideTshirtTemplateProps) {
  const chestZone = fitReport.evaluatedZones.find((item) => item.zone === 'chest');
  const shouldersZone = fitReport.evaluatedZones.find((item) => item.zone === 'shoulders');

  let chestDepthOffset = 4;
  if (chestZone) {
    // Sección transversal elíptica de prenda con misma relación fondo/ancho del cuerpo (Sección 10.2).
    const flatWidth = chestZone.garmentMeasureCm / 2;
    const garmentSection = solveGarmentSection(flatWidth, model.sections.chest.depthRatio);
    const depthDiffCm = garmentSection.sideDepthCm - model.sections.chest.depthCm;
    chestDepthOffset = clampVisualEaseOffsetPx(depthDiffCm * 2, anchors.scale);
  }

  const backX = anchors.chestBackX - chestDepthOffset;
  const frontX = anchors.chestFrontX + chestDepthOffset;
  const hemY = anchors.hipY - 4;
  const hemBackX = Math.min(anchors.waistBackX - chestDepthOffset * 0.85, backX + 2);
  const hemFrontX = Math.max(anchors.waistFrontX + chestDepthOffset * 0.85, frontX - 2);

  const path = [
    `M ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 2}`,
    `L ${anchors.shoulderFrontX + 2} ${anchors.shoulderY - 2}`,
    `Q ${frontX + 3} ${anchors.chestY} ${hemFrontX} ${hemY}`,
    `L ${hemBackX} ${hemY}`,
    `Q ${backX - 2} ${anchors.chestY} ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 2}`,
    'Z',
  ].join(' ');

  return (
    <g data-garment="tshirt-side" aria-label="Plantilla de camiseta en vista de perfil">
      <path
        d={path}
        fill="var(--accent)"
        fillOpacity={showHeatmap ? 0.08 : 0.16}
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Manga lateral estilizada */}
      <path
        d={`M ${anchors.centerX - 10} ${anchors.shoulderY + 6} L ${anchors.centerX + 12} ${anchors.shoulderY + 6} L ${anchors.centerX + 10} ${anchors.chestY + 18} L ${anchors.centerX - 12} ${anchors.chestY + 18} Z`}
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
    </g>
  );
}
