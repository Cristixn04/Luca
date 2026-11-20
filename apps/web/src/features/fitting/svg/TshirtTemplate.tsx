import type { FitReport, ZoneFitResult } from '@luca/domain';
import { clampVisualEaseOffsetPx, type FrontAvatarAnchors } from './anchors';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentButtonColor,
  resolveGarmentSeamColor,
  resolveUpperSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';

export type UpperGarmentVariant = 'tshirt' | 'long_sleeve' | 'jacket' | 'dress';

export interface TshirtTemplateProps {
  anchors: FrontAvatarAnchors;
  fitReport: FitReport;
  showHeatmap: boolean;
  garmentColorHex?: string;
  garmentMeta?: GarmentVisualMeta;
  patternPrefix?: string;
  variant?: UpperGarmentVariant;
}

function findZone(
  report: FitReport,
  zone: 'chest' | 'shoulders' | 'waist' | 'hip',
): ZoneFitResult | undefined {
  return report.evaluatedZones.find((item) => item.zone === zone);
}

function formatEase(easeCm: number): string {
  const sign = easeCm >= 0 ? '+' : '';
  return `${sign}${easeCm.toFixed(1)} cm`;
}

export function TshirtTemplate({
  anchors,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  patternPrefix = 'front',
  variant = 'tshirt',
}: TshirtTemplateProps) {
  const chestZone = findZone(fitReport, 'chest');
  const shouldersZone = findZone(fitReport, 'shoulders');
  const waistZone = findZone(fitReport, 'waist');
  const hipZone = findZone(fitReport, 'hip');

  const chestOffset = chestZone ? clampVisualEaseOffsetPx(chestZone.easeCm, anchors.scale) : 4;
  const shoulderOffset = shouldersZone
    ? clampVisualEaseOffsetPx(shouldersZone.easeCm * 2, anchors.scale)
    : 2;
  const waistOffset = waistZone ? clampVisualEaseOffsetPx(waistZone.easeCm, anchors.scale) : 3;
  const hipOffset = hipZone ? clampVisualEaseOffsetPx(hipZone.easeCm, anchors.scale) : 4;

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
  const chHalf = Math.max(anchors.chestHalfW * 0.9, anchors.chestHalfW + chestOffset + bulkBoost);
  const wHalf = Math.max(anchors.waistHalfW * 0.9, anchors.waistHalfW + waistOffset + bulkBoost * 0.6);
  const hHalf = Math.max(anchors.hipHalfW * 0.92, anchors.hipHalfW + hipOffset + bulkBoost * 0.4);

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

  // Posición anatómica natural de las mangas siguiendo los brazos del maniquí
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
  const neckTopY = anchors.shoulderY - 5;
  const neckDropY =
    variant === 'dress'
      ? anchors.shoulderY + 22
      : subtype === 'jacket_tailored'
        ? anchors.chestY + 10
        : subtype === 'polo' || subtype === 'shirt'
          ? anchors.shoulderY + 15
          : anchors.shoulderY + 13;

  const garmentPath =
    variant === 'dress'
      ? [
          `M ${cx - neckHalf} ${neckTopY}`,
          `C ${cx - neckHalf * 0.55} ${neckDropY}, ${cx + neckHalf * 0.55} ${neckDropY}, ${cx + neckHalf} ${neckTopY}`,
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
            `Q ${cx} ${neckDropY + 6} ${cx + neckHalf} ${neckTopY}`,
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
            `C ${cx - neckHalf * 0.5} ${neckDropY}, ${cx + neckHalf * 0.5} ${neckDropY}, ${cx + neckHalf} ${neckTopY}`,
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
  const buttonColor = resolveGarmentButtonColor(garmentColorHex);
  const hasPhoto = isSafeDataImageUrl(garmentMeta?.imageUrl);
  const clipId = `${patternPrefix}-${variant}-clip`;

  const maxHalfX = Math.max(sleeveOuterX, hemHalf, chHalf) + 4;
  const imgX = cx - maxHalfX;
  const imgY = neckTopY - 4;
  const imgW = maxHalfX * 2;
  const imgH = hemY - neckTopY + 12;

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

      {/* Fondo de escote interior (profundidad del cuello) */}
      <path
        d={`M ${cx - neckHalf} ${neckTopY} Q ${cx} ${neckTopY - 4} ${cx + neckHalf} ${neckTopY} C ${cx + neckHalf * 0.5} ${neckDropY}, ${cx - neckHalf * 0.5} ${neckDropY}, ${cx - neckHalf} ${neckTopY} Z`}
        fill={`url(#${patternPrefix}-collar-depth)`}
        opacity={showHeatmap ? 0.2 : 0.7}
      />

      {/* Capucha superior visible alrededor del cuello en buzos/hoodies */}
      {subtype === 'hoodie' && (
        <path
          d={`M ${cx - neckHalf - 7} ${neckTopY + 2} C ${cx - neckHalf - 11} ${neckTopY - 12}, ${cx - neckHalf + 2} ${neckTopY - 17}, ${cx} ${neckTopY - 15} C ${cx + neckHalf - 2} ${neckTopY - 17}, ${cx + neckHalf + 11} ${neckTopY - 12}, ${cx + neckHalf + 7} ${neckTopY + 2} Q ${cx} ${neckDropY + 4} ${cx - neckHalf - 7} ${neckTopY + 2} Z`}
          fill={baseFill}
          fillOpacity={showHeatmap ? 0.16 : 0.92}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      )}

      {/* Capa base de tela */}
      <path
        d={garmentPath}
        fill={baseFill}
        fillOpacity={showHeatmap ? 0.16 : 0.95}
      />

      {/* Proyección real de la foto subida por el usuario, recortada y adaptada a la silueta */}
      {hasPhoto && (
        <image
          href={garmentMeta.imageUrl}
          x={imgX}
          y={imgY}
          width={imgW}
          height={imgH}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={showHeatmap ? 0.3 : 0.96}
          data-garment-photo="front"
        />
      )}

      {/* Patrón de tela procedural si no hay foto subida */}
      {patternId && !showHeatmap && (
        <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.85" />
      )}

      {/* Sombreado cilíndrico 3D y caída de tela (realismo volumétrico) */}
      {!showHeatmap && (
        <>
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.65" />
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.52" />
        </>
      )}

      {/* Contorno principal nítido de la prenda */}
      <path
        d={garmentPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      {/* Detalles de confección específicos por tipo de prenda */}
      {!showHeatmap && (
        <g pointerEvents="none">
          {/* Costuras de sisa (mangas) y pliegues suaves de axila */}
          {!isTank && variant !== 'dress' && (
            <>
              <path
                d={`M ${cx - shHalf + 2} ${anchors.shoulderY + 5} Q ${cx - chHalf - 3} ${(anchors.shoulderY + armpitY) * 0.55} ${cx - chHalf} ${armpitY}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.9"
              />
              <path
                d={`M ${cx + shHalf - 2} ${anchors.shoulderY + 5} Q ${cx + chHalf + 3} ${(anchors.shoulderY + armpitY) * 0.55} ${cx + chHalf} ${armpitY}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.9"
              />
            </>
          )}

          {/* Ribete de cuello acanalado en camiseta / suéter */}
          {(subtype === 'tshirt' || subtype === 'sweater') && (
            <path
              d={`M ${cx - neckHalf + 1} ${neckTopY + 3} C ${cx - neckHalf * 0.5} ${neckDropY + 3}, ${cx + neckHalf * 0.5} ${neckDropY + 3}, ${cx + neckHalf - 1} ${neckTopY + 3}`}
              fill="none"
              stroke={seamColor}
              strokeWidth="1.2"
            />
          )}

          {/* Detalles de camisa / polo: cuello doblado + tapeta + botones */}
          {(subtype === 'shirt' || subtype === 'polo') && (
            <>
              <path
                d={`M ${cx - neckHalf} ${neckTopY} L ${cx - neckHalf - 3} ${neckTopY + 13} L ${cx} ${neckDropY + 4} L ${cx + neckHalf + 3} ${neckTopY + 13} L ${cx + neckHalf} ${neckTopY}`}
                fill={baseFill}
                fillOpacity="0.95"
                stroke={strokeColor}
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
              <line
                x1={cx}
                y1={neckDropY + 4}
                x2={cx}
                y2={subtype === 'polo' ? anchors.chestY + 18 : hemY + 2}
                stroke={seamColor}
                strokeWidth="1.05"
              />
              {(subtype === 'polo' ? [0.16, 0.28] : [0.18, 0.34, 0.5, 0.66, 0.82]).map((ratio) => {
                const by = neckDropY + 6 + (hemY - neckDropY - 12) * ratio;
                return (
                  <circle
                    key={ratio}
                    cx={cx}
                    cy={by}
                    r="1.6"
                    fill={buttonColor}
                    opacity="0.82"
                  />
                );
              })}
            </>
          )}

          {/* Detalles de buzo / hoodie: cordones, bolsillo canguro, puños y pretina acanalada */}
          {subtype === 'hoodie' && (
            <>
              <path
                d={`M ${cx - 5} ${neckDropY} Q ${cx - 6} ${anchors.chestY + 4} ${cx - 5.5} ${anchors.chestY + 16}`}
                fill="none"
                stroke={buttonColor}
                strokeWidth="1.35"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d={`M ${cx + 5} ${neckDropY} Q ${cx + 6} ${anchors.chestY + 4} ${cx + 5.5} ${anchors.chestY + 16}`}
                fill="none"
                stroke={buttonColor}
                strokeWidth="1.35"
                strokeLinecap="round"
                opacity="0.75"
              />
              {/* Bolsillo canguro */}
              <path
                d={`M ${cx - chHalf * 0.55} ${anchors.waistY + 6} L ${cx + chHalf * 0.55} ${anchors.waistY + 6} L ${cx + chHalf * 0.68} ${hemY - 11} L ${cx - chHalf * 0.68} ${hemY - 11} Z`}
                fill="rgb(0 0 0 / 6%)"
                stroke={seamColor}
                strokeWidth="1"
                strokeLinejoin="round"
              />
              {/* Pretina inferior acanalada */}
              <line
                x1={cx - hemHalf + 1}
                y1={hemY - 9}
                x2={cx + hemHalf - 1}
                y2={hemY - 9}
                stroke={seamColor}
                strokeWidth="1.1"
              />
            </>
          )}

          {/* Puños acanalados / camiseros en manga larga */}
          {isLongSleeve && (
            <>
              <line
                x1={cx - sleeveOuterX + 1}
                y1={sleeveEndY - 8}
                x2={cx - sleeveInnerX - 1}
                y2={sleeveEndY - 6}
                stroke={seamColor}
                strokeWidth="1.1"
              />
              <line
                x1={cx + sleeveInnerX + 1}
                y1={sleeveEndY - 6}
                x2={cx + sleeveOuterX - 1}
                y2={sleeveEndY - 8}
                stroke={seamColor}
                strokeWidth="1.1"
              />
            </>
          )}

          {/* Solapas, apertura central y bolsillos de chaqueta */}
          {variant === 'jacket' && (
            <>
              <line
                x1={cx}
                y1={neckDropY + 2}
                x2={cx}
                y2={hemY + 2}
                stroke={strokeColor}
                strokeWidth="1.35"
              />
              <path
                d={`M ${cx - neckHalf} ${neckTopY} L ${cx - 14} ${anchors.chestY + 2} L ${cx} ${anchors.chestY + 14} L ${cx + 14} ${anchors.chestY + 2} L ${cx + neckHalf} ${neckTopY}`}
                fill="rgb(0 0 0 / 6%)"
                stroke={strokeColor}
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <line
                x1={cx - hemHalf * 0.72}
                y1={anchors.waistY + 12}
                x2={cx - hemHalf * 0.34}
                y2={anchors.waistY + 14}
                stroke={seamColor}
                strokeWidth="1.2"
              />
              <line
                x1={cx + hemHalf * 0.34}
                y1={anchors.waistY + 14}
                x2={cx + hemHalf * 0.72}
                y2={anchors.waistY + 12}
                stroke={seamColor}
                strokeWidth="1.2"
              />
            </>
          )}

          {/* Corte de cintura y pliegues suaves de caída en vestido */}
          {variant === 'dress' && (
            <>
              <path
                d={`M ${cx - wHalf + 1} ${anchors.waistY} Q ${cx} ${anchors.waistY + 4} ${cx + wHalf - 1} ${anchors.waistY}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="1"
              />
              <path
                d={`M ${cx - wHalf * 0.45} ${anchors.waistY + 6} Q ${cx - hemHalf * 0.42} ${anchors.hipY + 22} ${cx - hemHalf * 0.46} ${hemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.9"
                opacity="0.7"
              />
              <path
                d={`M ${cx + wHalf * 0.45} ${anchors.waistY + 6} Q ${cx + hemHalf * 0.42} ${anchors.hipY + 22} ${cx + hemHalf * 0.46} ${hemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.9"
                opacity="0.7"
              />
            </>
          )}
        </g>
      )}

      {/* Zona de hombros (Mapa de calor accesible) */}
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
          <text
            x={cx + shHalf + 8}
            y={anchors.shoulderY + 8}
            fontSize="11"
            fontWeight="600"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Hombros {formatEase(shouldersZone.easeCm)}
          </text>
        </g>
      )}

      {/* Zona de pecho */}
      {showHeatmap && chestZone && (
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
            fontSize="11.5"
            fontWeight="700"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Pecho {formatEase(chestZone.easeCm)}
          </text>
        </g>
      )}

      {/* Zonas adicionales para vestido (cintura y cadera) */}
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
          <text
            x={cx}
            y={anchors.waistY + 11}
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
          <text
            x={cx}
            y={anchors.hipY + 5}
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
