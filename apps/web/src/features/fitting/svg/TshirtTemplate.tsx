import type { FitReport, ZoneFitResult } from '@luca/domain';
import {
  isSafeDataImageUrl,
  resolveGarmentAccentStroke,
  resolveGarmentButtonColor,
  resolveGarmentSeamColor,
  resolveUpperSubtype,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import { computeFittedEasePx, type MannequinRig } from './mannequinRig';

export type UpperGarmentVariant = 'tshirt' | 'long_sleeve' | 'jacket' | 'dress';

export interface TshirtTemplateProps {
  rig: MannequinRig;
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
  rig,
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

  const subtype = resolveUpperSubtype(variant, garmentMeta);
  const cx = rig.cx;
  const legLen = rig.footY - rig.crotchY;
  const isLongSleeve = variant === 'long_sleeve' || variant === 'jacket';
  const isTank = subtype === 'tank';

  const bulkBoost =
    variant === 'jacket'
      ? 2.6
      : subtype === 'hoodie' || subtype === 'sweater'
        ? 1.8
        : 0;

  const chEase = computeFittedEasePx(chestZone?.easeCm, bulkBoost);
  const shEase = computeFittedEasePx(shouldersZone?.easeCm, bulkBoost * 0.5);
  const wEase = computeFittedEasePx(waistZone?.easeCm ?? chestZone?.easeCm, bulkBoost * 0.65);
  const hEase = computeFittedEasePx(hipZone?.easeCm ?? chestZone?.easeCm, bulkBoost * 0.5);
  const slEase = Math.max(1.8, Math.min(4.6, chEase * 0.68 + bulkBoost * 0.35));
  const cuffEase = Math.max(1.4, slEase * 0.72);

  const shHalf = rig.shoulderX + shEase * 0.65;
  const chHalf = rig.chestX + chEase;
  const wHalf =
    variant === 'dress' || subtype === 'shirt' || rig.silhouette === 'female'
      ? rig.waistX + wEase * 0.92
      : Math.max(rig.waistX + wEase, chHalf - 2);
  const hHalf = rig.hipX + hEase * 0.85;

  const hemHalf =
    variant === 'dress'
      ? subtype === 'dress_maxi'
        ? hHalf + 15
        : subtype === 'dress_mini'
          ? hHalf + 6
          : hHalf + 11
      : Math.max(rig.hipX + hEase * 0.72, wHalf + 3);

  const hemY =
    variant === 'dress'
      ? subtype === 'dress_mini'
        ? rig.crotchY + legLen * 0.32
        : subtype === 'dress_maxi'
          ? rig.footY - 12
          : rig.crotchY + legLen * 0.56
      : variant === 'jacket'
        ? rig.hipY + 8
        : subtype === 'hoodie' || subtype === 'sweater'
          ? rig.hipY + 2
          : rig.hipY - 4;

  const neckHalf = rig.neckHalf + (variant === 'dress' ? 5 : 2.8);
  const neckTopY = rig.shoulderY - 4;
  const neckDropY =
    variant === 'dress'
      ? rig.shoulderY + 20
      : subtype === 'jacket_tailored'
        ? rig.chestY + 8
        : subtype === 'polo' || subtype === 'shirt'
          ? rig.shoulderY + 13
          : rig.shoulderY + 11;

  const arm = rig.arm;
  const armpitY = rig.armpitY + 5;
  const armpitX = rig.armpitX + chEase * 0.85;

  // Trazo de manga derecha (side=1) o izquierda (side=-1) adherido exactamente al esqueleto del brazo
  const buildRightSleeve = (): string[] => {
    if (isTank) {
      return [
        `L ${cx + shHalf - 6} ${rig.shoulderY + 1}`,
        `Q ${cx + chHalf - 1} ${rig.chestY - 6} ${cx + armpitX} ${armpitY}`,
      ];
    }
    if (variant === 'dress') {
      return [
        `L ${cx + shHalf} ${rig.shoulderY + 2}`,
        `C ${cx + arm.deltoid.outerX + slEase} ${arm.deltoid.y + 4}, ${cx + arm.bicep.outerX + slEase * 0.8} ${arm.bicep.y - 6}, ${cx + arm.bicep.outerX + slEase * 0.6} ${arm.bicep.y - 2}`,
        `L ${cx + arm.bicep.innerX - slEase * 0.4} ${arm.bicep.y}`,
        `L ${cx + armpitX} ${armpitY}`,
      ];
    }
    if (isLongSleeve) {
      return [
        `L ${cx + shHalf} ${rig.shoulderY + 2}`,
        `C ${cx + arm.deltoid.outerX + slEase} ${arm.deltoid.y + 6}, ${cx + arm.elbow.outerX + slEase} ${arm.elbow.y - 8}, ${cx + arm.elbow.outerX + slEase} ${arm.elbow.y}`,
        `C ${cx + arm.forearm.outerX + slEase} ${arm.forearm.y}, ${cx + arm.wrist.outerX + cuffEase} ${arm.wrist.y - 6}, ${cx + arm.wrist.outerX + cuffEase} ${arm.wrist.y}`,
        `L ${cx + arm.wrist.innerX - cuffEase} ${arm.wrist.y + 1.5}`,
        `C ${cx + arm.forearm.innerX - slEase * 0.65} ${arm.forearm.y}, ${cx + arm.elbow.innerX - slEase * 0.65} ${arm.elbow.y + 2}, ${cx + arm.elbow.innerX - slEase * 0.65} ${arm.elbow.y}`,
        `C ${cx + arm.bicep.innerX - slEase * 0.5} ${arm.bicep.y}, ${cx + armpitX + 2} ${armpitY + 6}, ${cx + armpitX} ${armpitY}`,
      ];
    }
    // Manga corta (camiseta / polo)
    return [
      `L ${cx + shHalf} ${rig.shoulderY + 2}`,
      `C ${cx + arm.deltoid.outerX + slEase} ${arm.deltoid.y + 5}, ${cx + arm.bicep.outerX + slEase} ${arm.bicep.y - 6}, ${cx + arm.bicep.outerX + slEase} ${arm.bicep.y}`,
      `L ${cx + arm.bicep.innerX - slEase * 0.6} ${arm.bicep.y + 2.5}`,
      `Q ${cx + armpitX + 2} ${armpitY + 5} ${cx + armpitX} ${armpitY}`,
    ];
  };

  const buildLeftSleeveReturn = (): string[] => {
    if (isTank) {
      return [
        `Q ${cx - chHalf + 1} ${rig.chestY - 6} ${cx - shHalf + 6} ${rig.shoulderY + 1}`,
      ];
    }
    if (variant === 'dress') {
      return [
        `L ${cx - arm.bicep.innerX + slEase * 0.4} ${arm.bicep.y}`,
        `L ${cx - arm.bicep.outerX - slEase * 0.6} ${arm.bicep.y - 2}`,
        `C ${cx - arm.bicep.outerX - slEase * 0.8} ${arm.bicep.y - 6}, ${cx - arm.deltoid.outerX - slEase} ${arm.deltoid.y + 4}, ${cx - shHalf} ${rig.shoulderY + 2}`,
      ];
    }
    if (isLongSleeve) {
      return [
        `C ${cx - armpitX - 2} ${armpitY + 6}, ${cx - arm.bicep.innerX + slEase * 0.5} ${arm.bicep.y}, ${cx - arm.elbow.innerX + slEase * 0.65} ${arm.elbow.y}`,
        `C ${cx - arm.elbow.innerX + slEase * 0.65} ${arm.elbow.y + 2}, ${cx - arm.forearm.innerX + slEase * 0.65} ${arm.forearm.y}, ${cx - arm.wrist.innerX + cuffEase} ${arm.wrist.y + 1.5}`,
        `L ${cx - arm.wrist.outerX - cuffEase} ${arm.wrist.y}`,
        `C ${cx - arm.wrist.outerX - cuffEase} ${arm.wrist.y - 6}, ${cx - arm.forearm.outerX - slEase} ${arm.forearm.y}, ${cx - arm.elbow.outerX - slEase} ${arm.elbow.y}`,
        `C ${cx - arm.elbow.outerX - slEase} ${arm.elbow.y - 8}, ${cx - arm.deltoid.outerX - slEase} ${arm.deltoid.y + 6}, ${cx - shHalf} ${rig.shoulderY + 2}`,
      ];
    }
    return [
      `Q ${cx - armpitX - 2} ${armpitY + 5} ${cx - arm.bicep.innerX + slEase * 0.6} ${arm.bicep.y + 2.5}`,
      `L ${cx - arm.bicep.outerX - slEase} ${arm.bicep.y}`,
      `C ${cx - arm.bicep.outerX - slEase} ${arm.bicep.y - 6}, ${cx - arm.deltoid.outerX - slEase} ${arm.deltoid.y + 5}, ${cx - shHalf} ${rig.shoulderY + 2}`,
    ];
  };

  const torsoRight: string[] =
    variant === 'dress'
      ? [
          `C ${cx + chHalf} ${rig.waistY - 14}, ${cx + wHalf} ${rig.waistY - 6}, ${cx + wHalf} ${rig.waistY}`,
          `C ${cx + hHalf + 1} ${rig.hipY - 8}, ${cx + hemHalf - 1} ${hemY - 34}, ${cx + hemHalf} ${hemY}`,
          `Q ${cx} ${hemY + 6} ${cx - hemHalf} ${hemY}`,
          `C ${cx - hemHalf + 1} ${hemY - 34}, ${cx - hHalf - 1} ${rig.hipY - 8}, ${cx - wHalf} ${rig.waistY}`,
          `C ${cx - wHalf} ${rig.waistY - 6}, ${cx - chHalf} ${rig.waistY - 14}, ${cx - armpitX} ${armpitY}`,
        ]
      : [
          `C ${cx + chHalf} ${rig.waistY - 12}, ${cx + wHalf} ${rig.waistY - 4}, ${cx + wHalf} ${rig.waistY}`,
          `C ${cx + wHalf} ${rig.waistY + 12}, ${cx + hemHalf} ${hemY - 12}, ${cx + hemHalf} ${hemY}`,
          `Q ${cx} ${hemY + (subtype === 'shirt' ? 5 : 2.5)} ${cx - hemHalf} ${hemY}`,
          `C ${cx - hemHalf} ${hemY - 12}, ${cx - wHalf} ${rig.waistY + 12}, ${cx - wHalf} ${rig.waistY}`,
          `C ${cx - wHalf} ${rig.waistY - 4}, ${cx - chHalf} ${rig.waistY - 12}, ${cx - armpitX} ${armpitY}`,
        ];

  const garmentPath = [
    `M ${cx - neckHalf} ${neckTopY}`,
    `C ${cx - neckHalf * 0.55} ${neckDropY}, ${cx + neckHalf * 0.55} ${neckDropY}, ${cx + neckHalf} ${neckTopY}`,
    ...buildRightSleeve(),
    ...torsoRight,
    ...buildLeftSleeveReturn(),
    'Z',
  ].join(' ');

  const baseFill = garmentColorHex ?? 'var(--accent)';
  const strokeColor = resolveGarmentAccentStroke(garmentColorHex);
  const seamColor = resolveGarmentSeamColor(garmentColorHex);
  const buttonColor = resolveGarmentButtonColor(garmentColorHex);
  const hasPhoto = isSafeDataImageUrl(garmentMeta?.imageUrl);
  const clipId = `${patternPrefix}-${variant}-clip`;

  const maxHalfX = Math.max(
    isLongSleeve ? arm.wrist.outerX + cuffEase : arm.bicep.outerX + slEase,
    hemHalf,
    chHalf,
  ) + 3;
  const imgX = cx - maxHalfX;
  const imgY = neckTopY - 3;
  const imgW = maxHalfX * 2;
  const imgH = hemY - neckTopY + 10;

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

      {/* Profundidad interior del cuello */}
      <path
        d={`M ${cx - neckHalf} ${neckTopY} Q ${cx} ${neckTopY - 3} ${cx + neckHalf} ${neckTopY} C ${cx + neckHalf * 0.55} ${neckDropY}, ${cx - neckHalf * 0.55} ${neckDropY}, ${cx - neckHalf} ${neckTopY} Z`}
        fill={`url(#${patternPrefix}-collar-depth)`}
        opacity={showHeatmap ? 0.2 : 0.65}
      />

      {/* Capucha superior alrededor del cuello en buzo/hoodie */}
      {subtype === 'hoodie' && (
        <path
          d={`M ${cx - neckHalf - 6} ${neckTopY + 2} C ${cx - neckHalf - 9} ${neckTopY - 10}, ${cx - neckHalf + 2} ${neckTopY - 15}, ${cx} ${neckTopY - 13} C ${cx + neckHalf - 2} ${neckTopY - 15}, ${cx + neckHalf + 9} ${neckTopY - 10}, ${cx + neckHalf + 6} ${neckTopY + 2} Q ${cx} ${neckDropY + 3} ${cx - neckHalf - 6} ${neckTopY + 2} Z`}
          fill={baseFill}
          fillOpacity={showHeatmap ? 0.16 : 0.94}
          stroke={strokeColor}
          strokeWidth="1.05"
        />
      )}

      {/* Capa base de tela */}
      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.96} />

      {/* Proyección real de foto frontal recortada */}
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

      {/* Patrón procedural */}
      {patternId && !showHeatmap && (
        <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.82" />
      )}

      {/* Volumen 3D cilíndrico y drapeado */}
      {!showHeatmap && (
        <>
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.58" />
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.46" />
        </>
      )}

      {/* Contorno nítido de la prenda */}
      <path
        d={garmentPath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.15"
        strokeLinejoin="round"
      />

      {/* Detalles de confección y adaptación a silueta Mujer / Hombre */}
      {!showHeatmap && (
        <g pointerEvents="none">
          {/* Costuras de sisa siguiendo el hombro anatómico */}
          {!isTank && (
            <>
              <path
                d={`M ${cx - shHalf + 1.5} ${rig.shoulderY + 2.5} Q ${cx - armpitX - 1.5} ${(rig.shoulderY + armpitY) * 0.56} ${cx - armpitX} ${armpitY}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.85"
              />
              <path
                d={`M ${cx + shHalf - 1.5} ${rig.shoulderY + 2.5} Q ${cx + armpitX + 1.5} ${(rig.shoulderY + armpitY) * 0.56} ${cx + armpitX} ${armpitY}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.85"
              />
            </>
          )}

          {/* Caída sutil bajo el busto en maniquí femenino */}
          {rig.silhouette === 'female' && variant !== 'jacket' && (
            <path
              d={`M ${cx - chHalf * 0.72} ${rig.bustUnderY} Q ${cx - chHalf * 0.34} ${rig.bustUnderY + 4.5} ${cx - 3} ${rig.bustUnderY - 1} M ${cx + 3} ${rig.bustUnderY - 1} Q ${cx + chHalf * 0.34} ${rig.bustUnderY + 4.5} ${cx + chHalf * 0.72} ${rig.bustUnderY}`}
              fill="none"
              stroke={seamColor}
              strokeWidth="0.75"
              opacity="0.55"
            />
          )}

          {/* Ribete cuello camiseta / suéter */}
          {(subtype === 'tshirt' || subtype === 'sweater') && (
            <path
              d={`M ${cx - neckHalf + 1} ${neckTopY + 2.5} C ${cx - neckHalf * 0.55} ${neckDropY + 2.8}, ${cx + neckHalf * 0.55} ${neckDropY + 2.8}, ${cx + neckHalf - 1} ${neckTopY + 2.5}`}
              fill="none"
              stroke={seamColor}
              strokeWidth="1.05"
            />
          )}

          {/* Camisa / polo: cuello doblado + botones */}
          {(subtype === 'shirt' || subtype === 'polo') && (
            <>
              <path
                d={`M ${cx - neckHalf} ${neckTopY} L ${cx - neckHalf - 2.5} ${neckTopY + 11} L ${cx} ${neckDropY + 3.5} L ${cx + neckHalf + 2.5} ${neckTopY + 11} L ${cx + neckHalf} ${neckTopY}`}
                fill={baseFill}
                fillOpacity="0.96"
                stroke={strokeColor}
                strokeWidth="0.95"
                strokeLinejoin="round"
              />
              <line
                x1={cx}
                y1={neckDropY + 3.5}
                x2={cx}
                y2={subtype === 'polo' ? rig.chestY + 16 : hemY + 1.5}
                stroke={seamColor}
                strokeWidth="0.95"
              />
              {(subtype === 'polo' ? [0.16, 0.28] : [0.18, 0.34, 0.5, 0.66, 0.82]).map((ratio) => {
                const by = neckDropY + 5 + (hemY - neckDropY - 10) * ratio;
                return (
                  <circle key={ratio} cx={cx} cy={by} r="1.45" fill={buttonColor} opacity="0.82" />
                );
              })}
            </>
          )}

          {/* Buzo / hoodie: cordones, bolsillo canguro y pretina */}
          {subtype === 'hoodie' && (
            <>
              <path
                d={`M ${cx - 4.5} ${neckDropY} Q ${cx - 5.2} ${rig.chestY + 4} ${cx - 4.8} ${rig.chestY + 15}`}
                fill="none"
                stroke={buttonColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0.76"
              />
              <path
                d={`M ${cx + 4.5} ${neckDropY} Q ${cx + 5.2} ${rig.chestY + 4} ${cx + 4.8} ${rig.chestY + 15}`}
                fill="none"
                stroke={buttonColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0.76"
              />
              <path
                d={`M ${cx - wHalf * 0.56} ${rig.waistY + 6} L ${cx + wHalf * 0.56} ${rig.waistY + 6} L ${cx + hemHalf * 0.66} ${hemY - 9} L ${cx - hemHalf * 0.66} ${hemY - 9} Z`}
                fill="rgb(0 0 0 / 6%)"
                stroke={seamColor}
                strokeWidth="0.95"
                strokeLinejoin="round"
              />
              <line
                x1={cx - hemHalf + 1}
                y1={hemY - 7.5}
                x2={cx + hemHalf - 1}
                y2={hemY - 7.5}
                stroke={seamColor}
                strokeWidth="1"
              />
            </>
          )}

          {/* Puños en manga larga */}
          {isLongSleeve && (
            <>
              <line
                x1={cx - arm.wrist.outerX - cuffEase + 0.8}
                y1={arm.wrist.y - 6}
                x2={cx - arm.wrist.innerX + cuffEase - 0.8}
                y2={arm.wrist.y - 5}
                stroke={seamColor}
                strokeWidth="1"
              />
              <line
                x1={cx + arm.wrist.innerX - cuffEase + 0.8}
                y1={arm.wrist.y - 5}
                x2={cx + arm.wrist.outerX + cuffEase - 0.8}
                y2={arm.wrist.y - 6}
                stroke={seamColor}
                strokeWidth="1"
              />
            </>
          )}

          {/* Chaqueta: apertura frontal, solapas y bolsillos */}
          {variant === 'jacket' && (
            <>
              <line
                x1={cx}
                y1={neckDropY + 1}
                x2={cx}
                y2={hemY + 1.5}
                stroke={strokeColor}
                strokeWidth="1.2"
              />
              <path
                d={`M ${cx - neckHalf} ${neckTopY} L ${cx - 12} ${rig.chestY + 1} L ${cx} ${rig.chestY + 12} L ${cx + 12} ${rig.chestY + 1} L ${cx + neckHalf} ${neckTopY}`}
                fill="rgb(0 0 0 / 6%)"
                stroke={strokeColor}
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <line
                x1={cx - hemHalf * 0.72}
                y1={rig.waistY + 11}
                x2={cx - hemHalf * 0.34}
                y2={rig.waistY + 12.5}
                stroke={seamColor}
                strokeWidth="1.1"
              />
              <line
                x1={cx + hemHalf * 0.34}
                y1={rig.waistY + 12.5}
                x2={cx + hemHalf * 0.72}
                y2={rig.waistY + 11}
                stroke={seamColor}
                strokeWidth="1.1"
              />
            </>
          )}

          {/* Vestido: corte de cintura y pliegues verticales */}
          {variant === 'dress' && (
            <>
              <path
                d={`M ${cx - wHalf + 1} ${rig.waistY} Q ${cx} ${rig.waistY + 3.5} ${cx + wHalf - 1} ${rig.waistY}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.95"
              />
              <path
                d={`M ${cx - wHalf * 0.44} ${rig.waistY + 6} Q ${cx - hemHalf * 0.42} ${rig.hipY + 20} ${cx - hemHalf * 0.45} ${hemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.85"
                opacity="0.65"
              />
              <path
                d={`M ${cx + wHalf * 0.44} ${rig.waistY + 6} Q ${cx + hemHalf * 0.42} ${rig.hipY + 20} ${cx + hemHalf * 0.45} ${hemY - 4}`}
                fill="none"
                stroke={seamColor}
                strokeWidth="0.85"
                opacity="0.65"
              />
            </>
          )}
        </g>
      )}

      {/* Mapa de calor accesible */}
      {showHeatmap && shouldersZone && (
        <g data-heatmap-zone="shoulders" data-fit-state={shouldersZone.state}>
          <rect
            x={cx - shHalf}
            y={rig.shoulderY - 4}
            width={shHalf * 2}
            height={16}
            rx={6}
            fill={`url(#${getHeatmapPatternId(shouldersZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[shouldersZone.state]}
            strokeWidth="1.5"
          />
          <text
            x={cx + shHalf + 8}
            y={rig.shoulderY + 8}
            fontSize="11"
            fontWeight="600"
            fill="var(--ink)"
            className="tabular-nums"
          >
            Hombros {formatEase(shouldersZone.easeCm)}
          </text>
        </g>
      )}

      {showHeatmap && chestZone && (
        <g data-heatmap-zone="chest" data-fit-state={chestZone.state}>
          <rect
            x={cx - chHalf}
            y={rig.chestY - 12}
            width={chHalf * 2}
            height={36}
            rx={8}
            fill={`url(#${getHeatmapPatternId(chestZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[chestZone.state]}
            strokeWidth="1.75"
          />
          <text
            x={cx}
            y={rig.chestY + 10}
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

      {showHeatmap && variant === 'dress' && waistZone && (
        <g data-heatmap-zone="waist" data-fit-state={waistZone.state}>
          <rect
            x={cx - wHalf}
            y={rig.waistY - 4}
            width={wHalf * 2}
            height={22}
            rx={6}
            fill={`url(#${getHeatmapPatternId(waistZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[waistZone.state]}
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={rig.waistY + 11}
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
            y={rig.hipY - 12}
            width={hHalf * 2}
            height={26}
            rx={8}
            fill={`url(#${getHeatmapPatternId(hipZone.state, patternPrefix)})`}
            stroke={FIT_STATE_HEX[hipZone.state]}
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={rig.hipY + 5}
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
