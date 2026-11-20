import type { FitReport } from '@luca/domain';
import {
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveUpperBlueprint,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import { computeFittedEasePx, type MannequinRig } from './mannequinRig';
import type { UpperGarmentVariant } from './TshirtTemplate';

export interface SideTshirtTemplateProps {
  rig: MannequinRig;
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
  rig,
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

  const bp = resolveUpperBlueprint(variant, garmentMeta);
  const { subtype, neckline, sleeveLength, garmentLength } = bp;
  const legLen = rig.footY - rig.crotchY;
  const isLongSleeve = sleeveLength === 'long';
  const isThreeQuarter = sleeveLength === 'three_quarter';
  const isSleeveless = sleeveLength === 'sleeveless' || neckline === 'strapless';
  const isFullLengthPiece =
    variant === 'dress' || garmentLength === 'knee' || garmentLength === 'midi' || garmentLength === 'maxi';

  const ease = computeFittedEasePx(chestZone?.easeCm, bp.fitBoostPx * 0.85);
  const slEase = Math.max(1.6, Math.min(3.8, ease * 0.65));

  const s = rig.side;
  const backChest = s.chestBackX - ease;
  const frontBust = s.bustFrontX + ease;
  const backWaist = s.waistBackX - ease * 0.9;
  const frontWaist = s.waistFrontX + ease * 0.95;

  const hemY = (() => {
    switch (garmentLength) {
      case 'crop':
        return rig.waistY - 6;
      case 'waist':
        return rig.waistY + 5;
      case 'thigh':
        return rig.crotchY + legLen * 0.31;
      case 'knee':
        return rig.kneeY + 2;
      case 'midi':
        return rig.crotchY + legLen * 0.56;
      case 'maxi':
        return rig.footY - 12;
      case 'hip':
      default:
        return variant === 'jacket'
          ? rig.hipY + 8
          : bp.hasHood || subtype === 'sweater'
            ? rig.hipY + 2
            : rig.hipY - 4;
    }
  })();

  const hemBackX = isFullLengthPiece
    ? s.hipBackX - ease - 8
    : Math.min(backWaist, s.hipBackX - ease * 0.6);
  const hemFrontX = isFullLengthPiece
    ? s.hipFrontX + ease + 8
    : Math.max(frontWaist, s.hipFrontX + ease * 0.65);

  const bodyPath = isFullLengthPiece
    ? [
        `M ${s.shoulderBackX - 2} ${rig.shoulderY - 3}`,
        `Q ${rig.cx} ${rig.shoulderY - 6} ${s.shoulderFrontX + 2.5} ${rig.shoulderY - 1}`,
        `C ${frontBust + 1} ${s.bustApexY - 4}, ${frontBust + 1} ${s.bustApexY + 6}, ${frontWaist} ${rig.waistY}`,
        `C ${s.hipFrontX + ease + 2} ${rig.hipY}, ${hemFrontX} ${hemY - 26}, ${hemFrontX} ${hemY}`,
        `Q ${rig.cx} ${hemY + 4} ${hemBackX} ${hemY}`,
        `C ${s.hipBackX - ease - 2} ${s.gluteApexY}, ${backWaist} ${rig.waistY}, ${backChest} ${rig.chestY}`,
        `C ${backChest} ${rig.shoulderY + 10}, ${s.shoulderBackX - 2} ${rig.shoulderY + 2}, ${s.shoulderBackX - 2} ${rig.shoulderY - 3}`,
        'Z',
      ].join(' ')
    : [
        `M ${s.shoulderBackX - 2} ${rig.shoulderY - 3}`,
        `Q ${rig.cx} ${rig.shoulderY - 6} ${s.shoulderFrontX + 2.5} ${rig.shoulderY - 1}`,
        `C ${frontBust + 1} ${s.bustApexY - 4}, ${frontBust + 1} ${s.bustApexY + 8}, ${frontWaist} ${rig.waistY}`,
        `C ${frontWaist} ${rig.waistY + 12}, ${hemFrontX} ${hemY - 10}, ${hemFrontX} ${hemY}`,
        `Q ${rig.cx} ${hemY + 3.5} ${hemBackX} ${hemY}`,
        `C ${hemBackX} ${hemY - 12}, ${backWaist} ${rig.waistY + 10}, ${backWaist} ${rig.waistY}`,
        `C ${backChest} ${rig.chestY + 12}, ${backChest} ${rig.shoulderY + 12}, ${s.shoulderBackX - 2} ${rig.shoulderY - 3}`,
        'Z',
      ].join(' ');

  const sa = rig.sideArm;
  const midY = (sa.elbow.y + sa.wrist.y) * 0.52;
  const midFrontX = (sa.elbow.frontX + sa.wrist.frontX) * 0.52;
  const midBackX = (sa.elbow.backX + sa.wrist.backX) * 0.52;

  const sleevePath = isLongSleeve
    ? [
        `M ${sa.shoulder.backX - slEase} ${sa.shoulder.y}`,
        `Q ${rig.cx} ${rig.shoulderY - 1} ${sa.shoulder.frontX + slEase} ${sa.shoulder.y}`,
        `C ${sa.elbow.frontX + slEase} ${sa.elbow.y - 6}, ${sa.elbow.frontX + slEase} ${sa.elbow.y + 6}, ${sa.wrist.frontX + slEase * 0.75} ${sa.wrist.y}`,
        `L ${sa.wrist.backX - slEase * 0.75} ${sa.wrist.y + 1}`,
        `C ${sa.elbow.backX - slEase} ${sa.elbow.y + 6}, ${sa.elbow.backX - slEase} ${sa.elbow.y - 6}, ${sa.shoulder.backX - slEase} ${sa.shoulder.y}`,
        'Z',
      ].join(' ')
    : isThreeQuarter
      ? [
          `M ${sa.shoulder.backX - slEase} ${sa.shoulder.y}`,
          `Q ${rig.cx} ${rig.shoulderY - 1} ${sa.shoulder.frontX + slEase} ${sa.shoulder.y}`,
          `C ${sa.elbow.frontX + slEase} ${sa.elbow.y - 4}, ${sa.elbow.frontX + slEase} ${sa.elbow.y + 4}, ${midFrontX + slEase * 0.8} ${midY}`,
          `L ${midBackX - slEase * 0.8} ${midY + 1}`,
          `C ${sa.elbow.backX - slEase} ${sa.elbow.y + 4}, ${sa.elbow.backX - slEase} ${sa.elbow.y - 4}, ${sa.shoulder.backX - slEase} ${sa.shoulder.y}`,
          'Z',
        ].join(' ')
      : [
          `M ${sa.shoulder.backX - slEase} ${sa.shoulder.y}`,
          `Q ${rig.cx} ${rig.shoulderY - 1} ${sa.shoulder.frontX + slEase} ${sa.shoulder.y}`,
          `L ${sa.bicep.frontX + slEase} ${sa.bicep.y}`,
          `L ${sa.bicep.backX - slEase} ${sa.bicep.y + 1}`,
          'Z',
        ].join(' ');

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const trimFill = bp.secondaryColorHex ?? baseFill;
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const patternId =
    garmentMeta?.pattern === 'striped' ||
    garmentMeta?.pattern === 'plaid' ||
    garmentMeta?.pattern === 'textured' ||
    bp.fabricTexture === 'knit' ||
    bp.fabricTexture === 'ribbed' ||
    bp.fabricTexture === 'corduroy'
      ? `${patternPrefix}-pat-${
          garmentMeta?.pattern === 'striped' || garmentMeta?.pattern === 'plaid'
            ? garmentMeta.pattern
            : 'textured'
        }`
      : null;

  return (
    <g data-garment={`${variant}-side`} aria-label={`Plantilla de ${variant} en vista de perfil`}>
      {bp.hasHood && (
        <path
          d={`M ${s.shoulderBackX - 2} ${rig.shoulderY - 3} C ${s.shoulderBackX - 13} ${rig.shoulderY - 12}, ${s.shoulderBackX - 14} ${rig.shoulderY + 7}, ${backChest - 2} ${rig.chestY - 4} Z`}
          fill={trimFill}
          fillOpacity={showHeatmap ? 0.16 : 0.95}
          stroke={strokeColor}
          strokeWidth="1.05"
        />
      )}

      {neckline === 'turtleneck' && (
        <path
          d={`M ${s.shoulderBackX - 1} ${rig.shoulderY - 2} L ${s.shoulderBackX} ${rig.shoulderY - 14} L ${s.shoulderFrontX + 1} ${rig.shoulderY - 13} L ${s.shoulderFrontX + 1.5} ${rig.shoulderY - 1} Z`}
          fill={trimFill}
          fillOpacity={showHeatmap ? 0.18 : 0.96}
          stroke={strokeColor}
          strokeWidth="1"
        />
      )}

      <path d={bodyPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.95} />
      {patternId && !showHeatmap && <path d={bodyPath} fill={`url(#${patternId})`} opacity="0.82" />}
      {!showHeatmap && (
        <>
          <path d={bodyPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.58" />
          <path d={bodyPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.46" />
        </>
      )}
      <path d={bodyPath} fill="none" stroke={strokeColor} strokeWidth="1.15" strokeLinejoin="round" />

      {!isSleeveless && (
        <g>
          <path d={sleevePath} fill={baseFill} fillOpacity={showHeatmap ? 0.2 : 0.97} />
          {patternId && !showHeatmap && (
            <path d={sleevePath} fill={`url(#${patternId})`} opacity="0.82" />
          )}
          {!showHeatmap && (
            <path d={sleevePath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.65" />
          )}
          <path
            d={sleevePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
          {isLongSleeve && !showHeatmap && (
            <line
              x1={sa.wrist.backX - slEase * 0.6}
              y1={sa.wrist.y - 5.5}
              x2={sa.wrist.frontX + slEase * 0.6}
              y2={sa.wrist.y - 6}
              stroke={bp.hasRibbedTrim && bp.secondaryColorHex ? bp.secondaryColorHex : seamColor}
              strokeWidth={bp.hasRibbedTrim && bp.secondaryColorHex ? '1.9' : '0.95'}
            />
          )}
        </g>
      )}

      {showHeatmap && shouldersZone && (
        <g data-heatmap-zone="shoulders" data-fit-state={shouldersZone.state}>
          <rect
            x={s.shoulderBackX - 3}
            y={rig.shoulderY - 4}
            width={Math.max(18, s.shoulderFrontX - s.shoulderBackX + 6)}
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
            x={backChest}
            y={rig.chestY - 12}
            width={Math.max(24, frontBust - backChest)}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(chestZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[chestZone.state]}
            strokeWidth="1.75"
          />
          <text
            x={rig.cx}
            y={rig.chestY + 10}
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
            x={backWaist}
            y={rig.waistY - 4}
            width={Math.max(20, frontWaist - backWaist)}
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
            x={s.hipBackX - ease}
            y={rig.hipY - 12}
            width={Math.max(24, s.hipFrontX - s.hipBackX + ease * 2)}
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
