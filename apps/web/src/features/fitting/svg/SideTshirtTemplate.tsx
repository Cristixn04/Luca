import { solveGarmentSection, type BodyModel, type FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx } from './anchors';
import {
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveUpperSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { SideAvatarAnchors } from './sideAnchors';
import type { UpperGarmentVariant } from './TshirtTemplate';

export interface SideTshirtTemplateProps {
  model: BodyModel;
  anchors: SideAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  garmentMeta?: GarmentVisualMeta;
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
  garmentMeta,
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

  const subtype = resolveUpperSubtype(variant, garmentMeta);
  const legLen = anchors.ankleY - anchors.crotchY;
  const bulkBoost =
    variant === 'jacket'
      ? 3.5
      : subtype === 'hoodie' || subtype === 'sweater'
        ? 2.6
        : 0;

  const backX = anchors.chestBackX - chestDepthOffset - bulkBoost;
  const frontX = anchors.chestFrontX + chestDepthOffset + bulkBoost;
  const hemY =
    variant === 'dress'
      ? subtype === 'dress_mini'
        ? anchors.crotchY + legLen * 0.34
        : subtype === 'dress_maxi'
          ? anchors.ankleY - 12
          : anchors.crotchY + legLen * 0.58
      : variant === 'jacket'
        ? anchors.hipY + 8
        : subtype === 'hoodie' || subtype === 'sweater'
          ? anchors.hipY + 2
          : anchors.hipY - 3;

  const hemBackX =
    variant === 'dress'
      ? anchors.hipBackX - chestDepthOffset - 10
      : Math.min(anchors.waistBackX - chestDepthOffset * 0.85 - bulkBoost * 0.5, backX + 2);
  const hemFrontX =
    variant === 'dress'
      ? anchors.hipFrontX + chestDepthOffset + 10
      : Math.max(anchors.waistFrontX + chestDepthOffset * 0.85 + bulkBoost * 0.5, frontX - 2);

  const path = [
    `M ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 4}`,
    `Q ${anchors.centerX} ${anchors.shoulderY - 7} ${anchors.shoulderFrontX + 3} ${anchors.shoulderY - 2}`,
    `C ${frontX + 4} ${anchors.chestY - 4}, ${frontX + 3} ${anchors.chestY + 18}, ${hemFrontX} ${hemY}`,
    `Q ${anchors.centerX} ${hemY + 4} ${hemBackX} ${hemY}`,
    `C ${backX - 2} ${anchors.waistY}, ${backX - 3} ${anchors.chestY - 4}, ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 4}`,
    'Z',
  ].join(' ');

  const isLongSleeve = variant === 'long_sleeve' || variant === 'jacket';
  const isTank = subtype === 'tank';
  const sleeveBottomY = isLongSleeve ? anchors.hipY + 14 : anchors.chestY + 18;
  const sleevePath = [
    `M ${anchors.centerX - 11} ${anchors.shoulderY + 5}`,
    `Q ${anchors.centerX} ${anchors.shoulderY - 2} ${anchors.centerX + 11} ${anchors.shoulderY + 7}`,
    `C ${anchors.centerX + 13} ${(anchors.shoulderY + sleeveBottomY) * 0.52}, ${anchors.centerX + 11} ${sleeveBottomY - 10}, ${anchors.centerX + 10} ${sleeveBottomY}`,
    `L ${anchors.centerX - 6} ${sleeveBottomY + 2}`,
    `C ${anchors.centerX - 9} ${(anchors.shoulderY + sleeveBottomY) * 0.55}, ${anchors.centerX - 12} ${anchors.shoulderY + 22}, ${anchors.centerX - 11} ${anchors.shoulderY + 5}`,
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
      {/* Capucha vista de perfil para buzo/hoodie */}
      {subtype === 'hoodie' && (
        <path
          d={`M ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 4} C ${anchors.shoulderBackX - 14} ${anchors.shoulderY - 14}, ${anchors.shoulderBackX - 16} ${anchors.shoulderY + 6}, ${backX - 4} ${anchors.chestY - 6} Z`}
          fill={baseFill}
          fillOpacity={showHeatmap ? 0.16 : 0.94}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      )}

      {/* Cuerpo de prenda en perfil */}
      <path d={path} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.94} />
      {patternId && !showHeatmap && <path d={path} fill={`url(#${patternId})`} opacity="0.85" />}
      {!showHeatmap && (
        <>
          <path d={path} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.62" />
          <path d={path} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.5" />
        </>
      )}
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.3" strokeLinejoin="round" />

      {/* Manga lateral anatómica */}
      {!isTank && (
        <g>
          <path d={sleevePath} fill={baseFill} fillOpacity={showHeatmap ? 0.2 : 0.96} />
          {patternId && !showHeatmap && (
            <path d={sleevePath} fill={`url(#${patternId})`} opacity="0.85" />
          )}
          {!showHeatmap && (
            <path d={sleevePath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.72" />
          )}
          <path
            d={sleevePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {isLongSleeve && !showHeatmap && (
            <line
              x1={anchors.centerX - 6}
              y1={sleeveBottomY - 6}
              x2={anchors.centerX + 10}
              y2={sleeveBottomY - 7}
              stroke={seamColor}
              strokeWidth="1.05"
            />
          )}
        </g>
      )}

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
