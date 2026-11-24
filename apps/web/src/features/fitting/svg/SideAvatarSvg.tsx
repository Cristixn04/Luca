import { Badge } from '@/design-system/components/Badge';
import { buildAnatomicalSideBodyPath } from './anatomyPaths';
import { AVATAR_VIEWBOX } from './anchors';
import { useAvatarColorStyle } from './avatarPalette';
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
  const { cssVars: avatarColorVars } = useAvatarColorStyle();
  const cx = rig.cx;
  const s = rig.side;
  const sa = rig.sideArm;
  const patternPrefix = patternIdSuffix ? `side-${patternIdSuffix}` : 'side';
  const bodyClipId = `${patternPrefix}-side-body-clip`;
  const armClipId = `${patternPrefix}-side-arm-clip`;
  const isFemale = silhouette === 'female';

  const wY = sa.wrist.y;
  const handTipY = sa.handTipY;
  const handLen = Math.max(15, handTipY - wY);

  const profileBodyPath = buildAnatomicalSideBodyPath(rig);

  // Mano relajada de perfil fiel a croquis (pulgar adelantado, dedos afinados en abanico suave)
  const sideHandSubpath = [
    `C ${sa.wrist.frontX + 3.0} ${wY + handLen * 0.2}, ${sa.wrist.frontX + 4.0} ${wY + handLen * 0.44}, ${sa.wrist.frontX + 2.4} ${wY + handLen * 0.56}`,
    `L ${sa.wrist.frontX + 0.4} ${wY + handLen * 0.46}`,
    `C ${sa.wrist.frontX + 1.8} ${wY + handLen * 0.72}, ${sa.wrist.frontX + 0.8} ${handTipY - 2.2}, ${sa.wrist.frontX - 1.8} ${handTipY + 0.6}`,
    `C ${sa.wrist.backX - 0.8} ${handTipY - 0.8}, ${sa.wrist.backX - 2.0} ${handTipY - handLen * 0.3}, ${sa.wrist.backX - 0.8} ${wY + handLen * 0.24}`,
    `C ${sa.wrist.backX - 0.4} ${wY + handLen * 0.12}, ${sa.wrist.backX - 0.1} ${wY + 1}, ${sa.wrist.backX} ${wY}`,
  ].join(' ');

  // Brazo de perfil en curva natural (húmero levemente atrás, antebrazo fluyendo hacia adelante)
  const profileArmPath = [
    `M ${sa.shoulder.backX} ${sa.shoulder.y}`,
    `C ${sa.shoulder.backX + 1} ${rig.shoulderY - 1.5}, ${sa.shoulder.frontX - 1} ${rig.shoulderY - 1.5}, ${sa.shoulder.frontX} ${sa.shoulder.y}`,
    `C ${sa.bicep.frontX + 1.8} ${sa.bicep.y - 4}, ${sa.bicep.frontX + 0.8} ${sa.bicep.y + 7}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 2.8} ${sa.elbow.y + (wY - sa.elbow.y) * 0.34}, ${sa.wrist.frontX + 1.0} ${wY - 6}, ${sa.wrist.frontX} ${wY}`,
    sideHandSubpath,
    `C ${sa.elbow.backX - 1.0} ${sa.elbow.y + 12}, ${sa.elbow.backX - 1.8} ${sa.elbow.y + 2}, ${sa.elbow.backX} ${sa.elbow.y}`,
    `C ${sa.bicep.backX - 2.0} ${sa.bicep.y + 5}, ${sa.shoulder.backX - 2.0} ${sa.shoulder.y + 10}, ${sa.shoulder.backX} ${sa.shoulder.y}`,
    'Z',
  ].join(' ');

  const profileArmOpenInkPath = [
    `M ${sa.shoulder.frontX - 0.4} ${sa.shoulder.y + 7}`,
    `C ${sa.bicep.frontX + 1.8} ${sa.bicep.y - 4}, ${sa.bicep.frontX + 0.8} ${sa.bicep.y + 7}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 2.8} ${sa.elbow.y + (wY - sa.elbow.y) * 0.34}, ${sa.wrist.frontX + 1.0} ${wY - 6}, ${sa.wrist.frontX} ${wY}`,
    sideHandSubpath,
    `C ${sa.elbow.backX - 1.0} ${sa.elbow.y + 12}, ${sa.elbow.backX - 1.8} ${sa.elbow.y + 2}, ${sa.elbow.backX} ${sa.elbow.y}`,
    `C ${sa.bicep.backX - 2.0} ${sa.bicep.y + 5}, ${sa.shoulder.backX - 2.0} ${sa.shoulder.y + 10}, ${sa.shoulder.backX + 0.4} ${sa.shoulder.y + 4}`,
  ].join(' ');

  const profileForearmAndHandPath = [
    `M ${sa.bicep.backX} ${sa.bicep.y}`,
    `L ${sa.bicep.frontX} ${sa.bicep.y}`,
    `C ${sa.elbow.frontX} ${sa.elbow.y - 4}, ${sa.elbow.frontX} ${sa.elbow.y}, ${sa.elbow.frontX} ${sa.elbow.y}`,
    `C ${sa.wrist.frontX + 2.8} ${sa.elbow.y + (wY - sa.elbow.y) * 0.34}, ${sa.wrist.frontX + 1.0} ${wY - 6}, ${sa.wrist.frontX} ${wY}`,
    sideHandSubpath,
    `C ${sa.elbow.backX - 1.0} ${sa.elbow.y + 12}, ${sa.elbow.backX - 1.8} ${sa.elbow.y + 2}, ${sa.elbow.backX} ${sa.elbow.y}`,
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
      <g
        clipPath={`url(#${armClipId})`}
        filter={`url(#${patternPrefix}-soft-shade)`}
        pointerEvents="none"
      >
        <path
          d={`M ${sa.shoulder.backX - 4} ${sa.shoulder.y} L ${sa.shoulder.backX + 7} ${sa.shoulder.y} L ${sa.elbow.backX + 5.6} ${sa.elbow.y} L ${sa.wrist.backX + 3.6} ${wY} L ${sa.wrist.backX - 4} ${handTipY} L ${sa.shoulder.backX - 5} ${handTipY} Z`}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.78"
        />
        <ellipse
          cx={(sa.shoulder.backX + sa.shoulder.frontX) * 0.58}
          cy={sa.shoulder.y + 12}
          rx={5.6}
          ry={14}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
      </g>
      <path
        d={profileArmOpenInkPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Separación fina de dedos en abanico de perfil */}
      <path
        d={[
          `M ${sa.wrist.frontX - 0.6} ${wY + handLen * 0.56} L ${sa.wrist.frontX - 1.4} ${handTipY - 1.6}`,
          `M ${sa.wrist.backX + 1.2} ${wY + handLen * 0.58} L ${sa.wrist.backX + 0.4} ${handTipY - 2.6}`,
        ].join(' ')}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.56"
        strokeLinecap="round"
        opacity="0.72"
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
      style={avatarColorVars}
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

      {/* Sombra suave de contacto en el suelo */}
      <ellipse
        cx={cx + 5}
        cy={rig.footY + 3.5}
        rx={26}
        ry={5}
        fill={`url(#${patternPrefix}-floor-shadow)`}
        pointerEvents="none"
      />

      {/* Relleno base cálido del cuerpo de perfil */}
      <path
        d={profileBodyPath}
        fill={`url(#${patternPrefix}-side-body-grad)`}
        data-avatar-body="side"
      />

      {/* Modelado volumétrico 3D difuminado recortado al cuerpo de perfil */}
      <g
        clipPath={`url(#${bodyClipId})`}
        filter={`url(#${patternPrefix}-soft-shade)`}
        pointerEvents="none"
      >
        <path
          d={`M ${cx - 10} ${rig.chinY - 4} L ${cx + 9} ${rig.chinY - 4} L ${cx + 8} ${rig.neckBaseY + 3} Q ${cx - 1} ${rig.neckBaseY + 7} ${cx - 10} ${rig.neckBaseY + 2} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
        />
        <path
          d={[
            `M ${s.shoulderBackX - 7} ${rig.shoulderY}`,
            `L ${s.chestBackX + 9} ${rig.chestY}`,
            `L ${s.waistBackX + 7} ${rig.waistY}`,
            `L ${s.hipBackX + 12} ${s.gluteApexY}`,
            `L ${s.thighBackX + 9} ${rig.crotchY + 24}`,
            `L ${s.kneeBackX + 7} ${rig.kneeY}`,
            `L ${s.calfBackX + 9} ${rig.calfY}`,
            `L ${s.ankleBackX + 4.5} ${rig.ankleJointY}`,
            `L ${s.ankleBackX - 6} ${rig.footY + 2}`,
            `L ${s.hipBackX - 10} ${rig.footY + 2}`,
            'Z',
          ].join(' ')}
          fill={`url(#${patternPrefix}-muscle-shade)`}
          opacity="0.76"
        />
        <path
          d={`M ${s.chestFrontX - 10} ${s.underBustY - 1} Q ${s.chestFrontX - 1} ${s.underBustY + 4.2} ${s.bustFrontX + 3} ${s.underBustY - 1} L ${s.bustFrontX + 3} ${s.underBustY + 7.5} L ${s.chestFrontX - 10} ${s.underBustY + 5} Z`}
          fill={`url(#${patternPrefix}-skin-core-shade)`}
          opacity="0.78"
        />
        <ellipse
          cx={s.thighFrontX - 5.5}
          cy={rig.crotchY + (rig.kneeY - rig.crotchY) * 0.45}
          rx={6}
          ry={24}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
        <ellipse
          cx={s.calfFrontX - 2.5}
          cy={rig.calfY + 8}
          rx={3.8}
          ry={19}
          fill={`url(#${patternPrefix}-skin-sheen)`}
        />
      </g>

      {/* Líneas anatómicas ultrafinas de perfil */}
      <g pointerEvents="none" fill="none" strokeLinecap="round">
        <path
          d={`M ${cx - 3.6} ${rig.chinY + 1} Q ${cx - 0.5} ${rig.neckBaseY + 2} ${s.shoulderFrontX - 2} ${rig.shoulderY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.6"
          opacity="0.72"
        />
        {!isFemale && (
          <path
            d={`M ${s.chestFrontX - 7} ${s.underBustY + 1} Q ${s.chestFrontX} ${s.underBustY + 2.6} ${s.bustFrontX - 0.2} ${s.underBustY - 1.5}`}
            stroke="var(--mannequin-detail)"
            strokeWidth="0.68"
          />
        )}
        <path
          d={`M ${s.kneeFrontX - 3.4} ${rig.kneeY - 3} Q ${s.kneeFrontX - 0.8} ${rig.kneeY + 1} ${s.kneeFrontX - 2.8} ${rig.kneeY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
        />
        <path
          d={`M ${s.kneeBackX + 1.8} ${rig.kneeY + 1} L ${s.kneeBackX + 5.6} ${rig.kneeY + 2.2}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.58"
        />
        <path
          d={`M ${s.ankleBackX + 3.4} ${rig.calfY + 18} L ${s.ankleBackX + 3} ${rig.ankleJointY + 3}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.58"
        />
        <path
          d={`M ${cx + 0.8} ${rig.ankleJointY + 1.5} Q ${cx + 2.5} ${rig.ankleJointY + 3.5} ${cx + 0.2} ${rig.ankleJointY + 5.2}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.62"
        />
        <path
          d={`M ${s.ankleFrontX + 14.8} ${rig.footY - 2.8} Q ${s.ankleFrontX + 17.0} ${rig.footY - 2} ${s.ankleFrontX + 17.8} ${rig.footY - 0.1}`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.56"
          opacity="0.68"
        />
      </g>

      {/* Ropa base editorial verde oliva mate recortada al cuerpo de perfil */}
      <EditorialBasewear
        view="side"
        rig={rig}
        patternPrefix={patternPrefix}
        bodyClipId={bodyClipId}
      />

      {/* Contorno de tinta refinada abrazando cuerpo y ropa base */}
      <path
        d={profileBodyPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.08"
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
            strokeWidth="1.05"
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
