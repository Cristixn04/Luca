import type { FitReport } from '@luca/domain';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveLowerSubtype,
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

  const subtype = resolveLowerSubtype(variant, garmentMeta);
  const cx = rig.cx;
  const wEase = computeFittedEasePx(waistZone?.easeCm, 0.4);
  const hEase = computeFittedEasePx(hipZone?.easeCm, 0.5);
  const legEase = Math.max(2.2, hEase * 0.82);

  const wHalf = rig.waistX + wEase;
  const hHalf = rig.hipX + hEase;
  const legLen = rig.footY - rig.crotchY;

  const shortHemY = rig.crotchY + legLen * 0.27;
  const skirtHemY =
    subtype === 'skirt_mini'
      ? rig.crotchY + legLen * 0.25
      : subtype === 'skirt_maxi'
        ? rig.footY - 12
        : rig.crotchY + legLen * 0.54;
  const pantsHemY = rig.ankleJointY + 3;

  const kneeOuter = rig.kneeOuterX + legEase;
  const calfOuter = Math.max(rig.calfOuterX + legEase, kneeOuter - 0.5);
  const ankleOuter = Math.max(rig.ankleOuterX + legEase * 1.15, calfOuter * 0.82);
  const ankleInner = Math.max(3.6, rig.ankleInnerX - 1.6);
  const kneeInner = Math.max(3.2, rig.kneeInnerX - 1.4);
  const shortOuter = Math.max(rig.hipX * 0.86 + legEase, kneeOuter + 2);
  const skirtFlare = subtype === 'skirt_maxi' ? 14 : subtype === 'skirt_mini' ? 5 : 9.5;

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

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const hasBackPhoto = isSafeDataImageUrl(garmentMeta?.backImageUrl);
  const clipId = `${patternPrefix}-${variant}-back-clip`;

  const hemBottom = variant === 'skirt' ? skirtHemY : variant === 'shorts' ? shortHemY : pantsHemY;
  const maxHalfX = Math.max(hHalf + skirtFlare, hHalf + 4);
  const imgX = cx - maxHalfX;
  const imgY = rig.waistY - 2;
  const imgW = maxHalfX * 2;
  const imgH = hemBottom - rig.waistY + 10;

  const patternId =
    !hasBackPhoto &&
    (garmentMeta?.pattern === 'striped' ||
      garmentMeta?.pattern === 'plaid' ||
      garmentMeta?.pattern === 'textured')
      ? `${patternPrefix}-pat-${garmentMeta.pattern}`
      : null;

  return (
    <g data-garment={`${variant}-back`} aria-label={`Plantilla de ${variant} en vista de espalda`}>
      <defs>
        <clipPath id={clipId}>
          <path d={garmentPath} />
        </clipPath>
      </defs>

      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.96} />

      {hasBackPhoto && (
        <image
          href={garmentMeta.backImageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={showHeatmap ? 0.28 : 0.96}
          data-garment-photo="back"
        />
      )}

      {patternId && !showHeatmap && (
        <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.82" />
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
            stroke={seamColor}
            strokeWidth="1"
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
