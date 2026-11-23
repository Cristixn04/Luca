import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX } from './anchors';
import { EditorialBasewear, EditorialSideHead } from './EditorialFigureParts';
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
  const bodyClipId = `${patternPrefix}-side-body-clip`;
  const armClipId = `${patternPrefix}-side-arm-clip`;
  const isFemale = silhouette === 'female';

  const wY = sa.wrist.y;
  const handTipY = sa.handTipY;
  const handLen = Math.max(14, handTipY - wY);

  // Cuerpo anatómico editorial de perfil derecho (postura erguida en S: dorsal, pectoral, lumbar, glúteo, gemelo y pie)
  const profileBodyPath = [
    `M ${cx - 8.2} ${rig.chinY - 4}`,
    `C ${cx - 9.4} ${rig.neckBaseY + 1}, ${s.shoulderBackX - 3.6} ${rig.shoulderY - 3}, ${s.shoulderBackX - 1.2} ${rig.shoulderY + 6}`,
    `C ${s.chestBackX - 4.2} ${rig.chestY - 5}, ${s.chestBackX - 1.6} ${rig.chestY + 14}, ${s.waistBackX} ${rig.waistY}`,
    `C ${s.hipBackX - 3.2} ${rig.hipY - 12}, ${s.hipBackX - 3.4} ${s.gluteApexY + 10}, ${s.thighBackX} ${rig.crotchY + 12}`,
    `C ${s.thighBackX - 0.8} ${rig.kneeY - 18}, ${s.kneeBackX + 2.6} ${rig.kneeY + 3}, ${s.calfBackX - 1.6} ${rig.calfY - 3}`,
    `C ${s.calfBackX - 0.4} ${rig.calfY + 18}, ${s.ankleBackX + 2.4} ${rig.ankleJointY - 6}, ${s.ankleBackX} ${rig.ankleJointY}`,
    // Talón redondeado -> arco plantar suave -> bola del pie -> dedo gordo -> empeine
    `C ${s.ankleBackX - 3.6} ${rig.footY - 5}, ${s.ankleBackX - 4.2} ${rig.footY + 0.5}, ${s.ankleBackX + 2.4} ${rig.footY + 0.8}`,
    `Q ${cx + 2} ${rig.footY - 0.8} ${s.ankleFrontX + 9} ${rig.footY + 0.8}`,
    `L ${s.ankleFrontX + 19.5} ${rig.footY + 0.8}`,
    `C ${s.ankleFrontX + 22.2} ${rig.footY + 0.3}, ${s.ankleFrontX + 22.2} ${rig.footY - 3.8}, ${s.ankleFrontX + 17.5} ${rig.footY - 4.8}`,
    `C ${s.ankleFrontX + 11.4} ${rig.footY - 7.2}, ${s.ankleFrontX + 4.8} ${rig.ankleJointY + 3}, ${s.ankleFrontX} ${rig.ankleJointY}`,
    // Tibia -> rótula marcada -> cuádriceps pleno -> abdomen -> pectoral/busto -> cuello frontal
    `C ${s.calfFrontX - 1.4} ${rig.calfY + 6}, ${s.kneeFrontX + 0.8} ${rig.kneeY + 5}, ${s.kneeFrontX + 1.4} ${rig.kneeY - 3}`,
    `C ${s.thighFrontX + 1.6} ${rig.crotchY + 14}, ${s.hipFrontX + 1.4} ${rig.hipY + 8}, ${s.hipFrontX} ${rig.hipY}`,
    `C ${s.waistFrontX + 1.4} ${rig.waistY + 10}, ${s.waistFrontX} ${rig.waistY - 8}, ${s.chestFrontX} ${s.underBustY}`,
    `C ${s.bustFrontX + 2.2} ${s.underBustY - 2}, ${s.bustFrontX + 2.2} ${s.bustApexY - 4}, ${s.chestFrontX - 1.2} ${rig.chestY - 14}`,
    `C ${s.shoulderFrontX + 1.8} ${rig.shoulderY + 4}, ${s.shoulderFrontX} ${rig.shoulderY - 1}, ${cx + 6.4} ${rig.neckBaseY + 2}`,
    `L ${cx + 6.4} ${rig.chinY - 4}`,
    'Z',
  ].join(' ');

  // Mano relajada de perfil refinada (muñeca fina, pulgar adelantado, dedos afinados curvados hacia la pierna)
  const sideHandSubpath = [
    `C ${sa.wrist.frontX + 2.8} ${wY + handLen * 0.22}, ${sa.wrist.frontX + 3.6} ${wY + handLen * 0.45}, ${sa.wrist.frontX + 2.2} ${wY + handLen * 0.56}`,
    `L ${sa.wrist.frontX + 0.4} ${wY + handLen * 0.48}`,
    `C ${sa.wrist.frontX + 1.4} ${wY + handLen * 0.72}, ${sa.wrist.frontX + 0.5} ${handTipY - 2.4}, ${sa.wrist.frontX - 2.2} ${handTipY}`,
    `C ${sa.wrist.backX - 0.6} ${handTipY - 0.6}, ${sa.wrist.backX - 1.4} ${handTipY - handLen * 0.28}, ${sa.wrist.backX - 0.5} ${wY + handLen * 0.24}`,
    `C ${sa.wrist.backX - 0.3} ${wY + handLen * 0.12}, ${sa.wrist.backX - 0.1} ${wY + 1}, ${sa.wrist.backX} ${wY}`,
  ].join(' ');

  // Brazo editorial completo de perfil con curva natural del deltoides, bíceps/tríceps y antebrazo levemente adelantado
  const profileArmPath = [
    `M ${sa.shoulder.backX} ${sa.shoulder.y}`,
    `C ${sa.shoulder.backX + 1} ${rig.shoulderY - 1.5}, ${sa.shoulder.frontX - 1} ${rig.shoulderY - 1.5}, ${sa.shoulder.frontX} ${sa.shoulder.y}`,
    `C ${sa.bicep.frontX + 1.8} ${sa.bicep.y - 4}, ${sa.bicep.frontX + 1.0} ${sa.bicep.y + 6}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 2.6} ${sa.elbow.y + (wY - sa.elbow.y) * 0.36}, ${sa.wrist.frontX + 1.0} ${wY - 6}, ${sa.wrist.frontX} ${wY}`,
    sideHandSubpath,
    `C ${sa.elbow.backX - 1.2} ${sa.elbow.y + 10}, ${sa.elbow.backX - 1.4} ${sa.elbow.y + 2}, ${sa.elbow.backX} ${sa.elbow.y}`,
    `C ${sa.bicep.backX - 2.0} ${sa.bicep.y + 4}, ${sa.shoulder.backX - 2.0} ${sa.shoulder.y + 10}, ${sa.shoulder.backX} ${sa.shoulder.y}`,
    'Z',
  ].join(' ');

  // Contorno abierto en el hombro para fundirse orgánicamente con el trapecio sin corte artificial
  const profileArmOpenInkPath = [
    `M ${sa.shoulder.frontX - 0.4} ${sa.shoulder.y + 6}`,
    `C ${sa.bicep.frontX + 1.8} ${sa.bicep.y - 4}, ${sa.bicep.frontX + 1.0} ${sa.bicep.y + 6}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 2.6} ${sa.elbow.y + (wY - sa.elbow.y) * 0.36}, ${sa.wrist.frontX + 1.0} ${wY - 6}, ${sa.wrist.frontX} ${wY}`,
    sideHandSubpath,
    `C ${sa.elbow.backX - 1.2} ${sa.elbow.y + 10}, ${sa.elbow.backX - 1.4} ${sa.elbow.y + 2}, ${sa.elbow.backX} ${sa.elbow.y}`,
    `C ${sa.bicep.backX - 2.0} ${sa.bicep.y + 4}, ${sa.shoulder.backX - 2.0} ${sa.shoulder.y + 10}, ${sa.shoulder.backX + 0.4} ${sa.shoulder.y + 3}`,
  ].join(' ');

  const profileForearmAndHandPath = [
    `M ${sa.bicep.backX} ${sa.bicep.y}`,
    `L ${sa.bicep.frontX} ${sa.bicep.y}`,
    `C ${sa.elbow.frontX} ${sa.elbow.y - 4}, ${sa.elbow.frontX} ${sa.elbow.y}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 2.6} ${sa.elbow.y + (wY - sa.elbow.y) * 0.36}, ${sa.wrist.frontX + 1.0} ${wY - 6}, ${sa.wrist.frontX} ${wY}`,
    sideHandSubpath,
    `C ${sa.elbow.backX - 1.2} ${sa.elbow.y + 10}, ${sa.elbow.backX - 1.4} ${sa.elbow.y + 2}, ${sa.elbow.backX} ${sa.elbow.y}`,
    'Z',
  ].join(' ');

  const profileHandPath = [
    `M ${sa.wrist.backX} ${wY - 1}`,
    `L ${sa.wrist.frontX} ${wY - 1}`,
    sideHandSubpath,
    'Z',
  ].join(' ');

  const renderBareSideArm = () => (
    <g>
      <path d={profileArmPath} fill={`url(#${patternPrefix}-side-body-grad)`} />
      <g clipPath={`url(#${armClipId})`} pointerEvents="none">
        {/* Sombra posterior suave en tríceps y antebrazo */}
        <path
          d={`M ${sa.shoulder.backX - 3} ${sa.shoulder.y} L ${sa.shoulder.backX + 6.5} ${sa.shoulder.y} L ${sa.elbow.backX + 5.2} ${sa.elbow.y} L ${sa.wrist.backX + 3.6} ${wY} L ${sa.wrist.backX - 3} ${handTipY} L ${sa.shoulder.backX - 4} ${handTipY} Z`}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.72"
        />
        {/* Brillo suave en deltoides lateral y cara anterior del antebrazo */}
        <ellipse
          cx={(sa.shoulder.backX + sa.shoulder.frontX) * 0.56}
          cy={sa.shoulder.y + 11}
          rx={5.2}
          ry={12}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
      </g>
      <path
        d={profileArmOpenInkPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Definición muy sutil del deltoides inferior y dedos de perfil */}
      <path
        d={`M ${sa.shoulder.backX + 2.5} ${sa.bicep.y - 6} Q ${(sa.shoulder.backX + sa.shoulder.frontX) * 0.5} ${sa.bicep.y - 2} ${sa.bicep.frontX - 1} ${sa.bicep.y - 7} M ${sa.wrist.frontX - 0.4} ${handTipY - handLen * 0.32} L ${sa.wrist.frontX - 1.2} ${handTipY - 1.5}`}
        fill="none"
        stroke="var(--mannequin-detail)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.68"
        pointerEvents="none"
      />
    </g>
  );

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
      <defs>
        <clipPath id={bodyClipId}>
          <path d={profileBodyPath} />
        </clipPath>
        <clipPath id={armClipId}>
          <path d={profileArmPath} />
        </clipPath>
      </defs>

      {/* Relleno base cálido del cuerpo de perfil */}
      <path
        d={profileBodyPath}
        fill={`url(#${patternPrefix}-side-body-grad)`}
        data-avatar-body="side"
      />

      {/* Sombreado anatómico de perfil recortado al cuerpo */}
      <g clipPath={`url(#${bodyClipId})`} pointerEvents="none">
        <path
          d={`M ${cx - 10} ${rig.chinY - 4} L ${cx + 9} ${rig.chinY - 4} L ${cx + 8} ${rig.neckBaseY + 2} Q ${cx - 1} ${rig.neckBaseY + 6} ${cx - 10} ${rig.neckBaseY + 1} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
        />
        <path
          d={[
            `M ${s.shoulderBackX - 6} ${rig.shoulderY}`,
            `L ${s.chestBackX + 8} ${rig.chestY}`,
            `L ${s.waistBackX + 7} ${rig.waistY}`,
            `L ${s.hipBackX + 11} ${s.gluteApexY}`,
            `L ${s.thighBackX + 8} ${rig.crotchY + 24}`,
            `L ${s.kneeBackX + 6.5} ${rig.kneeY}`,
            `L ${s.calfBackX + 8} ${rig.calfY}`,
            `L ${s.ankleBackX + 4} ${rig.ankleJointY}`,
            `L ${s.ankleBackX - 6} ${rig.footY + 2}`,
            `L ${s.hipBackX - 9} ${rig.footY + 2}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.7"
        />
        <path
          d={`M ${s.chestFrontX - 9} ${s.underBustY - 1} Q ${s.chestFrontX - 1} ${s.underBustY + 3.8} ${s.bustFrontX + 3} ${s.underBustY - 1} L ${s.bustFrontX + 3} ${s.underBustY + 6.5} L ${s.chestFrontX - 9} ${s.underBustY + 4.5} Z`}
          fill={`url(#${patternPrefix}-skin-core-shade)`}
          opacity="0.72"
        />
        <ellipse
          cx={s.thighFrontX - 5.5}
          cy={rig.crotchY + (rig.kneeY - rig.crotchY) * 0.45}
          rx={5.2}
          ry={21}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
        <ellipse
          cx={s.calfFrontX - 2.5}
          cy={rig.calfY + 8}
          rx={3.2}
          ry={17}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
      </g>

      {/* Líneas anatómicas finas de perfil */}
      <g pointerEvents="none" fill="none" strokeLinecap="round">
        <path
          d={`M ${cx - 3.6} ${rig.chinY + 1} Q ${cx - 0.5} ${rig.neckBaseY + 2} ${s.shoulderFrontX - 2} ${rig.shoulderY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.65"
        />
        {!isFemale && (
          <path
            d={`M ${s.chestFrontX - 7} ${s.underBustY + 1} Q ${s.chestFrontX} ${s.underBustY + 2.6} ${s.bustFrontX - 0.2} ${s.underBustY - 1.5}`}
            stroke="var(--mannequin-detail)"
            strokeWidth="0.72"
          />
        )}
        <path
          d={`M ${s.kneeFrontX - 3.5} ${rig.kneeY - 3} Q ${s.kneeFrontX - 1} ${rig.kneeY + 1} ${s.kneeFrontX - 3} ${rig.kneeY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.68"
        />
        <path
          d={`M ${s.kneeBackX + 2} ${rig.kneeY + 1} L ${s.kneeBackX + 5.8} ${rig.kneeY + 2.2}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
        />
        <path
          d={`M ${s.ankleBackX + 3.4} ${rig.calfY + 18} L ${s.ankleBackX + 3} ${rig.ankleJointY + 3}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
        />
        <path
          d={`M ${cx + 0.8} ${rig.ankleJointY + 1.5} Q ${cx + 2.5} ${rig.ankleJointY + 3.5} ${cx + 0.2} ${rig.ankleJointY + 5.2}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.68"
        />
        <path
          d={`M ${s.ankleFrontX + 16} ${rig.footY - 2.8} Q ${s.ankleFrontX + 18.2} ${rig.footY - 2} ${s.ankleFrontX + 19} ${rig.footY - 0.1}`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.6"
          opacity="0.7"
        />
      </g>

      {/* Ropa base editorial verde oliva mate recortada al cuerpo de perfil */}
      <EditorialBasewear
        view="side"
        rig={rig}
        patternPrefix={patternPrefix}
        bodyClipId={bodyClipId}
      />

      {/* Contorno de tinta espresso limpio abrazando cuerpo y ropa base */}
      <path
        d={profileBodyPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Cabeza y cabello de perfil editorial */}
      <EditorialSideHead rig={rig} patternPrefix={patternPrefix} />

      {/* Brazo base cuando no hay prendas */}
      {!outfitLayers && !fitReport && renderBareSideArm()}

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
          {renderBareSideArm()}
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
            strokeWidth="1.15"
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
              {renderBareSideArm()}
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
                strokeWidth="1.15"
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
