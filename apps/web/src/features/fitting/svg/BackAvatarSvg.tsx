import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX, computeFrontAvatarAnchors } from './anchors';
import { BackPantsTemplate } from './BackPantsTemplate';
import { BackTshirtTemplate } from './BackTshirtTemplate';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';

export function BackAvatarSvg({
  model,
  garmentCategory,
  fitReport,
  showHeatmap,
  garmentColorHex,
  garmentMeta,
  outfitLayers,
  compact = false,
  frameless = false,
  patternIdSuffix,
}: SingleAvatarViewProps) {
  const anchors = computeFrontAvatarAnchors(model);
  const cx = anchors.centerX;
  const patternPrefix = patternIdSuffix ? `back-${patternIdSuffix}` : 'back';

  const backHalfW = Math.max(anchors.chestHalfW, (model.backWidthCm / 2) * anchors.scale);
  const headRx = anchors.headRadius * 0.8;
  const headRy = anchors.headRadius * 1.02;
  const headTopY = anchors.headCenterY - headRy;
  const napeY = anchors.headCenterY + headRy * 0.92;
  const neckHalf = anchors.neckHalfW * 0.98;
  const neckBaseY = anchors.shoulderY - 4;

  const backHeadPath = [
    `M ${cx} ${headTopY}`,
    `C ${cx + headRx * 1.06} ${headTopY}, ${cx + headRx * 1.06} ${anchors.headCenterY + headRy * 0.32}, ${cx + headRx * 0.72} ${napeY - 2}`,
    `Q ${cx} ${napeY + 4} ${cx - headRx * 0.72} ${napeY - 2}`,
    `C ${cx - headRx * 1.06} ${anchors.headCenterY + headRy * 0.32}, ${cx - headRx * 1.06} ${headTopY}, ${cx} ${headTopY}`,
    'Z',
  ].join(' ');

  const neckPath = [
    `M ${cx - neckHalf} ${napeY - 6}`,
    `L ${cx + neckHalf} ${napeY - 6}`,
    `C ${cx + neckHalf} ${neckBaseY - 4}, ${cx + neckHalf + 6} ${neckBaseY + 2}, ${cx + anchors.shoulderHalfW * 0.56} ${anchors.shoulderY + 2}`,
    `L ${cx - anchors.shoulderHalfW * 0.56} ${anchors.shoulderY + 2}`,
    `C ${cx - neckHalf - 6} ${neckBaseY + 2}, ${cx - neckHalf} ${neckBaseY - 4}, ${cx - neckHalf} ${napeY - 6}`,
    'Z',
  ].join(' ');

  const buildBackArmPath = (side: -1 | 1) => {
    const shX = cx + side * anchors.shoulderHalfW;
    const armOuterElbowX = cx + side * (anchors.shoulderHalfW + 14);
    const armInnerElbowX = cx + side * (backHalfW + 7);
    const elbowY = anchors.waistY + 4;
    const wristOuterX = cx + side * (anchors.shoulderHalfW + 20);
    const wristInnerX = cx + side * (anchors.shoulderHalfW + 10);
    const wristY = anchors.hipY + 18;
    const handTipY = anchors.crotchY + 14;
    const handOuterX = cx + side * (anchors.shoulderHalfW + 22);
    const handInnerX = cx + side * (anchors.shoulderHalfW + 11);

    return [
      `M ${shX - side * 5} ${anchors.shoulderY + 2}`,
      `C ${shX + side * 8} ${anchors.shoulderY + 6}, ${armOuterElbowX + side * 2} ${anchors.chestY + 16}, ${armOuterElbowX} ${elbowY}`,
      `C ${armOuterElbowX + side * 4} ${anchors.hipY - 8}, ${wristOuterX + side * 2} ${wristY - 8}, ${wristOuterX} ${wristY}`,
      `C ${handOuterX + side * 2} ${wristY + 10}, ${handOuterX} ${handTipY - 4}, ${handOuterX - side * 3.5} ${handTipY}`,
      `C ${handInnerX + side * 2} ${handTipY + 1}, ${handInnerX - side * 1} ${wristY + 11}, ${wristInnerX} ${wristY + 2}`,
      `C ${armInnerElbowX + side * 2} ${anchors.hipY - 12}, ${armInnerElbowX} ${elbowY + 4}, ${armInnerElbowX} ${elbowY}`,
      `C ${cx + side * (backHalfW + 3)} ${anchors.chestY + 18}, ${cx + side * backHalfW} ${anchors.chestY + 4}, ${shX - side * 5} ${anchors.shoulderY + 2}`,
      'Z',
    ].join(' ');
  };

  const calfY = anchors.kneeY + (anchors.ankleY - anchors.kneeY) * 0.34;
  const ankleJointY = anchors.ankleY - 12;
  const kneeOuterX = anchors.hipHalfW * 0.65;
  const calfOuterX = anchors.hipHalfW * 0.68;
  const ankleOuterX = anchors.ankleHalfW + 13;
  const ankleInnerX = 7.5;
  const kneeInnerX = 5.5;
  const calfInnerX = 6.5;

  const torsoAndLegsPath = [
    `M ${cx - neckHalf - 2} ${anchors.shoulderY - 2}`,
    `C ${cx - anchors.shoulderHalfW * 0.62} ${anchors.shoulderY - 1}, ${cx - anchors.shoulderHalfW} ${anchors.shoulderY + 1}, ${cx - anchors.shoulderHalfW} ${anchors.shoulderY + 7}`,
    `C ${cx - anchors.shoulderHalfW} ${anchors.chestY - 10}, ${cx - backHalfW - 1} ${anchors.chestY - 4}, ${cx - backHalfW} ${anchors.chestY + 4}`,
    `C ${cx - backHalfW + 1} ${anchors.waistY - 16}, ${cx - anchors.waistHalfW} ${anchors.waistY - 8}, ${cx - anchors.waistHalfW} ${anchors.waistY}`,
    `C ${cx - anchors.waistHalfW} ${anchors.hipY - 16}, ${cx - anchors.hipHalfW} ${anchors.hipY - 10}, ${cx - anchors.hipHalfW} ${anchors.hipY}`,
    `C ${cx - anchors.hipHalfW} ${anchors.crotchY - 2}, ${cx - anchors.hipHalfW * 0.9} ${anchors.crotchY + 14}, ${cx - kneeOuterX} ${anchors.kneeY}`,
    `C ${cx - calfOuterX} ${calfY - 8}, ${cx - calfOuterX} ${calfY + 12}, ${cx - ankleOuterX} ${ankleJointY}`,
    `L ${cx - ankleOuterX - 2} ${anchors.ankleY}`,
    `L ${cx - ankleInnerX + 1} ${anchors.ankleY}`,
    `L ${cx - ankleInnerX} ${ankleJointY}`,
    `C ${cx - calfInnerX} ${calfY + 8}, ${cx - calfInnerX - 2} ${calfY - 10}, ${cx - kneeInnerX} ${anchors.kneeY}`,
    `C ${cx - kneeInnerX - 2} ${anchors.crotchY + 34}, ${cx - 4} ${anchors.crotchY + 8}, ${cx} ${anchors.crotchY + 4}`,
    `C ${cx + 4} ${anchors.crotchY + 8}, ${cx + kneeInnerX + 2} ${anchors.crotchY + 34}, ${cx + kneeInnerX} ${anchors.kneeY}`,
    `C ${cx + calfInnerX + 2} ${calfY - 10}, ${cx + calfInnerX} ${calfY + 8}, ${cx + ankleInnerX} ${ankleJointY}`,
    `L ${cx + ankleInnerX - 1} ${anchors.ankleY}`,
    `L ${cx + ankleOuterX + 2} ${anchors.ankleY}`,
    `L ${cx + ankleOuterX} ${ankleJointY}`,
    `C ${cx + calfOuterX} ${calfY + 12}, ${cx + calfOuterX} ${calfY - 8}, ${cx + kneeOuterX} ${anchors.kneeY}`,
    `C ${cx + anchors.hipHalfW * 0.9} ${anchors.crotchY + 14}, ${cx + anchors.hipHalfW} ${anchors.crotchY - 2}, ${cx + anchors.hipHalfW} ${anchors.hipY}`,
    `C ${cx + anchors.hipHalfW} ${anchors.hipY - 10}, ${cx + anchors.waistHalfW} ${anchors.hipY - 16}, ${cx + anchors.waistHalfW} ${anchors.waistY}`,
    `C ${cx + anchors.waistHalfW} ${anchors.waistY - 8}, ${cx + backHalfW - 1} ${anchors.waistY - 16}, ${cx + backHalfW} ${anchors.chestY + 4}`,
    `C ${cx + backHalfW + 1} ${anchors.chestY - 4}, ${cx + anchors.shoulderHalfW} ${anchors.chestY - 10}, ${cx + anchors.shoulderHalfW} ${anchors.shoulderY + 7}`,
    `C ${cx + anchors.shoulderHalfW} ${anchors.shoulderY + 1}, ${cx + anchors.shoulderHalfW * 0.62} ${anchors.shoulderY - 1}, ${cx + neckHalf + 2} ${anchors.shoulderY - 2}`,
    'Z',
  ].join(' ');

  const isBackEstimated = model.backWidthEstimated || model.backLengthEstimated;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      role="img"
      aria-label="Avatar paramétrico de espalda con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />
      <MannequinDefs prefix={patternPrefix} />

      {/* Brazos traseros */}
      <g fill={`url(#${patternPrefix}-limb-grad)`} stroke="var(--mannequin-stroke)" strokeWidth="1.15" strokeLinejoin="round">
        <path d={buildBackArmPath(-1)} />
        <path d={buildBackArmPath(1)} />
      </g>

      {/* Cuello trasero */}
      <path
        d={neckPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.1"
      />

      {/* Torso y piernas traseras */}
      <path
        d={torsoAndLegsPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        data-avatar-body="back"
      />

      {/* Línea anatómica sutil de columna, omóplatos y pantorrillas */}
      <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.95" strokeLinecap="round">
        <line x1={cx} y1={anchors.shoulderY + 8} x2={cx} y2={anchors.waistY + 6} />
        <path
          d={`M ${cx - backHalfW * 0.56} ${anchors.shoulderY + 16} Q ${cx - backHalfW * 0.3} ${anchors.chestY + 2} ${cx - backHalfW * 0.22} ${anchors.chestY + 12}`}
        />
        <path
          d={`M ${cx + backHalfW * 0.56} ${anchors.shoulderY + 16} Q ${cx + backHalfW * 0.3} ${anchors.chestY + 2} ${cx + backHalfW * 0.22} ${anchors.chestY + 12}`}
        />
      </g>

      {/* Orejas y nuca */}
      <ellipse
        cx={cx - headRx * 0.98}
        cy={anchors.headCenterY + 2}
        rx={2.5}
        ry={5}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.95"
      />
      <ellipse
        cx={cx + headRx * 0.98}
        cy={anchors.headCenterY + 2}
        rx={2.5}
        ry={5}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.95"
      />
      <path
        d={backHeadPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <BackPantsTemplate
              anchors={anchors}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
              garmentMeta={outfitLayers.bottomMeta}
              variant={outfitLayers.bottomVariant}
            />
          )}
          {outfitLayers.topFitReport && (
            <BackTshirtTemplate
              model={model}
              anchors={anchors}
              fitReport={outfitLayers.topFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.topColorHex}
              garmentMeta={outfitLayers.topMeta}
              variant={outfitLayers.topVariant}
            />
          )}
          {outfitLayers.outerwearFitReport && (
            <BackTshirtTemplate
              model={model}
              anchors={anchors}
              fitReport={outfitLayers.outerwearFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.outerwearColorHex}
              garmentMeta={outfitLayers.outerwearMeta}
              variant="jacket"
            />
          )}
        </>
      ) : (
        <>
          {fitReport && !isLowerCategory(garmentCategory) && (
            <BackTshirtTemplate
              model={model}
              anchors={anchors}
              fitReport={fitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={garmentColorHex}
              garmentMeta={garmentMeta}
              variant={garmentCategory}
            />
          )}
          {fitReport && isLowerCategory(garmentCategory) && (
            <BackPantsTemplate
              anchors={anchors}
              fitReport={fitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={garmentColorHex}
              garmentMeta={garmentMeta}
              variant={garmentCategory}
            />
          )}
        </>
      )}
    </svg>
  );

  if (frameless) {
    return svgNode;
  }

  return (
    <div
      data-avatar-view="back"
      className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg p-3 ${compact ? 'w-full' : 'w-full max-w-[320px]'}`}
    >
      <div className="flex w-full items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">Espalda</span>
        {isBackEstimated && (
          <Badge data-estimated-badge="back">Espalda: estimado</Badge>
        )}
      </div>
      {svgNode}
    </div>
  );
}
