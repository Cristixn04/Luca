import { solveGarmentSection, type BodyModel, type FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx } from './anchors';
import {
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveLowerSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { LowerGarmentVariant } from './PantsTemplate';
import type { SideAvatarAnchors } from './sideAnchors';

export interface SidePantsTemplateProps {
  model: BodyModel;
  anchors: SideAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  garmentMeta?: GarmentVisualMeta;
  patternPrefix: string;
  variant?: LowerGarmentVariant;
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
  garmentColorHex,
  garmentMeta,
  patternPrefix,
  variant = 'pants',
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

  const subtype = resolveLowerSubtype(variant, garmentMeta);
  const wBack = anchors.waistBackX - waistOffset;
  const wFront = anchors.waistFrontX + waistOffset;
  const hBack = anchors.hipBackX - hipOffset;
  const hFront = anchors.hipFrontX + hipOffset;
  const legBack = anchors.legBackX - Math.max(2, hipOffset * 0.6);
  const legFront = anchors.legFrontX + Math.max(2, hipOffset * 0.6);
  const legLength = anchors.ankleY - anchors.crotchY;
  const hemY =
    variant === 'shorts'
      ? anchors.crotchY + legLength * 0.28
      : variant === 'skirt'
        ? subtype === 'skirt_mini'
          ? anchors.crotchY + legLength * 0.26
          : subtype === 'skirt_maxi'
            ? anchors.ankleY - 12
            : anchors.crotchY + legLength * 0.54
        : anchors.ankleY - 6;

  const path =
    variant === 'skirt'
      ? [
          `M ${wBack} ${anchors.waistY}`,
          `L ${wFront} ${anchors.waistY}`,
          `C ${hFront + 3} ${anchors.hipY - 4}, ${hFront + 9} ${hemY - 26}, ${hFront + 9} ${hemY}`,
          `Q ${anchors.centerX} ${hemY + 4} ${hBack - 9} ${hemY}`,
          `C ${hBack - 9} ${hemY - 26}, ${hBack - 3} ${anchors.hipY - 4}, ${wBack} ${anchors.waistY}`,
          'Z',
        ].join(' ')
      : [
          `M ${wBack} ${anchors.waistY}`,
          `L ${wFront} ${anchors.waistY}`,
          `C ${hFront + 2} ${anchors.hipY - 4}, ${legFront + 2} ${anchors.crotchY - 2}, ${legFront + 1} ${anchors.crotchY}`,
          `L ${legFront - 2} ${hemY}`,
          `L ${legBack + 2} ${hemY}`,
          `L ${legBack - 1} ${anchors.crotchY}`,
          `C ${hBack - 3} ${anchors.hipY + 6}, ${hBack - 3} ${anchors.hipY - 8}, ${wBack} ${anchors.waistY}`,
          'Z',
        ].join(' ');

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const patternId =
    garmentMeta?.pattern === 'striped' ||
    garmentMeta?.pattern === 'plaid' ||
    garmentMeta?.pattern === 'textured'
      ? `${patternPrefix}-pat-${garmentMeta.pattern}`
      : null;

  return (
    <g data-garment={`${variant}-side`} aria-label={`Plantilla de ${variant} en vista de perfil`}>
      <path d={path} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.94} />
      {patternId && !showHeatmap && <path d={path} fill={`url(#${patternId})`} opacity="0.85" />}
      {!showHeatmap && (
        <>
          <path d={path} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.62" />
          <path d={path} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.48" />
        </>
      )}
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.3" strokeLinejoin="round" />

      {/* Costura lateral y pretina */}
      {!showHeatmap && (
        <g pointerEvents="none">
          <line
            x1={wBack + 1}
            y1={anchors.waistY + 8}
            x2={wFront - 1}
            y2={anchors.waistY + 8}
            stroke={seamColor}
            strokeWidth="1"
          />
          <line
            x1={anchors.centerX}
            y1={anchors.waistY + 8}
            x2={anchors.centerX}
            y2={hemY - 4}
            stroke={seamColor}
            strokeWidth="0.9"
            opacity="0.6"
          />
        </g>
      )}

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
