import type { BodyModel, FitReport } from '@luca/domain';
import { HEATMAP_TOKENS } from '@/design-system/tokens';
import type { M2GarmentCategory } from '../store';
import { AVATAR_VIEWBOX, computeFrontAvatarAnchors } from './anchors';
import { getHeatmapPatternId } from './heatmapMeta';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { PantsTemplate } from './PantsTemplate';
import { TshirtTemplate } from './TshirtTemplate';

export interface FrontAvatarCanvasProps {
  model: BodyModel;
  garmentCategory: M2GarmentCategory;
  fitReport: FitReport | null;
  showHeatmap: boolean;
}

export function FrontAvatarCanvas({
  model,
  garmentCategory,
  fitReport,
  showHeatmap,
}: FrontAvatarCanvasProps) {
  const anchors = computeFrontAvatarAnchors(model);
  const cx = anchors.centerX;

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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[320px] rounded-[var(--radius-md)] border border-border bg-bg p-3">
        <svg
          viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Avatar paramétrico de frente con mapa de calor de calce"
        >
          <HeatmapPatternDefs />

          {/* Eje central de simetría */}
          <line
            x1={cx}
            y1={AVATAR_VIEWBOX.topPadding}
            x2={cx}
            y2={anchors.ankleY}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Cabeza */}
          <circle
            cx={cx}
            cy={anchors.headCenterY}
            r={anchors.headRadius}
            fill="var(--surface)"
            stroke="var(--muted)"
            strokeWidth="1.5"
          />

          {/* Silueta corporal paramétrica */}
          <path
            d={torsoPath}
            fill="var(--surface)"
            stroke="var(--muted)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            data-avatar-body="front"
          />

          {/* Prenda activa */}
          {fitReport && garmentCategory === 'tshirt' && (
            <TshirtTemplate anchors={anchors} fitReport={fitReport} showHeatmap={showHeatmap} />
          )}
          {fitReport && garmentCategory === 'pants' && (
            <PantsTemplate anchors={anchors} fitReport={fitReport} showHeatmap={showHeatmap} />
          )}
        </svg>
      </div>

      {/* Leyenda accesible del mapa de calor (color + patrón + etiqueta) */}
      <div
        aria-label="Leyenda del mapa de calor"
        className="flex w-full flex-wrap items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2"
      >
        {HEATMAP_TOKENS.map((token) => (
          <div key={token.state} className="flex items-center gap-1.5 text-xs text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <HeatmapPatternDefs prefix={`legend-${token.state}`} />
              <rect
                x="1"
                y="1"
                width="14"
                height="14"
                rx="3"
                fill={`url(#${getHeatmapPatternId(token.state, `legend-${token.state}`)})`}
                stroke={token.hex}
                strokeWidth="1.5"
              />
            </svg>
            <span>{token.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
