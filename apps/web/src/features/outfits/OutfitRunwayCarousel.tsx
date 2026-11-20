import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type TouchEvent,
} from 'react';
import {
  evaluateGarmentFit,
  getGarmentSlot,
  type BodyModel,
  type OutfitProposal,
} from '@luca/domain';
import { ArrowLeft, ArrowRight, Pause, Play, X } from 'lucide-react';
import type { ViewerMode } from '@/features/fitting/store';
import { BackAvatarSvg } from '@/features/fitting/svg/BackAvatarSvg';
import { FrontAvatarSvg, type OutfitLayerOverlay } from '@/features/fitting/svg/FrontAvatarSvg';
import { SideAvatarSvg } from '@/features/fitting/svg/SideAvatarSvg';

const VIEW_OPTIONS: readonly { id: ViewerMode; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'side', label: 'Perfil' },
  { id: 'back', label: 'Espalda' },
  { id: 'all', label: '3 vistas' },
];

function buildOutfitLayers(
  proposal: OutfitProposal,
  bodyModel: BodyModel | null,
): OutfitLayerOverlay | undefined {
  if (!bodyModel) return undefined;

  const topItem =
    proposal.items.find((i) => getGarmentSlot(i.category) === 'outerwear') ??
    proposal.items.find((i) => getGarmentSlot(i.category) === 'top') ??
    proposal.items.find((i) => getGarmentSlot(i.category) === 'one_piece');

  const bottomItem = proposal.items.find((i) => getGarmentSlot(i.category) === 'bottom');

  const topFitReport = topItem?.flatMeasuresCm
    ? evaluateGarmentFit(bodyModel, {
        category: 'tshirt',
        sizeLabel: 'M',
        elasticity: topItem.elasticity,
        flatMeasuresCm: topItem.flatMeasuresCm,
      })
    : topItem
      ? evaluateGarmentFit(bodyModel, {
          category: 'tshirt',
          sizeLabel: 'M',
          elasticity: topItem.elasticity,
          flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 },
        })
      : null;

  const bottomFitReport = bottomItem?.flatMeasuresCm
    ? evaluateGarmentFit(bodyModel, {
        category: 'pants',
        sizeLabel: '32',
        elasticity: bottomItem.elasticity,
        flatMeasuresCm: bottomItem.flatMeasuresCm,
      })
    : bottomItem
      ? evaluateGarmentFit(bodyModel, {
          category: 'pants',
          sizeLabel: '32',
          elasticity: bottomItem.elasticity,
          flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 79 },
        })
      : null;

  return {
    topFitReport,
    topColorHex: topItem?.dominantColorHex ?? '#1F5F6B',
    topVariant:
      topItem &&
      (topItem.category === 'tshirt' ||
        topItem.category === 'long_sleeve' ||
        topItem.category === 'jacket' ||
        topItem.category === 'dress')
        ? topItem.category
        : 'tshirt',
    bottomFitReport,
    bottomColorHex: bottomItem?.dominantColorHex ?? '#2B4263',
    bottomVariant:
      bottomItem &&
      (bottomItem.category === 'pants' ||
        bottomItem.category === 'shorts' ||
        bottomItem.category === 'skirt')
        ? bottomItem.category
        : 'pants',
  };
}

function getCircularOffset(index: number, activeIndex: number, total: number): number {
  if (total <= 1) return 0;
  let delta = index - activeIndex;
  const half = total / 2;
  if (delta > half) delta -= total;
  if (delta < -half) delta += total;
  return delta;
}

function getRingStyle(
  delta: number,
  isZoomed: boolean,
): {
  transform: string;
  opacity: number;
  zIndex: number;
  filter: string;
  pointerEvents: 'auto' | 'none';
} {
  if (delta === 0) {
    return {
      transform: `translate3d(-50%, ${isZoomed ? '-4px' : '0px'}, 0) scale(${isZoomed ? 1.06 : 1})`,
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
      pointerEvents: 'auto',
    };
  }

  if (isZoomed) {
    const sign = delta < 0 ? -1 : 1;
    return {
      transform: `translate3d(calc(-50% + ${sign * 150}%), -28px, 0) scale(0.8)`,
      opacity: 0,
      zIndex: 5,
      filter: 'blur(4px)',
      pointerEvents: 'none',
    };
  }

  const abs = Math.abs(delta);
  const sign = delta < 0 ? -1 : 1;

  if (abs === 1) {
    return {
      transform: `translate3d(calc(-50% + ${sign * 96}%), -20px, 0) scale(0.84)`,
      opacity: 0.94,
      zIndex: 20,
      filter: 'blur(1.8px)',
      pointerEvents: 'auto',
    };
  }

  if (abs === 2) {
    return {
      transform: `translate3d(calc(-50% + ${sign * 172}%), -42px, 0) scale(0.70)`,
      opacity: 0.72,
      zIndex: 10,
      filter: 'blur(3.6px)',
      pointerEvents: 'auto',
    };
  }

  return {
    transform: `translate3d(calc(-50% + ${sign * 124}%), -62px, 0) scale(0.56)`,
    opacity: 0.22,
    zIndex: 5,
    filter: 'blur(5.4px)',
    pointerEvents: 'none',
  };
}

