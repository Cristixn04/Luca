import type { BodyModel, FitReport } from '@luca/domain';
import { Badge } from '@/design-system/components/Badge';
import type { M2GarmentCategory, MannequinSilhouette } from '../store';
import { buildAnatomicalFrontBackPath } from './anatomyPaths';
import { AVATAR_VIEWBOX } from './anchors';
import { useAvatarColorStyle } from './avatarPalette';
import {
  EditorialBasewear,
  EditorialFemaleBackHair,
  EditorialFrontHead,
} from './EditorialFigureParts';
import type { GarmentVisualMeta } from './garmentVisuals';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';
import { computeMannequinRig } from './mannequinRig';
import { PantsTemplate, type LowerGarmentVariant } from './PantsTemplate';
import { TshirtTemplate, type UpperGarmentVariant } from './TshirtTemplate';

export interface OutfitLayerOverlay {
  readonly topFitReport?: FitReport | null;
  readonly topColorHex?: string;
  readonly topVariant?: UpperGarmentVariant;
  readonly topMeta?: GarmentVisualMeta;
  readonly outerwearFitReport?: FitReport | null;
  readonly outerwearColorHex?: string;
  readonly outerwearMeta?: GarmentVisualMeta;
  readonly bottomFitReport?: FitReport | null;
  readonly bottomColorHex?: string;
  readonly bottomVariant?: LowerGarmentVariant;
  readonly bottomMeta?: GarmentVisualMeta;
}

export function isLowerCategory(category: M2GarmentCategory): category is LowerGarmentVariant {
  return category === 'pants' || category === 'shorts' || category === 'skirt';
}

export interface SingleAvatarViewProps {
  model: BodyModel;
  silhouette?: MannequinSilhouette;
  garmentCategory: M2GarmentCategory;
  fitReport: FitReport | null;
  showHeatmap: boolean;
  garmentColorHex?: string;
  garmentMeta?: GarmentVisualMeta;
  outfitLayers?: OutfitLayerOverlay;
  compact?: boolean;
  frameless?: boolean;
  patternIdSuffix?: string;
}

