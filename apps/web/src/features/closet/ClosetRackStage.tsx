import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Ruler,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type {
  GarmentColorHarmony,
  GarmentUsageMetrics,
  SizeRecommendation,
} from '@luca/domain';
import { Badge } from '@/design-system/components/Badge';
import { HangingGarmentVisual } from './HangingGarmentVisual';
import { CATEGORY_LABELS, STATUS_LABELS, type GarmentWithSizes } from './types';

export interface RackItemMeta {
  readonly item: GarmentWithSizes;
  readonly recommendation: SizeRecommendation | null;
  readonly harmony: GarmentColorHarmony | null;
  readonly usage: GarmentUsageMetrics | undefined;
  readonly wishlistUnlocks: number | undefined;
}

export interface ClosetRackStageProps {
  entries: readonly RackItemMeta[];
  spotlightId: string | null;
  onSelectSpotlight: (garmentId: string | null) => void;
  onOpenInFittingRoom: (item: GarmentWithSizes, recommendedSize?: string) => void;
  onOpenDetail: (garmentId: string) => void;
  onEdit: (item: GarmentWithSizes) => void;
  onDelete: (garmentId: string) => Promise<void>;
  onLogWear: (garmentId: string) => Promise<void>;
}

function formatPadIndex(index: number, total: number): string {
  const width = Math.max(2, String(total).length);
  return `${String(index + 1).padStart(width, '0')} / ${String(total).padStart(width, '0')}`;
}

