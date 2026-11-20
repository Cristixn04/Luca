import type { FitReport, ZoneFitResult } from '@luca/domain';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentButtonColor,
  resolveGarmentSeamColor,
  resolveLowerSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import { computeFittedEasePx, type MannequinRig } from './mannequinRig';

export type LowerGarmentVariant = 'pants' | 'shorts' | 'skirt';

export interface PantsTemplateProps {
  rig: MannequinRig;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  garmentMeta?: GarmentVisualMeta;
  patternPrefix?: string;
  variant?: LowerGarmentVariant;
}

function findZone(report: FitReport, zone: 'waist' | 'hip'): ZoneFitResult | undefined {
  return report.evaluatedZones.find((item) => item.zone === zone);
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function PantsTemplate({
  rig,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix = 'front',
  variant = 'pants',
}: PantsTemplateProps) {
  const waistZone = findZone(fitReport, 'waist');
  const hipZone = findZone(fitReport, 'hip');

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

  // Contorno de pierna envuelve exactamente muslo -> rodilla -> pantorrilla -> tobillo sin sobresalir
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
          `Q ${cx} ${rig.waistY + 2.5} ${cx + wHalf} ${rig.waistY}`,
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
            `Q ${cx + (shortOuter + kneeInner) * 0.5} ${shortHemY + 2} ${cx + kneeInner} ${shortHemY}`,
            `L ${cx} ${rig.crotchY + 5}`,
            `L ${cx - kneeInner} ${shortHemY}`,
            `Q ${cx - (shortOuter + kneeInner) * 0.5} ${shortHemY + 2} ${cx - shortOuter} ${shortHemY}`,
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
            `Q ${cx + (ankleOuter + ankleInner) * 0.5} ${pantsHemY + 2} ${cx + ankleInner} ${pantsHemY}`,
            `C ${cx + ankleInner} ${rig.calfY + 10}, ${cx + kneeInner} ${rig.kneeY + 6}, ${cx + kneeInner} ${rig.kneeY}`,
            `C ${cx + kneeInner} ${rig.crotchY + 26}, ${cx + 3} ${rig.crotchY + 8}, ${cx} ${rig.crotchY + 5}`,
            `C ${cx - 3} ${rig.crotchY + 8}, ${cx - kneeInner} ${rig.crotchY + 26}, ${cx - kneeInner} ${rig.kneeY}`,
            `C ${cx - kneeInner} ${rig.kneeY + 6}, ${cx - ankleInner} ${rig.calfY + 10}, ${cx - ankleInner} ${pantsHemY}`,
            `Q ${cx - (ankleOuter + ankleInner) * 0.5} ${pantsHemY + 2} ${cx - ankleOuter} ${pantsHemY}`,
            `C ${cx - calfOuter} ${rig.calfY + 12}, ${cx - calfOuter} ${rig.calfY - 8}, ${cx - kneeOuter} ${rig.kneeY}`,
            `C ${cx - kneeOuter - 1} ${rig.kneeY - 12}, ${cx - hHalf * 0.96} ${rig.crotchY + 24}, ${cx - hHalf} ${rig.crotchY}`,
            `C ${cx - hHalf} ${rig.crotchY - 2}, ${cx - hHalf - 1} ${rig.hipY - 4}, ${cx - wHalf} ${rig.waistY}`,
            'Z',
          ].join(' ');

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const buttonColor = resolveGarmentButtonColor(garmentColorHex);
  const hasPhoto = isSafeDataImageUrl(garmentMeta?.imageUrl);
  const clipId = `${patternPrefix}-${variant}-clip`;

  const hemBottom = variant === 'skirt' ? skirtHemY : variant === 'shorts' ? shortHemY : pantsHemY;
  const maxHalfX = Math.max(hHalf + skirtFlare, hHalf + 4);
  const imgX = cx - maxHalfX;
  const imgY = rig.waistY - 2;
  const imgW = maxHalfX * 2;
  const imgH = hemBottom - rig.waistY + 10;

  const patternId =
    !hasPhoto &&
    (garmentMeta?.pattern === 'striped' ||
      garmentMeta?.pattern === 'plaid' ||
      garmentMeta?.pattern === 'textured')
      ? `${patternPrefix}-pat-${garmentMeta.pattern}`
      : null;

  return (
    <g data-garment={variant} aria-label={`Plantilla de ${variant} sobre el avatar`}>
      <defs>
        <clipPath id={clipId}>
          <path d={garmentPath} />
        </clipPath>
      </defs>

      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.96} />

      {hasPhoto && (
        <image
          href={garmentMeta.imageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={showHeatmap ? 0.28 : 0.96}
          data-garment-photo="front"
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
            d={`M ${cx - wHalf + 1} ${rig.waistY + 7.5} Q ${cx} ${rig.waistY + 9.5} ${cx + wHalf - 1} ${rig.waistY + 7.5}`}
            fill="none"
            stroke={seamColor}
            strokeWidth="1"
          />

          {variant !== 'skirt' ? (
            <>
              <circle cx={cx} cy={rig.waistY + 4} r="1.6" fill={buttonColor} opacity="0.82" />
              <path
                d={`M ${cx} ${rig.waistY + 8.5} L ${cx} ${rig.crotchY - 3} Q ${cx - 3.5} ${rig.crotchY - 2} ${cx - 4.5} ${rig.crotchY - 8.5}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.95"
              />
              {subtype === 'jeans' ? (
                <>
                  <path
                    d={`M ${cx - wHalf + 2.5} ${rig.waistY + 8.5} Q ${cx - wHalf + 9.5} ${rig.waistY + 18.5} ${cx - hHalf + 2} ${rig.waistY + 21.5}`}
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="0.95"
                  />
                  <path
                    d={`M ${cx + wHalf - 2.5} ${rig.waistY + 8.5} Q ${cx + wHalf - 9.5} ${rig.waistY + 18.5} ${cx + hHalf - 2} ${rig.waistY + 21.5}`}
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="0.95"
                  />
                </>
              ) : (
                <>
                  <line
                    x1={cx - wHalf + 5}
                    y1={rig.waistY + 9}
                    x2={cx - hHalf + 3}
                    y2={rig.waistY + 25}
                    stroke={seamColor}
                    strokeWidth="0.95"
                  />
                  <line
                    x1={cx + wHalf - 5}
                    y1={rig.waistY + 9}
                    x2={cx + hHalf - 3}
                    y2={rig.waistY + 25}
                    stroke={seamColor}
                    strokeWidth="0.95"
                  />
                </>
              )}
              {variant === 'pants' && (
                <>
                  <line
                    x1={cx - hHalf * 0.5}
                    y1={rig.hipY + 8}
                    x2={cx - (ankleOuter + ankleInner) * 0.5}
                    y2={pantsHemY - 8}
                    stroke={seamColor}
                    strokeWidth="0.7"
                    opacity="0.4"
                  />
                  <line
                    x1={cx + hHalf * 0.5}
                    y1={rig.hipY + 8}
                    x2={cx + (ankleOuter + ankleInner) * 0.5}
                    y2={pantsHemY - 8}
                    stroke={seamColor}
                    strokeWidth="0.7"
                    opacity="0.4"
                  />
                </>
              )}
            </>
          ) : (
            <>
              <path
                d={`M ${cx - wHalf * 0.42} ${rig.waistY + 11} Q ${cx - hHalf * 0.46} ${rig.hipY + 16} ${cx - (hHalf + skirtFlare) * 0.46} ${skirtHemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.9"
                opacity="0.62"
              />
              <path
                d={`M ${cx + wHalf * 0.42} ${rig.waistY + 11} Q ${cx + hHalf * 0.46} ${rig.hipY + 16} ${cx + (hHalf + skirtFlare) * 0.46} ${skirtHemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.9"
                opacity="0.62"
              />
            </>
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