export function FrontAvatarSvg({
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
  const patternPrefix = patternIdSuffix ? `front-${patternIdSuffix}` : 'front';
  const bodyClipId = `${patternPrefix}-front-body-clip`;

  const wY = a.wrist.y;
  const handTipY = a.handTipY;
  const handLen = Math.max(15, handTipY - wY);
  const footInnerX = Math.max(2.2, rig.ankleInnerX - (isFemale ? 3.4 : 4.0));
  const neckTopY = rig.chinY - 6;

  const unifiedBodyPath = buildAnatomicalFrontBackPath(rig, 'front');
  const isTorsoEstimated = model.landmarks.torsoEstimated;
  const kneeMidX = (rig.kneeOuterX + rig.kneeInnerX) * 0.5;
  const calfMidX = (rig.calfOuterX + rig.calfInnerX) * 0.5;
  const thighMidY = rig.crotchY + (rig.kneeY - rig.crotchY) * 0.46;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      style={avatarColorVars}
      role="img"
      aria-label="Avatar paramétrico de frente con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />
      <MannequinDefs prefix={patternPrefix} />
      <defs>
        <clipPath id={bodyClipId}>
          <path d={unifiedBodyPath} />
        </clipPath>
      </defs>

      {/* Sombra suave de contacto en el suelo bajo los pies */}
      <ellipse
        cx={cx}
        cy={rig.footY + 3.5}
        rx={rig.ankleOuterX + 22}
        ry={5.5}
        fill={`url(#${patternPrefix}-floor-shadow)`}
        pointerEvents="none"
      />

      {isFemale && <EditorialFemaleBackHair rig={rig} />}

      {/* Relleno base cálido del cuerpo anatómico unificado */}
      <path
        d={unifiedBodyPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        data-avatar-body="front"
      />

      {/* Modelado volumétrico 3D difuminado recortado limpiamente a la silueta */}
      <g
        clipPath={`url(#${bodyClipId})`}
        filter={`url(#${patternPrefix}-soft-shade)`}
        pointerEvents="none"
      >
        {/* Oclusión bajo la mandíbula sobre el cuello */}
        <path
          d={`M ${cx - rig.neckHalf - 4} ${neckTopY} L ${cx + rig.neckHalf + 4} ${neckTopY} L ${cx + rig.neckHalf + 2} ${rig.neckBaseY + 3} Q ${cx} ${rig.neckBaseY + 10} ${cx - rig.neckHalf - 2} ${rig.neckBaseY + 3} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
        />

        {/* Sombra de fosa supraclavicular y clavículas */}
        <ellipse
          cx={cx}
          cy={rig.shoulderY + 5}
          rx={rig.neckHalf * 0.9}
          ry={3.2}
          fill={`url(#${patternPrefix}-ambient-occlusion)`}
          opacity="0.7"
        />

        {/* Sombra lateral 3D en torso, brazos y piernas + luz clave cenital */}
        {([-1, 1] as const).map((side) => (
          <g key={`front-vol-${side}`}>
            {/* Terminador lateral del torso (costados, cintura y cadera) */}
            <path
              d={[
                `M ${cx + side * (rig.chestX + 4)} ${rig.armpitY - 2}`,
                `C ${cx + side * (rig.chestX - 8)} ${rig.chestY + 10}, ${cx + side * (rig.waistX - 6.5)} ${rig.waistY}, ${cx + side * (rig.hipX - 8.5)} ${rig.hipY}`,
                `L ${cx + side * (rig.hipX + 8)} ${rig.hipY + 24}`,
                `L ${cx + side * (rig.chestX + 8)} ${rig.armpitY - 2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity={side === 1 ? '0.92' : '0.72'}
            />
            {/* Luz clave superior en deltoides y bíceps */}
            <ellipse
              cx={cx + side * (rig.shoulderX - 1)}
              cy={a.deltoid.y + 6}
              rx={6.8}
              ry={12}
              fill={`url(#${patternPrefix}-skin-sheen)`}
            />
            {/* Sombra interior de brazos y antebrazos */}
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
              opacity="0.76"
            />
            {/* Oclusión de cara interna de muslos */}
            <path
              d={[
                `M ${cx + side * 0.8} ${rig.crotchY + 2}`,
                `L ${cx + side * (rig.kneeInnerX + 7.5)} ${thighMidY}`,
                `L ${cx + side * (rig.kneeInnerX + 4.6)} ${rig.kneeY + 6}`,
                `L ${cx + side * (rig.kneeInnerX - 3)} ${rig.kneeY + 6}`,
                `L ${cx + side * 0.5} ${rig.crotchY + 2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.68"
            />
            {/* Luz clave en cuádriceps, rótula y tibia */}
            <ellipse
              cx={cx + side * kneeMidX}
              cy={thighMidY}
              rx={6.4}
              ry={24}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.92"
            />
            <ellipse
              cx={cx + side * kneeMidX}
              cy={rig.kneeY - 2}
              rx={4.6}
              ry={4.2}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.88"
            />
            <ellipse
              cx={cx + side * calfMidX}
              cy={rig.calfY + 12}
              rx={4.2}
              ry={20}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.82"
            />
            {/* Sombra bajo rótula y lateral de gemelo */}
            <ellipse
              cx={cx + side * kneeMidX}
              cy={rig.kneeY + 5.5}
              rx={6.4}
              ry={3.8}
              fill={`url(#${patternPrefix}-ambient-occlusion)`}
              opacity="0.72"
            />
            <path
              d={`M ${cx + side * (rig.calfOuterX - 5.2)} ${rig.kneeY + 6} Q ${cx + side * (rig.calfOuterX - 2)} ${rig.calfY} ${cx + side * (rig.ankleOuterX - 2)} ${rig.ankleJointY} L ${cx + side * (rig.calfOuterX + 6)} ${rig.ankleJointY} L ${cx + side * (rig.calfOuterX + 6)} ${rig.kneeY + 6} Z`}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.72"
            />
          </g>
        ))}

        {/* Volumen esculpido del pecho/abdomen masculino o busto/abdomen femenino */}
        {isFemale ? (
          <g>
            {/* Sombra 3D suave bajo el busto y relieve abdominal femenino (fiel a Imagen 1) */}
            {([-1, 1] as const).map((side) => (
              <ellipse
                key={`bust-shade-${side}`}
                cx={cx + side * rig.chestX * 0.44}
                cy={rig.bustUnderY + 3.5}
                rx={rig.chestX * 0.36}
                ry={5.2}
                fill={`url(#${patternPrefix}-ambient-occlusion)`}
                opacity="0.75"
              />
            ))}
            <ellipse
              cx={cx}
              cy={rig.waistY + 6}
              rx={rig.waistX * 0.48}
              ry={12}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.76"
            />
          </g>
        ) : (
          <g>
            {([-1, 1] as const).map((side) => (
              <g key={`pec-vol-${side}`}>
                <path
                  d={[
                    `M ${cx + side * 1.8} ${rig.chestY + 7}`,
                    `Q ${cx + side * rig.chestX * 0.5} ${rig.chestY + 14} ${cx + side * (rig.chestX - 1.5)} ${rig.chestY + 4}`,
                    `Q ${cx + side * rig.chestX * 0.52} ${rig.chestY + 20} ${cx + side * 2.2} ${rig.chestY + 13}`,
                    'Z',
                  ].join(' ')}
                  fill={`url(#${patternPrefix}-skin-core-shade)`}
                  opacity="0.92"
                />
                <ellipse
                  cx={cx + side * rig.chestX * 0.48}
                  cy={rig.chestY - 1.5}
                  rx={rig.chestX * 0.3}
                  ry={6.8}
                  fill={`url(#${patternPrefix}-skin-sheen)`}
                  opacity="0.92"
                />
                <ellipse
                  cx={cx + side * 7.6}
                  cy={rig.chestY + (rig.waistY - rig.chestY) * 0.44}
                  rx={5.6}
                  ry={6.2}
                  fill={`url(#${patternPrefix}-muscle-shade)`}
                  opacity="0.48"
                />
                <ellipse
                  cx={cx + side * 7.2}
                  cy={rig.chestY + (rig.waistY - rig.chestY) * 0.74}
                  rx={5.2}
                  ry={5.6}
                  fill={`url(#${patternPrefix}-muscle-shade)`}
                  opacity="0.42"
                />
              </g>
            ))}
            <rect
              x={cx - 1.4}
              y={rig.chestY + 4}
              width={2.8}
              height={Math.max(12, rig.waistY - rig.chestY - 2)}
              rx={1.4}
              fill="var(--mannequin-shade-deep)"
              opacity="0.46"
            />
          </g>
        )}
      </g>

      {/* Trazos anatómicos ultrafinos de croquis de moda (Imágenes 3 y 4) */}
      <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Tendones del cuello y clavículas delicadas */}
        <path
          d={`M ${cx - rig.neckHalf * 0.7} ${rig.chinY + 2} Q ${cx - 4.2} ${rig.neckBaseY + 3} ${cx - 2.4} ${rig.shoulderY + 5} M ${cx + rig.neckHalf * 0.7} ${rig.chinY + 2} Q ${cx + 4.2} ${rig.neckBaseY + 3} ${cx + 2.4} ${rig.shoulderY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.6"
          opacity="0.72"
        />
        <path
          d={`M ${cx - rig.shoulderX * 0.62} ${rig.shoulderY + 4.5} Q ${cx - rig.neckHalf * 1.1} ${rig.shoulderY + 9.2} ${cx - 3.0} ${rig.shoulderY + 7.2} M ${cx + 3.0} ${rig.shoulderY + 7.2} Q ${cx + rig.neckHalf * 1.1} ${rig.shoulderY + 9.2} ${cx + rig.shoulderX * 0.62} ${rig.shoulderY + 4.5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.78"
          opacity="0.82"
        />

        {([-1, 1] as const).map((side) => {
          const wOutX = cx + side * a.wrist.outerX;
          const wInX = cx + side * a.wrist.innerX;
          return (
            <g key={`front-ink-${side}`}>
              {/* Pliegue axilar */}
              <path
                d={`M ${cx + side * rig.armpitX} ${rig.armpitY} Q ${cx + side * (rig.armpitX + 1.8)} ${rig.armpitY - 7} ${cx + side * (rig.shoulderX * 0.84)} ${rig.shoulderY + 13}`}
                stroke="var(--mannequin-stroke)"
                strokeWidth="0.8"
                opacity="0.72"
              />
              {/* Pliegue sutil del codo */}
              <path
                d={`M ${cx + side * (a.elbow.innerX + 1.8)} ${a.elbow.y - 1.5} Q ${cx + side * ((a.elbow.innerX + a.elbow.outerX) * 0.5)} ${a.elbow.y + 1.2} ${cx + side * (a.elbow.outerX - 2.6)} ${a.elbow.y - 1.5}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.58"
                opacity="0.68"
              />
              {/* Separación anatómica de dedos en manos (índice, medio, anular, meñique) */}
              <path
                d={[
                  `M ${wInX + side * (isFemale ? 1.8 : 2.3)} ${wY + handLen * 0.58} Q ${wInX + side * (isFemale ? 1.2 : 1.7)} ${wY + handLen * 0.78} ${wInX + side * (isFemale ? 1.5 : 2.0)} ${handTipY - 1.5}`,
                  `M ${wOutX - side * (isFemale ? 0.2 : 0.4)} ${wY + handLen * 0.54} Q ${wOutX - side * (isFemale ? 1.0 : 1.5)} ${wY + handLen * 0.76} ${wInX + side * (isFemale ? 3.2 : 4.2)} ${handTipY - 1.8}`,
                  `M ${wOutX + side * (isFemale ? 1.2 : 1.6)} ${wY + handLen * 0.5} Q ${wOutX + side * (isFemale ? 0.4 : 0.6)} ${wY + handLen * 0.7} ${wOutX - side * (isFemale ? 0.6 : 1.0)} ${handTipY - 4.4}`,
                ].join(' ')}
                stroke="var(--mannequin-stroke)"
                strokeWidth="0.58"
                opacity="0.74"
              />
              {/* Rótulas finas estilo croquis */}
              <path
                d={`M ${cx + side * (rig.kneeOuterX - 4.4)} ${rig.kneeY - 3.6} Q ${cx + side * kneeMidX} ${rig.kneeY - 6.0} ${cx + side * (rig.kneeInnerX + 3.8)} ${rig.kneeY - 3.4}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.62"
                opacity="0.72"
              />
              <path
                d={`M ${cx + side * (rig.kneeOuterX - 4.8)} ${rig.kneeY + 1.2} Q ${cx + side * kneeMidX} ${rig.kneeY + 5.2} ${cx + side * (rig.kneeInnerX + 4.0)} ${rig.kneeY + 1.4}`}
                stroke="var(--mannequin-detail)"
                strokeWidth="0.72"
                opacity="0.78"
              />
              {/* Dedos estilizados en pies */}
              <path
                d={`M ${cx + side * (footInnerX + 3.8)} ${rig.footY - 2.6} L ${cx + side * (footInnerX + 4.0)} ${rig.footY + 0.9} M ${cx + side * (footInnerX + 7.2)} ${rig.footY - 2.3} L ${cx + side * (footInnerX + 7.6)} ${rig.footY + 0.7} M ${cx + side * (footInnerX + 10.2)} ${rig.footY - 1.9} L ${cx + side * (footInnerX + 10.8)} ${rig.footY + 0.4}`}
                stroke="var(--mannequin-stroke)"
                strokeWidth="0.56"
                opacity="0.68"
              />
            </g>
          );
        })}

        {/* Contornos pectorales, abdominales y línea ilíaca (Hombre) */}
        {!isFemale && (
          <>
            <path
              d={`M ${cx - rig.chestX + 2.2} ${rig.chestY + 3.5} Q ${cx - rig.chestX * 0.48} ${rig.chestY + 11.5} ${cx - 2.2} ${rig.chestY + 6.8} M ${cx + 2.2} ${rig.chestY + 6.8} Q ${cx + rig.chestX * 0.48} ${rig.chestY + 11.5} ${cx + rig.chestX - 2.2} ${rig.chestY + 3.5}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.82"
              opacity="0.72"
            />
            <circle
              cx={cx - rig.chestX * 0.56}
              cy={rig.chestY + 4.8}
              r={1.35}
              fill="var(--mannequin-detail)"
              stroke="none"
              opacity="0.6"
            />
            <circle
              cx={cx + rig.chestX * 0.56}
              cy={rig.chestY + 4.8}
              r={1.35}
              fill="var(--mannequin-detail)"
              stroke="none"
              opacity="0.6"
            />
            <path
              d={`M ${cx} ${rig.chestY + 8} L ${cx} ${rig.waistY + 1.5} M ${cx - rig.waistX * 0.56} ${rig.chestY + 24} Q ${cx - rig.waistX * 0.5} ${rig.waistY - 4} ${cx - rig.waistX * 0.4} ${rig.waistY + 6} M ${cx + rig.waistX * 0.56} ${rig.chestY + 24} Q ${cx + rig.waistX * 0.5} ${rig.waistY - 4} ${cx + rig.waistX * 0.4} ${rig.waistY + 6}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.6"
              opacity="0.62"
            />
          </>
        )}

        {/* Ombligo anatómico delicado */}
        <path
          d={`M ${cx - 1.0} ${rig.waistY + 4.2} Q ${cx} ${rig.waistY + 6.2} ${cx + 1.0} ${rig.waistY + 4.2}`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.65"
          opacity="0.65"
        />
      </g>

      {/* Ropa base verde oliva mate recortada limpiamente al cuerpo */}
      <EditorialBasewear
        view="front"
        rig={rig}
        patternPrefix={patternPrefix}
        bodyClipId={bodyClipId}
      />

      {/* Contorno exterior de tinta refinada abrazando cuerpo y ropa base */}
      <path
        d={unifiedBodyPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.08"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Rostro y cabello editorial frontal */}
      <EditorialFrontHead rig={rig} patternPrefix={patternPrefix} />

      {/* Prendas ajustadas exactamente al MannequinRig */}
      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <PantsTemplate
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
            <TshirtTemplate
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
            <TshirtTemplate
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
            <TshirtTemplate
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
            <PantsTemplate
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
      data-avatar-view="front"
      data-mannequin-silhouette={silhouette}
      className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg p-3 ${compact ? 'w-full' : 'w-full max-w-[320px]'}`}
    >
      <div className="flex w-full items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">Frente</span>
        {isTorsoEstimated && (
          <Badge data-estimated-badge="front">Torso: estimado</Badge>
        )}
      </div>
      {svgNode}
    </div>
  );
}
