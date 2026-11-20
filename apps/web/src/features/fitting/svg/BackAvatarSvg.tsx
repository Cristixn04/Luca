import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX, computeFrontAvatarAnchors } from './anchors';
import { BackPantsTemplate } from './BackPantsTemplate';
import { BackTshirtTemplate } from './BackTshirtTemplate';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { HeatmapPatternDefs } from './heatmapPatterns';

export function BackAvatarSvg({
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
  const patternPrefix = patternIdSuffix ? `back-${patternIdSuffix}` : 'back';

  const backHalfW = Math.max(anchors.chestHalfW, (model.backWidthCm / 2) * anchors.scale);

  const torsoPath = [
    `M ${cx - anchors.neckHalfW} ${anchors.neckY}`,
    `L ${cx - anchors.shoulderHalfW} ${anchors.shoulderY}`,
    `C ${cx - anchors.shoulderHalfW} ${anchors.chestY - 6}, ${cx - backHalfW} ${anchors.chestY - 4}, ${cx - backHalfW} ${anchors.chestY}`,
    `C ${cx - backHalfW} ${anchors.waistY - 14}, ${cx - anchors.waistHalfW} ${anchors.waistY - 8}, ${cx - anchors.waistHalfW} ${anchors.waistY}`,
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
    `C ${cx + anchors.waistHalfW} ${anchors.waistY - 8}, ${cx + backHalfW} ${anchors.waistY - 14}, ${cx + backHalfW} ${anchors.chestY}`,
    `C ${cx + backHalfW} ${anchors.chestY - 4}, ${cx + anchors.shoulderHalfW} ${anchors.chestY - 6}, ${cx + anchors.shoulderHalfW} ${anchors.shoulderY}`,
    `L ${cx + anchors.neckHalfW} ${anchors.neckY}`,
    'Z',
  ].join(' ');

  const isBackEstimated = model.backWidthEstimated || model.backLengthEstimated;

  const svgNode = (
    <svg
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      className={frameless ? 'h-full w-auto max-w-full' : 'h-auto w-full'}
      role="img"
      aria-label="Avatar paramétrico de espalda con mapa de calor de calce"
    >
      <HeatmapPatternDefs prefix={patternPrefix} />

      {!frameless && (
        <line
          x1={cx}
          y1={anchors.neckY}
          x2={cx}
          y2={anchors.waistY}
          stroke="var(--border)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
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
        data-avatar-body="back"
      />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <BackPantsTemplate
              anchors={anchors}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
              variant={outfitLayers.bottomVariant}
            />
          )}
          {outfitLayers.topFitReport && (
            <BackTshirtTemplate
              model={model}
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
            <BackTshirtTemplate
              model={model}
              anchors={anchors}
              fitReport={fitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={garmentColorHex}
              variant={garmentCategory}
            />
          )}
          {fitReport && isLowerCategory(garmentCategory) && (
            <BackPantsTemplate
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
      data-avatar-view="back"
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
