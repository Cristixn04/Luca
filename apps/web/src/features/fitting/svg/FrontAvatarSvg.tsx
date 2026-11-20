import type { BodyModel, FitReport } from '@luca/domain';
import { Badge } from '@/design-system/components/Badge';
import type { M2GarmentCategory } from '../store';
import { AVATAR_VIEWBOX, computeFrontAvatarAnchors } from './anchors';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { PantsTemplate, type LowerGarmentVariant } from './PantsTemplate';
import { TshirtTemplate, type UpperGarmentVariant } from './TshirtTemplate';

export interface OutfitLayerOverlay {
  readonly topFitReport?: FitReport | null;
  readonly topColorHex?: string;
  readonly topVariant?: UpperGarmentVariant;
  readonly bottomFitReport?: FitReport | null;
  readonly bottomColorHex?: string;
  readonly bottomVariant?: LowerGarmentVariant;
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
  outfitLayers,
  compact = false,
  frameless = false,
  patternIdSuffix,
}: SingleAvatarViewProps) {
  const anchors = computeFrontAvatarAnchors(model);
  const cx = anchors.centerX;
  const patternPrefix = patternIdSuffix ? `front-${patternIdSuffix}` : 'front';

  const torsoPath = [
    `M ${cx - anchors.neckHalfW} ${anchors.neckY}`,
    `L ${cx - anchors.shoulderHalfW} ${anchors.shoulderY}`,
    `C ${cx - anchors.shoulderHalfW} ${anchors.chestY - 6}, ${cx - anchors.chestHalfW} ${anchors.chestY - 4}, ${cx - anchors.chestHalfW} ${anchors.chestY}`,
    `C ${cx - anchors.chestHalfW} ${anchors.waistY - 14}, ${cx - anchors.waistHalfW} ${anchors.waistY - 8}, ${cx - anchors.waistHalfW} ${anchors.waistY}`,
    `C ${cx - anchors.waistHalfW} ${anchors.hipY - 14}, ${cx - anchors.hipHalfW} ${anchors.hipY - 8}, ${cx - anchors.hipHalfW} ${anchors.hipY}`,
    `L ${cx - anchors.hipHalfW * 0.92} ${anchors.crotchY}`,
    `L ${cx - anchors.ankleHalfW - 10} ${anchors.ankleY}`,
    `L ${cx - 8} ${anchors.ankleY}`,
    `L ${cx - 3} ${anchors.crotchY + 4}`,
    `L ${cx + 3} ${anchors.crotchY + 4}`,
    `L ${cx + 8} ${anchors.ankleY}`,
    `L ${cx + anchors.ankleHalfW + 10} ${anchors.ankleY}`,
    `L ${cx + anchors.hipHalfW * 0.92} ${anchors.crotchY}`,
    `L ${cx + anchors.hipHalfW} ${anchors.hipY}`,
    `C ${cx + anchors.hipHalfW} ${anchors.hipY - 8}, ${cx + anchors.waistHalfW} ${anchors.hipY - 14}, ${cx + anchors.waistHalfW} ${anchors.waistY}`,
    `C ${cx + anchors.waistHalfW} ${anchors.waistY - 8}, ${cx + anchors.chestHalfW} ${anchors.waistY - 14}, ${cx + anchors.chestHalfW} ${anchors.chestY}`,
    `C ${cx + anchors.chestHalfW} ${anchors.chestY - 4}, ${cx + anchors.shoulderHalfW} ${anchors.chestY - 6}, ${cx + anchors.shoulderHalfW} ${anchors.shoulderY}`,
    `L ${cx + anchors.neckHalfW} ${anchors.neckY}`,
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

      {!frameless && (
        <line
          x1={cx}
          y1={AVATAR_VIEWBOX.topPadding}
          x2={cx}
          y2={anchors.ankleY}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      )}

      <circle
        cx={cx}
        cy={anchors.headCenterY}
        r={anchors.headRadius}
        fill="var(--surface)"
        stroke="var(--muted)"
        strokeWidth="1.5"
      />

      <path
        d={torsoPath}
        fill="var(--surface)"
        stroke="var(--muted)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        data-avatar-body="front"
      />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <PantsTemplate
              anchors={anchors}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
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
              variant={outfitLayers.topVariant}
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