export function ClosetRackStage({
  entries,
  spotlightId,
  onSelectSpotlight,
  onOpenInFittingRoom,
  onOpenDetail,
  onEdit,
  onDelete,
  onLogWear,
}: ClosetRackStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(1120);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [wearLoggedForId, setWearLoggedForId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((obsEntries) => {
      const width = obsEntries[0]?.contentRect.width;
      if (width && width > 0) {
        setStageWidth(width);
      }
    });
    observer.observe(el);
    setStageWidth(el.clientWidth || 1120);
    return () => observer.disconnect();
  }, []);

  const spotlightIndex = useMemo(
    () => (spotlightId ? entries.findIndex((e) => e.item.garment.id === spotlightId) : -1),
    [entries, spotlightId],
  );
  const spotlightEntry = spotlightIndex >= 0 ? entries[spotlightIndex]! : null;

  const hoveredIndex = useMemo(
    () => (hoveredId ? entries.findIndex((e) => e.item.garment.id === hoveredId) : -1),
    [entries, hoveredId],
  );
  const hoveredEntry = !spotlightEntry && hoveredIndex >= 0 ? entries[hoveredIndex]! : null;

  // Navegación por teclado cuando una prenda está seleccionada en spotlight
  useEffect(() => {
    if (!spotlightEntry || entries.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onSelectSpotlight(null);
      } else if (event.key === 'ArrowRight' && entries.length > 1) {
        event.preventDefault();
        const nextIdx = (spotlightIndex + 1) % entries.length;
        onSelectSpotlight(entries[nextIdx]!.item.garment.id);
      } else if (event.key === 'ArrowLeft' && entries.length > 1) {
        event.preventDefault();
        const prevIdx = (spotlightIndex - 1 + entries.length) % entries.length;
        onSelectSpotlight(entries[prevIdx]!.item.garment.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entries, onSelectSpotlight, spotlightEntry, spotlightIndex]);

  // Cálculo de posiciones sobre el riel metálico (estilo Offcut con separación de vecinos)
  const isCompactViewport = stageWidth < 680;
  const count = entries.length;
  const spreadPx = isCompactViewport ? 44 : count <= 3 ? 56 : 78;
  const hangerWidth = isCompactViewport ? 186 : 228;
  const hangerHeight = isCompactViewport ? 248 : 300;
  const minStep = isCompactViewport ? 94 : 96;
  const maxStep = isCompactViewport ? 132 : 138;
  const railPaddingX = isCompactViewport ? 96 : 148;

  const naturalTrackWidth =
    count <= 1
      ? stageWidth
      : Math.max(stageWidth, (count - 1) * minStep + railPaddingX * 2 + spreadPx * 2);
  const needsHorizontalScroll = naturalTrackWidth > stageWidth + 4;
  const trackWidth = needsHorizontalScroll ? naturalTrackWidth : Math.max(stageWidth, 320);

  const usableSpan = Math.max(trackWidth - railPaddingX * 2, 0);
  const step =
    count <= 1 ? 0 : Math.min(maxStep, Math.max(minStep, usableSpan / Math.max(count - 1, 1)));
  const totalSpan = count <= 1 ? 0 : (count - 1) * step;
  const startX = trackWidth / 2 - totalSpan / 2;

  const activeSpreadIdx = spotlightIndex >= 0 ? spotlightIndex : hoveredIndex;

  const getSlotLeft = (index: number): number => {
    const base = startX + index * step;
    if (activeSpreadIdx < 0) return base;
    if (index < activeSpreadIdx) return base - spreadPx;
    if (index > activeSpreadIdx) return base + spreadPx;
    return base;
  };

  const handleCycleSpotlight = (direction: -1 | 1) => {
    if (entries.length <= 1 || spotlightIndex < 0) return;
    const nextIdx = (spotlightIndex + direction + entries.length) % entries.length;
    setWearLoggedForId(null);
    onSelectSpotlight(entries[nextIdx]!.item.garment.id);
  };

  const scrollRackBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div
      ref={containerRef}
      data-testid="closet-rack-stage"
      className="relative flex min-h-[410px] w-full flex-1 flex-col justify-center sm:min-h-[455px]"
    >
      {/* RIEL METÁLICO + PRENDAS COLGADAS (se atenúa y desenfoca suavemente al abrir spotlight) */}
      <div
        className={`closet-rack-dim relative w-full ${spotlightEntry ? 'is-dimmed' : ''}`}
        aria-hidden={Boolean(spotlightEntry)}
      >
        {needsHorizontalScroll && !spotlightEntry && (
          <>
            <button
              type="button"
              aria-label="Desplazar perchero a la izquierda"
              onClick={() => scrollRackBy(-280)}
              className="vf-glass absolute left-2 top-[190px] z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition-transform hover:scale-105"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Desplazar perchero a la derecha"
              onClick={() => scrollRackBy(280)}
              className="vf-glass absolute right-2 top-[190px] z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition-transform hover:scale-105"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          onMouseLeave={() => setHoveredId(null)}
          className={`relative w-full ${
            needsHorizontalScroll ? 'overflow-x-auto pb-4' : 'overflow-visible'
          }`}
        >
          <div
            className="relative mx-auto"
            style={{
              width: `${trackWidth}px`,
              height: isCompactViewport ? '356px' : '396px',
            }}
          >
            {/* Riel cromado horizontal con tapas cilíndricas laterales */}
            <div
              className="closet-rail"
              style={{
                position: 'absolute',
                left: `${isCompactViewport ? 22 : 48}px`,
                right: `${isCompactViewport ? 22 : 48}px`,
                top: '36px',
              }}
              aria-hidden="true"
            />

            {/* Prendas colgadas con percha sobre el riel */}
            {entries.map((entry, idx) => {
              const { item, recommendation, harmony, usage } = entry;
              const { garment } = item;
              const isFace = !spotlightEntry && hoveredId === garment.id;
              const isVacated = spotlightId === garment.id;
              const leftPx = getSlotLeft(idx);

              return (
                <button
                  key={garment.id}
                  type="button"
                  data-closet-rack-item={garment.id}
                  tabIndex={spotlightEntry ? -1 : 0}
                  aria-label={`Seleccionar ${garment.name}`}
                  onMouseEnter={() => setHoveredId(garment.id)}
                  onFocus={() => setHoveredId(garment.id)}
                  onBlur={() => setHoveredId((prev) => (prev === garment.id ? null : prev))}
                  onClick={() => {
                    setHoveredId(null);
                    setWearLoggedForId(null);
                    onSelectSpotlight(garment.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '28px',
                    left: `${leftPx}px`,
                    width: `${hangerWidth}px`,
                    height: `${hangerHeight}px`,
                    marginLeft: `${-hangerWidth / 2}px`,
                    zIndex: isFace ? 25 : idx + 2,
                  }}
                  className={`closet-hanger-slot cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none ${
                    isFace ? 'is-face' : ''
                  } ${isVacated ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
                >
                  <div className="closet-hanger-body h-full w-full">
                    <HangingGarmentVisual item={item} className="h-full w-full" />
                  </div>
                  {/* Texto accesible cuando la prenda no muestra el rótulo flotante de hover */}
                  {!isFace && <span className="sr-only">{garment.name}</span>}
                  <span className="sr-only">
                    {garment.brand ? `${garment.brand} · ` : ''}
                    {recommendation ? `Talla sugerida ${recommendation.recommendedSize} · ` : ''}
                    {harmony ? `Afinidad paleta ${harmony.scorePercent} % · ` : ''}
                    {usage ? `${usage.wearCount} uso(s)` : ''}
                  </span>
                </button>
              );
            })}

            {/* Pie editorial flotante bajo la prenda en hover (estilo #cap de la referencia) */}
            {hoveredEntry && hoveredIndex >= 0 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-30 flex flex-col items-center text-center transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{
                  top: `${28 + hangerHeight + 10}px`,
                  left: `${getSlotLeft(hoveredIndex)}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="max-w-[260px] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--rw-ink)]">
                  {hoveredEntry.item.garment.name}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-[var(--rw-muted)]">
                  <span>
                    {hoveredEntry.item.garment.brand ||
                      CATEGORY_LABELS[hoveredEntry.item.garment.category]}
                  </span>
                  {hoveredEntry.item.garment.price !== undefined && (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">
                        ${hoveredEntry.item.garment.price.toFixed(0)}
                      </span>
                    </>
                  )}
                  {hoveredEntry.recommendation && (
                    <>
                      <span>·</span>
                      <span className="font-medium text-[var(--rw-ink)]">
                        Talla {hoveredEntry.recommendation.recommendedSize}
                      </span>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VISTA SPOTLIGHT AL SELECCIONAR UNA PRENDA (zoom frontal centrado + flechas + acciones) */}
      {spotlightEntry && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Prenda seleccionada: ${spotlightEntry.item.garment.name}`}
          data-testid="closet-spotlight"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-2 py-2"
        >
          {/* Fondo clicable para cerrar spotlight */}
          <div
            className="absolute inset-0 z-0 cursor-pointer"
            onClick={() => onSelectSpotlight(null)}
            aria-hidden="true"
          />

          {/* Botón cerrar superior derecho */}
          <button
            type="button"
            aria-label="Cerrar vista de prenda"
            onClick={() => onSelectSpotlight(null)}
            className="vf-glass absolute right-2 top-1 z-30 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink transition-transform hover:scale-105 sm:right-4"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cerrar
          </button>

          {/* Escenario central con flechas circulares izquierda/derecha y prenda ampliada */}
          <div className="relative z-20 flex w-full max-w-[740px] items-center justify-center gap-3 sm:gap-10">
            <button
              type="button"
              aria-label="Prenda anterior"
              disabled={entries.length <= 1}
              onClick={() => handleCycleSpotlight(-1)}
              className="vf-glass flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div
              key={spotlightEntry.item.garment.id}
              className="closet-spotlight-garment relative flex h-[270px] w-[220px] items-start justify-center sm:h-[330px] sm:w-[270px]"
            >
              <HangingGarmentVisual item={spotlightEntry.item} className="h-full w-full" />
            </div>

            <button
              type="button"
              aria-label="Siguiente prenda"
              disabled={entries.length <= 1}
              onClick={() => handleCycleSpotlight(1)}
              className="vf-glass flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Información editorial + botón "Ver calce y tallas" (solo visible al seleccionar) */}
          <div
            key={`meta-${spotlightEntry.item.garment.id}`}
            className="closet-spotlight-meta relative z-20 mt-2 flex max-w-[680px] flex-col items-center text-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-medium tabular-nums tracking-[0.16em] text-[var(--rw-muted)]">
                {formatPadIndex(spotlightIndex, entries.length)}
              </span>
              <Badge>{CATEGORY_LABELS[spotlightEntry.item.garment.category]}</Badge>
              <Badge
                variant={
                  spotlightEntry.item.garment.status === 'wishlist' ? 'accent' : 'neutral'
                }
              >
                {STATUS_LABELS[spotlightEntry.item.garment.status]}
              </Badge>
            </div>

            <h2 className="mt-1.5 font-display text-2xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-3xl">
              {spotlightEntry.item.garment.name}
            </h2>

            {/* Línea de metadatos clave en píldoras limpias */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs text-[var(--rw-muted)]">
              <span>{spotlightEntry.item.garment.brand || 'Sin marca'}</span>
              <span>·</span>
              <span className="tabular-nums">{spotlightEntry.item.sizes.length} talla(s)</span>
              {spotlightEntry.item.garment.price !== undefined && (
                <>
                  <span>·</span>
                  <span className="tabular-nums font-medium text-[var(--rw-ink)]">
                    ${spotlightEntry.item.garment.price.toFixed(0)}
                  </span>
                </>
              )}
              {spotlightEntry.recommendation && (
                <span
                  data-testid="spotlight-recommended-size"
                  className="vf-glass ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-accent"
                >
                  Talla sugerida: {spotlightEntry.recommendation.recommendedSize}
                </span>
              )}
              {spotlightEntry.harmony && (
                <span
                  data-testid={`garment-harmony-${spotlightEntry.item.garment.id}`}
                  className="vf-glass inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-ink"
                >
                  Afinidad paleta: {spotlightEntry.harmony.scorePercent} %
                </span>
              )}
              {spotlightEntry.item.garment.status === 'wishlist' &&
                spotlightEntry.wishlistUnlocks !== undefined && (
                  <span className="vf-glass inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-accent">
                    Desbloquea {spotlightEntry.wishlistUnlocks} outfit(s)
                  </span>
                )}
              {spotlightEntry.item.garment.status === 'owned' && spotlightEntry.usage && (
                <span className="vf-glass inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] tabular-nums text-muted">
                  {spotlightEntry.usage.wearCount} uso(s)
                  {spotlightEntry.usage.cpw !== null
                    ? ` · $${spotlightEntry.usage.cpw.toFixed(0)}/uso`
                    : ''}
                  {spotlightEntry.usage.isOrphan ? ' · Huérfana' : ''}
                </span>
              )}
            </div>

            {/* Acciones de la prenda seleccionada */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {/* CTA principal: abre esta prenda directamente en el Probador */}
              <button
                type="button"
                onClick={() =>
                  onOpenInFittingRoom(
                    spotlightEntry.item,
                    spotlightEntry.recommendation?.recommendedSize,
                  )
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--rw-cta)] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.1em] text-[var(--rw-cta-ink)] shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                Ver calce y tallas
              </button>

              {/* Acceso a ficha completa (tabla comparativa, CPW, similares, ΔE₀₀) */}
              <button
                type="button"
                onClick={() => onOpenDetail(spotlightEntry.item.garment.id)}
                className="vf-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-ink transition-transform hover:scale-[1.02]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Ficha y detalles
              </button>

              {spotlightEntry.item.garment.status === 'owned' && (
                <button
                  type="button"
                  onClick={async () => {
                    await onLogWear(spotlightEntry.item.garment.id);
                    setWearLoggedForId(spotlightEntry.item.garment.id);
                  }}
                  className="vf-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-medium text-ink transition-transform hover:scale-[1.02]"
                >
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {wearLoggedForId === spotlightEntry.item.garment.id
                    ? 'Uso registrado'
                    : 'Usé hoy'}
                </button>
              )}

              <button
                type="button"
                aria-label="Editar prenda"
                title="Editar"
                onClick={() => onEdit(spotlightEntry.item)}
                className="vf-glass inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink transition-transform hover:scale-105"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label="Eliminar prenda"
                title="Eliminar"
                onClick={async () => {
                  const currentId = spotlightEntry.item.garment.id;
                  const nextId =
                    entries.length > 1
                      ? entries[(spotlightIndex + 1) % entries.length]!.item.garment.id
                      : null;
                  await onDelete(currentId);
                  onSelectSpotlight(nextId === currentId ? null : nextId);
                }}
                className="vf-glass inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#C2410C] transition-transform hover:scale-105"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
