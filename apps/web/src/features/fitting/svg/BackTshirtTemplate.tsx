import type { BodyModel, FitReport } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveUpperSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import type { UpperGarmentVariant } from './TshirtTemplate';

export interface BackTshirtTemplateProps {
  model: BodyModel;
  anchors: FrontAvatarAnchors;
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

export function BackTshirtTemplate({
  model,
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix,
  variant = 'tshirt',
}: BackTshirtTemplateProps) {
  const chestZone = fitReport.evaluatedZones.find((item) => item.zone === 'chest');
  const shouldersZone = fitReport.evaluatedZones.find((item) => item.zone === 'shoulders');
  const backZone = fitReport.evaluatedZones.find((item) => item.zone === 'back');
  const waistZone = fitReport.evaluatedZones.find((item) => item.zone === 'waist');
  const hipZone = fitReport.evaluatedZones.find((item) => item.zone === 'hip');

  const bodyOffset = chestZone ? clampVisualEaseOffsetPx(chestZone.easeCm, anchors.scale) : 4;
  const shoulderOffset = shouldersZone
    ? clampVisualEaseOffsetPx(shouldersZone.easeCm * 2, anchors.scale)
    : 2;

  const subtype = resolveUpperSubtype(variant, garmentMeta);
  const cx = anchors.centerX;
  const legLen = anchors.ankleY - anchors.crotchY;
  const bulkBoost =
    variant === 'jacket'
      ? 4.5
      : subtype === 'hoodie' || subtype === 'sweater'
        ? 3.2
        : 0;

  const shHalf = Math.max(
    anchors.neckHalfW + 12,
    anchors.shoulderHalfW + shoulderOffset * 0.7 + bulkBoost * 0.5,
  );
  const backBodyHalf = (model.backWidthCm / 2) * anchors.scale;
  const chHalf = Math.max(
    anchors.chestHalfW * 0.9,
    Math.max(anchors.chestHalfW, backBodyHalf) + bodyOffset + bulkBoost,
  );
  const wHalf = Math.max(anchors.waistHalfW * 0.9, anchors.waistHalfW + 3 + bulkBoost * 0.6);
  const hHalf = Math.max(anchors.hipHalfW * 0.92, anchors.hipHalfW + 4 + bulkBoost * 0.4);
  const hemHalf =
    variant === 'dress'
      ? subtype === 'dress_maxi'
        ? hHalf + 18
        : subtype === 'dress_mini'
          ? hHalf + 8
          : hHalf + 14
      : Math.max(wHalf + 2, chHalf * 0.97);

  const isLongSleeve = variant === 'long_sleeve' || variant === 'jacket';
  const isTank = subtype === 'tank';
  const sleeveOuterX = isTank
    ? shHalf - 4
    : isLongSleeve
      ? shHalf + 23 + bulkBoost * 0.4
      : shHalf + 17;
  const sleeveInnerX = isTank
    ? chHalf
    : isLongSleeve
      ? shHalf + 9 + bulkBoost * 0.3
      : chHalf + 8;
  const sleeveEndY = isTank
    ? anchors.chestY + 2
    : isLongSleeve
      ? anchors.hipY + 14
      : anchors.chestY + 15;
  const armpitY = anchors.chestY + 9;

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

  const neckHalf = anchors.neckHalfW + (variant === 'dress' ? 5 : 3);
  const neckTopY = anchors.shoulderY - 6;

  const garmentPath =
    variant === 'dress'
      ? [
          `M ${cx - neckHalf} ${neckTopY}`,
          `Q ${cx} ${neckTopY + 5} ${cx + neckHalf} ${neckTopY}`,
          `L ${cx + shHalf} ${anchors.shoulderY + 4}`,
          `Q ${cx + shHalf + 9} ${anchors.shoulderY + 18} ${cx + shHalf + 7} ${anchors.chestY + 4}`,
          `Q ${cx + chHalf + 2} ${anchors.chestY + 7} ${cx + chHalf} ${armpitY}`,
          `C ${cx + chHalf} ${anchors.waistY - 12}, ${cx + wHalf} ${anchors.waistY - 6}, ${cx + wHalf} ${anchors.waistY}`,
          `C ${cx + hHalf + 2} ${anchors.hipY - 8}, ${cx + hemHalf - 1} ${hemY - 36}, ${cx + hemHalf} ${hemY}`,
          `Q ${cx} ${hemY + 7} ${cx - hemHalf} ${hemY}`,
          `C ${cx - hemHalf + 1} ${hemY - 36}, ${cx - hHalf - 2} ${anchors.hipY - 8}, ${cx - wHalf} ${anchors.waistY}`,
          `C ${cx - wHalf} ${anchors.waistY - 6}, ${cx - chHalf} ${anchors.waistY - 12}, ${cx - chHalf} ${armpitY}`,
          `Q ${cx - chHalf - 2} ${anchors.chestY + 7} ${cx - shHalf - 7} ${anchors.chestY + 4}`,
          `Q ${cx - shHalf - 9} ${anchors.shoulderY + 18} ${cx - shHalf} ${anchors.shoulderY + 4}`,
          'Z',
        ].join(' ')
      : isTank
        ? [
            `M ${cx - neckHalf} ${neckTopY}`,
            `Q ${cx} ${neckTopY + 12} ${cx + neckHalf} ${neckTopY}`,
            `L ${cx + shHalf - 8} ${anchors.shoulderY + 3}`,
            `Q ${cx + chHalf - 2} ${anchors.chestY - 4} ${cx + chHalf} ${armpitY}`,
            `C ${cx + chHalf} ${anchors.waistY - 8}, ${cx + wHalf} ${anchors.waistY + 6}, ${cx + hemHalf} ${hemY}`,
            `Q ${cx} ${hemY + 4} ${cx - hemHalf} ${hemY}`,
            `C ${cx - wHalf} ${anchors.waistY + 6}, ${cx - chHalf} ${anchors.waistY - 8}, ${cx - chHalf} ${armpitY}`,
            `Q ${cx - chHalf + 2} ${anchors.chestY - 4} ${cx - shHalf + 8} ${anchors.shoulderY + 3}`,
            'Z',
          ].join(' ')
        : [
            `M ${cx - neckHalf} ${neckTopY}`,
            `Q ${cx} ${neckTopY + 5} ${cx + neckHalf} ${neckTopY}`,
            `L ${cx + shHalf} ${anchors.shoulderY + 4}`,
            `C ${cx + shHalf + 10} ${anchors.shoulderY + 14}, ${cx + sleeveOuterX} ${(anchors.shoulderY + sleeveEndY) * 0.52}, ${cx + sleeveOuterX} ${sleeveEndY}`,
            `L ${cx + sleeveInnerX} ${sleeveEndY + (isLongSleeve ? 3 : 6)}`,
            `C ${cx + chHalf + 6} ${armpitY + 12}, ${cx + chHalf + 2} ${armpitY + 4}, ${cx + chHalf} ${armpitY}`,
            `C ${cx + chHalf} ${anchors.waistY - 8}, ${cx + Math.max(wHalf, hemHalf * 0.96)} ${anchors.waistY + 8}, ${cx + hemHalf} ${hemY}`,
            `Q ${cx} ${hemY + (subtype === 'shirt' ? 6 : 3)} ${cx - hemHalf} ${hemY}`,
            `C ${cx - Math.max(wHalf, hemHalf * 0.96)} ${anchors.waistY + 8}, ${cx - chHalf} ${anchors.waistY - 8}, ${cx - chHalf} ${armpitY}`,
            `C ${cx - chHalf - 2} ${armpitY + 4}, ${cx - chHalf - 6} ${armpitY + 12}, ${cx - sleeveInnerX} ${sleeveEndY + (isLongSleeve ? 3 : 6)}`,
            `L ${cx - sleeveOuterX} ${sleeveEndY}`,
            `C ${cx - sleeveOuterX} ${(anchors.shoulderY + sleeveEndY) * 0.52}, ${cx - shHalf - 10} ${anchors.shoulderY + 14}, ${cx - shHalf} ${anchors.shoulderY + 4}`,
            'Z',
          ].join(' ');

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const hasBackPhoto = isSafeDataImageUrl(garmentMeta?.backImageUrl);
  const clipId = `${patternPrefix}-${variant}-back-clip`;

  const maxHalfX = Math.max(sleeveOuterX, hemHalf, chHalf) + 4;
  const imgX = cx - maxHalfX;
  const imgY = neckTopY - 4;
  const imgW = maxHalfX * 2;
  const imgH = hemY - neckTopY + 12;

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

      {/* Proyección real de la foto trasera si el usuario la subió */}
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
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.5" />
        </>
      )}

      <path
        d={garmentPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      {/* Detalles de espalda según prenda */}
      {!showHeatmap && (
        <g pointerEvents="none">
          {/* Capucha descansando sobre la espalda en buzos/hoodies */}
          {subtype === 'hoodie' && (
            <path
              d={`M ${cx - neckHalf - 5} ${neckTopY} C ${cx - shHalf * 0.62} ${anchors.shoulderY + 8}, ${cx - shHalf * 0.45} ${anchors.chestY + 2}, ${cx} ${anchors.chestY + 5} C ${cx + shHalf * 0.45} ${anchors.chestY + 2}, ${cx + shHalf * 0.62} ${anchors.shoulderY + 8}, ${cx + neckHalf + 5} ${neckTopY} Z`}
              fill={baseFill}
              fillOpacity="0.96"
              stroke={strokeColor}
              strokeWidth="1.15"
              strokeLinejoin="round"
            />
          )}

          {/* Canesú y pliegue trasero de camisa */}
          {subtype === 'shirt' && (
            <>
              <line
                x1={cx - shHalf + 5}
                y1={anchors.shoulderY + 14}
                x2={cx + shHalf - 5}
                y2={anchors.shoulderY + 14}
                stroke={seamColor}
                strokeWidth="1"
              />
              <line
                x1={cx}
                y1={anchors.shoulderY + 14}
                x2={cx}
                y2={anchors.waistY + 6}
                stroke={seamColor}
                strokeWidth="0.9"
                opacity="0.7"
              />
            </>
          )}

          {/* Costura central y abertura trasera de chaqueta / vestido */}
          {(variant === 'jacket' || variant === 'dress') && (
            <line
              x1={cx}
              y1={neckTopY + 5}
              x2={cx}
              y2={hemY - 2}
              stroke={seamColor}
              strokeWidth="0.95"
            />
          )}

          {isLongSleeve && (
            <>
              <line
                x1={cx - sleeveOuterX + 1}
                y1={sleeveEndY - 8}
                x2={cx - sleeveInnerX - 1}
                y2={sleeveEndY - 6}
                stroke={seamColor}
                strokeWidth="1.05"
              />
              <line
                x1={cx + sleeveInnerX + 1}
                y1={sleeveEndY - 6}
                x2={cx + sleeveOuterX - 1}
                y2={sleeveEndY - 8}
                stroke={seamColor}
                strokeWidth="1.05"
              />
            </>
          )}
        </g>
      )}

      {showHeatmap && shouldersZone && (
        <g data-heatmap-zone="shoulders" data-fit-state={shouldersZone.state}>
          <rect
            x={cx - shHalf}
            y={anchors.shoulderY - 4}
            width={shHalf * 2}
            height={16}
            rx={6}
            fill={`url(#${getHeatmapPatternId(shouldersZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[shouldersZone.state]}
            strokeWidth="1.5"
          />
        </g>
      )}

      {showHeatmap && backZone && (
        <g
          data-heatmap-zone="back"
          data-fit-state={backZone.state}
          data-estimated={model.backWidthEstimated ? 'true' : 'false'}
        >
          <rect
            x={cx - chHalf}
            y={anchors.chestY - 12}
            width={chHalf * 2}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(backZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[backZone.state]}
            strokeWidth="1.75"
            strokeDasharray={model.backWidthEstimated ? '4 3' : undefined}
          />
          <text
            x={cx}
            y={anchors.chestY + 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Espalda {formatEase(backZone.easeCm)}
          </text>
        </g>
      )}

      {showHeatmap && !backZone && chestZone && (
        <g data-heatmap-zone="chest" data-fit-state={chestZone.state}>
          <rect
            x={cx - chHalf}
            y={anchors.chestY - 12}
            width={chHalf * 2}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(chestZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[chestZone.state]}
            strokeWidth="1.75"
          />
          <text
            x={cx}
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
            x={cx - wHalf}
            y={anchors.waistY - 4}
            width={wHalf * 2}
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
            x={cx - hHalf}
            y={anchors.hipY - 12}
            width={hHalf * 2}
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
