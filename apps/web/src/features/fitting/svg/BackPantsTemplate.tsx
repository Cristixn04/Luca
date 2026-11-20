import type { FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveLowerSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { LowerGarmentVariant } from './PantsTemplate';

export interface BackPantsTemplateProps {
  anchors: FrontAvatarAnchors;
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
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix,
  variant = 'pants',
}: BackPantsTemplateProps) {
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  const waistOffset = waistZone ? clampVisualEaseOffsetPx(waistZone.easeCm, anchors.scale) : 3;
  const hipOffset = hipZone ? clampVisualEaseOffsetPx(hipZone.easeCm, anchors.scale) : 4;

  const subtype = resolveLowerSubtype(variant, garmentMeta);
  const cx = anchors.centerX;
  const wHalf = Math.max(anchors.waistHalfW * 0.9, anchors.waistHalfW + waistOffset);
  const hHalf = Math.max(anchors.hipHalfW * 0.92, anchors.hipHalfW + hipOffset);
  const legLength = anchors.ankleY - anchors.crotchY;
  const shortHemY = anchors.crotchY + legLength * 0.28;
  const skirtHemY =
    subtype === 'skirt_mini'
      ? anchors.crotchY + legLength * 0.26
      : subtype === 'skirt_maxi'
        ? anchors.ankleY - 12
        : anchors.crotchY + legLength * 0.54;
  const pantsHemY = anchors.ankleY - 6;
  const ankleOuter = Math.max(anchors.ankleHalfW + 10, hHalf * 0.56);
  const kneeOuter = Math.max(ankleOuter + 3, hHalf * 0.72);
  const shortOuter = Math.max(hHalf * 0.88, ankleOuter + 6);
  const innerGap = 4.5;
  const skirtFlare = subtype === 'skirt_maxi' ? 16 : subtype === 'skirt_mini' ? 6 : 11;

  const garmentPath =
    variant === 'skirt'
      ? [
          `M ${cx - wHalf} ${anchors.waistY}`,
          `Q ${cx} ${anchors.waistY + 2} ${cx + wHalf} ${anchors.waistY}`,
          `C ${cx + hHalf + 2} ${anchors.hipY - 4}, ${cx + hHalf + skirtFlare} ${skirtHemY - 28}, ${cx + hHalf + skirtFlare} ${skirtHemY}`,
          `Q ${cx} ${skirtHemY + 6} ${cx - hHalf - skirtFlare} ${skirtHemY}`,
          `C ${cx - hHalf - skirtFlare} ${skirtHemY - 28}, ${cx - hHalf - 2} ${anchors.hipY - 4}, ${cx - wHalf} ${anchors.waistY}`,
          'Z',
        ].join(' ')
      : variant === 'shorts'
        ? [
            `M ${cx - wHalf} ${anchors.waistY}`,
            `Q ${cx} ${anchors.waistY + 2} ${cx + wHalf} ${anchors.waistY}`,
            `C ${cx + hHalf + 2} ${anchors.hipY - 4}, ${cx + hHalf + 1} ${anchors.crotchY - 4}, ${cx + hHalf} ${anchors.crotchY}`,
            `L ${cx + shortOuter} ${shortHemY}`,
            `L ${cx + innerGap + 1.5} ${shortHemY}`,
            `L ${cx} ${anchors.crotchY + 5}`,
            `L ${cx - innerGap - 1.5} ${shortHemY}`,
            `L ${cx - shortOuter} ${shortHemY}`,
            `L ${cx - hHalf} ${anchors.crotchY}`,
            `C ${cx - hHalf - 1} ${anchors.crotchY - 4}, ${cx - hHalf - 2} ${anchors.hipY - 4}, ${cx - wHalf} ${anchors.waistY}`,
            'Z',
          ].join(' ')
        : [
            `M ${cx - wHalf} ${anchors.waistY}`,
            `Q ${cx} ${anchors.waistY + 2} ${cx + wHalf} ${anchors.waistY}`,
            `C ${cx + hHalf + 2} ${anchors.hipY - 4}, ${cx + hHalf + 1} ${anchors.crotchY - 2}, ${cx + hHalf} ${anchors.crotchY}`,
            `C ${cx + kneeOuter + 1} ${anchors.kneeY - 20}, ${cx + kneeOuter} ${anchors.kneeY + 12}, ${cx + ankleOuter} ${pantsHemY}`,
            `L ${cx + innerGap + 4} ${pantsHemY}`,
            `C ${cx + innerGap + 3} ${anchors.kneeY + 10}, ${cx + innerGap + 1} ${anchors.kneeY - 24}, ${cx} ${anchors.crotchY + 6}`,
            `C ${cx - innerGap - 1} ${anchors.kneeY - 24}, ${cx - innerGap - 3} ${anchors.kneeY + 10}, ${cx - innerGap - 4} ${pantsHemY}`,
            `L ${cx - ankleOuter} ${pantsHemY}`,
            `C ${cx - kneeOuter} ${anchors.kneeY + 12}, ${cx - kneeOuter - 1} ${anchors.kneeY - 20}, ${cx - hHalf} ${anchors.crotchY}`,
            `C ${cx - hHalf - 1} ${anchors.crotchY - 2}, ${cx - hHalf - 2} ${anchors.hipY - 4}, ${cx - wHalf} ${anchors.waistY}`,
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
  const imgY = anchors.waistY - 2;
  const imgW = maxHalfX * 2;
  const imgH = hemBottom - anchors.waistY + 10;

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

      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.95} />

      {hasBackPhoto && (
        <image
          href={garmentMeta.backImageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={showHeatmap ? 0.3 : 0.96}
          data-garment-photo="back"
        />
      )}

      {patternId && !showHeatmap && (
        <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.85" />
      )}

      {!showHeatmap && (
        <>
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.62" />
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.48" />
        </>
      )}

      <path
        d={garmentPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      {!showHeatmap && (
        <g pointerEvents="none">
          <path
            d={`M ${cx - wHalf + 1} ${anchors.waistY + 8} Q ${cx} ${anchors.waistY + 9.5} ${cx + wHalf - 1} ${anchors.waistY + 8}`}
            fill="none"
            stroke={seamColor}
            strokeWidth="1.05"
          />

          {variant !== 'skirt' ? (
            <>
              <line
                x1={cx}
                y1={anchors.waistY + 8}
                x2={cx}
                y2={anchors.crotchY + 4}
                stroke={seamColor}
                strokeWidth="1"
              />
              {/* Canesú en V para jeans */}
              {subtype === 'jeans' && (
                <path
                  d={`M ${cx - wHalf + 2} ${anchors.waistY + 13} L ${cx} ${anchors.waistY + 21} L ${cx + wHalf - 2} ${anchors.waistY + 13}`}
                  fill="none"
                  stroke={seamColor}
                  strokeWidth="0.95"
                />
              )}
              {/* Bolsillos traseros */}
              <path
                d={`M ${cx - hHalf * 0.68} ${anchors.hipY - 8} L ${cx - hHalf * 0.2} ${anchors.hipY - 8} L ${cx - hHalf * 0.22} ${anchors.hipY + 8} L ${cx - hHalf * 0.44} ${anchors.hipY + 13} L ${cx - hHalf * 0.66} ${anchors.hipY + 8} Z`}
                fill="rgb(0 0 0 / 5%)"
                stroke={seamColor}
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <path
                d={`M ${cx + hHalf * 0.2} ${anchors.hipY - 8} L ${cx + hHalf * 0.68} ${anchors.hipY - 8} L ${cx + hHalf * 0.66} ${anchors.hipY + 8} L ${cx + hHalf * 0.44} ${anchors.hipY + 13} L ${cx + hHalf * 0.22} ${anchors.hipY + 8} Z`}
                fill="rgb(0 0 0 / 5%)"
                stroke={seamColor}
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <line
              x1={cx}
              y1={anchors.waistY + 8}
              x2={cx}
              y2={skirtHemY - 2}
              stroke={seamColor}
              strokeWidth="0.95"
            />
          )}
        </g>
      )}

      {showHeatmap && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={cx - wHalf}
            y={anchors.waistY - 2}
            width={wHalf * 2}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={anchors.waistY + 13}
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
            y={anchors.hipY - 12}
            width={hHalf * 2}
            height={28}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.6"
          />
          <text
            x={cx}
            y={anchors.hipY + 6}
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