function getPinPosition(category: OutfitProposal['items'][number]['category'], index: number): {
  top: string;
  left: string;
} {
  const slot = getGarmentSlot(category);
  if (slot === 'outerwear') return { top: '30%', left: '66%' };
  if (slot === 'top' || slot === 'one_piece') return { top: '34%', left: '34%' };
  if (slot === 'bottom') return { top: '63%', left: '58%' };
  return { top: `${36 + index * 14}%`, left: '50%' };
}

export interface OutfitRunwayCarouselProps {
  proposals: readonly OutfitProposal[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  bodyModel: BodyModel | null;
  occasionLabel: string;
  temperatureC: number;
  viewMode: ViewerMode;
  onChangeViewMode: (mode: ViewerMode) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  highlightedItemId: string | null;
  onHighlightItem: (id: string | null) => void;
}

export function OutfitRunwayCarousel({
  proposals,
  selectedIndex,
  onSelectIndex,
  bodyModel,
  occasionLabel,
  temperatureC,
  viewMode,
  onChangeViewMode,
  showHeatmap,
  onToggleHeatmap,
  highlightedItemId,
  onHighlightItem,
}: OutfitRunwayCarouselProps) {
  const safeIndex = Math.min(selectedIndex, Math.max(0, proposals.length - 1));
  const activeProposal = proposals[safeIndex] ?? null;

  const [isZoomed, setIsZoomed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStageHovered, setIsStageHovered] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const layersByProposalId = useMemo(() => {
    const map = new Map<string, OutfitLayerOverlay | undefined>();
    for (const proposal of proposals) {
      map.set(proposal.id, buildOutfitLayers(proposal, bodyModel));
    }
    return map;
  }, [bodyModel, proposals]);

  const goPrev = () => {
    if (proposals.length <= 1) return;
    setIsPlaying(false);
    onSelectIndex((safeIndex - 1 + proposals.length) % proposals.length);
  };

  const goNext = () => {
    if (proposals.length <= 1) return;
    setIsPlaying(false);
    onSelectIndex((safeIndex + 1) % proposals.length);
  };

  // Autoplay opt-in (WCAG 2.2.2): static by default, pauses on hover/zoom/reduced-motion
  useEffect(() => {
    if (!isPlaying || isZoomed || isStageHovered || proposals.length <= 1) {
      return;
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      onSelectIndex((safeIndex + 1) % proposals.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPlaying, isStageHovered, isZoomed, onSelectIndex, proposals.length, safeIndex]);

  const handleStageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    } else if (event.key === 'Escape' && isZoomed) {
      event.preventDefault();
      setIsZoomed(false);
      onHighlightItem(null);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const stageEl = stageRef.current;
    const cursorEl = cursorRef.current;
    if (!stageEl || !cursorEl) return;

    const rect = stageEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cursorEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    cursorEl.classList.add('is-visible');
  };

  const handlePointerLeave = () => {
    setIsStageHovered(false);
    cursorRef.current?.classList.remove('is-visible');
    dragStartXRef.current = null;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || isZoomed || viewMode === 'all') return;
    dragStartXRef.current = event.clientX;
    didDragRef.current = false;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    const deltaX = event.clientX - dragStartXRef.current;
    dragStartXRef.current = null;

    if (Math.abs(deltaX) >= 48) {
      didDragRef.current = true;
      if (deltaX < 0) goNext();
      else goPrev();
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || isZoomed || viewMode === 'all') return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) goNext();
    else goPrev();
  };

  const renderFigureSvg = (
    proposal: OutfitProposal,
    mode: Exclude<ViewerMode, 'all'>,
    suffix: string,
  ) => {
    if (!bodyModel) return null;
    const layers = layersByProposalId.get(proposal.id);
    const commonProps = {
      model: bodyModel,
      garmentCategory: 'tshirt' as const,
      fitReport: null,
      showHeatmap,
      outfitLayers: layers,
      frameless: true,
      patternIdSuffix: suffix,
    };

    if (mode === 'side') return <SideAvatarSvg {...commonProps} />;
    if (mode === 'back') return <BackAvatarSvg {...commonProps} />;
    return <FrontAvatarSvg {...commonProps} />;
  };

