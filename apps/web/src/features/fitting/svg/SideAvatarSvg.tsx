import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX } from './anchors';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { resolveUpperBlueprint } from './garmentVisuals';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';
import { computeMannequinRig } from './mannequinRig';
import { SidePantsTemplate } from './SidePantsTemplate';
import { SideTshirtTemplate } from './SideTshirtTemplate';

export function SideAvatarSvg({
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
  const s = rig.side;
  const sa = rig.sideArm;
  const patternPrefix = patternIdSuffix ? `side-${patternIdSuffix}` : 'side';

  // Cabeza de perfil limpia estilo atelier (sin rostro, curva frontal suave y mandíbula fina)
  const hr = rig.headRy;
  const profileHeadPath = [
    `M ${cx - hr * 0.14} ${rig.headTopY}`,
    `C ${cx + hr * 0.66} ${rig.headTopY}, ${cx + hr * 0.78} ${rig.headCenterY - hr * 0.42}, ${cx + hr * 0.78} ${rig.headCenterY + hr * 0.08}`,
    `C ${cx + hr * 0.8} ${rig.headCenterY + hr * 0.56}, ${cx + hr * 0.68} ${rig.chinY - 2}, ${cx + hr * 0.42} ${rig.chinY}`,
    `C ${cx + hr * 0.06} ${rig.chinY}, ${cx - hr * 0.22} ${rig.chinY - 5}, ${cx - hr * 0.52} ${rig.headCenterY + hr * 0.5}`,
    `C ${cx - hr * 0.84} ${rig.headCenterY + hr * 0.12}, ${cx - hr * 0.82} ${rig.headTopY + 3}, ${cx - hr * 0.14} ${rig.headTopY}`,
    'Z',
  ].join(' ');

  // Cuerpo anatómico de perfil (fiel a la silueta central de referencia: busto/pectoral, lumbar, glúteo, pierna y pie)
  const profileBodyPath = [
    `M ${cx - 6.5} ${rig.chinY - 5}`,
    `C ${cx - 8} ${rig.neckBaseY}, ${s.shoulderBackX - 2} ${rig.shoulderY - 4}, ${s.shoulderBackX} ${rig.shoulderY + 3}`,
    `C ${s.chestBackX - 3} ${rig.chestY - 6}, ${s.chestBackX - 1} ${rig.chestY + 12}, ${s.waistBackX} ${rig.waistY}`,
    `C ${s.hipBackX - 2} ${rig.hipY - 12}, ${s.hipBackX - 2} ${s.gluteApexY + 10}, ${s.thighBackX} ${rig.crotchY + 10}`,
    `C ${s.thighBackX} ${rig.kneeY - 16}, ${s.kneeBackX + 2} ${rig.kneeY + 4}, ${s.calfBackX} ${rig.calfY}`,
    `C ${s.calfBackX} ${rig.calfY + 16}, ${s.ankleBackX + 2} ${rig.ankleJointY - 6}, ${s.ankleBackX} ${rig.ankleJointY}`,
    `C ${s.ankleBackX - 2} ${rig.footY - 3}, ${s.ankleBackX - 1} ${rig.footY}, ${s.ankleBackX + 3} ${rig.footY}`,
    `L ${s.ankleFrontX + 16} ${rig.footY}`,
    `C ${s.ankleFrontX + 17} ${rig.footY - 4.5}, ${s.ankleFrontX + 4} ${rig.ankleJointY + 3}, ${s.ankleFrontX} ${rig.ankleJointY}`,
    `C ${s.calfFrontX - 1} ${rig.calfY + 6}, ${s.kneeFrontX} ${rig.kneeY + 4}, ${s.kneeFrontX} ${rig.kneeY - 4}`,
    `C ${s.thighFrontX} ${rig.crotchY + 14}, ${s.hipFrontX + 1} ${rig.hipY + 8}, ${s.hipFrontX} ${rig.hipY}`,
    `C ${s.waistFrontX + 1} ${rig.waistY + 10}, ${s.waistFrontX} ${rig.waistY - 8}, ${s.chestFrontX} ${s.underBustY}`,
    `C ${s.bustFrontX + 1} ${s.underBustY - 2}, ${s.bustFrontX + 1} ${s.bustApexY - 4}, ${s.chestFrontX - 1} ${rig.chestY - 14}`,
    `C ${s.shoulderFrontX + 1} ${rig.shoulderY + 5}, ${s.shoulderFrontX} ${rig.shoulderY - 1}, ${cx + 5.5} ${rig.neckBaseY + 2}`,
    `L ${cx + 5.5} ${rig.chinY - 4}`,
    'Z',
  ].join(' ');

  // Brazo esbelto de perfil alineado exactamente con rig.sideArm
  const profileArmPath = [
    `M ${sa.shoulder.backX} ${sa.shoulder.y}`,
    `Q ${cx} ${rig.shoulderY + 1} ${sa.shoulder.frontX} ${sa.shoulder.y}`,
    `C ${sa.bicep.frontX} ${sa.bicep.y}, ${sa.elbow.frontX} ${sa.elbow.y - 4}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 1} ${sa.wrist.y - 8}, ${sa.wrist.frontX} ${sa.wrist.y - 2}, ${sa.wrist.frontX} ${sa.wrist.y}`,
    `C ${sa.wrist.frontX + 2} ${sa.wrist.y + 8}, ${sa.wrist.frontX + 1} ${sa.handTipY - 4}, ${sa.wrist.frontX - 2.5} ${sa.handTipY}`,
    `C ${sa.wrist.backX - 1} ${sa.handTipY - 1}, ${sa.wrist.backX - 1} ${sa.wrist.y + 8}, ${sa.wrist.backX} ${sa.wrist.y}`,
    `C ${sa.elbow.backX} ${sa.elbow.y + 8}, ${sa.elbow.backX} ${sa.elbow.y}, ${sa.elbow.backX} ${sa.elbow.y}`,
    `C ${sa.bicep.backX} ${sa.bicep.y}, ${sa.shoulder.backX} ${sa.shoulder.y + 8}, ${sa.shoulder.backX} ${sa.shoulder.y}`,
    'Z',
  ].join(' ');

  // Antebrazo + mano (visible completo en manga corta y vestidos)
  const profileForearmAndHandPath = [
    `M ${sa.bicep.backX} ${sa.bicep.y}`,
    `L ${sa.bicep.frontX} ${sa.bicep.y}`,
    `C ${sa.elbow.frontX} ${sa.elbow.y - 4}, ${sa.elbow.frontX} ${sa.elbow.y}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 1} ${sa.wrist.y - 8}, ${sa.wrist.frontX} ${sa.wrist.y - 2}, ${sa.wrist.frontX} ${sa.wrist.y}`,
    `C ${sa.wrist.frontX + 2} ${sa.wrist.y + 8}, ${sa.wrist.frontX + 1} ${sa.handTipY - 4}, ${sa.wrist.frontX - 2.5} ${sa.handTipY}`,
    `C ${sa.wrist.backX - 1} ${sa.handTipY - 1}, ${sa.wrist.backX - 1} ${sa.wrist.y + 8}, ${sa.wrist.backX} ${sa.wrist.y}`,
    `C ${sa.elbow.backX} ${sa.elbow.y + 8}, ${sa.elbow.backX} ${sa.elbow.y}, ${sa.elbow.backX} ${sa.elbow.y}`,
    'Z',
  ].join(' ');

  // Mano sola (emerge limpiamente desde el puño en manga larga / chaqueta)
  const profileHandPath = [
    `M ${sa.wrist.backX} ${sa.wrist.y - 1}`,
    `L ${sa.wrist.frontX} ${sa.wrist.y - 1}`,
    `C ${sa.wrist.frontX + 2} ${sa.wrist.y + 8}, ${sa.wrist.frontX + 1} ${sa.handTipY - 4}, ${sa.wrist.frontX - 2.5} ${sa.handTipY}`,
    `C ${sa.wrist.backX - 1} ${sa.handTipY - 1}, ${sa.wrist.backX - 1} ${sa.wrist.y + 8}, ${sa.wrist.backX} ${sa.wrist.y - 1}`,
    'Z',
  ].join(' ');

  const activeUpperIsLongSleeve = (() => {
    if (outfitLayers) {
      if (outfitLayers.outerwearFitReport) {
        const outerSleeve = resolveUpperBlueprint('jacket', outfitLayers.outerwearMeta).sleeveLength;
        if (outerSleeve === 'long' || outerSleeve === 'three_quarter') return true;
      }
      if (outfitLayers.topFitReport) {
        const topSleeve = resolveUpperBlueprint(
          outfitLayers.topVariant ?? 'tshirt',
          outfitLayers.topMeta,
        ).sleeveLength;
        return topSleeve === 'long' || topSleeve === 'three_quarter';
      }
      return false;
    }
    if (isLowerCategory(garmentCategory)) return false;
    const singleSleeve = resolveUpperBlueprint(garmentCategory, garmentMeta).sleeveLength;
    return singleSleeve === 'long' || singleSleeve === 'three_quarter';
  })();

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

      {/* Cuerpo anatómico de perfil */}
      <path
        d={profileBodyPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeDasharray={anyDepthEstimated ? '5 3' : undefined}
        strokeLinejoin="round"
        data-avatar-body="side"
      />

      {/* Costuras de taller en vista de perfil */}
      <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.65" pointerEvents="none">
        <path d={`M ${s.shoulderBackX} ${rig.shoulderY - 1} Q ${cx} ${rig.shoulderY + 4} ${s.shoulderFrontX} ${rig.shoulderY + 2}`} />
        <path d={`M ${s.hipBackX + 1} ${rig.hipY - 4} Q ${cx} ${rig.hipY - 8} ${s.hipFrontX - 1} ${rig.hipY + 2}`} />
      </g>

      {/* Cabeza de perfil + oreja fina */}
      <path
        d={profileHeadPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path
        d={`M ${cx - 3.5} ${rig.headCenterY - 2} C ${cx - 7.5} ${rig.headCenterY - 2}, ${cx - 7.5} ${rig.headCenterY + 6.5}, ${cx - 2.5} ${rig.headCenterY + 5.5}`}
        fill="none"
        stroke="var(--mannequin-detail)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Brazo base cuando no hay prendas o como referencia */}
      {!outfitLayers && !fitReport && (
        <path
          d={profileArmPath}
          fill={`url(#${patternPrefix}-limb-grad)`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <SidePantsTemplate
              rig={rig}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
              garmentMeta={outfitLayers.bottomMeta}
              variant={outfitLayers.bottomVariant}
            />
          )}
          <path
            d={profileArmPath}
            fill={`url(#${patternPrefix}-limb-grad)`}
            stroke="var(--mannequin-stroke)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {outfitLayers.topFitReport && (
            <SideTshirtTemplate
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
            <SideTshirtTemplate
              rig={rig}
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
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          {fitReport && isLowerCategory(garmentCategory) && (
            <>
              <SidePantsTemplate
                rig={rig}
                fitReport={fitReport}
                showHeatmap={showHeatmap}
                patternPrefix={patternPrefix}
                garmentColorHex={garmentColorHex}
                garmentMeta={garmentMeta}
                variant={garmentCategory}
              />
              <path
                d={profileArmPath}
                fill={`url(#${patternPrefix}-limb-grad)`}
                stroke="var(--mannequin-stroke)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </>
          )}
          {fitReport && !isLowerCategory(garmentCategory) && (
            <>
              <SideTshirtTemplate
                rig={rig}
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
                strokeWidth="1"
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
      data-mannequin-silhouette={silhouette}
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
