import type { BodyModel, FitReport } from '@luca/domain';
import {
  resolveGarmentAccentStroke,
  resolveGarmentSeamColor,
  resolveUpperBlueprint,
  type GarmentVisualMeta,
} from './garmentVisuals';
import { FIT_STATE_HEX, getHeatmapPatternId } from './heatmapMeta';
import { computeFittedEasePx, type MannequinRig } from './mannequinRig';
import type { UpperGarmentVariant } from './TshirtTemplate';

export interface BackTshirtTemplateProps {
  model: BodyModel;
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

export function BackTshirtTemplate({
  model,
  rig,
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

  const chEase = computeFittedEasePx(backZone?.easeCm ?? chestZone?.easeCm, bp.fitBoostPx);
  const shEase = computeFittedEasePx(shouldersZone?.easeCm, bp.fitBoostPx * 0.5);
  const wEase = computeFittedEasePx(waistZone?.easeCm ?? chestZone?.easeCm, bp.fitBoostPx * 0.65);
  const hEase = computeFittedEasePx(hipZone?.easeCm ?? chestZone?.easeCm, bp.fitBoostPx * 0.5);
  const slEase = Math.max(1.8, Math.min(4.8, chEase * 0.68 + Math.max(0, bp.fitBoostPx) * 0.35));
  const cuffEase = Math.max(1.4, slEase * 0.72);

  const shHalf = rig.shoulderX + shEase * 0.65;
  const chHalf = rig.backChestX + chEase;
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

  const neckHalf = rig.neckHalf + (variant === 'dress' ? 5 : 2.8);
  const neckTopY = rig.shoulderY - 5;
  const arm = rig.arm;
  const armpitY = rig.armpitY + 5;
  const armpitX = rig.armpitX + chEase * 0.85;

  const midForearmY = (arm.elbow.y + arm.wrist.y) * 0.52;
  const midForearmOuterX = (arm.elbow.outerX + arm.wrist.outerX) * 0.52;
  const midForearmInnerX = (arm.elbow.innerX + arm.wrist.innerX) * 0.52;

  const buildRightSleeve = (): string[] => {
    if (isStrapless) return [`L ${cx + armpitX} ${armpitY}`];
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
    if (isStrapless) return [`L ${cx - chHalf} ${rig.chestY - 9}`];
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

  const torsoReturn: string[] = isFullLengthPiece
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
    ...(isStrapless
      ? [`M ${cx - chHalf} ${rig.chestY - 9}`, `L ${cx + chHalf} ${rig.chestY - 9}`]
      : [
          `M ${cx - neckHalf} ${neckTopY}`,
          `Q ${cx} ${neckTopY + (isSleeveless ? 11 : 4.5)} ${cx + neckHalf} ${neckTopY}`,
        ]),
    ...buildRightSleeve(),
    ...torsoReturn,
    ...buildLeftSleeveReturn(),
    'Z',
  ].join(' ');

  const resolvedPrimary = bp.primaryColorHex ?? garmentColorHex;
  const baseFill = resolvedPrimary ?? 'var(--accent)';
  const trimFill = bp.secondaryColorHex ?? baseFill;
  const strokeColor = resolveGarmentAccentStroke(resolvedPrimary);
  const seamColor = resolveGarmentSeamColor(resolvedPrimary);
  const customPatternId = `${patternPrefix}-${variant}-back-twin-pat`;
  const stripeStep = bp.stripeDensity === 'fine' ? 6 : bp.stripeDensity === 'wide' ? 14 : 9.5;
  const stripeColor = bp.secondaryColorHex ?? 'rgb(255 255 255 / 32%)';
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
    <g data-garment={`${variant}-back`} aria-label={`Plantilla de ${variant} en vista de espalda`}>
      <defs>
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

      {neckline === 'turtleneck' && (
        <path
          d={`M ${cx - rig.neckHalf - 1.5} ${neckTopY + 2} L ${cx - rig.neckHalf - 1} ${neckTopY - 12} Q ${cx} ${neckTopY - 13} ${cx + rig.neckHalf + 1} ${neckTopY - 12} L ${cx + rig.neckHalf + 1.5} ${neckTopY + 2} Z`}
          fill={trimFill}
          fillOpacity={showHeatmap ? 0.18 : 0.96}
          stroke={strokeColor}
          strokeWidth="1.05"
        />
      )}

      <path d={garmentPath} fill={baseFill} fillOpacity={showHeatmap ? 0.16 : 0.96} />

      {hasCustomPattern && !showHeatmap ? (
        <path d={garmentPath} fill={`url(#${customPatternId})`} />
      ) : (
        patternId && !showHeatmap && <path d={garmentPath} fill={`url(#${patternId})`} opacity="0.82" />
      )}

      {!showHeatmap && (
        <>
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-shade)`} opacity="0.58" />
          <path d={garmentPath} fill={`url(#${patternPrefix}-fabric-drape)`} opacity="0.46" />
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
          {bp.hasHood && (
            <path
              d={`M ${cx - neckHalf - 4} ${neckTopY} C ${cx - shHalf * 0.62} ${rig.shoulderY + 8}, ${cx - shHalf * 0.44} ${rig.chestY}, ${cx} ${rig.chestY + 3} C ${cx + shHalf * 0.44} ${rig.chestY}, ${cx + shHalf * 0.62} ${rig.shoulderY + 8}, ${cx + neckHalf + 4} ${neckTopY} Z`}
              fill={trimFill}
              fillOpacity="0.96"
              stroke={strokeColor}
              strokeWidth="1.05"
              strokeLinejoin="round"
            />
          )}

          {subtype === 'shirt' && (
            <>
              <line
                x1={cx - shHalf + 5}
                y1={rig.shoulderY + 13}
                x2={cx + shHalf - 5}
                y2={rig.shoulderY + 13}
                stroke={seamColor}
                strokeWidth="0.95"
              />
              <line
                x1={cx}
                y1={rig.shoulderY + 13}
                x2={cx}
                y2={rig.waistY + 6}
                stroke={seamColor}
                strokeWidth="0.85"
                opacity="0.7"
              />
            </>
          )}

          {(variant === 'jacket' || isFullLengthPiece) && (
            <line
              x1={cx}
              y1={neckTopY + 4}
              x2={cx}
              y2={hemY - 2}
              stroke={seamColor}
              strokeWidth="0.9"
            />
          )}

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
        </g>
      )}

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
            y={rig.chestY - 12}
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
            y={rig.chestY + 10}
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
            y={rig.waistY - 4}
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
            y={rig.hipY - 12}
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