  const singleViewMode: Exclude<ViewerMode, 'all'> = viewMode === 'all' ? 'front' : viewMode;
  const lookNumber = String(safeIndex + 1).padStart(2, '0');

  return (
    <div className="flex flex-col justify-between bg-[var(--rw-stage)]/70">
      {/* Cabecera editorial superior del escenario */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-7 sm:pt-5">
        {isZoomed && activeProposal ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--rw-muted)]">
              Look {lookNumber}
            </span>
            <p className="font-display text-xl font-normal tracking-tight text-[var(--rw-ink)] sm:text-2xl">
              Opción {safeIndex + 1} · {occasionLabel}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <h1
              id="outfits-heading"
              className="font-display text-3xl font-normal tracking-[-0.02em] text-[var(--rw-ink)] sm:text-[42px] sm:leading-[1.08]"
            >
              Outfits
            </h1>
            <p className="text-xs text-[var(--rw-muted)]">
              {occasionLabel} · {temperatureC} °C · {proposals.length}{' '}
              {proposals.length === 1 ? 'propuesta' : 'propuestas'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector compacto de ángulo del maniquí */}
          <div
            role="group"
            aria-label="Vista del maniquí"
            className="inline-flex border border-[var(--rw-line)] bg-[var(--rw-panel)]/85"
          >
            {VIEW_OPTIONS.map((opt) => {
              const active = viewMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeViewMode(opt.id)}
                  className={`cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-[var(--rw-cta)] text-[var(--rw-cta-ink)]'
                      : 'text-[var(--rw-muted)] hover:text-[var(--rw-ink)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[var(--rw-line)] bg-[var(--rw-panel)]/85 px-2.5 py-1 text-[11px] font-medium text-[var(--rw-ink)]">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={onToggleHeatmap}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            Mapa de calor
          </label>

          {isZoomed && (
            <button
              type="button"
              aria-label="Salir de vista ampliada"
              onClick={() => {
                setIsZoomed(false);
                onHighlightItem(null);
              }}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--rw-line)] bg-[var(--rw-panel)] text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Escenario 3D Ring Carousel */}
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Carrusel de outfits — usa las flechas o desliza para cambiar de propuesta"
        data-testid="outfit-runway-stage"
        onKeyDown={handleStageKeyDown}
        onPointerEnter={() => setIsStageHovered(true)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative mx-auto flex min-h-[340px] w-full flex-1 select-none items-end justify-center overflow-hidden px-4 pb-3 pt-4 outline-none touch-pan-y focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] sm:min-h-[410px] lg:min-h-[430px]"
      >
        {!bodyModel ? (
          <p className="self-center text-sm text-[var(--rw-muted)]">
            Verifica tus medidas en el Probador para ver el maniquí.
          </p>
        ) : viewMode === 'all' && activeProposal ? (
          <div className="grid w-full max-w-[700px] grid-cols-3 items-end gap-2 self-center py-3 sm:gap-5">
            {(['front', 'side', 'back'] as const).map((angle) => (
              <div key={angle} className="relative flex flex-col items-center gap-2">
                <div className="relative h-[250px] sm:h-[330px]">
                  {renderFigureSvg(activeProposal, angle, `all-${activeProposal.id}`)}
                  <span className="rw-floor-shadow" aria-hidden="true" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--rw-muted)]">
                  {angle === 'front' ? 'Frente' : angle === 'side' ? 'Perfil' : 'Espalda'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative h-[310px] w-full sm:h-[380px] lg:h-[405px]">
            {proposals.map((proposal, index) => {
              const delta = getCircularOffset(index, safeIndex, proposals.length);
              const isActive = delta === 0;
              const ringStyle = getRingStyle(delta, isZoomed);

              return (
                <div
                  key={proposal.id}
                  data-runway-item-index={index}
                  data-runway-active={isActive ? 'true' : 'false'}
                  style={ringStyle}
                  className="rw-actor flex h-[285px] w-[155px] flex-col items-center justify-end sm:h-[355px] sm:w-[195px] lg:h-[385px] lg:w-[210px]"
                >
                  <button
                    type="button"
                    tabIndex={isActive || Math.abs(delta) <= 2 ? 0 : -1}
                    aria-label={
                      isActive
                        ? isZoomed
                          ? `Cerrar vista detallada de Opción ${index + 1}`
                          : `Ampliar Opción ${index + 1} (${proposal.score.total} de 100)`
                        : `Ver Opción ${index + 1} (${proposal.score.total} de 100)`
                    }
                    onClick={() => {
                      if (didDragRef.current) {
                        didDragRef.current = false;
                        return;
                      }
                      if (isActive) {
                        setIsZoomed((prev) => !prev);
                        setIsPlaying(false);
                      } else {
                        setIsPlaying(false);
                        setIsZoomed(false);
                        onHighlightItem(null);
                        onSelectIndex(index);
                      }
                    }}
                    className="relative flex h-full w-full cursor-pointer items-end justify-center bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                  >
                    {renderFigureSvg(proposal, singleViewMode, `rw-${index}`)}
                  </button>

                  {/* Pines interactivos sobre el maniquí en modo Zoom */}
                  {isActive && isZoomed && (
                    <div className="pointer-events-none absolute inset-0 z-30">
                      {proposal.items.map((item, itemIdx) => {
                        const pos = getPinPosition(item.category, itemIdx);
                        const highlighted = highlightedItemId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            style={{ top: pos.top, left: pos.left }}
                            aria-label={`${itemIdx + 1}: ${item.name}`}
                            onMouseEnter={() => onHighlightItem(item.id)}
                            onMouseLeave={() => onHighlightItem(null)}
                            onFocus={() => onHighlightItem(item.id)}
                            onBlur={() => onHighlightItem(null)}
                            onClick={(event) => {
                              event.stopPropagation();
                              onHighlightItem(highlighted ? null : item.id);
                            }}
                            className={`pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border text-[11px] font-semibold transition-transform ${
                              highlighted
                                ? 'scale-115 border-[var(--rw-cta)] bg-[var(--rw-cta)] text-[var(--rw-cta-ink)]'
                                : 'border-[var(--rw-line)] bg-[var(--rw-panel)] text-[var(--rw-ink)] hover:scale-110'
                            }`}
                          >
                            {itemIdx + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Sombra elíptica de contacto en el suelo del estudio */}
                  <span className="rw-floor-shadow" aria-hidden="true" />
                </div>
              );
            })}
          </div>
        )}

        {/* Cursor circular translúcido de pasarela (solo desktop con puntero fino) */}
        <span ref={cursorRef} className="rw-stage-cursor" aria-hidden="true" />
      </div>

      {/* Barra inferior de controles estilo Runway: ← | ticks 01..N | play/pause | → */}
      <div className="flex items-center gap-3 border-t border-[var(--rw-line)]/60 px-4 py-4 sm:gap-5 sm:px-7">
        <button
          type="button"
          onClick={goPrev}
          disabled={proposals.length <= 1}
          aria-label="Outfit anterior"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-[var(--rw-ink)] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>

        <div
          role="tablist"
          aria-label="Propuestas de outfits"
          className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3"
        >
          {proposals.map((proposal, index) => {
            const active = index === safeIndex;
            const num = String(index + 1).padStart(2, '0');
            return (
              <button
                key={proposal.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setIsPlaying(false);
                  onSelectIndex(index);
                }}
                className={`group flex min-w-0 cursor-pointer flex-col gap-1.5 pt-1 text-left transition-[flex-grow] duration-300 ${
                  active ? 'flex-[2.2] sm:flex-[2.6]' : 'flex-1'
                }`}
              >
                <span className="relative block h-[2px] w-full overflow-hidden bg-[var(--rw-line)]">
                  {active && (
                    <span
                      key={`${proposal.id}-${isPlaying ? 'play' : 'static'}`}
                      className={`rw-tick-progress block h-full w-full bg-[var(--rw-ink)] ${
                        isPlaying && !isZoomed && !isStageHovered ? 'is-running' : ''
                      }`}
                    />
                  )}
                </span>
                <span className="flex items-baseline gap-2 truncate text-[11px] tabular-nums">
                  <span
                    className={
                      active
                        ? 'font-semibold text-[var(--rw-ink)]'
                        : 'text-[var(--rw-muted)] group-hover:text-[var(--rw-ink)]'
                    }
                  >
                    {num}
                  </span>
                  {active ? (
                    <>
                      <span className="hidden truncate font-medium text-[var(--rw-ink)] sm:inline">
                        Opción {index + 1}
                        <span className="text-[var(--rw-muted)]"> · {proposal.score.total}/100</span>
                      </span>
                      <span className="sr-only sm:hidden">Opción {index + 1}</span>
                    </>
                  ) : (
                    <span className="sr-only">Opción {index + 1}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={proposals.length <= 1}
          onClick={() => {
            setIsZoomed(false);
            setIsPlaying((prev) => !prev);
          }}
          aria-label={isPlaying ? 'Pausar carrusel' : 'Reproducir carrusel'}
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-[var(--rw-ink)] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={proposals.length <= 1}
          aria-label="Siguiente outfit"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-[var(--rw-ink)] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
