import type { FitReport } from '@luca/domain';
import {
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveLowerBlueprint,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import { computeFittedEasePx, type MannequinRig } from './mannequinRig';
import type { LowerGarmentVariant } from './PantsTemplate';

export interface SidePantsTemplateProps {
  rig: MannequinRig;
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
  rig,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix,
  variant = 'pants',
}: SidePantsTemplateProps) {
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  const bp = resolveLowerBlueprint(variant, garmentMeta);
  const { garmentLength, fitCut } = bp;
  const wEase = computeFittedEasePx(waistZone?.easeCm, 0.4);
  const hEase = computeFittedEasePx(hipZone?.easeCm, 0.5);
  const legEase = Math.max(1.4, hEase * 0.8 + bp.legWidthBoostPx * 0.65);

  const s = rig.side;
  const wBack = s.waistBackX - wEase;
  const wFront = s.waistFrontX + wEase;
  const hBack = s.hipBackX - hEase;
  const hFront = s.hipFrontX + hEase;
  const thighBack = s.thighBackX - legEase;
  const thighFront = s.thighFrontX + legEase;
  const kneeBack = s.kneeBackX - legEase;
  const kneeFront = s.kneeFrontX + legEase;
  const calfBack = s.calfBackX - legEase;
  const calfFront = s.calfFrontX + legEase;
  const flareAdd = fitCut === 'flared' ? 4.5 : fitCut === 'wide_leg' || fitCut === 'oversized' ? 3 : 0;
  const ankleBack = Math.min(s.ankleBackX - legEase * 1.1 - flareAdd, calfBack + 3);
  const ankleFront = Math.max(s.ankleFrontX + legEase * 1.1 + flareAdd, calfFront + 1);

  const legLen = rig.footY - rig.crotchY;
  const hemY =
    variant === 'shorts'
      ? garmentLength === 'knee'
        ? rig.kneeY - 2
        : rig.crotchY + legLen * 0.27
      : variant === 'skirt'
        ? garmentLength === 'thigh'
          ? rig.crotchY + legLen * 0.25
          : garmentLength === 'knee'
            ? rig.kneeY + 3
            : garmentLength === 'maxi' || garmentLength === 'ankle'
              ? rig.footY - 12
              : rig.crotchY + legLen * 0.54
        : garmentLength === 'knee'
          ? rig.kneeY + 4
          : garmentLength === 'midi'
            ? rig.calfY + 14
            : rig.ankleJointY + 3;

  const path =
    variant === 'skirt'
      ? [
          `M ${wBack} ${rig.waistY}`,
          `L ${wFront} ${rig.waistY}`,
          `C ${hFront + 1} ${rig.hipY - 4}, ${hFront + 7} ${hemY - 24}, ${hFront + 7} ${hemY}`,
          `Q ${rig.cx} ${hemY + 4} ${hBack - 7} ${hemY}`,
          `C ${hBack - 7} ${hemY - 24}, ${hBack - 2} ${s.gluteApexY}, ${wBack} ${rig.waistY}`,
          'Z',
        ].join(' ')
      : variant === 'shorts'
        ? [
            `M ${wBack} ${rig.waistY}`,
            `L ${wFront} ${rig.waistY}`,
            `C ${hFront + 1} ${rig.hipY}, ${thighFront} ${rig.crotchY}, ${thighFront} ${hemY}`,
            `L ${thighBack} ${hemY}`,
            `C ${hBack - 1} ${rig.crotchY}, ${hBack - 2} ${s.gluteApexY}, ${wBack} ${rig.waistY}`,
            'Z',
          ].join(' ')
        : [
            `M ${wBack} ${rig.waistY}`,
            `L ${wFront} ${rig.waistY}`,
            `C ${hFront + 1} ${rig.hipY}, ${thighFront} ${rig.crotchY + 8}, ${kneeFront} ${rig.kneeY}`,
            `C ${calfFront} ${rig.calfY}, ${ankleFront} ${hemY - 12}, ${ankleFront} ${hemY}`,
            `L ${ankleBack} ${hemY}`,
            `C ${calfBack} ${rig.calfY + 6}, ${kneeBack} ${rig.kneeY + 4}, ${thighBack} ${rig.crotchY + 12}`,
            `C ${hBack - 2} ${s.gluteApexY + 10}, ${hBack - 2} ${s.gluteApexY - 10}, ${wBack} ${rig.waistY}`,
            'Z',
          ].join(' ');

  const resolvedPrimary = bp.primaryColorHex ?? garmentColorHex;
  const baseFill = resolvedPrimary ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(resolvedPrimary);
  const seamColor = resolveGarmentSeamColor(resolvedPrimary);
  const patternId =
    garmentMeta?.pattern === 'striped' ||
    garmentMeta?.pattern === 'plaid' ||
    garmentMeta?.pattern === 'textured' ||
    bp.fabricTexture === 'corduroy' ||
    bp.fabricTexture === 'knit'
      ? `${patternPrefix}-pat-${
          garmentMeta?.pattern === 'striped' || garmentMeta?.pattern === 'plaid'
            ? garmentMeta.pattern
            : 'textured'
        }`
      : null;

  return (
    <g data-garment={`${variant}-side`} aria-label={`Plantilla de ${variant} en vista de perfil`}>
      <path d={path} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.95} />
      {patternId && !showHeatmap && <path d={path} fill={`url(#${patternId})`} opacity="0.82" />}
      {!showHeatmap && (
        <>
          <path d={path} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.58" />
          <path d={path} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.44" />
        </>
      )}
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.15" strokeLinejoin="round" />

      {!showHeatmap && (
        <g pointerEvents="none">
          <line
            x1={wBack + 1}
            y1={rig.waistY + 7.5}
            x2={wFront - 1}
            y2={rig.waistY + 7.5}
            stroke={bp.secondaryColorHex ?? seamColor}
            strokeWidth={bp.closure === 'belt' ? '1.8' : '0.95'}
          />
          <line
            x1={rig.cx}
            y1={rig.waistY + 7.5}
            x2={rig.cx}
            y2={hemY - 4}
            stroke={seamColor}
            strokeWidth="0.85"
            opacity="0.55"
          />
          {bp.pockets === 'cargo' && variant !== 'skirt' && (
            <rect
              x={rig.cx - 8}
              y={rig.crotchY + 14}
              width={16}
              height={20}
              rx={2}
              fill="rgb(0 0 0 / 6%)"
              stroke={seamColor}
              strokeWidth="0.95"
            />
          )}
        </g>
      )}

      {showHeatmap && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={wBack}
            y={rig.waistY - 2}
            width={Math.max(20, wFront - wBack)}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={rig.cx}
            y={rig.waistY + 13}
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
            y={rig.hipY - 12}
            width={Math.max(24, hFront - hBack)}
            height={28}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={rig.cx}
            y={rig.hipY + 6}
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
