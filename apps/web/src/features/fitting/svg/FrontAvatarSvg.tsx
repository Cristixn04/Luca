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

      {/* Costuras de taller de moda y sombreado anatómico sutil (referencia atelier) */}
      <g pointerEvents="none">
        {/* Línea central vertical + línea de cuello + cortes princesa */}
        <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.65">
          <path d={`M ${cx - rig.neckHalf - 1} ${rig.shoulderY - 1} Q ${cx} ${rig.shoulderY + 5} ${cx + rig.neckHalf + 1} ${rig.shoulderY - 1}`} />
          <line x1={cx} y1={rig.shoulderY + 2} x2={cx} y2={rig.crotchY + 1} />
          <path
            d={`M ${cx - rig.shoulderX * 0.55} ${rig.shoulderY + 1} C ${cx - rig.chestX * 0.56} ${rig.chestY}, ${cx - rig.waistX * 0.62} ${rig.waistY}, ${cx - rig.hipX * 0.64} ${rig.hipY - 4}`}
          />
          <path
            d={`M ${cx + rig.shoulderX * 0.55} ${rig.shoulderY + 1} C ${cx + rig.chestX * 0.56} ${rig.chestY}, ${cx + rig.waistX * 0.62} ${rig.waistY}, ${cx + rig.hipX * 0.64} ${rig.hipY - 4}`}
          />
          {/* Línea de sisa de hombro */}
          <path d={`M ${cx - rig.shoulderX + 3} ${rig.shoulderY + 2} Q ${cx - rig.armpitX - 1} ${rig.chestY - 8} ${cx - rig.armpitX} ${rig.armpitY}`} />
          <path d={`M ${cx + rig.shoulderX - 3} ${rig.shoulderY + 2} Q ${cx + rig.armpitX + 1} ${rig.chestY - 8} ${cx + rig.armpitX} ${rig.armpitY}`} />
          {/* Línea pélvica de maniquí */}
          <path
            d={`M ${cx - rig.hipX + 1} ${rig.hipY - 8} Q ${cx - rig.hipX * 0.42} ${rig.crotchY - 14} ${cx} ${rig.crotchY + 2} Q ${cx + rig.hipX * 0.42} ${rig.crotchY - 14} ${cx + rig.hipX - 1} ${rig.hipY - 8}`}
          />
        </g>

        {/* Contorno de busto femenino o pectoral masculino */}
        {isFemale ? (
          <>
            <path
              d={`M ${cx - rig.chestX + 2} ${rig.chestY + 2} Q ${cx - rig.chestX * 0.46} ${rig.bustUnderY + 4} ${cx - 2.5} ${rig.chestY + 3}`}
              fill="none"
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.85"
              opacity="0.55"
            />
            <path
              d={`M ${cx + 2.5} ${rig.chestY + 3} Q ${cx + rig.chestX * 0.46} ${rig.bustUnderY + 4} ${cx + rig.chestX - 2} ${rig.chestY + 2}`}
              fill="none"
              stroke="var(--mannequin-stroke)"
              strokeWidth="0.85"
              opacity="0.55"
            />
            <path
              d={`M ${cx - rig.chestX + 3} ${rig.chestY + 3} Q ${cx - rig.chestX * 0.46} ${rig.bustUnderY + 7} ${cx - 2.5} ${rig.chestY + 4} Q ${cx - rig.chestX * 0.46} ${rig.bustUnderY + 2} ${cx - rig.chestX + 3} ${rig.chestY + 3} Z`}
              fill="var(--mannequin-shade-deep)"
            />
            <path
              d={`M ${cx + 2.5} ${rig.chestY + 4} Q ${cx + rig.chestX * 0.46} ${rig.bustUnderY + 7} ${cx + rig.chestX - 3} ${rig.chestY + 3} Q ${cx + rig.chestX * 0.46} ${rig.bustUnderY + 2} ${cx + 2.5} ${rig.chestY + 4} Z`}
              fill="var(--mannequin-shade-deep)"
            />
          </>
        ) : (
          <path
            d={`M ${cx - rig.chestX + 4} ${rig.chestY + 4} Q ${cx - rig.chestX * 0.45} ${rig.chestY + 8} ${cx - 2} ${rig.chestY + 5} M ${cx + 2} ${rig.chestY + 5} Q ${cx + rig.chestX * 0.45} ${rig.chestY + 8} ${cx + rig.chestX - 4} ${rig.chestY + 4}`}
            fill="none"
            stroke="var(--mannequin-detail)"
            strokeWidth="0.95"
          />
        )}

        {/* Sombreado sutil de rótulas (rodillas) */}
        <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.8" strokeLinecap="round">
          <path
            d={`M ${cx - rig.kneeOuterX + 4} ${rig.kneeY - 1} Q ${cx - (rig.kneeOuterX + rig.kneeInnerX) * 0.5} ${rig.kneeY + 4.5} ${cx - rig.kneeInnerX - 3} ${rig.kneeY - 1}`}
          />
          <path
            d={`M ${cx + rig.kneeInnerX + 3} ${rig.kneeY - 1} Q ${cx + (rig.kneeOuterX + rig.kneeInnerX) * 0.5} ${rig.kneeY + 4.5} ${cx + rig.kneeOuterX - 4} ${rig.kneeY - 1}`}
          />
        </g>
      </g>

      {/* Orejas finas y cabeza esculpida */}
      <ellipse
        cx={cx - rig.headRx * 0.96}
        cy={rig.headCenterY + 2}
        rx={2.1}
        ry={5}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.9"
      />
      <ellipse
        cx={cx + rig.headRx * 0.96}
        cy={rig.headCenterY + 2}
        rx={2.1}
        ry={5}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.9"
      />
      <path
        d={headPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />

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
