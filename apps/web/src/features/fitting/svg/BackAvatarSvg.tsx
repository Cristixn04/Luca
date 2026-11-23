import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX } from './anchors';
import { BackPantsTemplate } from './BackPantsTemplate';
import { BackTshirtTemplate } from './BackTshirtTemplate';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';
import { computeMannequinRig } from './mannequinRig';

export function BackAvatarSvg({
  model,
  silhouette = 'female',
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
  const rig = computeMannequinRig(model, silhouette);
  const cx = rig.cx;
  const isFemale = silhouette === 'female';
  const patternPrefix = patternIdSuffix ? `back-${patternIdSuffix}` : 'back';

  const napeY = rig.headCenterY + rig.headRy * 0.9;
  const backHeadPath = [
    `M ${cx} ${rig.headTopY}`,
    `C ${cx + rig.headRx * 1.05} ${rig.headTopY}, ${cx + rig.headRx * 1.04} ${rig.headCenterY + rig.headRy * 0.3}, ${cx + rig.headRx * 0.72} ${napeY - 2}`,
    `Q ${cx} ${napeY + 3.5} ${cx - rig.headRx * 0.72} ${napeY - 2}`,
    `C ${cx - rig.headRx * 1.04} ${rig.headCenterY + rig.headRy * 0.3}, ${cx - rig.headRx * 1.05} ${rig.headTopY}, ${cx} ${rig.headTopY}`,
    'Z',
  ].join(' ');

  const neckPath = [
    `M ${cx - rig.neckHalf} ${napeY - 5}`,
    `L ${cx + rig.neckHalf} ${napeY - 5}`,
    `C ${cx + rig.neckHalf} ${rig.neckBaseY}, ${cx + rig.neckHalf + 4} ${rig.shoulderY - 2}, ${cx + rig.shoulderX * 0.52} ${rig.shoulderY + 2}`,
    `L ${cx - rig.shoulderX * 0.52} ${rig.shoulderY + 2}`,
    `C ${cx - rig.neckHalf - 4} ${rig.shoulderY - 2}, ${cx - rig.neckHalf} ${rig.neckBaseY}, ${cx - rig.neckHalf} ${napeY - 5}`,
    'Z',
  ].join(' ');

  const buildBackArmPath = (side: -1 | 1) => {
    const a = rig.arm;
    const s = side;
    const wOutX = cx + s * a.wrist.outerX;
    const wInX = cx + s * a.wrist.innerX;
    const wY = a.wrist.y;
    const handTipY = a.handTipY;
    const handLen = Math.max(12, handTipY - wY);
    const thumbTipX = cx + s * (a.wrist.innerX - 3.2);
    const thumbTipY = wY + handLen * 0.44;
    const palmInX = cx + s * (a.wrist.innerX + 0.8);
    const fingerOutX = cx + s * (a.wrist.outerX + 2.2);
    const fingerTipX = cx + s * (a.wrist.innerX + 2.4);

    return [
      `M ${cx + s * (rig.shoulderX - 3)} ${rig.shoulderY + 1}`,
      `C ${cx + s * (a.deltoid.outerX + 1.5)} ${a.deltoid.y + 4}, ${cx + s * (a.bicep.outerX + 0.5)} ${a.bicep.y - 4}, ${cx + s * a.bicep.outerX} ${a.bicep.y}`,
      `C ${cx + s * a.elbow.outerX} ${a.elbow.y - 6}, ${cx + s * a.elbow.outerX} ${a.elbow.y + 4}, ${cx + s * a.forearm.outerX} ${a.forearm.y}`,
      `C ${cx + s * (a.forearm.outerX + 1)} ${wY - 10}, ${wOutX + s * 0.8} ${wY - 4}, ${wOutX} ${wY}`,
      `C ${fingerOutX} ${wY + handLen * 0.25}, ${fingerOutX - s * 0.5} ${handTipY - handLen * 0.25}, ${fingerTipX} ${handTipY}`,
      `C ${palmInX + s * 1} ${handTipY - 1}, ${palmInX} ${wY + handLen * 0.48}, ${palmInX - s * 0.8} ${wY + handLen * 0.34}`,
      `L ${thumbTipX} ${thumbTipY}`,
      `C ${thumbTipX - s * 1.4} ${wY + handLen * 0.36}, ${wInX - s * 1.2} ${wY + handLen * 0.18}, ${wInX} ${wY}`,
      `C ${cx + s * a.forearm.innerX} ${a.forearm.y + 4}, ${cx + s * a.elbow.innerX} ${a.elbow.y + 3}, ${cx + s * a.elbow.innerX} ${a.elbow.y}`,
      `C ${cx + s * a.bicep.innerX} ${a.bicep.y + 2}, ${cx + s * (rig.armpitX + 1)} ${rig.armpitY + 4}, ${cx + s * rig.armpitX} ${rig.armpitY}`,
      `L ${cx + s * (rig.shoulderX - 3)} ${rig.shoulderY + 1}`,
      'Z',
    ].join(' ');
  };

  const torsoAndLegsPath = [
    `M ${cx - rig.neckHalf - 2} ${rig.shoulderY - 2}`,
    `C ${cx - rig.shoulderX * 0.65} ${rig.shoulderY - 1}, ${cx - rig.shoulderX + 1} ${rig.shoulderY}, ${cx - rig.shoulderX} ${rig.shoulderY + 5}`,
    `C ${cx - rig.armpitX - 2} ${rig.armpitY - 8}, ${cx - rig.armpitX} ${rig.armpitY - 2}, ${cx - rig.backChestX} ${rig.chestY + 4}`,
    `C ${cx - rig.backChestX} ${rig.waistY - 14}, ${cx - rig.waistX} ${rig.waistY - 8}, ${cx - rig.waistX} ${rig.waistY}`,
    `C ${cx - rig.waistX} ${rig.hipY - 16}, ${cx - rig.hipX} ${rig.hipY - 12}, ${cx - rig.hipX} ${rig.hipY}`,
    `C ${cx - rig.hipX} ${rig.crotchY + 4}, ${cx - rig.hipX * 0.9} ${rig.crotchY + 24}, ${cx - rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx - rig.calfOuterX - 0.8} ${rig.calfY - 8}, ${cx - rig.calfOuterX} ${rig.calfY + 12}, ${cx - rig.ankleOuterX} ${rig.ankleJointY}`,
    `L ${cx - rig.ankleOuterX - 1.5} ${rig.footY}`,
    `L ${cx - rig.ankleInnerX + 1.5} ${rig.footY}`,
    `L ${cx - rig.ankleInnerX} ${rig.ankleJointY}`,
    `C ${cx - rig.calfInnerX} ${rig.calfY + 10}, ${cx - rig.calfInnerX - 1.5} ${rig.calfY - 10}, ${cx - rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx - rig.kneeInnerX - 1.5} ${rig.crotchY + 34}, ${cx - 3.5} ${rig.crotchY + 10}, ${cx} ${rig.crotchY + 3}`,
    `C ${cx + 3.5} ${rig.crotchY + 10}, ${cx + rig.kneeInnerX + 1.5} ${rig.crotchY + 34}, ${cx + rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx + rig.calfInnerX + 1.5} ${rig.calfY - 10}, ${cx + rig.calfInnerX} ${rig.calfY + 10}, ${cx + rig.ankleInnerX} ${rig.ankleJointY}`,
    `L ${cx + rig.ankleInnerX - 1.5} ${rig.footY}`,
    `L ${cx + rig.ankleOuterX + 1.5} ${rig.footY}`,
    `L ${cx + rig.ankleOuterX} ${rig.ankleJointY}`,
    `C ${cx + rig.calfOuterX} ${rig.calfY + 12}, ${cx + rig.calfOuterX + 0.8} ${rig.calfY - 8}, ${cx + rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx + rig.hipX * 0.9} ${rig.crotchY + 24}, ${cx + rig.hipX} ${rig.crotchY + 4}, ${cx + rig.hipX} ${rig.hipY}`,
    `C ${cx + rig.hipX} ${rig.hipY - 12}, ${cx + rig.waistX} ${rig.hipY - 16}, ${cx + rig.waistX} ${rig.waistY}`,
    `C ${cx + rig.waistX} ${rig.waistY - 8}, ${cx + rig.backChestX} ${rig.waistY - 14}, ${cx + rig.backChestX} ${rig.chestY + 4}`,
    `C ${cx + rig.armpitX} ${rig.armpitY - 2}, ${cx + rig.armpitX + 2} ${rig.armpitY - 8}, ${cx + rig.shoulderX} ${rig.shoulderY + 5}`,
    `C ${cx + rig.shoulderX - 1} ${rig.shoulderY}, ${cx + rig.shoulderX * 0.65} ${rig.shoulderY - 1}, ${cx + rig.neckHalf + 2} ${rig.shoulderY - 2}`,
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
      <g
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      >
        <path d={buildBackArmPath(-1)} />
        <path d={buildBackArmPath(1)} />
      </g>

      {/* Cuello trasero */}
      <path
        d={neckPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1"
      />

      {/* Torso y piernas traseras */}
      <path
        d={torsoAndLegsPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
        data-avatar-body="back"
      />

      {/* Anatomía trasera sutil y prenda base neutra */}
      <g pointerEvents="none">
        {/* Omóplatos y pliegues de rodilla */}
        <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.85" strokeLinecap="round">
          <path
            d={`M ${cx - rig.backChestX * 0.52} ${rig.shoulderY + 14} Q ${cx - rig.backChestX * 0.28} ${rig.chestY} ${cx - rig.backChestX * 0.22} ${rig.chestY + 10}`}
          />
          <path
            d={`M ${cx + rig.backChestX * 0.52} ${rig.shoulderY + 14} Q ${cx + rig.backChestX * 0.28} ${rig.chestY} ${cx + rig.backChestX * 0.22} ${rig.chestY + 10}`}
          />
          <path d={`M ${cx - rig.kneeOuterX + 5} ${rig.kneeY + 2} Q ${cx - (rig.kneeOuterX + rig.kneeInnerX) * 0.5} ${rig.kneeY - 1} ${cx - rig.kneeInnerX - 4} ${rig.kneeY + 2}`} />
          <path d={`M ${cx + rig.kneeInnerX + 4} ${rig.kneeY + 2} Q ${cx + (rig.kneeOuterX + rig.kneeInnerX) * 0.5} ${rig.kneeY - 1} ${cx + rig.kneeOuterX - 5} ${rig.kneeY + 2}`} />
        </g>

        {/* Short base neutro trasero */}
        <path
          d={[
            `M ${cx - rig.waistX - 0.5} ${Math.max(rig.waistY + 2, rig.hipY - 12)}`,
            `Q ${cx} ${Math.max(rig.waistY + 4, rig.hipY - 9)} ${cx + rig.waistX + 0.5} ${Math.max(rig.waistY + 2, rig.hipY - 12)}`,
            `C ${cx + rig.hipX} ${rig.hipY - 3}, ${cx + rig.hipX} ${rig.crotchY + 3}, ${cx + rig.hipX * 0.88} ${rig.crotchY + 15}`,
            `L ${cx + 5} ${rig.crotchY + 15}`,
            `L ${cx} ${rig.crotchY + 4}`,
            `L ${cx - 5} ${rig.crotchY + 15}`,
            `L ${cx - rig.hipX * 0.88} ${rig.crotchY + 15}`,
            `C ${cx - rig.hipX} ${rig.crotchY + 3}, ${cx - rig.hipX} ${rig.hipY - 3}, ${cx - rig.waistX - 0.5} ${Math.max(rig.waistY + 2, rig.hipY - 12)}`,
            'Z',
          ].join(' ')}
          fill="var(--avatar-basewear)"
          opacity="0.88"
        />
      </g>

      {/* Orejas, nuca y cabello trasero realista */}
      <ellipse
        cx={cx - rig.headRx * 0.96}
        cy={rig.headCenterY + 2}
        rx={2.1}
        ry={4.8}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.85"
      />
      <ellipse
        cx={cx + rig.headRx * 0.96}
        cy={rig.headCenterY + 2}
        rx={2.1}
        ry={4.8}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.85"
      />
      <path
        d={backHeadPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.95"
        strokeLinejoin="round"
      />
      <path
        d={
          isFemale
            ? [
                `M ${cx - rig.headRx * 1.15} ${rig.headCenterY - 2}`,
                `C ${cx - rig.headRx * 1.24} ${rig.headTopY + 1}, ${cx - rig.headRx * 0.55} ${rig.headTopY - 4.5}, ${cx} ${rig.headTopY - 4}`,
                `C ${cx + rig.headRx * 0.55} ${rig.headTopY - 4.5}, ${cx + rig.headRx * 1.24} ${rig.headTopY + 1}, ${cx + rig.headRx * 1.15} ${rig.headCenterY - 2}`,
                `C ${cx + rig.headRx * 1.54} ${rig.chinY + 8}, ${cx + rig.headRx * 1.55} ${rig.shoulderY + 8}, ${cx + rig.headRx * 1.2} ${rig.shoulderY + 22}`,
                `Q ${cx} ${rig.shoulderY + 28} ${cx - rig.headRx * 1.2} ${rig.shoulderY + 22}`,
                `C ${cx - rig.headRx * 1.55} ${rig.shoulderY + 8}, ${cx - rig.headRx * 1.54} ${rig.chinY + 8}, ${cx - rig.headRx * 1.15} ${rig.headCenterY - 2}`,
                'Z',
              ].join(' ')
            : [
                `M ${cx - rig.headRx * 1.04} ${rig.headCenterY + 1}`,
                `C ${cx - rig.headRx * 1.12} ${rig.headTopY + 1}, ${cx - rig.headRx * 0.55} ${rig.headTopY - 4.5}, ${cx} ${rig.headTopY - 4}`,
                `C ${cx + rig.headRx * 0.55} ${rig.headTopY - 4.5}, ${cx + rig.headRx * 1.12} ${rig.headTopY + 1}, ${cx + rig.headRx * 1.04} ${rig.headCenterY + 1}`,
                `C ${cx + rig.headRx * 0.9} ${napeY - 3}, ${cx + rig.neckHalf + 1} ${napeY + 1}, ${cx} ${napeY + 1.5}`,
                `C ${cx - rig.neckHalf - 1} ${napeY + 1}, ${cx - rig.headRx * 0.9} ${napeY - 3}, ${cx - rig.headRx * 1.04} ${rig.headCenterY + 1}`,
                'Z',
              ].join(' ')
        }
        fill={`url(#${patternPrefix}-hair-grad)`}
        pointerEvents="none"
      />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <BackPantsTemplate
              rig={rig}
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
              rig={rig}
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
              rig={rig}
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
              rig={rig}
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
              rig={rig}
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
      data-mannequin-silhouette={silhouette}
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
