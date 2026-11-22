import type { BodyModel, FitReport } from '@luca/domain';
import { Badge } from '@/design-system/components/Badge';
import type { M2GarmentCategory, MannequinSilhouette } from '../store';
import { AVATAR_VIEWBOX } from './anchors';
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
  const isFemale = silhouette === 'female';
  const patternPrefix = patternIdSuffix ? `front-${patternIdSuffix}` : 'front';

  // Cabeza ovalada de taller sin rostro (esbelta y elegante)
  const headPath = [
    `M ${cx} ${rig.headTopY}`,
    `C ${cx + rig.headRx * 1.04} ${rig.headTopY}, ${cx + rig.headRx * 1.05} ${rig.headCenterY - rig.headRy * 0.1}, ${cx + rig.headRx * 0.9} ${rig.headCenterY + rig.headRy * 0.5}`,
    `C ${cx + rig.headRx * 0.7} ${rig.chinY - 3}, ${cx + rig.headRx * 0.28} ${rig.chinY}, ${cx} ${rig.chinY}`,
    `C ${cx - rig.headRx * 0.28} ${rig.chinY}, ${cx - rig.headRx * 0.7} ${rig.chinY - 3}, ${cx - rig.headRx * 0.9} ${rig.headCenterY + rig.headRy * 0.5}`,
    `C ${cx - rig.headRx * 1.05} ${rig.headCenterY - rig.headRy * 0.1}, ${cx - rig.headRx * 1.04} ${rig.headTopY}, ${cx} ${rig.headTopY}`,
    'Z',
  ].join(' ');

  // Cuello estilizado con transición suave a clavículas
  const neckPath = [
    `M ${cx - rig.neckHalf} ${rig.chinY - 5}`,
    `L ${cx + rig.neckHalf} ${rig.chinY - 5}`,
    `C ${cx + rig.neckHalf} ${rig.neckBaseY}, ${cx + rig.neckHalf + 4} ${rig.shoulderY - 2}, ${cx + rig.shoulderX * 0.52} ${rig.shoulderY + 2}`,
    `L ${cx - rig.shoulderX * 0.52} ${rig.shoulderY + 2}`,
    `C ${cx - rig.neckHalf - 4} ${rig.shoulderY - 2}, ${cx - rig.neckHalf} ${rig.neckBaseY}, ${cx - rig.neckHalf} ${rig.chinY - 5}`,
    'Z',
  ].join(' ');

  // Brazos esbeltos con manos anatómicas abiertas (pulgar hacia adentro + dedos afinados)
  const buildArmPath = (side: -1 | 1) => {
    const a = rig.arm;
    const s = side;
    const wOutX = cx + s * a.wrist.outerX;
    const wInX = cx + s * a.wrist.innerX;
    const wY = a.wrist.y;
    const handTipY = a.handTipY;
    const thumbTipX = cx + s * (a.wrist.innerX - 3.2);
    const thumbTipY = wY + 12.5;
    const palmInX = cx + s * (a.wrist.innerX + 0.8);
    const fingerOutX = cx + s * (a.wrist.outerX + 2.2);
    const fingerTipX = cx + s * (a.wrist.innerX + 2.4);

    return [
      `M ${cx + s * (rig.shoulderX - 3)} ${rig.shoulderY + 1}`,
      `C ${cx + s * (a.deltoid.outerX + 1.5)} ${a.deltoid.y + 4}, ${cx + s * (a.bicep.outerX + 0.5)} ${a.bicep.y - 4}, ${cx + s * a.bicep.outerX} ${a.bicep.y}`,
      `C ${cx + s * a.elbow.outerX} ${a.elbow.y - 6}, ${cx + s * a.elbow.outerX} ${a.elbow.y + 4}, ${cx + s * a.forearm.outerX} ${a.forearm.y}`,
      `C ${cx + s * (a.forearm.outerX + 1)} ${wY - 10}, ${wOutX + s * 0.8} ${wY - 4}, ${wOutX} ${wY}`,
      `C ${fingerOutX} ${wY + 7}, ${fingerOutX - s * 0.5} ${handTipY - 7}, ${fingerTipX} ${handTipY}`,
      `C ${palmInX + s * 1} ${handTipY - 1}, ${palmInX} ${wY + 13}, ${palmInX - s * 0.8} ${wY + 9}`,
      `L ${thumbTipX} ${thumbTipY}`,
      `C ${thumbTipX - s * 1.4} ${wY + 10}, ${wInX - s * 1.2} ${wY + 5}, ${wInX} ${wY}`,
      `C ${cx + s * a.forearm.innerX} ${a.forearm.y + 4}, ${cx + s * a.elbow.innerX} ${a.elbow.y + 3}, ${cx + s * a.elbow.innerX} ${a.elbow.y}`,
      `C ${cx + s * a.bicep.innerX} ${a.bicep.y + 2}, ${cx + s * (rig.armpitX + 1)} ${rig.armpitY + 4}, ${cx + s * rig.armpitX} ${rig.armpitY}`,
      `L ${cx + s * (rig.shoulderX - 3)} ${rig.shoulderY + 1}`,
      'Z',
    ].join(' ');
  };

  // Torso y piernas estilizadas (siguiendo exactamente MannequinRig)
  const footOuterX = rig.ankleOuterX + 4.8;
  const footInnerX = Math.max(3.5, rig.ankleInnerX - 2.6);

  const torsoAndLegsPath = [
    `M ${cx - rig.neckHalf - 2} ${rig.shoulderY - 2}`,
    `C ${cx - rig.shoulderX * 0.65} ${rig.shoulderY - 1}, ${cx - rig.shoulderX + 1} ${rig.shoulderY}, ${cx - rig.shoulderX} ${rig.shoulderY + 5}`,
    `C ${cx - rig.armpitX - 2} ${rig.armpitY - 8}, ${cx - rig.armpitX} ${rig.armpitY - 2}, ${cx - rig.chestX} ${rig.chestY + 4}`,
    `C ${cx - rig.chestX} ${rig.waistY - 14}, ${cx - rig.waistX} ${rig.waistY - 8}, ${cx - rig.waistX} ${rig.waistY}`,
    `C ${cx - rig.waistX} ${rig.hipY - 16}, ${cx - rig.hipX} ${rig.hipY - 12}, ${cx - rig.hipX} ${rig.hipY}`,
    `C ${cx - rig.hipX} ${rig.crotchY + 4}, ${cx - rig.hipX * 0.9} ${rig.crotchY + 24}, ${cx - rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx - rig.calfOuterX - 0.8} ${rig.calfY - 8}, ${cx - rig.calfOuterX} ${rig.calfY + 12}, ${cx - rig.ankleOuterX} ${rig.ankleJointY}`,
    `C ${cx - footOuterX} ${rig.footY - 4}, ${cx - footOuterX} ${rig.footY + 0.5}, ${cx - rig.ankleOuterX + 1} ${rig.footY}`,
    `L ${cx - footInnerX} ${rig.footY}`,
    `C ${cx - footInnerX - 1.5} ${rig.footY - 4}, ${cx - rig.ankleInnerX} ${rig.ankleJointY + 2}, ${cx - rig.ankleInnerX} ${rig.ankleJointY}`,
    `C ${cx - rig.calfInnerX} ${rig.calfY + 10}, ${cx - rig.calfInnerX - 1.5} ${rig.calfY - 10}, ${cx - rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx - rig.kneeInnerX - 1.5} ${rig.crotchY + 34}, ${cx - 3.5} ${rig.crotchY + 10}, ${cx} ${rig.crotchY + 3}`,
    `C ${cx + 3.5} ${rig.crotchY + 10}, ${cx + rig.kneeInnerX + 1.5} ${rig.crotchY + 34}, ${cx + rig.kneeInnerX} ${rig.kneeY}`,
    `C ${cx + rig.calfInnerX + 1.5} ${rig.calfY - 10}, ${cx + rig.calfInnerX} ${rig.calfY + 10}, ${cx + rig.ankleInnerX} ${rig.ankleJointY}`,
    `C ${cx + rig.ankleInnerX} ${rig.ankleJointY + 2}, ${cx + footInnerX + 1.5} ${rig.footY - 4}, ${cx + footInnerX} ${rig.footY}`,
    `L ${cx + rig.ankleOuterX - 1} ${rig.footY}`,
    `C ${cx + footOuterX} ${rig.footY + 0.5}, ${cx + footOuterX} ${rig.footY - 4}, ${cx + rig.ankleOuterX} ${rig.ankleJointY}`,
    `C ${cx + rig.calfOuterX} ${rig.calfY + 12}, ${cx + rig.calfOuterX + 0.8} ${rig.calfY - 8}, ${cx + rig.kneeOuterX} ${rig.kneeY}`,
    `C ${cx + rig.hipX * 0.9} ${rig.crotchY + 24}, ${cx + rig.hipX} ${rig.crotchY + 4}, ${cx + rig.hipX} ${rig.hipY}`,
    `C ${cx + rig.hipX} ${rig.hipY - 12}, ${cx + rig.waistX} ${rig.hipY - 16}, ${cx + rig.waistX} ${rig.waistY}`,
    `C ${cx + rig.waistX} ${rig.waistY - 8}, ${cx + rig.chestX} ${rig.waistY - 14}, ${cx + rig.chestX} ${rig.chestY + 4}`,
    `C ${cx + rig.armpitX} ${rig.armpitY - 2}, ${cx + rig.armpitX + 2} ${rig.armpitY - 8}, ${cx + rig.shoulderX} ${rig.shoulderY + 5}`,
    `C ${cx + rig.shoulderX - 1} ${rig.shoulderY}, ${cx + rig.shoulderX * 0.65} ${rig.shoulderY - 1}, ${cx + rig.neckHalf + 2} ${rig.shoulderY - 2}`,
    'Z',
  ].join(' ');

  const isTorsoEstimated = model.landmarks.torsoEstimated;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      role="img"
      aria-label="Avatar paramétrico de frente con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />
      <MannequinDefs prefix={patternPrefix} />

      {/* Cabello trasero (solo avatar femenino: melena ondulada media hasta hombros) */}
      {isFemale && (
        <path
          d={[
            `M ${cx - rig.headRx * 1.15} ${rig.headCenterY - rig.headRy * 0.25}`,
            `C ${cx - rig.headRx * 1.48} ${rig.chinY + 4}, ${cx - rig.headRx * 1.62} ${rig.shoulderY + 6}, ${cx - rig.headRx * 1.25} ${rig.shoulderY + 20}`,
            `Q ${cx} ${rig.shoulderY + 28} ${cx + rig.headRx * 1.25} ${rig.shoulderY + 20}`,
            `C ${cx + rig.headRx * 1.62} ${rig.shoulderY + 6}, ${cx + rig.headRx * 1.48} ${rig.chinY + 4}, ${cx + rig.headRx * 1.15} ${rig.headCenterY - rig.headRy * 0.25}`,
            'Z',
          ].join(' ')}
          fill="var(--avatar-hair-dark)"
          stroke="var(--avatar-hair-dark)"
          strokeWidth="0.6"
        />
      )}

      {/* Brazos y manos anatómicas */}
      <g
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      >
        <path d={buildArmPath(-1)} />
        <path d={buildArmPath(1)} />
      </g>

      {/* Cuello */}
      <path
        d={neckPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1"
      />
      <ellipse
        cx={cx}
        cy={rig.chinY + 2.5}
        rx={rig.neckHalf * 0.9}
        ry={4.5}
        fill={`url(#${patternPrefix}-neck-shadow)`}
      />

      {/* Cuerpo principal y piernas */}
      <path
        d={torsoAndLegsPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
        data-avatar-body="front"
      />

      {/* Anatomía humana sutil y prenda base neutra de estudio */}
      <g pointerEvents="none">
        {/* Clavículas y sombreado anatómico suave */}
        <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.85" strokeLinecap="round">
          <path
            d={`M ${cx - rig.shoulderX * 0.62} ${rig.shoulderY + 6} Q ${cx - rig.neckHalf * 1.1} ${rig.shoulderY + 9.5} ${cx - 3} ${rig.shoulderY + 7.5}`}
          />
          <path
            d={`M ${cx + 3} ${rig.shoulderY + 7.5} Q ${cx + rig.neckHalf * 1.1} ${rig.shoulderY + 9.5} ${cx + rig.shoulderX * 0.62} ${rig.shoulderY + 6}`}
          />
          {/* Ombligo sutil */}
          <path d={`M ${cx - 1.2} ${rig.waistY + 5} Q ${cx} ${rig.waistY + 6.8} ${cx + 1.2} ${rig.waistY + 5}`} />
        </g>

        {/* Ropa base deportiva neutra (siempre limpia cuando solo se prueba una prenda) */}
        {isFemale && (
          <path
            d={[
              `M ${cx - rig.shoulderX * 0.48} ${rig.shoulderY + 1}`,
              `L ${cx - rig.shoulderX * 0.34} ${rig.shoulderY + 1}`,
              `Q ${cx} ${rig.chestY - 7} ${cx + rig.shoulderX * 0.34} ${rig.shoulderY + 1}`,
              `L ${cx + rig.shoulderX * 0.48} ${rig.shoulderY + 1}`,
              `C ${cx + rig.chestX - 1} ${rig.chestY - 4}, ${cx + rig.chestX} ${rig.bustUnderY}, ${cx + rig.chestX - 2} ${rig.bustUnderY + 7}`,
              `Q ${cx} ${rig.bustUnderY + 9} ${cx - rig.chestX + 2} ${rig.bustUnderY + 7}`,
              `C ${cx - rig.chestX} ${rig.bustUnderY}, ${cx - rig.chestX + 1} ${rig.chestY - 4}, ${cx - rig.shoulderX * 0.48} ${rig.shoulderY + 1}`,
              'Z',
            ].join(' ')}
            fill="var(--avatar-basewear)"
            opacity="0.88"
          />
        )}
        {/* Short base neutro en zona pélvica */}
        <path
          d={[
            `M ${cx - rig.waistX - 0.5} ${rig.hipY - 12}`,
            `Q ${cx} ${rig.hipY - 9} ${cx + rig.waistX + 0.5} ${rig.hipY - 12}`,
            `C ${cx + rig.hipX} ${rig.hipY - 3}, ${cx + rig.hipX} ${rig.crotchY + 3}, ${cx + rig.hipX * 0.88} ${rig.crotchY + 15}`,
            `L ${cx + 5} ${rig.crotchY + 15}`,
            `L ${cx} ${rig.crotchY + 4}`,
            `L ${cx - 5} ${rig.crotchY + 15}`,
            `L ${cx - rig.hipX * 0.88} ${rig.crotchY + 15}`,
            `C ${cx - rig.hipX} ${rig.crotchY + 3}, ${cx - rig.hipX} ${rig.hipY - 3}, ${cx - rig.waistX - 0.5} ${rig.hipY - 12}`,
            'Z',
          ].join(' ')}
          fill="var(--avatar-basewear)"
          opacity="0.88"
        />

        {/* Contorno pectoral masculino suave */}
        {!isFemale && (
          <path
            d={`M ${cx - rig.chestX + 4} ${rig.chestY + 4} Q ${cx - rig.chestX * 0.45} ${rig.chestY + 8} ${cx - 2} ${rig.chestY + 5} M ${cx + 2} ${rig.chestY + 5} Q ${cx + rig.chestX * 0.45} ${rig.chestY + 8} ${cx + rig.chestX - 4} ${rig.chestY + 4}`}
            fill="none"
            stroke="var(--mannequin-detail)"
            strokeWidth="0.9"
          />
        )}

        {/* Sombreado sutil de rodillas */}
        <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.8" strokeLinecap="round">
          <path
            d={`M ${cx - rig.kneeOuterX + 4} ${rig.kneeY - 1} Q ${cx - (rig.kneeOuterX + rig.kneeInnerX) * 0.5} ${rig.kneeY + 4.5} ${cx - rig.kneeInnerX - 3} ${rig.kneeY - 1}`}
          />
          <path
            d={`M ${cx + rig.kneeInnerX + 3} ${rig.kneeY - 1} Q ${cx + (rig.kneeOuterX + rig.kneeInnerX) * 0.5} ${rig.kneeY + 4.5} ${cx + rig.kneeOuterX - 4} ${rig.kneeY - 1}`}
          />
        </g>
      </g>

      {/* Orejas, rostro humano 2D realista y cabello estilizado */}
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
        d={headPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.95"
        strokeLinejoin="round"
      />

      {/* Rasgos faciales realistas 2D */}
      <g pointerEvents="none">
        {/* Rubor suave en mejillas */}
        <ellipse
          cx={cx - rig.headRx * 0.44}
          cy={rig.headCenterY + 3.2}
          rx={3.6}
          ry={2.1}
          fill={`url(#${patternPrefix}-cheek-blush)`}
        />
        <ellipse
          cx={cx + rig.headRx * 0.44}
          cy={rig.headCenterY + 3.2}
          rx={3.6}
          ry={2.1}
          fill={`url(#${patternPrefix}-cheek-blush)`}
        />

        {/* Cejas */}
        <path
          d={`M ${cx - rig.headRx * 0.62} ${rig.headCenterY - 4.4} Q ${cx - rig.headRx * 0.36} ${rig.headCenterY - (isFemale ? 6.0 : 5.4)} ${cx - rig.headRx * 0.14} ${rig.headCenterY - 4.2}`}
          fill="none"
          stroke="var(--avatar-hair-dark)"
          strokeWidth={isFemale ? '0.95' : '1.25'}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx + rig.headRx * 0.14} ${rig.headCenterY - 4.2} Q ${cx + rig.headRx * 0.36} ${rig.headCenterY - (isFemale ? 6.0 : 5.4)} ${cx + rig.headRx * 0.62} ${rig.headCenterY - 4.4}`}
          fill="none"
          stroke="var(--avatar-hair-dark)"
          strokeWidth={isFemale ? '0.95' : '1.25'}
          strokeLinecap="round"
        />

        {/* Ojos con iris y brillo especular */}
        {([-1, 1] as const).map((side) => {
          const ex = cx + side * rig.headRx * 0.37;
          const ey = rig.headCenterY - 1.4;
          return (
            <g key={side}>
              <ellipse cx={ex} cy={ey} rx={2.5} ry={1.35} fill="#faf8f6" />
              <circle cx={ex} cy={ey} r={1.2} fill="var(--avatar-iris)" />
              <circle cx={ex} cy={ey} r={0.55} fill="#161210" />
              <circle cx={ex - 0.4} cy={ey - 0.4} r={0.35} fill="#ffffff" />
              <path
                d={`M ${ex - 2.6} ${ey} Q ${ex} ${ey - 1.85} ${ex + 2.6} ${ey}`}
                fill="none"
                stroke="var(--avatar-hair-dark)"
                strokeWidth={isFemale ? '0.85' : '0.7'}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Nariz sutil */}
        <path
          d={`M ${cx} ${rig.headCenterY - 0.5} L ${cx - 0.5} ${rig.headCenterY + 3.6} Q ${cx} ${rig.headCenterY + 4.3} ${cx + 1.1} ${rig.headCenterY + 3.7}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.72"
        />

        {/* Labios naturales */}
        <path
          d={`M ${cx - 3.6} ${rig.headCenterY + 7.2} Q ${cx - 1.4} ${rig.headCenterY + 6.1} ${cx} ${rig.headCenterY + 6.7} Q ${cx + 1.4} ${rig.headCenterY + 6.1} ${cx + 3.6} ${rig.headCenterY + 7.2} Q ${cx} ${rig.headCenterY + 9.4} ${cx - 3.6} ${rig.headCenterY + 7.2} Z`}
          fill="var(--avatar-lip)"
          opacity={isFemale ? '0.88' : '0.68'}
        />
        <path
          d={`M ${cx - 3.3} ${rig.headCenterY + 7.3} Q ${cx} ${rig.headCenterY + 7.9} ${cx + 3.3} ${rig.headCenterY + 7.3}`}
          fill="none"
          stroke="var(--mannequin-stroke)"
          strokeWidth="0.45"
          opacity="0.7"
        />
      </g>

      {/* Cabello frontal estilizado */}
      {isFemale ? (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - rig.headRx * 1.14} ${rig.headCenterY + 1}`,
              `C ${cx - rig.headRx * 1.24} ${rig.headTopY + 1}, ${cx - rig.headRx * 0.5} ${rig.headTopY - 4.5}, ${cx} ${rig.headTopY - 4}`,
              `C ${cx + rig.headRx * 0.5} ${rig.headTopY - 4.5}, ${cx + rig.headRx * 1.24} ${rig.headTopY + 1}, ${cx + rig.headRx * 1.14} ${rig.headCenterY + 1}`,
              `C ${cx + rig.headRx * 0.96} ${rig.headCenterY - 5}, ${cx + rig.headRx * 0.56} ${rig.headTopY + 5.5}, ${cx + 1.5} ${rig.headTopY + 6.5}`,
              `C ${cx - rig.headRx * 0.56} ${rig.headTopY + 5.5}, ${cx - rig.headRx * 0.96} ${rig.headCenterY - 5}, ${cx - rig.headRx * 1.14} ${rig.headCenterY + 1}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
          />
          <path
            d={`M ${cx - rig.headRx * 0.6} ${rig.headTopY + 2} Q ${cx} ${rig.headTopY - 1} ${cx + rig.headRx * 0.6} ${rig.headTopY + 2}`}
            fill="none"
            stroke="var(--avatar-hair-hi)"
            strokeWidth="0.9"
            opacity="0.65"
          />
        </g>
      ) : (
        <g pointerEvents="none">
          <path
            d={[
              `M ${cx - rig.headRx * 1.04} ${rig.headCenterY - 2}`,
              `C ${cx - rig.headRx * 1.14} ${rig.headTopY + 1}, ${cx - rig.headRx * 0.55} ${rig.headTopY - 4.5}, ${cx + 1} ${rig.headTopY - 4}`,
              `C ${cx + rig.headRx * 0.68} ${rig.headTopY - 4}, ${cx + rig.headRx * 1.14} ${rig.headTopY + 1}, ${cx + rig.headRx * 1.04} ${rig.headCenterY - 2}`,
              `C ${cx + rig.headRx * 0.92} ${rig.headCenterY - 7}, ${cx + rig.headRx * 0.45} ${rig.headTopY + 7.5}, ${cx - 2} ${rig.headTopY + 7}`,
              `C ${cx - rig.headRx * 0.55} ${rig.headTopY + 7.5}, ${cx - rig.headRx * 0.92} ${rig.headCenterY - 7}, ${cx - rig.headRx * 1.04} ${rig.headCenterY - 2}`,
              'Z',
            ].join(' ')}
            fill={`url(#${patternPrefix}-hair-grad)`}
          />
        </g>
      )}

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
