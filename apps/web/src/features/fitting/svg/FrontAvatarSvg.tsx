import type { BodyModel, FitReport } from '@luca/domain';
import { Badge } from '@/design-system/components/Badge';
import type { M2GarmentCategory, MannequinSilhouette } from '../store';
import { AVATAR_VIEWBOX } from './anchors';
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
  const cx = rig.cx;
  const a = rig.arm;
  const isFemale = silhouette === 'female';
  const patternPrefix = patternIdSuffix ? `front-${patternIdSuffix}` : 'front';
  const bodyClipId = `${patternPrefix}-front-body-clip`;

  const wY = a.wrist.y;
  const handTipY = a.handTipY;
  const handLen = Math.max(14, handTipY - wY);
  const footOuterX = rig.ankleOuterX + 9.2;
  const footInnerX = Math.max(2.6, rig.ankleInnerX - 4.0);
  const neckTopY = rig.chinY - 6;
  const trapStartY = rig.chinY + (rig.shoulderY - rig.chinY) * 0.34;
  const deltoidDomeY = rig.shoulderY + 2;

  // Silueta editorial continua: cuello atlético -> caída diagonal de trapecios -> deltoides redondeado ->
  // brazos en postura relajada en A -> manos proporcionadas -> torso -> muslos/gemelos esculpidos -> pies realistas
  const unifiedBodyPath = [
    // Cuello izquierdo -> trapecio inclinado (~25°) -> domo redondeado del deltoides izquierdo
    `M ${cx - rig.neckHalf} ${neckTopY}`,
    `C ${cx - rig.neckHalf - 0.5} ${trapStartY}, ${cx - rig.neckHalf - 3.5} ${rig.neckBaseY + 3}, ${cx - rig.shoulderX * 0.68} ${rig.shoulderY - 1.5}`,
    `C ${cx - rig.shoulderX * 0.96} ${deltoidDomeY - 1}, ${cx - a.deltoid.outerX - 1.6} ${deltoidDomeY + 4}, ${cx - a.deltoid.outerX - 1.4} ${a.deltoid.y + 10}`,
    // Brazo izquierdo exterior (deltoides -> bíceps -> codo -> braquiorradial -> muñeca)
    `C ${cx - a.bicep.outerX - 1.8} ${a.bicep.y - 5}, ${cx - a.bicep.outerX - 0.8} ${a.bicep.y + 6}, ${cx - a.elbow.outerX} ${a.elbow.y}`,
    `C ${cx - a.forearm.outerX - 2.2} ${a.forearm.y - 10}, ${cx - a.forearm.outerX - 1.0} ${a.forearm.y + 6}, ${cx - a.wrist.outerX} ${wY}`,
    // Mano izquierda relajada y proporcionada (dorso -> meñique/anular/medio -> índice -> pulgar abierto)
    `C ${cx - (a.wrist.outerX + 3.2)} ${wY + handLen * 0.28}, ${cx - (a.wrist.outerX + 2.4)} ${handTipY - handLen * 0.24}, ${cx - (a.wrist.outerX - 1.0)} ${handTipY - 2.6}`,
    `C ${cx - (a.wrist.innerX + 4.4)} ${handTipY + 0.8}, ${cx - (a.wrist.innerX + 1.8)} ${handTipY + 0.4}, ${cx - (a.wrist.innerX + 0.5)} ${handTipY - 3.8}`,
    `C ${cx - (a.wrist.innerX + 0.2)} ${wY + handLen * 0.58}, ${cx - (a.wrist.innerX + 0.2)} ${wY + handLen * 0.48}, ${cx - (a.wrist.innerX - 0.8)} ${wY + handLen * 0.4}`,
    `L ${cx - (a.wrist.innerX - 3.8)} ${wY + handLen * 0.54}`,
    `C ${cx - (a.wrist.innerX - 5.2)} ${wY + handLen * 0.46}, ${cx - (a.wrist.innerX - 3.0)} ${wY + handLen * 0.2}, ${cx - a.wrist.innerX} ${wY}`,
    // Brazo izquierdo interior -> axila
    `C ${cx - a.forearm.innerX + 0.6} ${a.forearm.y + 4}, ${cx - a.elbow.innerX} ${a.elbow.y + 4}, ${cx - a.elbow.innerX} ${a.elbow.y}`,
    `C ${cx - a.bicep.innerX} ${a.bicep.y + 3}, ${cx - rig.armpitX - 1.2} ${rig.armpitY + 5}, ${cx - rig.armpitX} ${rig.armpitY}`,
    // Torso izquierdo con estrechamiento atlético hacia cintura y cadera
    `C ${cx - rig.chestX - 1.2} ${rig.chestY + 2}, ${cx - rig.chestX + 0.8} ${rig.waistY - 14}, ${cx - rig.waistX} ${rig.waistY}`,
    `C ${cx - rig.waistX - 0.8} ${rig.hipY - 15}, ${cx - rig.hipX - 0.8} ${rig.hipY - 10}, ${cx - rig.hipX} ${rig.hipY}`,
    // Pierna izquierda exterior (cuádriceps pleno -> rodilla -> gemelo lateral -> tobillo)
    `C ${cx - rig.hipX * 1.02} ${rig.crotchY + 10}, ${cx - rig.hipX * 0.94} ${rig.crotchY + 34}, ${cx - rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx - rig.calfOuterX - 2.0} ${rig.calfY - 10}, ${cx - rig.calfOuterX - 0.6} ${rig.calfY + 12}, ${cx - rig.ankleOuterX} ${rig.ankleJointY}`,
    // Pie izquierdo realista con apertura natural y empeine amplio
    `C ${cx - rig.ankleOuterX - 2.4} ${rig.footY - 7}, ${cx - footOuterX - 1.4} ${rig.footY - 2.4}, ${cx - footOuterX + 0.6} ${rig.footY + 0.6}`,
    `C ${cx - footOuterX + 4.4} ${rig.footY + 2.4}, ${cx - footInnerX - 3.8} ${rig.footY + 2.4}, ${cx - footInnerX} ${rig.footY + 0.5}`,
    `C ${cx - footInnerX + 1.8} ${rig.footY - 3.6}, ${cx - rig.ankleInnerX + 1.4} ${rig.ankleJointY + 3}, ${cx - rig.ankleInnerX} ${rig.ankleJointY}`,
    // Pierna izquierda interior (curva llena del gemelo medial -> rodilla -> vasto interno -> entrepierna)
    `C ${cx - rig.calfInnerX + 0.4} ${rig.calfY + 12}, ${cx - rig.calfInnerX - 2.2} ${rig.calfY - 10}, ${cx - rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx - rig.kneeInnerX - 2.6} ${rig.crotchY + 36}, ${cx - 3.4} ${rig.crotchY + 11}, ${cx} ${rig.crotchY + 3.2}`,
    // Pierna derecha interior (espejo)
    `C ${cx + 3.4} ${rig.crotchY + 11}, ${cx + rig.kneeInnerX + 2.6} ${rig.crotchY + 36}, ${cx + rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx + rig.calfInnerX + 2.2} ${rig.calfY - 10}, ${cx + rig.calfInnerX - 0.4} ${rig.calfY + 12}, ${cx + rig.ankleInnerX} ${rig.ankleJointY}`,
    // Pie derecho realista
    `C ${cx + rig.ankleInnerX - 1.4} ${rig.ankleJointY + 3}, ${cx + footInnerX - 1.8} ${rig.footY - 3.6}, ${cx + footInnerX} ${rig.footY + 0.5}`,
    `C ${cx + footInnerX + 3.8} ${rig.footY + 2.4}, ${cx + footOuterX - 4.4} ${rig.footY + 2.4}, ${cx + footOuterX - 0.6} ${rig.footY + 0.6}`,
    `C ${cx + footOuterX + 1.4} ${rig.footY - 2.4}, ${cx + rig.ankleOuterX + 2.4} ${rig.footY - 7}, ${cx + rig.ankleOuterX} ${rig.ankleJointY}`,
    // Pierna derecha exterior -> cadera -> cintura -> axila
    `C ${cx + rig.calfOuterX + 0.6} ${rig.calfY + 12}, ${cx + rig.calfOuterX + 2.0} ${rig.calfY - 10}, ${cx + rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx + rig.hipX * 0.94} ${rig.crotchY + 34}, ${cx + rig.hipX * 1.02} ${rig.crotchY + 10}, ${cx + rig.hipX} ${rig.hipY}`,
    `C ${cx + rig.hipX + 0.8} ${rig.hipY - 10}, ${cx + rig.waistX + 0.8} ${rig.hipY - 15}, ${cx + rig.waistX} ${rig.waistY}`,
    `C ${cx + rig.chestX - 0.8} ${rig.waistY - 14}, ${cx + rig.chestX + 1.2} ${rig.chestY + 2}, ${cx + rig.armpitX} ${rig.armpitY}`,
    // Brazo derecho interior -> mano derecha -> brazo derecho exterior -> deltoides -> trapecio -> cuello
    `C ${cx + rig.armpitX + 1.2} ${rig.armpitY + 5}, ${cx + a.bicep.innerX} ${a.bicep.y + 3}, ${cx + a.elbow.innerX} ${a.elbow.y}`,
    `C ${cx + a.elbow.innerX} ${a.elbow.y + 4}, ${cx + a.forearm.innerX - 0.6} ${a.forearm.y + 4}, ${cx + a.wrist.innerX} ${wY}`,
    `C ${cx + (a.wrist.innerX - 3.0)} ${wY + handLen * 0.2}, ${cx + (a.wrist.innerX - 5.2)} ${wY + handLen * 0.46}, ${cx + (a.wrist.innerX - 3.8)} ${wY + handLen * 0.54}`,
    `L ${cx + (a.wrist.innerX - 0.8)} ${wY + handLen * 0.4}`,
    `C ${cx + (a.wrist.innerX + 0.2)} ${wY + handLen * 0.48}, ${cx + (a.wrist.innerX + 0.2)} ${wY + handLen * 0.58}, ${cx + (a.wrist.innerX + 0.5)} ${handTipY - 3.8}`,
    `C ${cx + (a.wrist.innerX + 1.8)} ${handTipY + 0.4}, ${cx + (a.wrist.innerX + 4.4)} ${handTipY + 0.8}, ${cx + (a.wrist.outerX - 1.0)} ${handTipY - 2.6}`,
    `C ${cx + (a.wrist.outerX + 2.4)} ${handTipY - handLen * 0.24}, ${cx + (a.wrist.outerX + 3.2)} ${wY + handLen * 0.28}, ${cx + a.wrist.outerX} ${wY}`,
    `C ${cx + a.forearm.outerX + 1.0} ${a.forearm.y + 6}, ${cx + a.forearm.outerX + 2.2} ${a.forearm.y - 10}, ${cx + a.elbow.outerX} ${a.elbow.y}`,
    `C ${cx + a.bicep.outerX + 0.8} ${a.bicep.y + 6}, ${cx + a.bicep.outerX + 1.8} ${a.bicep.y - 5}, ${cx + a.deltoid.outerX + 1.4} ${a.deltoid.y + 10}`,
    `C ${cx + a.deltoid.outerX + 1.6} ${deltoidDomeY + 4}, ${cx + rig.shoulderX * 0.96} ${deltoidDomeY - 1}, ${cx + rig.shoulderX * 0.68} ${rig.shoulderY - 1.5}`,
    `C ${cx + rig.neckHalf + 3.5} ${rig.neckBaseY + 3}, ${cx + rig.neckHalf + 0.5} ${trapStartY}, ${cx + rig.neckHalf} ${neckTopY}`,
    'Z',
  ].join(' ');

  const isTorsoEstimated = model.landmarks.torsoEstimated;
  const kneeMidX = (rig.kneeOuterX + rig.kneeInnerX) * 0.5;
  const thighMidY = rig.crotchY + (rig.kneeY - rig.crotchY) * 0.48;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
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

      {isFemale && <EditorialFemaleBackHair rig={rig} />}

      {/* Relleno base cálido del cuerpo editorial unificado */}
      <path
        d={unifiedBodyPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        data-avatar-body="front"
      />

      {/* Sombreado muscular y volumétrico recortado limpiamente a la silueta */}
      <g clipPath={`url(#${bodyClipId})`} pointerEvents="none">
        {/* Sombra bajo la mandíbula sobre el cuello */}
        <path
          d={`M ${cx - rig.neckHalf - 4} ${neckTopY} L ${cx + rig.neckHalf + 4} ${neckTopY} L ${cx + rig.neckHalf + 2} ${rig.neckBaseY + 2} Q ${cx} ${rig.neckBaseY + 8} ${cx - rig.neckHalf - 2} ${rig.neckBaseY + 2} Z`}
          fill={`url(#${patternPrefix}-neck-shadow)`}
        />

        {([-1, 1] as const).map((side) => (
          <g key={`front-shade-${side}`}>
            <path
              d={[
                `M ${cx + side * (rig.chestX + 2)} ${rig.armpitY - 2}`,
                `C ${cx + side * (rig.chestX - 6.5)} ${rig.chestY + 8}, ${cx + side * (rig.waistX - 5.5)} ${rig.waistY - 4}, ${cx + side * (rig.hipX - 6)} ${rig.hipY}`,
                `L ${cx + side * (rig.hipX + 4)} ${rig.hipY}`,
                `L ${cx + side * (rig.chestX + 4)} ${rig.armpitY - 2}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity={side === 1 ? '0.84' : '0.64'}
            />
            <ellipse
              cx={cx + side * (rig.shoulderX - 1)}
              cy={a.deltoid.y + 6}
              rx={6}
              ry={10.5}
              fill={`url(#${patternPrefix}-skin-sheen)`}
            />
            <path
              d={[
                `M ${cx + side * (a.bicep.innerX - 0.5)} ${rig.armpitY + 1}`,
                `L ${cx + side * (a.bicep.innerX + 4.0)} ${a.bicep.y}`,
                `L ${cx + side * (a.elbow.innerX + 3.0)} ${a.elbow.y}`,
                `L ${cx + side * (a.wrist.innerX + 2.0)} ${wY}`,
                `L ${cx + side * (a.wrist.innerX - 2)} ${wY}`,
                `L ${cx + side * (a.elbow.innerX - 2)} ${a.elbow.y}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.68"
            />
            <path
              d={[
                `M ${cx + side * 1.2} ${rig.crotchY + 3}`,
                `L ${cx + side * (rig.kneeInnerX + 6.5)} ${thighMidY}`,
                `L ${cx + side * (rig.kneeInnerX + 4.2)} ${rig.kneeY + 4}`,
                `L ${cx + side * (rig.kneeInnerX - 2)} ${rig.kneeY + 4}`,
                `L ${cx + side * 1} ${rig.crotchY + 3}`,
                'Z',
              ].join(' ')}
              fill={`url(#${patternPrefix}-skin-core-shade)`}
              opacity="0.56"
            />
            <ellipse
              cx={cx + side * kneeMidX}
              cy={thighMidY}
              rx={5.2}
              ry={19}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.82"
            />
            <ellipse
              cx={cx + side * ((rig.calfOuterX + rig.calfInnerX) * 0.48)}
              cy={rig.calfY + 8}
              rx={3.6}
              ry={17}
              fill={`url(#${patternPrefix}-skin-sheen)`}
              opacity="0.72"
            />
            <path
              d={`M ${cx + side * (rig.calfOuterX - 5)} ${rig.kneeY + 6} Q ${cx + side * (rig.calfOuterX - 2)} ${rig.calfY} ${cx + side * (rig.ankleOuterX - 2)} ${rig.ankleJointY} L ${cx + side * (rig.calfOuterX + 5)} ${rig.ankleJointY} L ${cx + side * (rig.calfOuterX + 5)} ${rig.kneeY + 6} Z`}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.64"
            />
            <ellipse
              cx={cx + side * kneeMidX}
              cy={rig.kneeY + 5}
              rx={5.8}
              ry={3.4}
              fill={`url(#${patternPrefix}-muscle-shade)`}
              opacity="0.55"
            />
          </g>
        ))}

        {/* Sombreado pectoral y abdominal masculino suave */}
        {!isFemale && (
          <g>
            {([-1, 1] as const).map((side) => (
              <g key={`pec-shade-${side}`}>
                <path
                  d={[
                    `M ${cx + side * 2} ${rig.chestY + 7}`,
                    `Q ${cx + side * rig.chestX * 0.48} ${rig.chestY + 13} ${cx + side * (rig.chestX - 2)} ${rig.chestY + 4}`,
                    `Q ${cx + side * rig.chestX * 0.52} ${rig.chestY + 17.5} ${cx + side * 2.5} ${rig.chestY + 12}`,
                    'Z',
                  ].join(' ')}
                  fill={`url(#${patternPrefix}-skin-core-shade)`}
                  opacity="0.82"
                />
                <ellipse
                  cx={cx + side * rig.chestX * 0.48}
                  cy={rig.chestY - 1}
                  rx={rig.chestX * 0.28}
                  ry={5.8}
                  fill={`url(#${patternPrefix}-skin-sheen)`}
                  opacity="0.8"
                />
                <ellipse
                  cx={cx + side * 7.4}
                  cy={rig.chestY + (rig.waistY - rig.chestY) * 0.42}
                  rx={5.4}
                  ry={5.8}
                  fill={`url(#${patternPrefix}-muscle-shade)`}
                  opacity="0.42"
                />
                <ellipse
                  cx={cx + side * 7.0}
                  cy={rig.chestY + (rig.waistY - rig.chestY) * 0.72}
                  rx={5.0}
                  ry={5.4}
                  fill={`url(#${patternPrefix}-muscle-shade)`}
                  opacity="0.38"
                />
              </g>
            ))}
            <rect
              x={cx - 1.2}
              y={rig.chestY + 4}
              width={2.4}
              height={Math.max(12, rig.waistY - rig.chestY - 4)}
              rx={1.2}
              fill="var(--mannequin-shade-deep)"
              opacity="0.4"
            />
          </g>
        )}
      </g>

      {/* Trazos anatómicos internos de tinta fina editorial */}
      <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Tendones del cuello y clavículas esculpidas */}
        <path
          d={`M ${cx - rig.neckHalf * 0.72} ${rig.chinY + 2} Q ${cx - 4.5} ${rig.neckBaseY + 3} ${cx - 2.6} ${rig.shoulderY + 5} M ${cx + rig.neckHalf * 0.72} ${rig.chinY + 2} Q ${cx + 4.5} ${rig.neckBaseY + 3} ${cx + 2.6} ${rig.shoulderY + 5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.65"
        />
        <path
          d={`M ${cx - rig.shoulderX * 0.64} ${rig.shoulderY + 4.5} Q ${cx - rig.neckHalf * 1.15} ${rig.shoulderY + 9.5} ${cx - 3.2} ${rig.shoulderY + 7.5} M ${cx + 3.2} ${rig.shoulderY + 7.5} Q ${cx + rig.neckHalf * 1.15} ${rig.shoulderY + 9.5} ${cx + rig.shoulderX * 0.64} ${rig.shoulderY + 4.5}`}
          stroke="var(--mannequin-detail)"
          strokeWidth="0.88"
        />

        {([-1, 1] as const).map((side) => (
          <g key={`front-lines-${side}`}>
            {/* Pliegue axilar delto-pectoral */}
            <path
              d={`M ${cx + side * rig.armpitX} ${rig.armpitY} Q ${cx + side * (rig.armpitX + 1.8)} ${rig.armpitY - 7} ${cx + side * (rig.shoulderX * 0.85)} ${rig.shoulderY + 13}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.85"
              opacity="0.74"
            />
            {/* Pliegue interno suave del codo */}
            <path
              d={`M ${cx + side * (a.elbow.innerX + 2)} ${a.elbow.y - 1} Q ${cx + side * ((a.elbow.innerX + a.elbow.outerX) * 0.5)} ${a.elbow.y + 1.4} ${cx + side * (a.elbow.outerX - 2.8)} ${a.elbow.y - 1.4}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.6"
              opacity="0.72"
            />
            {/* Separación sutil de dedos en manos */}
            <path
              d={`M ${cx + side * (a.wrist.innerX + 2.8)} ${handTipY - handLen * 0.36} L ${cx + side * (a.wrist.innerX + 2.0)} ${handTipY - 1.2} M ${cx + side * (a.wrist.outerX - 1.8)} ${handTipY - handLen * 0.42} L ${cx + side * (a.wrist.outerX - 2.8)} ${handTipY - 2.4}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.62"
              opacity="0.74"
            />
            {/* Rótulas */}
            <path
              d={`M ${cx + side * (rig.kneeOuterX - 4.6)} ${rig.kneeY - 3.5} Q ${cx + side * kneeMidX} ${rig.kneeY - 6.2} ${cx + side * (rig.kneeInnerX + 4)} ${rig.kneeY - 3.2}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.68"
              opacity="0.78"
            />
            <path
              d={`M ${cx + side * (rig.kneeOuterX - 5)} ${rig.kneeY + 1.4} Q ${cx + side * kneeMidX} ${rig.kneeY + 5.6} ${cx + side * (rig.kneeInnerX + 4.2)} ${rig.kneeY + 1.6}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.76"
              opacity="0.82"
            />
            {/* Líneas finas de dedos en pies */}
            <path
              d={`M ${cx + side * (footInnerX + 4.4)} ${rig.footY - 2.6} L ${cx + side * (footInnerX + 4.6)} ${rig.footY + 0.9} M ${cx + side * (footInnerX + 8.2)} ${rig.footY - 2.3} L ${cx + side * (footInnerX + 8.6)} ${rig.footY + 0.7} M ${cx + side * (footInnerX + 11.6)} ${rig.footY - 1.9} L ${cx + side * (footInnerX + 12.2)} ${rig.footY + 0.4}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.6"
              opacity="0.7"
            />
          </g>
        ))}

        {/* Trazos pectorales y abdominales masculinos sutiles */}
        {!isFemale && (
          <>
            <path
              d={`M ${cx - rig.chestX + 2.2} ${rig.chestY + 3.5} Q ${cx - rig.chestX * 0.48} ${rig.chestY + 11.5} ${cx - 2.2} ${rig.chestY + 6.8} M ${cx + 2.2} ${rig.chestY + 6.8} Q ${cx + rig.chestX * 0.48} ${rig.chestY + 11.5} ${cx + rig.chestX - 2.2} ${rig.chestY + 3.5}`}
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.82"
              opacity="0.74"
            />
            <circle
              cx={cx - rig.chestX * 0.56}
              cy={rig.chestY + 4.8}
              r={1.45}
              fill="var(--mannequin-detail)"
              stroke="none"
              opacity="0.65"
            />
            <circle
              cx={cx + rig.chestX * 0.56}
              cy={rig.chestY + 4.8}
              r={1.45}
              fill="var(--mannequin-detail)"
              stroke="none"
              opacity="0.65"
            />
            <path
              d={`M ${cx} ${rig.chestY + 8} L ${cx} ${rig.waistY + 1.5} M ${cx - rig.waistX * 0.56} ${rig.chestY + 24} Q ${cx - rig.waistX * 0.5} ${rig.waistY - 4} ${cx - rig.waistX * 0.4} ${rig.waistY + 6} M ${cx + rig.waistX * 0.56} ${rig.chestY + 24} Q ${cx + rig.waistX * 0.5} ${rig.waistY - 4} ${cx + rig.waistX * 0.4} ${rig.waistY + 6}`}
              stroke="var(--mannequin-detail)"
              strokeWidth="0.64"
              opacity="0.68"
            />
          </>
        )}

        <path
          d={`M ${cx - 1.1} ${rig.waistY + 4.2} Q ${cx} ${rig.waistY + 6.4} ${cx + 1.1} ${rig.waistY + 4.2}`}
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.68"
          opacity="0.68"
        />
      </g>

      {/* Ropa base verde oliva mate recortada limpiamente al cuerpo (cero huecos en cadera) */}
      <EditorialBasewear
        view="front"
        rig={rig}
        patternPrefix={patternPrefix}
        bodyClipId={bodyClipId}
      />

      {/* Contorno exterior de tinta espresso limpia abrazando cuerpo y ropa base */}
      <path
        d={unifiedBodyPath}
        fill="none"
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
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
