import { Badge } from '@/design-system/components/Badge';
import { buildAnatomicalFrontBackPath } from './anatomyPaths';
import { AVATAR_VIEWBOX } from './anchors';
import { useAvatarColorStyle } from './avatarPalette';
import { BackPantsTemplate } from './BackPantsTemplate';
import { BackTshirtTemplate } from './BackTshirtTemplate';
import { EditorialBackHead, EditorialBasewear } from './EditorialFigureParts';
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
  const { cssVars: avatarColorVars } = useAvatarColorStyle();
  const cx = rig.cx;
  const a = rig.arm;
  const isFemale = silhouette === 'female';
  const patternPrefix = patternIdSuffix ? `back-${patternIdSuffix}` : 'back';
  const bodyClipId = `${patternPrefix}-back-body-clip`;

  const wY = a.wrist.y;
  const handTipY = a.handTipY;
  const handLen = Math.max(15, handTipY - wY);
  const napeTopY = rig.headCenterY + rig.headRy * 0.68;
  const calfMidX = (rig.calfOuterX + rig.calfInnerX) * 0.5;
  const kneeMidX = (rig.kneeOuterX + rig.kneeInnerX) * 0.5;
  const thighMidY = rig.crotchY + (rig.kneeY - rig.crotchY) * 0.48;

  const unifiedBackPath = buildAnatomicalFrontBackPath(rig, 'back');
  const isBackEstimated = model.backWidthEstimated || model.backLengthEstimated;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      style={avatarColorVars}
      role="img"
      aria-label="Avatar paramétrico de espalda con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />
      <MannequinDefs prefix={patternPrefix} />
      <defs>
        <clipPath id={bodyClipId}>
          <path d={unifiedBackPath} />
        </clipPath>
      </defs>

      {/* Sombra suave de contacto en el suelo */}
      <ellipse
        cx={cx}
        cy={rig.footY + 3.5}
        rx={rig.ankleOuterX + 20}
        ry={5.2}
        fill={`url(#${patternPrefix}-floor-shadow)`}
        pointerEvents="none"
      />

      {/* Relleno base cálido del cuerpo posterior unificado */}
      <path
        d={unifiedBackPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        data-avatar-body="back"
      />

      {/* Modelado volumétrico 3D difuminado recortado a la silueta posterior */}
      <g
        clipPath={`url(#${bodyClipId})`}
        filter={`url(#${patternPrefix}-soft-shade)`}
        pointerEvents="none"
      >
        <path
          d={`M ${cx - rig.neckHalf - 4} ${napeTopY} L ${cx + rig.neckHalf + 4} ${napeTopY} L ${cx + rig.neckHalf + 2} ${rig.neckBaseY + 2} Q ${cx} ${rig.neckBaseY + 8} ${cx - rig.neckHalf - 2} ${rig.neckBaseY + 2} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
          opacity="0.72"
        />

        {/* Surco espinal central modelado con volumen 3D suave */}
        <path
          d={`M ${cx - 2.6} ${rig.shoulderY + 8} Q ${cx} ${rig.chestY + 14} ${cx - 4.4} ${rig.waistY + 6} L ${cx + 4.4} ${rig.waistY + 6} Q ${cx} ${rig.chestY + 14} ${cx + 2.6} ${rig.shoulderY + 8} Z`}
          fill={`url(#${patternPrefix}-skin-core-shade)`}
          opacity="0.72"
        />

        {([-1, 1] as const).map((side) => (
          <g key={`back-vol-${side}`}>
            <path
              d={[
                `M ${cx + side * (rig.backChestX + 4)} ${rig.armpitY - 2}`,
                `C ${cx + side * (rig.backChestX - 8)} ${rig.chestY + 10}, ${cx + side * (rig.waistX - 6.5)} ${rig.waistY}, ${cx + side * (rig.hipX - 8.5)} ${rig.hipY}`,
                `L ${cx + side * (rig.hipX + 8)} ${rig.hipY + 24}`,
                `L ${cx + side * (rig.backChestX + 8)} ${rig.armpitY - 2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity={side === 1 ? '0.9' : '0.7'}
            />
            {/* Volumen tonal del omóplato y relieve del trapecio */}
            <path
              d={[
                `M ${cx + side * rig.backChestX * 0.22} ${rig.shoulderY + 14}`,
                `Q ${cx + side * rig.backChestX * 0.56} ${rig.shoulderY + 11} ${cx + side * rig.backChestX * 0.74} ${rig.chestY + 4}`,
                `Q ${cx + side * rig.backChestX * 0.44} ${rig.chestY + 20} ${cx + side * rig.backChestX * 0.2} ${rig.chestY + 12}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.64"
            />
            <ellipse
              cx={cx + side * rig.backChestX * 0.44}
              cy={rig.shoulderY + 17}
              rx={rig.backChestX * 0.22}
              ry={7.5}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.82"
            />
            <ellipse
              cx={cx + side * (rig.shoulderX - 1)}
              cy={a.deltoid.y + 6}
              rx={6.8}
              ry={12}
              fill={`url(#${patternPrefix}-skin-sheen)`}
            />
            <path
              d={[
                `M ${cx + side * (a.bicep.innerX - 1)} ${rig.armpitY}`,
                `L ${cx + side * (a.bicep.innerX + 4.4)} ${a.bicep.y}`,
                `L ${cx + side * (a.elbow.innerX + 3.4)} ${a.elbow.y}`,
                `L ${cx + side * (a.wrist.innerX + 2.2)} ${wY}`,
                `L ${cx + side * (a.wrist.innerX - 3)} ${wY}`,
                `L ${cx + side * (a.elbow.innerX - 3)} ${a.elbow.y}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.74"
            />
            {/* Isquiotibiales y hueco poplíteo */}
            <path
              d={`M ${cx + side * 0.8} ${rig.crotchY + 2} L ${cx + side * (rig.kneeInnerX + 7.2)} ${thighMidY} L ${cx + side * (rig.kneeInnerX + 4.6)} ${rig.kneeY + 6} L ${cx + side * (rig.kneeInnerX - 3)} ${rig.kneeY + 6} L ${cx + side * 0.5} ${rig.crotchY + 2} Z`}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.62"
            />
            <ellipse
              cx={cx + side * kneeMidX}
              cy={rig.kneeY + 1}
              rx={6.8}
              ry={3.8}
              fill={`url(#${patternPrefix}-ambient-occlusion)`}
              opacity="0.62"
            />
            {/* Volumen esculpido de las dos cabezas del gemelo */}
            <path
              d={[
                `M ${cx + side * (rig.calfOuterX - 1.5)} ${rig.calfY - 4}`,
                `Q ${cx + side * calfMidX} ${rig.calfY + 15} ${cx + side * (rig.calfInnerX + 1.5)} ${rig.calfY - 2}`,
                `Q ${cx + side * calfMidX} ${rig.calfY + 28} ${cx + side * (rig.ankleInnerX + (rig.ankleOuterX - rig.ankleInnerX) * 0.5)} ${rig.ankleJointY - 2}`,
                `L ${cx + side * (rig.calfOuterX + 3)} ${rig.calfY + 14}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.68"
            />
            <ellipse
              cx={cx + side * calfMidX}
              cy={rig.calfY - 4}
              rx={5.4}
              ry={12}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.86"
            />
          </g>
        ))}
      </g>

      {/* Trazos anatómicos posteriores ultrafinos estilo croquis (Imágenes 3 y 4) */}
      <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={`M ${cx} ${rig.shoulderY + 5} L ${cx} ${rig.waistY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.58"
          opacity="0.58"
        />
        <path
          d={`M ${cx - 5.2} ${rig.waistY + 1.5} Q ${cx - 4.2} ${rig.waistY + 3.0} ${cx - 3.4} ${rig.waistY + 1.8} M ${cx + 5.2} ${rig.waistY + 1.5} Q ${cx + 4.2} ${rig.waistY + 3.0} ${cx + 3.4} ${rig.waistY + 1.8}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.56"
          opacity="0.52"
        />

        {([-1, 1] as const).map((side) => {
          const wOutX = cx + side * a.wrist.outerX;
          const wInX = cx + side * a.wrist.innerX;
          return (
            <g key={`back-ink-${side}`}>
              {/* Acento suave del borde inferior del omóplato */}
              <path
                d={`M ${cx + side * rig.backChestX * 0.56} ${rig.shoulderY + 16} Q ${cx + side * rig.backChestX * 0.34} ${rig.chestY + 4} ${cx + side * rig.backChestX * 0.26} ${rig.chestY + 12}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.58"
                opacity="0.5"
              />
              {/* Pliegue axilar posterior */}
              <path
                d={`M ${cx + side * rig.armpitX} ${rig.armpitY} Q ${cx + side * (rig.armpitX + 1.8)} ${rig.armpitY - 7} ${cx + side * (rig.shoulderX * 0.84)} ${rig.shoulderY + 12}`}
                stroke="var(--mannequin-stroke)"
                strokeWidth="0.78"
                opacity="0.7"
              />
              {/* Codo y dedos traseros */}
              <path
                d={`M ${cx + side * (a.elbow.innerX + 2.2)} ${a.elbow.y - 1.5} Q ${cx + side * ((a.elbow.innerX + a.elbow.outerX) * 0.5)} ${a.elbow.y + 1.6} ${cx + side * (a.elbow.outerX - 2.2)} ${a.elbow.y - 1.5}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.56"
                opacity="0.62"
              />
              <path
                d={[
                  `M ${wInX + side * (isFemale ? 1.8 : 2.3)} ${wY + handLen * 0.58} Q ${wInX + side * (isFemale ? 1.2 : 1.7)} ${wY + handLen * 0.78} ${wInX + side * (isFemale ? 1.5 : 2.0)} ${handTipY - 1.5}`,
                  `M ${wOutX - side * (isFemale ? 0.2 : 0.4)} ${wY + handLen * 0.54} Q ${wOutX - side * (isFemale ? 1.0 : 1.5)} ${wY + handLen * 0.76} ${wInX + side * (isFemale ? 3.2 : 4.2)} ${handTipY - 1.8}`,
                ].join(' ')}
                stroke="var(--mannequin-stroke)"
                strokeWidth="0.56"
                opacity="0.7"
              />
              {/* Pliegue poplíteo detrás de la rodilla */}
              <path
                d={`M ${cx + side * (rig.kneeOuterX - 4.6)} ${rig.kneeY + 1.4} Q ${cx + side * kneeMidX} ${rig.kneeY - 1.5} ${cx + side * (rig.kneeInnerX + 4.0)} ${rig.kneeY + 1.4}`}
                stroke="var(--mannequin-stroke)"
                strokeWidth="0.68"
                opacity="0.62"
              />
              {/* Gemelo inferior, tendón de Aquiles y talón */}
              <path
                d={`M ${cx + side * (rig.calfOuterX - 4.0)} ${rig.calfY + 4} Q ${cx + side * calfMidX} ${rig.calfY + 11.5} ${cx + side * (rig.calfInnerX + 3.2)} ${rig.calfY + 5}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.65"
                opacity="0.68"
              />
              <path
                d={`M ${cx + side * (rig.ankleInnerX + (rig.ankleOuterX - rig.ankleInnerX) * 0.44)} ${rig.calfY + 16} L ${cx + side * (rig.ankleInnerX + (rig.ankleOuterX - rig.ankleInnerX) * 0.44)} ${rig.ankleJointY + 5}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.58"
                opacity="0.68"
              />
              <path
                d={`M ${cx + side * (rig.ankleInnerX + 0.5)} ${rig.footY - 4} Q ${cx + side * ((rig.ankleInnerX + rig.ankleOuterX) * 0.5)} ${rig.footY - 1.4} ${cx + side * (rig.ankleOuterX - 0.5)} ${rig.footY - 4}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.58"
                opacity="0.65"
              />
            </g>
          );
        })}
      </g>

      {/* Ropa base verde oliva mate recortada limpiamente al cuerpo posterior */}
      <EditorialBasewear
        view="back"
        rig={rig}
        patternPrefix={patternPrefix}
        bodyClipId={bodyClipId}
      />

      {/* Contorno exterior de tinta refinada abrazando cuerpo y ropa base */}
      <path
        d={unifiedBackPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.08"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Cabeza trasera con orejas y cabello castaño en capas */}
      <EditorialBackHead rig={rig} patternPrefix={patternPrefix} />

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
