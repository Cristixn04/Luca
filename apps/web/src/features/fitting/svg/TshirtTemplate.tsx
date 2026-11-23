import type { FitReport, ZoneFitResult } from '@luca/domain';
import {
  resolveGarmentAccentStroke,
  resolveGarmentButtonColor,
  resolveGarmentSeamColor,
  resolveUpperBlueprint,
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

  const bp = resolveUpperBlueprint(variant, garmentMeta);
  const { subtype, neckline, sleeveLength, garmentLength } = bp;
  const cx = rig.cx;
  const legLen = rig.footY - rig.crotchY;
  const isLongSleeve = sleeveLength === 'long';
  const isThreeQuarter = sleeveLength === 'three_quarter';
  const isSleeveless = sleeveLength === 'sleeveless';
  const isCapSleeve = sleeveLength === 'cap';
  const isStrapless = neckline === 'strapless';
  const isFullLengthPiece =
    variant === 'dress' || garmentLength === 'knee' || garmentLength === 'midi' || garmentLength === 'maxi';

  const chEase = computeFittedEasePx(chestZone?.easeCm, bp.fitBoostPx);
  const shEase = computeFittedEasePx(shouldersZone?.easeCm, bp.fitBoostPx * 0.5);
  const wEase = computeFittedEasePx(waistZone?.easeCm ?? chestZone?.easeCm, bp.fitBoostPx * 0.65);
  const hEase = computeFittedEasePx(hipZone?.easeCm ?? chestZone?.easeCm, bp.fitBoostPx * 0.5);
  const slEase = Math.max(1.8, Math.min(4.8, chEase * 0.68 + Math.max(0, bp.fitBoostPx) * 0.35));
  const cuffEase = Math.max(1.4, slEase * 0.72);

  const shHalf = rig.shoulderX + shEase * 0.65;
  const chHalf = rig.chestX + chEase;
  const wHalf =
    isFullLengthPiece || subtype === 'shirt' || rig.silhouette === 'female' || bp.fitCut === 'fitted'
      ? rig.waistX + wEase * 0.92
      : Math.max(rig.waistX + wEase, chHalf - 2);
  const hHalf = rig.hipX + hEase * 0.85;

  const skirtFlareBoost = bp.fitCut === 'a_line' || bp.fitCut === 'pleated' ? 5 : 0;
  const hemHalf =
    isFullLengthPiece
      ? garmentLength === 'maxi'
        ? hHalf + 15 + skirtFlareBoost
        : garmentLength === 'thigh'
          ? hHalf + 6 + skirtFlareBoost
          : hHalf + 11 + skirtFlareBoost
      : garmentLength === 'crop'
        ? Math.max(rig.waistX + wEase * 0.95, wHalf)
        : garmentLength === 'waist'
          ? Math.max(rig.waistX + wEase + 2, wHalf + 1.5)
          : Math.max(rig.hipX + hEase * 0.72, wHalf + 3);

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

  const neckHalf =
    rig.neckHalf +
    (neckline === 'scoop' || neckline === 'square'
      ? 6.5
      : neckline === 'v_neck'
        ? 4.2
        : neckline === 'turtleneck'
          ? 1.5
          : variant === 'dress'
            ? 5
            : 2.8);
  const neckTopY = rig.shoulderY - 4;
  const neckDropY =
    neckline === 'v_neck'
      ? rig.chestY - 2
      : neckline === 'scoop'
        ? rig.shoulderY + 22
        : neckline === 'square'
          ? rig.shoulderY + 18
          : neckline === 'turtleneck'
            ? rig.shoulderY + 5
            : bp.hasLapels
              ? rig.chestY + 8
              : neckline === 'polo' || neckline === 'shirt_collar'
                ? rig.shoulderY + 13
                : rig.shoulderY + 11;

  const arm = rig.arm;
  const armpitY = rig.armpitY + 5;
  const armpitX = rig.armpitX + chEase * 0.85;

  const midForearmY = (arm.elbow.y + arm.wrist.y) * 0.52;
  const midForearmOuterX = (arm.elbow.outerX + arm.wrist.outerX) * 0.52;
  const midForearmInnerX = (arm.elbow.innerX + arm.wrist.innerX) * 0.52;

  const buildNecklineSegment = (): string[] => {
    if (isStrapless) {
      return [`M ${cx - chHalf} ${rig.chestY - 9}`, `Q ${cx} ${rig.chestY - 6} ${cx + chHalf} ${rig.chestY - 9}`];
    }
    if (neckline === 'v_neck') {
      return [
        `M ${cx - neckHalf} ${neckTopY}`,
        `L ${cx} ${neckDropY + 5}`,
        `L ${cx + neckHalf} ${neckTopY}`,
      ];
    }
    if (neckline === 'square') {
      return [
        `M ${cx - neckHalf} ${neckTopY}`,
        `L ${cx - neckHalf + 1.5} ${neckDropY}`,
        `L ${cx + neckHalf - 1.5} ${neckDropY}`,
        `L ${cx + neckHalf} ${neckTopY}`,
      ];
    }
    return [
      `M ${cx - neckHalf} ${neckTopY}`,
      `C ${cx - neckHalf * 0.55} ${neckDropY}, ${cx + neckHalf * 0.55} ${neckDropY}, ${cx + neckHalf} ${neckTopY}`,
    ];
  };

  const buildRightSleeve = (): string[] => {
    if (isStrapless) {
      return [`L ${cx + armpitX} ${armpitY}`];
    }
    if (isSleeveless) {
      return [
        `L ${cx + shHalf - 6} ${rig.shoulderY + 1}`,
        `Q ${cx + chHalf - 1} ${rig.chestY - 6} ${cx + armpitX} ${armpitY}`,
      ];
    }
    if (isCapSleeve) {
      return [
        `L ${cx + shHalf} ${rig.shoulderY + 2}`,
        `C ${cx + arm.deltoid.outerX + slEase} ${arm.deltoid.y + 4}, ${cx + arm.bicep.outerX + slEase * 0.8} ${arm.bicep.y - 6}, ${cx + arm.bicep.outerX + slEase * 0.6} ${arm.bicep.y - 2}`,
        `L ${cx + arm.bicep.innerX - slEase * 0.4} ${arm.bicep.y}`,
        `L ${cx + armpitX} ${armpitY}`,
      ];
    }
    if (isThreeQuarter) {
      return [
        `L ${cx + shHalf} ${rig.shoulderY + 2}`,
        `C ${cx + arm.deltoid.outerX + slEase} ${arm.deltoid.y + 6}, ${cx + arm.elbow.outerX + slEase} ${arm.elbow.y - 6}, ${cx + midForearmOuterX + slEase * 0.85} ${midForearmY}`,
        `L ${cx + midForearmInnerX - slEase * 0.65} ${midForearmY + 1.5}`,
        `C ${cx + arm.elbow.innerX - slEase * 0.65} ${arm.elbow.y + 2}, ${cx + armpitX + 2} ${armpitY + 6}, ${cx + armpitX} ${armpitY}`,
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
    return [
      `L ${cx + shHalf} ${rig.shoulderY + 2}`,
      `C ${cx + arm.deltoid.outerX + slEase} ${arm.deltoid.y + 5}, ${cx + arm.bicep.outerX + slEase} ${arm.bicep.y - 6}, ${cx + arm.bicep.outerX + slEase} ${arm.bicep.y}`,
      `L ${cx + arm.bicep.innerX - slEase * 0.6} ${arm.bicep.y + 2.5}`,
      `Q ${cx + armpitX + 2} ${armpitY + 5} ${cx + armpitX} ${armpitY}`,
    ];
  };

  const buildLeftSleeveReturn = (): string[] => {
    if (isStrapless) {
      return [`L ${cx - chHalf} ${rig.chestY - 9}`];
    }
    if (isSleeveless) {
      return [`Q ${cx - chHalf + 1} ${rig.chestY - 6} ${cx - shHalf + 6} ${rig.shoulderY + 1}`];
    }
    if (isCapSleeve) {
      return [
        `L ${cx - arm.bicep.innerX + slEase * 0.4} ${arm.bicep.y}`,
        `L ${cx - arm.bicep.outerX - slEase * 0.6} ${arm.bicep.y - 2}`,
        `C ${cx - arm.bicep.outerX - slEase * 0.8} ${arm.bicep.y - 6}, ${cx - arm.deltoid.outerX - slEase} ${arm.deltoid.y + 4}, ${cx - shHalf} ${rig.shoulderY + 2}`,
      ];
    }
    if (isThreeQuarter) {
      return [
        `C ${cx - armpitX - 2} ${armpitY + 6}, ${cx - arm.elbow.innerX + slEase * 0.65} ${arm.elbow.y + 2}, ${cx - midForearmInnerX + slEase * 0.65} ${midForearmY + 1.5}`,
        `L ${cx - midForearmOuterX - slEase * 0.85} ${midForearmY}`,
        `C ${cx - arm.elbow.outerX - slEase} ${arm.elbow.y - 6}, ${cx - arm.deltoid.outerX - slEase} ${arm.deltoid.y + 6}, ${cx - shHalf} ${rig.shoulderY + 2}`,
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

  const torsoRight: string[] = isFullLengthPiece
    ? [
        `C ${cx + chHalf} ${rig.waistY - 14}, ${cx + wHalf} ${rig.waistY - 6}, ${cx + wHalf} ${rig.waistY}`,
        `C ${cx + hHalf + 1} ${rig.hipY - 8}, ${cx + hemHalf - 1} ${hemY - 34}, ${cx + hemHalf} ${hemY}`,
        `Q ${cx} ${hemY + 6} ${cx - hemHalf} ${hemY}`,
        `C ${cx - hemHalf + 1} ${hemY - 34}, ${cx - hHalf - 1} ${rig.hipY - 8}, ${cx - wHalf} ${rig.waistY}`,
        `C ${cx - wHalf} ${rig.waistY - 6}, ${cx - chHalf} ${rig.waistY - 14}, ${cx - armpitX} ${armpitY}`,
      ]
    : garmentLength === 'crop' || garmentLength === 'waist'
      ? [
          `C ${cx + chHalf} ${(armpitY + hemY) * 0.52}, ${cx + hemHalf} ${hemY - 8}, ${cx + hemHalf} ${hemY}`,
          `Q ${cx} ${hemY + 2.5} ${cx - hemHalf} ${hemY}`,
          `C ${cx - hemHalf} ${hemY - 8}, ${cx - chHalf} ${(armpitY + hemY) * 0.52}, ${cx - armpitX} ${armpitY}`,
        ]
      : [
          `C ${cx + chHalf} ${rig.waistY - 12}, ${cx + wHalf} ${rig.waistY - 4}, ${cx + wHalf} ${rig.waistY}`,
          `C ${cx + wHalf} ${rig.waistY + 12}, ${cx + hemHalf} ${hemY - 12}, ${cx + hemHalf} ${hemY}`,
          `Q ${cx} ${hemY + (subtype === 'shirt' ? 5 : 2.5)} ${cx - hemHalf} ${hemY}`,
          `C ${cx - hemHalf} ${hemY - 12}, ${cx - wHalf} ${rig.waistY + 12}, ${cx - wHalf} ${rig.waistY}`,
          `C ${cx - wHalf} ${rig.waistY - 4}, ${cx - chHalf} ${rig.waistY - 12}, ${cx - armpitX} ${armpitY}`,
        ];

  const garmentPath = [
    ...buildNecklineSegment(),
    ...buildRightSleeve(),
    ...torsoRight,
    ...buildLeftSleeveReturn(),
    'Z',
  ].join(' ');

  const resolvedPrimary = bp.primaryColorHex ?? garmentColorHex;
  const baseFill = resolvedPrimary ?? 'var(--accent)';
  const trimFill = bp.secondaryColorHex ?? baseFill;
  const strokeColor = resolveGarmentAccentStroke(resolvedPrimary);
  const seamColor = resolveGarmentSeamColor(resolvedPrimary);
  const buttonColor = bp.accentColorHex ?? resolveGarmentButtonColor(resolvedPrimary);
  // Siempre sintetizamos el gemelo digital paramétrico a medida sobre el avatar (nunca pegamos fotos crudas)
  const clipId = `${patternPrefix}-${variant}-clip`;
  const customPatternId = `${patternPrefix}-${variant}-twin-pat`;
  const stripeStep = bp.stripeDensity === 'fine' ? 6 : bp.stripeDensity === 'wide' ? 14 : 9.5;
  const stripeColor = bp.secondaryColorHex ?? 'rgb(255 255 255 / 32%)';
  const hasCustomPattern =
    bp.patternType === 'horizontal_stripes' ||
    bp.patternType === 'vertical_stripes' ||
    bp.patternType === 'plaid' ||
    bp.patternType === 'dots' ||
    bp.patternType === 'ribbed';

  const maxHalfX =
    Math.max(
      isLongSleeve
        ? arm.wrist.outerX + cuffEase
        : isThreeQuarter
          ? midForearmOuterX + slEase
          : arm.bicep.outerX + slEase,
      hemHalf,
      chHalf,
    ) + 3;
  const imgX = cx - maxHalfX;
  const imgY = neckTopY - 3;
  const imgW = maxHalfX * 2;
  const imgH = hemY - neckTopY + 10;

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
    <g
      data-garment={variant}
      data-neckline={neckline}
      data-sleeve={sleeveLength}
      data-closure={bp.closure}
      aria-label={`Plantilla de ${variant} sobre el avatar`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={garmentPath} />
        </clipPath>
        {hasCustomPattern && bp.patternType === 'horizontal_stripes' && (
          <pattern id={customPatternId} width="16" height={stripeStep} patternUnits="userSpaceOnUse">
            <rect width="16" height={stripeStep * 0.38} fill={stripeColor} opacity="0.82" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'vertical_stripes' && (
          <pattern id={customPatternId} width={stripeStep} height="16" patternUnits="userSpaceOnUse">
            <rect width={stripeStep * 0.34} height="16" fill={stripeColor} opacity="0.8" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'plaid' && (
          <pattern id={customPatternId} width={stripeStep * 1.5} height={stripeStep * 1.5} patternUnits="userSpaceOnUse">
            <rect width={stripeStep * 1.5} height={stripeStep * 0.26} fill={stripeColor} opacity="0.62" />
            <rect width={stripeStep * 0.26} height={stripeStep * 1.5} fill={stripeColor} opacity="0.62" />
            <rect
              y={stripeStep * 0.78}
              width={stripeStep * 1.5}
              height="1.2"
              fill={bp.accentColorHex ?? seamColor}
              opacity="0.55"
            />
            <rect
              x={stripeStep * 0.78}
              width="1.2"
              height={stripeStep * 1.5}
              fill={bp.accentColorHex ?? seamColor}
              opacity="0.55"
            />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'dots' && (
          <pattern id={customPatternId} width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.45" fill={stripeColor} opacity="0.85" />
            <circle cx="8.5" cy="8.5" r="1.45" fill={stripeColor} opacity="0.85" />
          </pattern>
        )}
        {hasCustomPattern && bp.patternType === 'ribbed' && (
          <pattern id={customPatternId} width="3.8" height="10" patternUnits="userSpaceOnUse">
            <line x1="1" y1="0" x2="1" y2="10" stroke="rgb(255 255 255 / 16%)" strokeWidth="0.75" />
            <line x1="2.7" y1="0" x2="2.7" y2="10" stroke="rgb(0 0 0 / 15%)" strokeWidth="0.75" />
          </pattern>
        )}
      </defs>

      {/* Profundidad interior del cuello */}
      {!isStrapless && neckline !== 'turtleneck' && (
        <path
          d={
            neckline === 'v_neck'
              ? `M ${cx - neckHalf} ${neckTopY} Q ${cx} ${neckTopY - 3} ${cx + neckHalf} ${neckTopY} L ${cx} ${neckDropY + 5} Z`
              : neckline === 'square'
                ? `M ${cx - neckHalf} ${neckTopY} Q ${cx} ${neckTopY - 2.5} ${cx + neckHalf} ${neckTopY} L ${cx + neckHalf - 1.5} ${neckDropY} L ${cx - neckHalf + 1.5} ${neckDropY} Z`
                : `M ${cx - neckHalf} ${neckTopY} Q ${cx} ${neckTopY - 3} ${cx + neckHalf} ${neckTopY} C ${cx + neckHalf * 0.55} ${neckDropY}, ${cx - neckHalf * 0.55} ${neckDropY}, ${cx - neckHalf} ${neckTopY} Z`
          }
          fill={`url(#${patternPrefix}-collar-depth)`}
          opacity={showHeatmap ? 0.2 : 0.65}
        />
      )}

      {/* Capucha superior alrededor del cuello */}
      {bp.hasHood && (
        <path
          d={`M ${cx - neckHalf - 6} ${neckTopY + 2} C ${cx - neckHalf - 9} ${neckTopY - 10}, ${cx - neckHalf + 2} ${neckTopY - 15}, ${cx} ${neckTopY - 13} C ${cx + neckHalf - 2} ${neckTopY - 15}, ${cx + neckHalf + 9} ${neckTopY - 10}, ${cx + neckHalf + 6} ${neckTopY + 2} Q ${cx} ${neckDropY + 3} ${cx - neckHalf - 6} ${neckTopY + 2} Z`}
          fill={trimFill}
          fillOpacity={showHeatmap ? 0.16 : 0.94}
          stroke={strokeColor}
          strokeWidth="1.05"
        />
      )}

      {/* Cuello alto / turtleneck */}
      {neckline === 'turtleneck' && (
        <path
          d={`M ${cx - rig.neckHalf - 1.5} ${neckTopY + 2} L ${cx - rig.neckHalf - 1} ${neckTopY - 12} Q ${cx} ${neckTopY - 14} ${cx + rig.neckHalf + 1} ${neckTopY - 12} L ${cx + rig.neckHalf + 1.5} ${neckTopY + 2} Q ${cx} ${neckTopY + 6} ${cx - rig.neckHalf - 1.5} ${neckTopY + 2} Z`}
          fill={trimFill}
          fillOpacity={showHeatmap ? 0.18 : 0.97}
          stroke={strokeColor}
          strokeWidth="1.05"
        />
      )}

      {/* Capa base de tela */}
      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.96} />

      {/* Bloques de color (colorblock) ajustados a las proporciones del avatar */}
      {!showHeatmap && bp.secondaryColorHex && bp.colorblockLayout !== 'none' && (
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          {bp.colorblockLayout === 'raglan_sleeves' && (
            <>
              <rect x={imgX} y={imgY} width={cx - armpitX - imgX + 4} height={imgH} fill={bp.secondaryColorHex} />
              <rect x={cx + armpitX - 4} y={imgY} width={imgX + imgW - (cx + armpitX - 4)} height={imgH} fill={bp.secondaryColorHex} />
            </>
          )}
          {bp.colorblockLayout === 'top_bottom_split' && (
            <rect
              x={imgX}
              y={(rig.chestY + rig.waistY) * 0.52}
              width={imgW}
              height={hemY - (rig.chestY + rig.waistY) * 0.52 + 8}
              fill={bp.secondaryColorHex}
            />
          )}
          {bp.colorblockLayout === 'chest_band' && (
            <rect
              x={imgX}
              y={rig.chestY - 7}
              width={imgW}
              height={22}
              fill={bp.secondaryColorHex}
            />
          )}
          {bp.colorblockLayout === 'side_panels' && (
            <>
              <rect x={cx - chHalf - 2} y={armpitY - 2} width={10} height={hemY - armpitY + 6} fill={bp.secondaryColorHex} />
              <rect x={cx + chHalf - 8} y={armpitY - 2} width={10} height={hemY - armpitY + 6} fill={bp.secondaryColorHex} />
            </>
          )}
        </g>
      )}

      {/* Patrón / textura del gemelo digital */}
      {hasCustomPattern && !showHeatmap ? (
        <path d={garmentPath} fill={`url(#${customPatternId})`} />
      ) : (
        patternId && !showHeatmap && <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.82" />
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

      {/* Detalles quirúrgicos de confección según blueprint */}
      {!showHeatmap && (
        <g pointerEvents="none">
          {/* Costuras de sisa siguiendo el hombro anatómico */}
          {!isSleeveless && !isStrapless && (
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

          {/* Ribete cuello crew / v_neck */}
          {neckline === 'crew' && (
            <path
              d={`M ${cx - neckHalf + 1} ${neckTopY + 2.5} C ${cx - neckHalf * 0.55} ${neckDropY + 2.8}, ${cx + neckHalf * 0.55} ${neckDropY + 2.8}, ${cx + neckHalf - 1} ${neckTopY + 2.5}`}
              fill="none"
              stroke={bp.secondaryColorHex ?? seamColor}
              strokeWidth={bp.secondaryColorHex ? '1.8' : '1.05'}
            />
          )}

          {neckline === 'v_neck' && (
            <path
              d={`M ${cx - neckHalf + 1.5} ${neckTopY + 2.2} L ${cx} ${neckDropY + 7.5} L ${cx + neckHalf - 1.5} ${neckTopY + 2.2}`}
              fill="none"
              stroke={bp.secondaryColorHex ?? seamColor}
              strokeWidth={bp.secondaryColorHex ? '1.7' : '1.05'}
              strokeLinejoin="round"
            />
          )}

          {/* Cuello doblado camisa / polo */}
          {(neckline === 'shirt_collar' || neckline === 'polo') && (
            <path
              d={`M ${cx - neckHalf} ${neckTopY} L ${cx - neckHalf - 2.5} ${neckTopY + 11} L ${cx} ${neckDropY + 3.5} L ${cx + neckHalf + 2.5} ${neckTopY + 11} L ${cx + neckHalf} ${neckTopY}`}
              fill={trimFill}
              fillOpacity="0.96"
              stroke={strokeColor}
              strokeWidth="0.95"
              strokeLinejoin="round"
            />
          )}

          {/* Cierre de botones */}
          {bp.closure === 'buttons' && (
            <>
              <line
                x1={cx}
                y1={neckDropY + 3.5}
                x2={cx}
                y2={neckline === 'polo' ? rig.chestY + 16 : hemY + 1.5}
                stroke={seamColor}
                strokeWidth="0.95"
              />
              {(neckline === 'polo' ? [0.16, 0.28] : [0.18, 0.34, 0.5, 0.66, 0.82]).map((ratio) => {
                const by = neckDropY + 5 + (hemY - neckDropY - 10) * ratio;
                if (by > hemY - 4) return null;
                return (
                  <circle key={ratio} cx={cx} cy={by} r="1.45" fill={buttonColor} opacity="0.86" />
                );
              })}
            </>
          )}

          {/* Cierre de cremallera */}
          {bp.closure === 'zipper' && (
            <>
              <line
                x1={cx}
                y1={neckDropY + 1}
                x2={cx}
                y2={hemY + 1.5}
                stroke={strokeColor}
                strokeWidth="1.25"
              />
              <line
                x1={cx}
                y1={neckDropY + 2}
                x2={cx}
                y2={hemY}
                stroke={buttonColor}
                strokeWidth="1.15"
                strokeDasharray="1.8 1.6"
                opacity="0.82"
              />
              <rect
                x={cx - 1.6}
                y={neckDropY + 3.5}
                width={3.2}
                height={5.2}
                rx={1}
                fill={buttonColor}
                opacity="0.9"
              />
            </>
          )}

          {/* Apertura frontal abierta */}
          {bp.closure === 'open_front' && (
            <line
              x1={cx}
              y1={neckDropY + 1}
              x2={cx}
              y2={hemY + 1.5}
              stroke={strokeColor}
              strokeWidth="1.25"
            />
          )}

          {/* Solapas de chaqueta / blazer */}
          {bp.hasLapels && (
            <path
              d={`M ${cx - neckHalf} ${neckTopY} L ${cx - 12} ${rig.chestY + 1} L ${cx} ${rig.chestY + 12} L ${cx + 12} ${rig.chestY + 1} L ${cx + neckHalf} ${neckTopY}`}
              fill="rgb(0 0 0 / 6%)"
              stroke={strokeColor}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          )}

          {/* Cordones de capucha */}
          {bp.hasHood && (
            <>
              <path
                d={`M ${cx - 4.5} ${neckDropY} Q ${cx - 5.2} ${rig.chestY + 4} ${cx - 4.8} ${rig.chestY + 15}`}
                fill="none"
                stroke={buttonColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0.78"
              />
              <path
                d={`M ${cx + 4.5} ${neckDropY} Q ${cx + 5.2} ${rig.chestY + 4} ${cx + 4.8} ${rig.chestY + 15}`}
                fill="none"
                stroke={buttonColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                opacity="0.78"
              />
            </>
          )}

          {/* Bolsillo canguro */}
          {bp.pockets === 'kangaroo' && hemY > rig.waistY + 12 && (
            <path
              d={`M ${cx - wHalf * 0.56} ${rig.waistY + 6} L ${cx + wHalf * 0.56} ${rig.waistY + 6} L ${cx + hemHalf * 0.66} ${hemY - 9} L ${cx - hemHalf * 0.66} ${hemY - 9} Z`}
              fill="rgb(0 0 0 / 6%)"
              stroke={seamColor}
              strokeWidth="0.95"
              strokeLinejoin="round"
            />
          )}

          {/* Bolsillo de pecho */}
          {bp.pockets === 'chest' && (
            <path
              d={`M ${cx + 6} ${rig.chestY - 6} L ${cx + 16} ${rig.chestY - 6} L ${cx + 16} ${rig.chestY + 5} L ${cx + 11} ${rig.chestY + 7.5} L ${cx + 6} ${rig.chestY + 5} Z`}
              fill="rgb(0 0 0 / 5%)"
              stroke={seamColor}
              strokeWidth="0.9"
            />
          )}

          {/* Bolsillos parche inferiores */}
          {bp.pockets === 'patch' && hemY > rig.waistY + 12 && (
            <>
              <rect
                x={cx - hemHalf * 0.72}
                y={rig.waistY + 9}
                width={hemHalf * 0.36}
                height={15}
                rx={2}
                fill="rgb(0 0 0 / 5%)"
                stroke={seamColor}
                strokeWidth="0.9"
              />
              <rect
                x={cx + hemHalf * 0.36}
                y={rig.waistY + 9}
                width={hemHalf * 0.36}
                height={15}
                rx={2}
                fill="rgb(0 0 0 / 5%)"
                stroke={seamColor}
                strokeWidth="0.9"
              />
            </>
          )}

          {/* Bolsillos laterales ribeteados */}
          {bp.pockets === 'side' && hemY > rig.waistY + 10 && (
            <>
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

          {/* Pretina / puños en canalé (ribbed trim) */}
          {bp.hasRibbedTrim && !isFullLengthPiece && (
            <line
              x1={cx - hemHalf + 1}
              y1={hemY - 7}
              x2={cx + hemHalf - 1}
              y2={hemY - 7}
              stroke={bp.secondaryColorHex ?? seamColor}
              strokeWidth={bp.secondaryColorHex ? '2.1' : '1.05'}
            />
          )}

          {isLongSleeve && (
            <>
              <line
                x1={cx - arm.wrist.outerX - cuffEase + 0.8}
                y1={arm.wrist.y - 6}
                x2={cx - arm.wrist.innerX + cuffEase - 0.8}
                y2={arm.wrist.y - 5}
                stroke={bp.hasRibbedTrim && bp.secondaryColorHex ? bp.secondaryColorHex : seamColor}
                strokeWidth={bp.hasRibbedTrim && bp.secondaryColorHex ? '2' : '1'}
              />
              <line
                x1={cx + arm.wrist.innerX - cuffEase + 0.8}
                y1={arm.wrist.y - 5}
                x2={cx + arm.wrist.outerX + cuffEase - 0.8}
                y2={arm.wrist.y - 6}
                stroke={bp.hasRibbedTrim && bp.secondaryColorHex ? bp.secondaryColorHex : seamColor}
                strokeWidth={bp.hasRibbedTrim && bp.secondaryColorHex ? '2' : '1'}
              />
            </>
          )}

          {/* Vestido / prenda larga: corte de cintura y pliegues */}
          {isFullLengthPiece && (
            <>
              <path
                d={`M ${cx - wHalf + 1} ${rig.waistY} Q ${cx} ${rig.waistY + 3.5} ${cx + wHalf - 1} ${rig.waistY}`}
                fill="none"
                stroke={bp.closure === 'belt' ? buttonColor : seamColor}
                strokeWidth={bp.closure === 'belt' ? '2.2' : '0.95'}
              />
              {bp.hasPleats && (
                <>
                  <path
                    d={`M ${cx - wHalf * 0.44} ${rig.waistY + 6} Q ${cx - hemHalf * 0.42} ${rig.hipY + 20} ${cx - hemHalf * 0.45} ${hemY - 4}`}
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="0.85"
                    opacity="0.65"
                  />
                  <path
                    d={`M ${cx} ${rig.waistY + 7} L ${cx} ${hemY - 5}`}
                    fill="none"
                    stroke={seamColor}
                    strokeWidth="0.7"
                    opacity="0.48"
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
