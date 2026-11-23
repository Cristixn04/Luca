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

export interface BackPantsTemplateProps {
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

export function BackPantsTemplate({
  rig,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix,
  variant = 'pants',
}: BackPantsTemplateProps) {
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  const bp = resolveLowerBlueprint(variant, garmentMeta);
  const { subtype, garmentLength, fitCut } = bp;
  const cx = rig.cx;
  const wEase = computeFittedEasePx(waistZone?.easeCm, 0.4);
  const hEase = computeFittedEasePx(hipZone?.easeCm, 0.5);
  const legEase = Math.max(1.4, hEase * 0.82 + bp.legWidthBoostPx * 0.65);

  const wHalf = rig.waistX + wEase;
  const hHalf = rig.hipX + hEase;
  const legLen = rig.footY - rig.crotchY;

  const shortHemY = garmentLength === 'knee' ? rig.kneeY - 2 : rig.crotchY + legLen * 0.27;
  const skirtHemY =
    garmentLength === 'thigh'
      ? rig.crotchY + legLen * 0.25
      : garmentLength === 'knee'
        ? rig.kneeY + 3
        : garmentLength === 'maxi' || garmentLength === 'ankle'
          ? rig.footY - 12
          : rig.crotchY + legLen * 0.54;
  const pantsHemY =
    garmentLength === 'knee'
      ? rig.kneeY + 4
      : garmentLength === 'midi'
        ? rig.calfY + 14
        : rig.ankleJointY + 3;

  const kneeOuter =
    fitCut === 'wide_leg' || fitCut === 'oversized'
      ? Math.max(rig.kneeOuterX + legEase, hHalf * 0.94)
      : rig.kneeOuterX + legEase;
  const calfOuter =
    fitCut === 'wide_leg' || fitCut === 'oversized'
      ? Math.max(rig.calfOuterX + legEase, kneeOuter)
      : fitCut === 'skinny'
        ? rig.calfOuterX + Math.max(1.2, legEase * 0.7)
        : Math.max(rig.calfOuterX + legEase, kneeOuter - 0.5);
  const ankleOuter =
    fitCut === 'flared'
      ? Math.max(rig.ankleOuterX + legEase + 5.5, calfOuter + 3.5)
      : fitCut === 'wide_leg' || fitCut === 'oversized'
        ? Math.max(calfOuter + 1.5, hHalf * 0.96)
        : fitCut === 'skinny'
          ? rig.ankleOuterX + 1.6
          : Math.max(rig.ankleOuterX + legEase * 1.15, calfOuter * 0.82);

  const ankleInner = Math.max(3.2, rig.ankleInnerX - (fitCut === 'wide_leg' ? 2.4 : 1.6));
  const kneeInner = Math.max(3.0, rig.kneeInnerX - 1.4);
  const shortOuter = Math.max(rig.hipX * 0.86 + legEase, kneeOuter + 2);
  const skirtFlareBase =
    garmentLength === 'maxi' || garmentLength === 'ankle'
      ? 14
      : garmentLength === 'thigh'
        ? 5
        : 9.5;
  const skirtFlare =
    fitCut === 'a_line' || fitCut === 'pleated' || fitCut === 'flared'
      ? skirtFlareBase + 5
      : fitCut === 'fitted' || fitCut === 'skinny'
        ? Math.max(1.5, skirtFlareBase - 5)
        : skirtFlareBase;

  const garmentPath =
    variant === 'skirt'
      ? [
          `M ${cx - wHalf} ${rig.waistY}`,
          `Q ${cx} ${rig.waistY + 2} ${cx + wHalf} ${rig.waistY}`,
          `C ${cx + hHalf + 1} ${rig.hipY - 4}, ${cx + hHalf + skirtFlare} ${skirtHemY - 28}, ${cx + hHalf + skirtFlare} ${skirtHemY}`,
          `Q ${cx} ${skirtHemY + 5.5} ${cx - hHalf - skirtFlare} ${skirtHemY}`,
          `C ${cx - hHalf - skirtFlare} ${skirtHemY - 28}, ${cx - hHalf - 1} ${rig.hipY - 4}, ${cx - wHalf} ${rig.waistY}`,
          'Z',
        ].join(' ')
      : variant === 'shorts'
        ? [
            `M ${cx - wHalf} ${rig.waistY}`,
            `Q ${cx} ${rig.waistY + 2} ${cx + wHalf} ${rig.waistY}`,
            `C ${cx + hHalf + 1} ${rig.hipY - 4}, ${cx + hHalf} ${rig.crotchY - 4}, ${cx + hHalf} ${rig.crotchY}`,
            `L ${cx + shortOuter} ${shortHemY}`,
            `L ${cx + kneeInner} ${shortHemY}`,
            `L ${cx} ${rig.crotchY + 5}`,
            `L ${cx - kneeInner} ${shortHemY}`,
            `L ${cx - shortOuter} ${shortHemY}`,
            `L ${cx - hHalf} ${rig.crotchY}`,
            `C ${cx - hHalf} ${rig.crotchY - 4}, ${cx - hHalf - 1} ${rig.hipY - 4}, ${cx - wHalf} ${rig.waistY}`,
            'Z',
          ].join(' ')
        : [
            `M ${cx - wHalf} ${rig.waistY}`,
            `Q ${cx} ${rig.waistY + 2} ${cx + wHalf} ${rig.waistY}`,
            `C ${cx + hHalf + 1} ${rig.hipY - 4}, ${cx + hHalf} ${rig.crotchY - 2}, ${cx + hHalf} ${rig.crotchY}`,
            `C ${cx + hHalf * 0.96} ${rig.crotchY + 24}, ${cx + kneeOuter + 1} ${rig.kneeY - 12}, ${cx + kneeOuter} ${rig.kneeY}`,
            `C ${cx + calfOuter} ${rig.calfY - 8}, ${cx + calfOuter} ${rig.calfY + 12}, ${cx + ankleOuter} ${pantsHemY}`,
            `L ${cx + ankleInner} ${pantsHemY}`,
            `C ${cx + ankleInner} ${rig.calfY + 10}, ${cx + kneeInner} ${rig.kneeY + 6}, ${cx + kneeInner} ${rig.kneeY}`,
            `C ${cx + kneeInner} ${rig.crotchY + 26}, ${cx + 3} ${rig.crotchY + 8}, ${cx} ${rig.crotchY + 5}`,
            `C ${cx - 3} ${rig.crotchY + 8}, ${cx - kneeInner} ${rig.crotchY + 26}, ${cx - kneeInner} ${rig.kneeY}`,
            `C ${cx - kneeInner} ${rig.kneeY + 6}, ${cx - ankleInner} ${rig.calfY + 10}, ${cx - ankleInner} ${pantsHemY}`,
            `L ${cx - ankleOuter} ${pantsHemY}`,
            `C ${cx - calfOuter} ${rig.calfY + 12}, ${cx - calfOuter} ${rig.calfY - 8}, ${cx - kneeOuter} ${rig.kneeY}`,
            `C ${cx - kneeOuter - 1} ${rig.kneeY - 12}, ${cx - hHalf * 0.96} ${rig.crotchY + 24}, ${cx - hHalf} ${rig.crotchY}`,
            `C ${cx - hHalf} ${rig.crotchY - 2}, ${cx - hHalf - 1} ${rig.hipY - 4}, ${cx - wHalf} ${rig.waistY}`,
            'Z',
          ].join(' ');

  const resolvedPrimary = bp.primaryColorHex ?? garmentColorHex;
  const baseFill = resolvedPrimary ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(resolvedPrimary);
  const seamColor = resolveGarmentSeamColor(resolvedPrimary);
  const customPatternId = `${patternPrefix}-${variant}-back-twin-pat`;
  const stripeStep = bp.stripeDensity === 'fine' ? 6 : bp.stripeDensity === 'wide' ? 14 : 9.5;
  const stripeColor = bp.secondaryColorHex ?? 'rgb(255 255 255 / 28%)';
  const hasCustomPattern =
    bp.patternType === 'horizontal_stripes' ||
    bp.patternType === 'vertical_stripes' ||
    bp.patternType === 'plaid' ||
    bp.patternType === 'dots' ||
    bp.patternType === 'ribbed';

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
    <g data-garment={`${variant}-back`} aria-label={`Plantilla de ${variant} en vista de espalda`}>
      <defs>
        {hasCustomPattern && bp.patternType === 'horizontal_stripes' && (
          <pattern id={customPatternId} width="16" height={stripeStep} patternUnits="userSpaceOnUse">
            <rect width="16" height={stripeStep * 0.36} fill={stripeColor} opacity="0.78" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'vertical_stripes' && (
          <pattern id={customPatternId} width={stripeStep} height="16" patternUnits="userSpaceOnUse">
            <rect width={stripeStep * 0.3} height="16" fill={stripeColor} opacity="0.76" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'plaid' && (
          <pattern id={customPatternId} width={stripeStep * 1.5} height={stripeStep * 1.5} patternUnits="userSpaceOnUse">
            <rect width={stripeStep * 1.5} height={stripeStep * 0.24} fill={stripeColor} opacity="0.6" />
            <rect width={stripeStep * 0.24} height={stripeStep * 1.5} fill={stripeColor} opacity="0.6" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'dots' && (
          <pattern id={customPatternId} width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.4" fill={stripeColor} opacity="0.82" />
            <circle cx="8.5" cy="8.5" r="1.4" fill={stripeColor} opacity="0.82" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'ribbed' && (
          <pattern id={customPatternId} width="3.8" height="10" patternUnits="userSpaceOnUse">
            <line x1="1" y1="0" x2="1" y2="10" stroke="rgb(255 255 255 / 15%)" strokeWidth="0.75" />
            <line x1="2.7" y1="0" x2="2.7" y2="10" stroke="rgb(0 0 0 / 14%)" strokeWidth="0.75" />
          </pattern>
        )}
      </defs>

      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.96} />

      {hasCustomPattern && !showHeatmap ? (
        <path d={garmentPath} fill={`url(#${customPatternId})`} />
      ) : (
        patternId && !showHeatmap && <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.82" />
      )}

      {!showHeatmap && (
        <>
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.58" />
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.44" />
        </>
      )}

      <path
        d={garmentPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.15"
        strokeLinejoin="round"
      />

      {!showHeatmap && (
        <g pointerEvents="none">
          <path
            d={`M ${cx - wHalf + 1} ${rig.waistY + 7.5} Q ${cx} ${rig.waistY + 9} ${cx + wHalf - 1} ${rig.waistY + 7.5}`}
            fill="none"
            stroke={bp.secondaryColorHex ?? seamColor}
            strokeWidth={bp.closure === 'belt' ? '1.8' : '1'}
          />

          {variant !== 'skirt' ? (
            <>
              <line
                x1={cx}
                y1={rig.waistY + 7.5}
                x2={cx}
                y2={rig.crotchY + 4}
                stroke={seamColor}
                strokeWidth="0.95"
              />
              {subtype === 'jeans' && (
                <path
                  d={`M ${cx - wHalf + 2} ${rig.waistY + 12.5} L ${cx} ${rig.waistY + 20} L ${cx + wHalf - 2} ${rig.waistY + 12.5}`}
                  fill="none"
                  stroke={seamColor}
                  strokeWidth="0.9"
                />
              )}
              <path
                d={`M ${cx - hHalf * 0.66} ${rig.hipY - 7} L ${cx - hHalf * 0.18} ${rig.hipY - 7} L ${cx - hHalf * 0.2} ${rig.hipY + 8} L ${cx - hHalf * 0.42} ${rig.hipY + 12.5} L ${cx - hHalf * 0.64} ${rig.hipY + 8} Z`}
                fill="rgb(0 0 0 / 5%)"
                stroke={seamColor}
                strokeWidth="0.95"
                strokeLinejoin="round"
              />
              <path
                d={`M ${cx + hHalf * 0.18} ${rig.hipY - 7} L ${cx + hHalf * 0.66} ${rig.hipY - 7} L ${cx + hHalf * 0.64} ${rig.hipY + 8} L ${cx + hHalf * 0.42} ${rig.hipY + 12.5} L ${cx + hHalf * 0.2} ${rig.hipY + 8} Z`}
                fill="rgb(0 0 0 / 5%)"
                stroke={seamColor}
                strokeWidth="0.95"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <line
              x1={cx}
              y1={rig.waistY + 7.5}
              x2={cx}
              y2={skirtHemY - 2}
              stroke={seamColor}
              strokeWidth="0.9"
            />
          )}
        </g>
      )}

      {showHeatmap && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={cx - wHalf}
            y={rig.waistY - 2}
            width={wHalf * 2}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={rig.waistY + 13}
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
            y={rig.hipY - 12}
            width={hHalf * 2}
            height={28}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={rig.hipY + 6}
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
