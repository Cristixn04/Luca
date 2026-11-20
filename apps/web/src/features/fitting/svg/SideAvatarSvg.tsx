import { Badge } from '@/design-system/components/Badge';
import { AVATAR_VIEWBOX } from './anchors';
import { isLowerCategory, type SingleAvatarViewProps } from './FrontAvatarSvg';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { computeSideAvatarAnchors } from './sideAnchors';
import { SidePantsTemplate } from './SidePantsTemplate';
import { SideTshirtTemplate } from './SideTshirtTemplate';

export function SideAvatarSvg({
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
  const anchors = computeSideAvatarAnchors(model);
  const cx = anchors.centerX;
  const patternPrefix = patternIdSuffix ? `side-${patternIdSuffix}` : 'side';

  const profilePath = [
    `M ${cx - 6} ${anchors.neckY}`,
    `L ${anchors.shoulderBackX} ${anchors.shoulderY}`,
    `C ${anchors.chestBackX - 2} ${anchors.chestY - 8}, ${anchors.chestBackX} ${anchors.chestY + 8}, ${anchors.waistBackX} ${anchors.waistY}`,
    `C ${anchors.hipBackX - 2} ${anchors.hipY - 8}, ${anchors.hipBackX} ${anchors.hipY + 10}, ${anchors.legBackX} ${anchors.crotchY}`,
    `L ${anchors.legBackX + 2} ${anchors.ankleY}`,
    `L ${anchors.legFrontX - 2} ${anchors.ankleY}`,
    `L ${anchors.legFrontX} ${anchors.crotchY}`,
    `C ${anchors.hipFrontX} ${anchors.hipY + 8}, ${anchors.hipFrontX} ${anchors.hipY - 8}, ${anchors.waistFrontX} ${anchors.waistY}`,
    `C ${anchors.chestFrontX + 2} ${anchors.chestY + 8}, ${anchors.chestFrontX + 2} ${anchors.chestY - 8}, ${anchors.shoulderFrontX} ${anchors.shoulderY}`,
    `L ${cx + 6} ${anchors.neckY}`,
    'Z',
  ].join(' ');

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
        cx={cx + 2}
        cy={anchors.headCenterY}
        r={anchors.headRadius}
        fill="var(--surface)"
        stroke="var(--muted)"
        strokeWidth="1.5"
      />

      <path
        d={profilePath}
        fill="var(--surface)"
        stroke="var(--muted)"
        strokeWidth="1.5"
        strokeDasharray={anyDepthEstimated ? '5 3' : undefined}
        strokeLinejoin="round"
        data-avatar-body="side"
      />

      {outfitLayers ? (
        <>
          {outfitLayers.bottomFitReport && (
            <SidePantsTemplate
              model={model}
              anchors={anchors}
              fitReport={outfitLayers.bottomFitReport}
              showHeatmap={showHeatmap}
              patternPrefix={patternPrefix}
              garmentColorHex={outfitLayers.bottomColorHex}
              variant={outfitLayers.bottomVariant}
            />
          )}
          {outfitLayers.topFitReport && (
            <SideTshirtTemplate
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
            <SideTshirtTemplate
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
            <SidePantsTemplate
              model={model}
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
      data-avatar-view="side"
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
