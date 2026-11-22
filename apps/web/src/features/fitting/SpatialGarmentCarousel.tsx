import { memo, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import type { GarmentCategory } from '@luca/domain';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORY_LABELS } from '@/features/closet/types';
import { GarmentCardPreviewSvg } from './GarmentCardPreviewSvg';
import { isSafeDataImageUrl, type GarmentVisualMeta } from './svg/garmentVisuals';

export interface SpatialCarouselItem {
  readonly id: string;
  readonly source: 'closet' | 'quick';
  readonly closetGarmentId?: string;
  readonly category: GarmentCategory;
  readonly name: string;
  readonly brand?: string;
  readonly sizeLabel: string;
  readonly colorHex: string;
  readonly imageUrl?: string;
  readonly meta?: GarmentVisualMeta;
}

export interface SpatialGarmentCarouselProps {
  slot: 'upper' | 'lower';
  label: string;
  items: readonly SpatialCarouselItem[];
  activeItemId: string | null;
  onSelectItem: (item: SpatialCarouselItem) => void;
  /** 'arc' posiciona las tarjetas en perspectiva 3D a ambos lados del maniquí central; 'strip' usa franja compacta */
  layout: 'arc' | 'strip';
  /** Compacta las distancias laterales del arco 3D cuando se despliega un panel lateral derecho */
  compactArc?: boolean;
  sheenTick?: number;
}

function getCircularOffset(index: number, anchorIndex: number, total: number): number {
  if (total <= 1) return 0;
  let delta = index - anchorIndex;
  const half = total / 2;
  if (delta > half) delta -= total;
  if (delta < -half) delta += total;
  return delta;
}

function getArcSlotStyle(
  slotPos: number,
  side: -1 | 1,
  compact: boolean,
): {
  transform: string;
  opacity: number;
  zIndex: number;
  filter: string;
  pointerEvents: 'auto' | 'none';
} {
  const sign = side < 0 ? '-' : '+';
  const x1 = compact ? 174 : 210;
  const x2 = compact ? 276 : 352;
  const x3 = compact ? 348 : 460;
  const x4 = compact ? 385 : 510;
  const s1 = compact ? 0.91 : 1;
  const s2 = compact ? 0.72 : 0.79;
  const s3 = compact ? 0.56 : 0.62;

  if (slotPos === 1) {
    return {
      transform: `translate3d(calc(-50% ${sign} ${x1}px), -50%, 0) perspective(1300px) rotateY(${-side * 16}deg) scale(${s1})`,
      opacity: 1,
      zIndex: 24,
      filter: 'blur(0px)',
      pointerEvents: 'auto',
    };
  }
  if (slotPos === 2) {
    return {
      transform: `translate3d(calc(-50% ${sign} ${x2}px), calc(-50% + 4px), 0) perspective(1300px) translateZ(-110px) rotateY(${-side * 25}deg) scale(${s2})`,
      opacity: 0.94,
      zIndex: 18,
      filter: 'blur(0.95px)',
      pointerEvents: 'auto',
    };
  }
  if (slotPos === 3) {
    return {
      transform: `translate3d(calc(-50% ${sign} ${x3}px), calc(-50% + 8px), 0) perspective(1300px) translateZ(-210px) rotateY(${-side * 34}deg) scale(${s3})`,
      opacity: compact ? 0.45 : 0.64,
      zIndex: 12,
      filter: 'blur(2.6px)',
      pointerEvents: 'auto',
    };
  }
  return {
    transform: `translate3d(calc(-50% ${sign} ${x4}px), calc(-50% + 10px), 0) perspective(1300px) translateZ(-290px) rotateY(${-side * 34}deg) scale(0.48)`,
    opacity: 0,
    zIndex: 4,
    filter: 'blur(4.5px)',
    pointerEvents: 'none',
  };
}

