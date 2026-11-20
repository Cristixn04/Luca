import type { BodyModel, FitReport } from '@luca/domain';
import { Badge } from '@/design-system/components/Badge';
import type { M2GarmentCategory } from '../store';
import { AVATAR_VIEWBOX, computeFrontAvatarAnchors } from './anchors';
import type { GarmentVisualMeta } from './garmentVisuals';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { MannequinDefs } from './MannequinDefs';
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
  const anchors = computeFrontAvatarAnchors(model);
  const cx = anchors.centerX;
  const patternPrefix = patternIdSuffix ? `front-${patternIdSuffix}` : 'front';

  // Proporciones anatómicas de cabeza, cuello, extremidades y pies
  const headRx = anchors.headRadius * 0.78;
  const headRy = anchors.headRadius * 1.04;
  const headTopY = anchors.headCenterY - headRy;
  const chinY = anchors.headCenterY + headRy;
  const jawY = anchors.headCenterY + headRy * 0.48;
  const neckBaseY = anchors.shoulderY - 4;
  const neckHalf = anchors.neckHalfW * 0.96;

  // Cabeza humana esculpida (cráneo -> pómulos -> mandíbula -> mentón)
  const headPath = [
    `M ${cx} ${headTopY}`,
    `C ${cx + headRx * 1.05} ${headTopY}, ${cx + headRx * 1.08} ${anchors.headCenterY - headRy * 0.12}, ${cx + headRx * 0.96} ${jawY}`,
    `C ${cx + headRx * 0.82} ${chinY - 4}, ${cx + headRx * 0.34} ${chinY}, ${cx} ${chinY}`,
    `C ${cx - headRx * 0.34} ${chinY}, ${cx - headRx * 0.82} ${chinY - 4}, ${cx - headRx * 0.96} ${jawY}`,
    `C ${cx - headRx * 1.08} ${anchors.headCenterY - headRy * 0.12}, ${cx - headRx * 1.05} ${headTopY}, ${cx} ${headTopY}`,
    'Z',
  ].join(' ');

  // Cuello y trapecios
  const neckPath = [
    `M ${cx - neckHalf} ${chinY - 6}`,
    `L ${cx + neckHalf} ${chinY - 6}`,
    `C ${cx + neckHalf} ${neckBaseY - 4}, ${cx + neckHalf + 6} ${neckBaseY + 2}, ${cx + anchors.shoulderHalfW * 0.56} ${anchors.shoulderY + 2}`,
    `L ${cx - anchors.shoulderHalfW * 0.56} ${anchors.shoulderY + 2}`,
    `C ${cx - neckHalf - 6} ${neckBaseY + 2}, ${cx - neckHalf} ${neckBaseY - 4}, ${cx - neckHalf} ${chinY - 6}`,
    'Z',
  ].join(' ');

  // Brazos y manos relajadas a los costados (anatómicos)
  const buildArmPath = (side: -1 | 1) => {
    const shX = cx + side * anchors.shoulderHalfW;
    const armOuterElbowX = cx + side * (anchors.shoulderHalfW + 14);
    const armInnerElbowX = cx + side * (anchors.chestHalfW + 7);
    const elbowY = anchors.waistY + 4;
    const wristOuterX = cx + side * (anchors.shoulderHalfW + 20);
    const wristInnerX = cx + side * (anchors.shoulderHalfW + 10);
    const wristY = anchors.hipY + 18;
    const handTipY = anchors.crotchY + 14;
    const handOuterX = cx + side * (anchors.shoulderHalfW + 22);
    const handInnerX = cx + side * (anchors.shoulderHalfW + 11);

    return [
      `M ${shX - side * 5} ${anchors.shoulderY + 2}`,
      `C ${shX + side * 8} ${anchors.shoulderY + 6}, ${armOuterElbowX + side * 2} ${anchors.chestY + 16}, ${armOuterElbowX} ${elbowY}`,
      `C ${armOuterElbowX + side * 4} ${anchors.hipY - 8}, ${wristOuterX + side * 2} ${wristY - 8}, ${wristOuterX} ${wristY}`,
      `C ${handOuterX + side * 2} ${wristY + 10}, ${handOuterX} ${handTipY - 4}, ${handOuterX - side * 3.5} ${handTipY}`,
      `C ${handInnerX + side * 2} ${handTipY + 1}, ${handInnerX - side * 1} ${wristY + 11}, ${wristInnerX} ${wristY + 2}`,
      `C ${armInnerElbowX + side * 2} ${anchors.hipY - 12}, ${armInnerElbowX} ${elbowY + 4}, ${armInnerElbowX} ${elbowY}`,
      `C ${cx + side * (anchors.chestHalfW + 3)} ${anchors.chestY + 18}, ${cx + side * anchors.chestHalfW} ${anchors.chestY + 4}, ${shX - side * 5} ${anchors.shoulderY + 2}`,
      'Z',
    ].join(' ');
  };

  // Torso, piernas esculpidas (muslo -> rodilla -> pantorrilla -> tobillo -> pie)
  const calfY = anchors.kneeY + (anchors.ankleY - anchors.kneeY) * 0.34;
  const ankleJointY = anchors.ankleY - 12;
  const kneeOuterX = anchors.hipHalfW * 0.65;
  const calfOuterX = anchors.hipHalfW * 0.68;
  const ankleOuterX = anchors.ankleHalfW + 13;
  const ankleInnerX = 7.5;
  const kneeInnerX = 5.5;
  const calfInnerX = 6.5;
  const footOuterX = ankleOuterX + 5.5;
  const footInnerX = ankleInnerX - 2.5;

  const torsoAndLegsPath = [
    `M ${cx - neckHalf - 2} ${anchors.shoulderY - 2}`,
    `C ${cx - anchors.shoulderHalfW * 0.62} ${anchors.shoulderY - 1}, ${cx - anchors.shoulderHalfW} ${anchors.shoulderY + 1}, ${cx - anchors.shoulderHalfW} ${anchors.shoulderY + 7}`,
    `C ${cx - anchors.shoulderHalfW} ${anchors.chestY - 10}, ${cx - anchors.chestHalfW - 1} ${anchors.chestY - 4}, ${cx - anchors.chestHalfW} ${anchors.chestY + 4}`,
    `C ${cx - anchors.chestHalfW + 1} ${anchors.waistY - 16}, ${cx - anchors.waistHalfW} ${anchors.waistY - 8}, ${cx - anchors.waistHalfW} ${anchors.waistY}`,
    `C ${cx - anchors.waistHalfW} ${anchors.hipY - 16}, ${cx - anchors.hipHalfW} ${anchors.hipY - 10}, ${cx - anchors.hipHalfW} ${anchors.hipY}`,
    `C ${cx - anchors.hipHalfW} ${anchors.crotchY - 2}, ${cx - anchors.hipHalfW * 0.9} ${anchors.crotchY + 14}, ${cx - kneeOuterX} ${anchors.kneeY}`,
    `C ${cx - calfOuterX} ${calfY - 8}, ${cx - calfOuterX} ${calfY + 12}, ${cx - ankleOuterX} ${ankleJointY}`,
    `C ${cx - footOuterX} ${anchors.ankleY - 4}, ${cx - footOuterX} ${anchors.ankleY}, ${cx - ankleOuterX + 2} ${anchors.ankleY}`,
    `L ${cx - footInnerX} ${anchors.ankleY}`,
    `C ${cx - footInnerX - 1} ${anchors.ankleY - 4}, ${cx - ankleInnerX} ${ankleJointY + 2}, ${cx - ankleInnerX} ${ankleJointY}`,
    `C ${cx - calfInnerX} ${calfY + 8}, ${cx - calfInnerX - 2} ${calfY - 10}, ${cx - kneeInnerX} ${anchors.kneeY}`,
    `C ${cx - kneeInnerX - 2} ${anchors.crotchY + 34}, ${cx - 4} ${anchors.crotchY + 8}, ${cx} ${anchors.crotchY + 4}`,
    `C ${cx + 4} ${anchors.crotchY + 8}, ${cx + kneeInnerX + 2} ${anchors.crotchY + 34}, ${cx + kneeInnerX} ${anchors.kneeY}`,
    `C ${cx + calfInnerX + 2} ${calfY - 10}, ${cx + calfInnerX} ${calfY + 8}, ${cx + ankleInnerX} ${ankleJointY}`,
    `C ${cx + ankleInnerX} ${ankleJointY + 2}, ${cx + footInnerX + 1} ${anchors.ankleY - 4}, ${cx + footInnerX} ${anchors.ankleY}`,
    `L ${cx + ankleOuterX - 2} ${anchors.ankleY}`,
    `C ${cx + footOuterX} ${anchors.ankleY}, ${cx + footOuterX} ${anchors.ankleY - 4}, ${cx + ankleOuterX} ${ankleJointY}`,
    `C ${cx + calfOuterX} ${calfY + 12}, ${cx + calfOuterX} ${calfY - 8}, ${cx + kneeOuterX} ${anchors.kneeY}`,
    `C ${cx + anchors.hipHalfW * 0.9} ${anchors.crotchY + 14}, ${cx + anchors.hipHalfW} ${anchors.crotchY - 2}, ${cx + anchors.hipHalfW} ${anchors.hipY}`,
    `C ${cx + anchors.hipHalfW} ${anchors.hipY - 10}, ${cx + anchors.waistHalfW} ${anchors.hipY - 16}, ${cx + anchors.waistHalfW} ${anchors.waistY}`,
    `C ${cx + anchors.waistHalfW} ${anchors.waistY - 8}, ${cx + anchors.chestHalfW - 1} ${anchors.waistY - 16}, ${cx + anchors.chestHalfW} ${anchors.chestY + 4}`,
    `C ${cx + anchors.chestHalfW + 1} ${anchors.chestY - 4}, ${cx + anchors.shoulderHalfW} ${anchors.chestY - 10}, ${cx + anchors.shoulderHalfW} ${anchors.shoulderY + 7}`,
    `C ${cx + anchors.shoulderHalfW} ${anchors.shoulderY + 1}, ${cx + anchors.shoulderHalfW * 0.62} ${anchors.shoulderY - 1}, ${cx + neckHalf + 2} ${anchors.shoulderY - 2}`,
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

      {/* Brazos y manos anatómicas */}
      <g fill={`url(#${patternPrefix}-limb-grad)`} stroke="var(--mannequin-stroke)" strokeWidth="1.15" strokeLinejoin="round">
        <path d={buildArmPath(-1)} />
        <path d={buildArmPath(1)} />
      </g>

      {/* Cuello */}
      <path
        d={neckPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.1"
      />
      {/* Sombra sutil bajo el mentón */}
      <ellipse
        cx={cx}
        cy={chinY + 2}
        rx={neckHalf * 0.92}
        ry={5}
        fill={`url(#${patternPrefix}-neck-shadow)`}
      />

      {/* Torso y piernas esculpidas */}
      <path
        d={torsoAndLegsPath}
        fill={`url(#${patternPrefix}-body-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        data-avatar-body="front"
      />

      {/* Detalles anatómicos sutiles (clavículas, rodillas) */}
      <g fill="none" stroke="var(--mannequin-detail)" strokeWidth="0.95" strokeLinecap="round">
        <path
          d={`M ${cx - anchors.shoulderHalfW * 0.52} ${anchors.shoulderY + 9} Q ${cx - 10} ${anchors.shoulderY + 13} ${cx - 3} ${anchors.shoulderY + 10}`}
        />
        <path
          d={`M ${cx + anchors.shoulderHalfW * 0.52} ${anchors.shoulderY + 9} Q ${cx + 10} ${anchors.shoulderY + 13} ${cx + 3} ${anchors.shoulderY + 10}`}
        />
        <path
          d={`M ${cx - kneeOuterX + 5} ${anchors.kneeY + 1} Q ${cx - (kneeOuterX + kneeInnerX) * 0.5} ${anchors.kneeY + 5} ${cx - kneeInnerX - 4} ${anchors.kneeY + 1}`}
        />
        <path
          d={`M ${cx + kneeInnerX + 4} ${anchors.kneeY + 1} Q ${cx + (kneeOuterX + kneeInnerX) * 0.5} ${anchors.kneeY + 5} ${cx + kneeOuterX - 5} ${anchors.kneeY + 1}`}
        />
      </g>

      {/* Orejas sutiles + Cabeza escultórica */}
      <ellipse
        cx={cx - headRx * 0.98}
        cy={anchors.headCenterY + 2}
        rx={2.6}
        ry={5.2}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.95"
      />
      <ellipse
        cx={cx + headRx * 0.98}
        cy={anchors.headCenterY + 2}
        rx={2.6}
        ry={5.2}
        fill={`url(#${patternPrefix}-limb-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="0.95"
      />
      <path
        d={headPath}
        fill={`url(#${patternPrefix}-head-grad)`}
        stroke="var(--mannequin-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Prendas en capas */}
      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <PantsTemplate
              anchors={anchors}
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
            <TshirtTemplate
              anchors={anchors}
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
            <PantsTemplate
              anchors={anchors}
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
