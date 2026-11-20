import { useRef, type TouchEvent } from 'react';
import type { AvatarView, BodyModel, FitReport } from '@luca/domain';
import { Button } from '@/design-system/components/Button';
import { HEATMAP_TOKENS } from '@/design-system/tokens';
import type { M2GarmentCategory, ViewerMode } from '../store';
import { BackAvatarSvg } from './BackAvatarSvg';
import { FrontAvatarSvg, type OutfitLayerOverlay } from './FrontAvatarSvg';
import { getHeatmapPatternId } from './heatmapMeta';
import { HeatmapPatternDefs } from './heatmapPatterns';
import { SideAvatarSvg } from './SideAvatarSvg';

const SINGLE_VIEWS: readonly AvatarView[] = ['front', 'side', 'back'];

const VIEW_TABS: readonly { id: ViewerMode; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'side', label: 'Perfil' },
  { id: 'back', label: 'Espalda' },
  { id: 'all', label: '3 vistas' },
];

export interface AvatarViewerProps {
  model: BodyModel;
  garmentCategory: M2GarmentCategory;
  fitReport: FitReport | null;
  showHeatmap: boolean;
  garmentColorHex?: string;
  outfitLayers?: OutfitLayerOverlay;
  viewMode: ViewerMode;
  onChangeViewMode: (mode: ViewerMode) => void;
}

export function AvatarViewer({
  model,
  garmentCategory,
  fitReport,
  showHeatmap,
  garmentColorHex,
  outfitLayers,
  viewMode,
  onChangeViewMode,
}: AvatarViewerProps) {
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || viewMode === 'all') return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 40) return;

    const currentIdx = SINGLE_VIEWS.indexOf(viewMode);
    if (currentIdx === -1) return;

    const nextIdx =
      deltaX < 0
        ? (currentIdx + 1) % SINGLE_VIEWS.length
        : (currentIdx - 1 + SINGLE_VIEWS.length) % SINGLE_VIEWS.length;

    onChangeViewMode(SINGLE_VIEWS[nextIdx]!);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Selector de vistas: Frente | Perfil | Espalda | 3 vistas (T5.6) */}
      <div
        role="group"
        aria-label="Selector de vistas del avatar"
        className="flex w-full flex-wrap items-center justify-center gap-1.5"
      >
        {VIEW_TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={viewMode === tab.id ? 'primary' : 'outline'}
            aria-pressed={viewMode === tab.id}
            onClick={() => onChangeViewMode(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Lienzo(s) con soporte de deslizamiento horizontal táctil en móvil */}
      <div
        data-testid="avatar-swipe-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={
          viewMode === 'all'
            ? 'grid w-full grid-cols-1 gap-3 sm:grid-cols-3'
            : 'flex w-full justify-center'
        }
      >
        {(viewMode === 'front' || viewMode === 'all') && (
          <FrontAvatarSvg
            model={model}
            garmentCategory={garmentCategory}
            fitReport={fitReport}
            showHeatmap={showHeatmap}
            garmentColorHex={garmentColorHex}
            outfitLayers={outfitLayers}
            compact={viewMode === 'all'}
          />
        )}
        {(viewMode === 'side' || viewMode === 'all') && (
          <SideAvatarSvg
            model={model}
            garmentCategory={garmentCategory}
            fitReport={fitReport}
            showHeatmap={showHeatmap}
            garmentColorHex={garmentColorHex}
            outfitLayers={outfitLayers}
            compact={viewMode === 'all'}
          />
        )}
        {(viewMode === 'back' || viewMode === 'all') && (
          <BackAvatarSvg
            model={model}
            garmentCategory={garmentCategory}
            fitReport={fitReport}
            showHeatmap={showHeatmap}
            garmentColorHex={garmentColorHex}
            outfitLayers={outfitLayers}
            compact={viewMode === 'all'}
          />
        )}
      </div>

      {viewMode !== 'all' && (
        <p className="text-center text-[11px] text-muted md:hidden">
          Desliza horizontalmente para alternar entre frente, perfil y espalda.
        </p>
      )}

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
