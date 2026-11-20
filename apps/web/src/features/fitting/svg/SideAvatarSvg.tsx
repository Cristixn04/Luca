import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX } from './anchors';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';
import { computeSideAvatarAnchors } from './sideAnchors';
import { SidePantsTemplate } from './SidePantsTemplate';
import { SideTshirtTemplate } from './SideTshirtTemplate';

export function SideAvatarSvg({
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
  const anchors = computeSideAvatarAnchors(model);
  const cx = anchors.centerX;
  const patternPrefix = patternIdSuffix ? `side-${patternIdSuffix}` : 'side';

  const headR = anchors.headRadius;
  const headTopY = anchors.headCenterY - headR * 1.04;
  const chinY = anchors.headCenterY + headR * 1.02;
  const kneeY = anchors.crotchY + (anchors.ankleY - anchors.crotchY) * 0.48;
  const calfY = kneeY + (anchors.ankleY - kneeY) * 0.34;
  const ankleJointY = anchors.ankleY - 12;

  // Cabeza de perfil mirando hacia la derecha (cráneo -> frente -> nariz sutil -> mentón -> mandíbula)
  const profileHeadPath = [
    `M ${cx - headR * 0.2} ${headTopY}`,
    `C ${cx + headR * 0.72} ${headTopY}, ${cx + headR * 0.88} ${anchors.headCenterY - headR * 0.48}, ${cx + headR * 0.88} ${anchors.headCenterY - headR * 0.12}`,
    `L ${cx + headR * 1.02} ${anchors.headCenterY + headR * 0.12}`,
    `L ${cx + headR * 0.86} ${anchors.headCenterY + headR * 0.24}`,
    `C ${cx + headR * 0.9} ${anchors.headCenterY + headR * 0.56}, ${cx + headR * 0.82} ${chinY - 2}, ${cx + headR * 0.54} ${chinY}`,
    `C ${cx + headR * 0.14} ${chinY}, ${cx - headR * 0.24} ${chinY - 4}, ${cx - headR * 0.56} ${anchors.headCenterY + headR * 0.55}`,
    `C ${cx - headR * 0.96} ${anchors.headCenterY + headR * 0.15}, ${cx - headR * 0.94} ${headTopY + 4}, ${cx - headR * 0.2} ${headTopY}`,
    'Z',
  ].join(' ');

  // Cuerpo de perfil anatómico (curva dorsal, lumbar, glútea, pantorrilla, talón, pie, rodilla, pecho)
  const profileBodyPath = [
    `M ${cx - 8} ${chinY - 6}`,
    `C ${cx - 10} ${anchors.neckY}, ${anchors.shoulderBackX - 2} ${anchors.shoulderY - 6}, ${anchors.shoulderBackX} ${anchors.shoulderY + 2}`,
    `C ${anchors.chestBackX - 4} ${anchors.chestY - 6}, ${anchors.chestBackX - 2} ${anchors.chestY + 12}, ${anchors.waistBackX + 2} ${anchors.waistY}`,
    `C ${anchors.hipBackX - 5} ${anchors.hipY - 8}, ${anchors.hipBackX - 5} ${anchors.hipY + 14}, ${anchors.legBackX - 1} ${anchors.crotchY + 8}`,
    `C ${anchors.legBackX - 1} ${kneeY - 12}, ${anchors.legBackX + 4} ${kneeY + 4}, ${anchors.legBackX - 3} ${calfY}`,
    `C ${anchors.legBackX - 3} ${calfY + 18}, ${anchors.legBackX + 4} ${ankleJointY - 6}, ${anchors.legBackX + 3} ${ankleJointY}`,
    `C ${anchors.legBackX + 1} ${anchors.ankleY - 3}, ${anchors.legBackX + 2} ${anchors.ankleY}, ${anchors.legBackX + 6} ${anchors.ankleY}`,
    `L ${anchors.legFrontX + 14} ${anchors.ankleY}`,
    `C ${anchors.legFrontX + 15} ${anchors.ankleY - 5}, ${anchors.legFrontX + 4} ${ankleJointY + 3}, ${anchors.legFrontX - 1} ${ankleJointY}`,
    `C ${anchors.legFrontX - 2} ${calfY + 6}, ${anchors.legFrontX + 2} ${kneeY + 4}, ${anchors.legFrontX + 3} ${kneeY - 4}`,
    `C ${anchors.legFrontX + 4} ${anchors.crotchY + 14}, ${anchors.hipFrontX + 2} ${anchors.hipY + 8}, ${anchors.hipFrontX} ${anchors.hipY}`,
    `C ${anchors.waistFrontX + 1} ${anchors.waistY + 12}, ${anchors.waistFrontX} ${anchors.waistY - 6}, ${anchors.chestFrontX + 3} ${anchors.chestY + 6}`,
    `C ${anchors.chestFrontX + 4} ${anchors.chestY - 10}, ${anchors.shoulderFrontX + 1} ${anchors.shoulderY + 6}, ${anchors.shoulderFrontX} ${anchors.shoulderY - 1}`,
    `C ${cx + 8} ${anchors.neckY + 2}, ${cx + 7} ${chinY - 2}, ${cx + 8} ${chinY - 6}`,
    'Z',
  ].join(' ');

  // Brazo y mano en vista de perfil
  const profileArmPath = [
    `M ${cx - 8} ${anchors.shoulderY + 6}`,
    `C ${cx - 12} ${anchors.chestY + 12}, ${cx - 10} ${anchors.waistY - 4}, ${cx - 9} ${anchors.waistY + 6}`,
    `C ${cx - 7} ${anchors.hipY - 4}, ${cx - 4} ${anchors.hipY + 12}, ${cx - 3} ${anchors.hipY + 18}`,
    `C ${cx - 4} ${anchors.crotchY + 6}, ${cx + 1} ${anchors.crotchY + 14}, ${cx + 5} ${anchors.crotchY + 13}`,
    `C ${cx + 9} ${anchors.crotchY + 11}, ${cx + 8} ${anchors.hipY + 18}, ${cx + 7} ${anchors.hipY + 16}`,
    `C ${cx + 8} ${anchors.hipY - 2}, ${cx + 9} ${anchors.waistY + 6}, ${cx + 8} ${anchors.waistY + 4}`,
    `C ${cx + 10} ${anchors.chestY + 10}, ${cx + 10} ${anchors.shoulderY + 12}, ${cx + 6} ${anchors.shoulderY + 6}`,
    `Q ${cx - 1} ${anchors.shoulderY + 1} ${cx - 8} ${anchors.shoulderY + 6}`,
    'Z',
  ].join(' ');

  // Antebrazo y mano en perfil (visible completo sobre prendas de manga corta o vestidos)
  const profileForearmAndHandPath = [
    `M ${cx - 8} ${anchors.chestY + 14}`,
    `C ${cx - 10} ${anchors.waistY - 2}, ${cx - 9} ${anchors.waistY + 6}, ${cx - 8} ${anchors.waistY + 8}`,
    `C ${cx - 6} ${anchors.hipY - 2}, ${cx - 4} ${anchors.hipY + 12}, ${cx - 3} ${anchors.hipY + 18}`,
    `C ${cx - 4} ${anchors.crotchY + 6}, ${cx + 1} ${anchors.crotchY + 14}, ${cx + 5} ${anchors.crotchY + 13}`,
    `C ${cx + 9} ${anchors.crotchY + 11}, ${cx + 8} ${anchors.hipY + 18}, ${cx + 7} ${anchors.hipY + 16}`,
    `C ${cx + 8} ${anchors.hipY - 2}, ${cx + 9} ${anchors.waistY + 6}, ${cx + 8} ${anchors.waistY + 4}`,
    `C ${cx + 9} ${anchors.chestY + 22}, ${cx + 9} ${anchors.chestY + 16}, ${cx + 8} ${anchors.chestY + 14}`,
    'Z',
  ].join(' ');

  // Mano en perfil (emerge limpiamente al final de manga larga/chaqueta)
  const profileHandPath = [
    `M ${cx - 3} ${anchors.hipY + 15}`,
    `C ${cx - 4} ${anchors.crotchY + 5}, ${cx + 1} ${anchors.crotchY + 14}, ${cx + 5} ${anchors.crotchY + 13}`,
    `C ${cx + 9} ${anchors.crotchY + 11}, ${cx + 8} ${anchors.hipY + 17}, ${cx + 7} ${anchors.hipY + 14}`,
    'Z',
  ].join(' ');

  const activeUpperIsLongSleeve = outfitLayers
    ? Boolean(outfitLayers.outerwearFitReport) ||
      outfitLayers.topVariant === 'long_sleeve' ||
      outfitLayers.topVariant === 'jacket'
    : garmentCategory === 'long_sleeve' || garmentCategory === 'jacket';

  const overlayLimbPath = activeUpperIsLongSleeve ? profileHandPath : profileForearmAndHandPath;

  const anyDepthEstimated =
    model.sections.chest.depthEstimated ||
    model.sections.waist.depthEstimated ||
    model.sections.hip.depthEstimated;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      role="img"
      aria-label="Avatar paramétrico de perfil con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />
      <MannequinDefs prefix={patternPrefix} />

      {!frameless && (
        <line
          x1={cx}
          y1={AVATAR_VIEWBOX.topPadding}
          x2={cx}
          y2={anchors.ankleY}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.55"
        />
      )}

      {/* Cuerpo de perfil anatómico */}
      <path
        d={profileBodyPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeDasharray={anyDepthEstimated ? '5 3' : undefined}
        strokeLinejoin="round"
        data-avatar-body="side"
      />

      {/* Cabeza de perfil + oreja */}
      <path
        d={profileHeadPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d={`M ${cx - 4} ${anchors.headCenterY - 2} C ${cx - 8} ${anchors.headCenterY - 2}, ${cx - 8} ${anchors.headCenterY + 7}, ${cx - 3} ${anchors.headCenterY + 6}`}
        fill="none"
        stroke="var(--mannequin-detail)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Brazo anatómico base (se dibuja debajo de mangas y sobre el torso) */}
      <path
        d={profileArmPath}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <SidePantsTemplate
              model={model}
              anchors={anchors}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
              garmentMeta={outfitLayers.bottomMeta}
              variant={outfitLayers.bottomVariant}
            />
          )}
          {/* Antebrazo/brazo sobre pantalón antes de la prenda superior */}
          <path
            d={profileArmPath}
            fill={`url(#${patternPrefix}-limb-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
          {outfitLayers.topFitReport && (
            <SideTshirtTemplate
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
            <SideTshirtTemplate
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
          <path
            d={overlayLimbPath}
            fill={`url(#${patternPrefix}-limb-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          {fitReport && isLowerCategory(garmentCategory) && (
            <SidePantsTemplate
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
            <path
              d={profileArmPath}
              fill={`url(#${patternPrefix}-limb-grad)`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="1.05"
              strokeLinejoin="round"
            />
          )}
          {fitReport && !isLowerCategory(garmentCategory) && (
            <>
              <SideTshirtTemplate
                model={model}
                anchors={anchors}
                fitReport={fitReport}
                showHeatmap={showHeatmap}
                patternPrefix={patternPrefix}
                garmentColorHex={garmentColorHex}
                garmentMeta={garmentMeta}
                variant={garmentCategory}
              />
              <path
                d={overlayLimbPath}
                fill={`url(#${patternPrefix}-limb-grad)`}
                stroke="var(--mannequin-stroke)"
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
            </>
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
      data-avatar-view="side"
      className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg p-3 ${compact ? 'w-full' : 'w-full max-w-[320px]'}`}
    >
      <div className="flex w-full items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">Perfil</span>
        {anyDepthEstimated && (
          <Badge data-estimated-badge="side">Fondo: estimado</Badge>
        )}
      </div>
      {svgNode}
    </div>
  );
}