export const SpatialGarmentCarousel = memo(function SpatialGarmentCarousel({
  slot,
  label,
  items,
  activeItemId,
  onSelectItem,
  layout,
  compactArc = false,
  sheenTick = 0,
}: SpatialGarmentCarouselProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  if (items.length === 0) return null;

  const foundActiveIndex = activeItemId ? items.findIndex((i) => i.id === activeItemId) : -1;
  const anchorIndex = foundActiveIndex >= 0 ? foundActiveIndex : fallbackIndex % items.length;

  const stepTo = (direction: -1 | 1) => {
    const nextIdx = (anchorIndex + direction + items.length) % items.length;
    setFallbackIndex(nextIdx);
    const target = items[nextIdx];
    if (target) onSelectItem(target);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 36) return;
    stepTo(deltaX < 0 ? 1 : -1);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, item: SpatialCarouselItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectItem(item);
    }
  };

  if (layout === 'strip') {
    return (
      <section
        aria-label={label}
        data-spatial-carousel={slot}
        className="flex w-full flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--rw-muted)]">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepTo(-1)}
              aria-label={`Anterior en carrusel ${slot === 'upper' ? 'superior' : 'inferior'}`}
              className="vf-glass inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink transition-transform hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => stepTo(1)}
              aria-label={`Siguiente en carrusel ${slot === 'upper' ? 'superior' : 'inferior'}`}
              className="vf-glass inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink transition-transform hover:scale-105 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          role="listbox"
          aria-label={label}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none]"
        >
          {items.map((item) => {
            const isActive = item.id === activeItemId;
            return (
              <div
                key={item.id}
                role="option"
                tabIndex={0}
                aria-selected={isActive}
                aria-label={`Seleccionar ${item.name} (${slot === 'upper' ? 'superior' : 'inferior'})`}
                onClick={() => onSelectItem(item)}
                onKeyDown={(event) => handleCardKeyDown(event, item)}
                className={`vf-glass-card relative flex w-[112px] shrink-0 cursor-pointer flex-col justify-between rounded-[20px] p-2.5 text-left transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                  isActive ? 'ring-2 ring-[var(--rw-cta)]' : ''
                }`}
              >
                <div className="flex h-[76px] w-full items-center justify-center">
                  {!item.meta?.visualSpec && isSafeDataImageUrl(item.imageUrl) ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      style={{ filter: 'drop-shadow(0 8px 10px rgba(40,30,20,0.22))' }}
                    />
                  ) : (
                    <GarmentCardPreviewSvg
                      category={item.category}
                      colorHex={item.colorHex}
                      meta={item.meta}
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  <span className="truncate text-[11px] font-semibold text-ink">{item.name}</span>
                  <span className="truncate text-[10px] text-muted">
                    {CATEGORY_LABELS[item.category]} · {item.sizeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Modo arco espacial 3D: las tarjetas flanquean a izquierda y derecha del maniquí central
  // Si el ítem activo pertenece a este carrusel, queda "puesto" en el maniquí y los demás lo rodean;
  // si no hay ítem activo en este carrusel, repartimos todos simétricamente a izquierda y derecha.
  const flankingEntries: { item: SpatialCarouselItem; side: -1 | 1; slotPos: number }[] = [];
  const otherItems = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.id !== activeItemId);

  const leftBucket: SpatialCarouselItem[] = [];
  const rightBucket: SpatialCarouselItem[] = [];

  for (const entry of otherItems) {
    const delta = getCircularOffset(entry.idx, anchorIndex, items.length);
    if (delta < 0) {
      leftBucket.push(entry.item);
    } else {
      rightBucket.push(entry.item);
    }
  }

  // Equilibra visualmente ambos flancos cuando hay pocas prendas (p. ej. 2–3 presets por fila)
  leftBucket.sort((a, b) => {
    const da = Math.abs(getCircularOffset(items.indexOf(a), anchorIndex, items.length));
    const db = Math.abs(getCircularOffset(items.indexOf(b), anchorIndex, items.length));
    return da - db;
  });
  rightBucket.sort((a, b) => {
    const da = Math.abs(getCircularOffset(items.indexOf(a), anchorIndex, items.length));
    const db = Math.abs(getCircularOffset(items.indexOf(b), anchorIndex, items.length));
    return da - db;
  });

  while (leftBucket.length === 0 && rightBucket.length > 1) {
    const moved = rightBucket.pop();
    if (moved) leftBucket.push(moved);
  }
  while (rightBucket.length === 0 && leftBucket.length > 1) {
    const moved = leftBucket.pop();
    if (moved) rightBucket.push(moved);
  }

  leftBucket.slice(0, 3).forEach((item, i) => {
    flankingEntries.push({ item, side: -1, slotPos: i + 1 });
  });
  rightBucket.slice(0, 3).forEach((item, i) => {
    flankingEntries.push({ item, side: 1, slotPos: i + 1 });
  });

  if (flankingEntries.length === 0) {
    return null;
  }

  const showArrows = items.length > 1;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-spatial-carousel={slot}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative flex h-[204px] w-full items-center justify-center overflow-visible sm:h-[218px]"
    >
      {/* Etiqueta sutil de fila en la esquina izquierda */}
      <span className="vf-glass pointer-events-none absolute left-2 top-1 z-30 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--vf-nav-muted-ink)]">
        {label}
      </span>

      {/* Botón circular anterior (estilo .arrow.glass) */}
      {showArrows && (
        <button
          type="button"
          onClick={() => stepTo(-1)}
          aria-label={`Anterior en carrusel ${slot === 'upper' ? 'superior' : 'inferior'}`}
          className="vf-glass absolute left-2 top-1/2 z-35 inline-flex h-[42px] w-[42px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink transition-transform duration-200 hover:scale-106 active:scale-94"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}

      {/* Tarjetas de vidrio en arco 3D flanqueando al maniquí central */}
      <div role="listbox" aria-label={label} className="contents">
        {flankingEntries.map(({ item, side, slotPos }) => {
          const style = getArcSlotStyle(slotPos, side, compactArc);
          return (
            <div
              key={item.id}
              role="option"
              tabIndex={0}
              aria-selected={false}
              aria-label={`Seleccionar ${item.name} (${slot === 'upper' ? 'superior' : 'inferior'})`}
              onClick={() => onSelectItem(item)}
              onKeyDown={(event) => handleCardKeyDown(event, item)}
              style={style}
              className="vf-glass-card vf-arc-card group absolute left-1/2 top-1/2 flex h-[192px] w-[142px] cursor-pointer flex-col justify-between rounded-[22px] p-2.5 text-left sm:h-[204px] sm:w-[154px] sm:p-3"
            >
              {sheenTick > 0 && (
                <span
                  key={sheenTick}
                  aria-hidden="true"
                  className="vf-card-sheen pointer-events-none absolute inset-0"
                />
              )}
              <div className="flex h-[118px] w-full items-center justify-center p-1 transition-transform duration-300 group-hover:scale-[1.04] sm:h-[128px]">
                {!item.meta?.visualSpec && isSafeDataImageUrl(item.imageUrl) ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    style={{ filter: 'drop-shadow(0 12px 12px rgba(40,30,20,0.22))' }}
                  />
                ) : (
                  <GarmentCardPreviewSvg
                    category={item.category}
                    colorHex={item.colorHex}
                    meta={item.meta}
                    className="h-full w-full"
                  />
                )}
              </div>

              <div className="flex flex-col gap-0.5 px-0.5">
                <span className="truncate text-[12.5px] font-semibold leading-tight text-ink">
                  {item.name}
                </span>
                <span className="flex items-center justify-between gap-1 text-[11px] font-medium text-muted">
                  <span className="truncate">
                    {item.source === 'closet' ? item.brand || 'Mi clóset' : CATEGORY_LABELS[item.category]}
                  </span>
                  <span className="shrink-0 tabular-nums font-bold text-ink">{item.sizeLabel}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón circular siguiente (estilo .arrow.glass) */}
      {showArrows && (
        <button
          type="button"
          onClick={() => stepTo(1)}
          aria-label={`Siguiente en carrusel ${slot === 'upper' ? 'superior' : 'inferior'}`}
          className="vf-glass absolute right-2 top-1/2 z-35 inline-flex h-[42px] w-[42px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ink transition-transform duration-200 hover:scale-106 active:scale-94"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
