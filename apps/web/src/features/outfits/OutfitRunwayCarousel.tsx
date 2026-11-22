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
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { GarmentWithSizes } from '@/features/closet/types';
import type { MannequinSilhouette, ViewerMode } from '@/features/fitting/store';
import { BackAvatarSvg } from '@/features/fitting/svg/BackAvatarSvg';
import { FrontAvatarSvg, type OutfitLayerOverlay } from '@/features/fitting/svg/FrontAvatarSvg';
import type { GarmentVisualMeta } from '@/features/fitting/svg/garmentVisuals';
import { SideAvatarSvg } from '@/features/fitting/svg/SideAvatarSvg';
import { makeOutfitRenderKey, type OutfitRenderRecord } from './outfitsStore';

const VIEW_OPTIONS: readonly { id: ViewerMode; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'side', label: 'Perfil' },
  { id: 'back', label: 'Espalda' },
  { id: 'all', label: '3 vistas' },
];

function extractVisualMeta(
  item: OutfitProposal['items'][number] | undefined,
  itemsById: ReadonlyMap<string, GarmentWithSizes>,
): GarmentVisualMeta | undefined {
  if (!item) return undefined;
  const full = itemsById.get(item.id);
  return {
    name: full?.garment.name ?? item.name,
    pattern: full?.garment.pattern,
    style: full?.garment.style,
    tags: full?.garment.tags,
    visualSpec: full?.garment.visualSpec,
    imageUrl: full?.image?.dataUrl,
    backImageUrl: full?.image?.backDataUrl,
  };
}

function buildOutfitLayers(
  proposal: OutfitProposal,
  bodyModel: BodyModel | null,
  itemsById: ReadonlyMap<string, GarmentWithSizes>,
): OutfitLayerOverlay | undefined {
  if (!bodyModel) return undefined;

  const outerwearItem = proposal.items.find((i) => getGarmentSlot(i.category) === 'outerwear');
  const innerTopItem =
    proposal.items.find((i) => getGarmentSlot(i.category) === 'top') ??
    proposal.items.find((i) => getGarmentSlot(i.category) === 'one_piece');

  const primaryTopItem = innerTopItem ?? outerwearItem;
  const separateOuterwear = innerTopItem && outerwearItem ? outerwearItem : undefined;
  const bottomItem = proposal.items.find((i) => getGarmentSlot(i.category) === 'bottom');

  const evaluateUpper = (item: OutfitProposal['items'][number] | undefined) => {
    if (!item) return null;
    const cat =
      item.category === 'tshirt' ||
      item.category === 'long_sleeve' ||
      item.category === 'jacket' ||
      item.category === 'dress'
        ? item.category
        : 'tshirt';
    return evaluateGarmentFit(bodyModel, {
      category: cat,
      sizeLabel: 'M',
      elasticity: item.elasticity,
      flatMeasuresCm: item.flatMeasuresCm ?? { chestFlat: 50, shoulders: 45, backWidth: 42 },
    });
  };

  const evaluateLower = (item: OutfitProposal['items'][number] | undefined) => {
    if (!item) return null;
    const cat =
      item.category === 'pants' || item.category === 'shorts' || item.category === 'skirt'
        ? item.category
        : 'pants';
    return evaluateGarmentFit(bodyModel, {
      category: cat,
      sizeLabel: '32',
      elasticity: item.elasticity,
      flatMeasuresCm: item.flatMeasuresCm ?? { waistFlat: 41, hipFlat: 52, inseam: 79 },
    });
  };

  const resolveColor = (
    item: OutfitProposal['items'][number] | undefined,
    fallback: string,
  ): string => {
    if (!item) return fallback;
    const full = itemsById.get(item.id);
    return full?.garment.visualSpec?.primary_color_hex ?? item.dominantColorHex ?? fallback;
  };

  return {
    topFitReport: evaluateUpper(primaryTopItem),
    topColorHex: resolveColor(primaryTopItem, '#1F5F6B'),
    topVariant:
      primaryTopItem &&
      (primaryTopItem.category === 'tshirt' ||
        primaryTopItem.category === 'long_sleeve' ||
        primaryTopItem.category === 'jacket' ||
        primaryTopItem.category === 'dress')
        ? primaryTopItem.category
        : 'tshirt',
    topMeta: extractVisualMeta(primaryTopItem, itemsById),
    outerwearFitReport: evaluateUpper(separateOuterwear),
    outerwearColorHex: resolveColor(separateOuterwear, '#4B5724'),
    outerwearMeta: extractVisualMeta(separateOuterwear, itemsById),
    bottomFitReport: evaluateLower(bottomItem),
    bottomColorHex: resolveColor(bottomItem, '#2B4263'),
    bottomVariant:
      bottomItem &&
      (bottomItem.category === 'pants' ||
        bottomItem.category === 'shorts' ||
        bottomItem.category === 'skirt')
        ? bottomItem.category
        : 'pants',
    bottomMeta: extractVisualMeta(bottomItem, itemsById),
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
  itemsById: ReadonlyMap<string, GarmentWithSizes>;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  bodyModel: BodyModel | null;
  silhouette: MannequinSilhouette;
  onChangeSilhouette: (silhouette: MannequinSilhouette) => void;
  occasionLabel: string;
  temperatureC: number;
  viewMode: ViewerMode;
  onChangeViewMode: (mode: ViewerMode) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  highlightedItemId: string | null;
  onHighlightItem: (id: string | null) => void;
  rendersByKey?: Readonly<Record<string, OutfitRenderRecord>>;
  displayMode?: 'parametric' | 'ai';
  onChangeDisplayMode?: (mode: 'parametric' | 'ai') => void;
  onRequestAiRender?: (activeSvg: SVGSVGElement | null) => void;
  aiRenderBusy?: boolean;
  aiRenderNotice?: string | null;
  aiRenderError?: string | null;
  needsApiConsent?: boolean;
  onGrantApiConsentAndRender?: (activeSvg: SVGSVGElement | null) => void;
  onCancelApiConsent?: () => void;
}

export function OutfitRunwayCarousel({
  proposals,
  itemsById,
  selectedIndex,
  onSelectIndex,
  bodyModel,
  silhouette,
  onChangeSilhouette,
  occasionLabel,
  temperatureC,
  viewMode,
  onChangeViewMode,
  showHeatmap,
  onToggleHeatmap,
  highlightedItemId,
  onHighlightItem,
  rendersByKey = {},
  displayMode = 'parametric',
  onChangeDisplayMode,
  onRequestAiRender,
  aiRenderBusy = false,
  aiRenderNotice = null,
  aiRenderError = null,
  needsApiConsent = false,
  onGrantApiConsentAndRender,
  onCancelApiConsent,
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
      map.set(proposal.id, buildOutfitLayers(proposal, bodyModel, itemsById));
    }
    return map;
  }, [bodyModel, itemsById, proposals]);

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
      silhouette,
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
  const activeRenderKey = activeProposal
    ? makeOutfitRenderKey(
        silhouette,
        activeProposal.items.map((i) => i.id),
      )
    : null;
  const activeCachedRender = activeRenderKey ? rendersByKey[activeRenderKey] : undefined;

  const findActiveMannequinSvg = (): SVGSVGElement | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const activeNode = stage.querySelector('[data-runway-active="true"] svg');
    if (activeNode instanceof SVGSVGElement) return activeNode;
    const fallbackSvg = stage.querySelector('svg');
    return fallbackSvg instanceof SVGSVGElement ? fallbackSvg : null;
  };

  return (
    <div className="flex min-w-0 flex-col justify-between bg-transparent">
      {/* Cabecera flotante sin caja sobre el fondo interactivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2 pt-1 sm:px-2">
        {isZoomed && activeProposal ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--rw-muted)]">
              Look {lookNumber}
            </span>
            <p className="font-display text-xl font-normal tracking-tight text-[var(--rw-ink)] sm:text-2xl">
              Opción {safeIndex + 1} · {occasionLabel}
            </p>
          </div>
        ) : (
          <div className="flex items-baseline gap-3">
            <h1
              id="outfits-heading"
              className="font-display text-3xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-[44px] sm:leading-[1.05]"
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
          {/* Selector de maniquí Mujer / Hombre en cápsula de vidrio */}
          <div
            role="group"
            aria-label="Tipo de maniquí"
            className="luca-glass-pill inline-flex items-center gap-0.5 rounded-full p-1"
          >
            {(
              [
                { id: 'female', label: 'Mujer' },
                { id: 'male', label: 'Hombre' },
              ] as const
            ).map((opt) => {
              const active = silhouette === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeSilhouette(opt.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
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

          {/* Cápsula de vidrio flotante para ángulo del maniquí */}
          <div
            role="group"
            aria-label="Vista del maniquí"
            className="luca-glass-pill inline-flex items-center gap-0.5 rounded-full p-1"
          >
            {VIEW_OPTIONS.map((opt) => {
              const active = viewMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeViewMode(opt.id)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
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

          <label className="luca-glass-pill inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-[var(--rw-ink)]">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={onToggleHeatmap}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            Mapa de calor
          </label>

          {/* Modo híbrido: conmutador Realista IA / Paramétrico cuando existe caché + botón bajo demanda */}
          {activeCachedRender && onChangeDisplayMode && (
            <div
              role="group"
              aria-label="Modo de visualización del outfit"
              className="luca-glass-pill inline-flex items-center gap-0.5 rounded-full p-1"
            >
              {(
                [
                  { id: 'ai', label: 'Realista IA' },
                  { id: 'parametric', label: 'Paramétrico' },
                ] as const
              ).map((opt) => {
                const active = displayMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeDisplayMode(opt.id)}
                    className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
          )}

          {onRequestAiRender && activeProposal && (
            <button
              type="button"
              disabled={aiRenderBusy}
              onClick={() => onRequestAiRender(findActiveMannequinSvg())}
              className="luca-glass-pill inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]/45 disabled:cursor-wait disabled:opacity-60"
            >
              {aiRenderBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : activeCachedRender ? (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {aiRenderBusy
                  ? 'Renderizando...'
                  : activeCachedRender
                    ? 'Regenerar IA'
                    : 'Render realista IA'}
              </span>
            </button>
          )}

          {isZoomed && (
            <button
              type="button"
              aria-label="Salir de vista ampliada"
              onClick={() => {
                setIsZoomed(false);
                onHighlightItem(null);
              }}
              className="luca-glass-pill inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--rw-ink)] transition-transform hover:scale-105"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Consentimiento explícito / estado de render realista IA (sin llamadas automáticas) */}
      {needsApiConsent && onGrantApiConsentAndRender && (
        <div
          role="dialog"
          aria-label="Consentimiento para render realista IA"
          className="luca-glass-panel mx-1 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs sm:mx-2"
        >
          <div className="flex items-start gap-2 text-[var(--rw-muted)]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rw-ink)]" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[var(--rw-ink)]">
                Consentimiento de renderizado IA:
              </strong>{' '}
              se enviarán las prendas del outfit sin metadatos EXIF a Gemini (sin almacenamiento en
              servidor) y el resultado quedará cifrado en tu dispositivo.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={aiRenderBusy}
              onClick={() => onGrantApiConsentAndRender(findActiveMannequinSvg())}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--rw-cta)] px-3.5 py-1.5 text-xs font-medium text-[var(--rw-cta-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Permitir y renderizar
            </button>
            {onCancelApiConsent && (
              <button
                type="button"
                onClick={onCancelApiConsent}
                className="cursor-pointer rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--rw-muted)] hover:text-[var(--rw-ink)]"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {(aiRenderError || aiRenderNotice) && (
        <div className="px-2 pb-1">
          {aiRenderError && (
            <p role="alert" className="text-xs font-medium text-[#C2410C]">
              {aiRenderError}
            </p>
          )}
          {!aiRenderError && aiRenderNotice && (
            <p role="status" className="text-xs font-medium text-[var(--rw-muted)]">
              {aiRenderNotice}
            </p>
          )}
        </div>
      )}

      {/* Escenario 3D Ring Carousel flotante sin encerrar */}
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
        className="relative flex min-h-[340px] w-full flex-1 select-none items-end justify-center overflow-hidden px-2 pb-4 pt-4 outline-none touch-pan-y focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:min-h-[430px] lg:min-h-[475px]"
      >
        {!bodyModel ? (
          <p className="self-center text-sm text-[var(--rw-muted)]">
            Verifica tus medidas en el Probador para ver el maniquí.
          </p>
        ) : viewMode === 'all' && activeProposal ? (
          <div className="grid w-full max-w-[760px] grid-cols-3 items-end gap-2 self-center py-3 sm:gap-6">
            {(['front', 'side', 'back'] as const).map((angle) => (
              <div key={angle} className="relative flex flex-col items-center gap-2">
                <div className="relative h-[250px] sm:h-[360px]">
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
          <div className="relative h-[320px] w-full sm:h-[400px] lg:h-[445px]">
            {proposals.map((proposal, index) => {
              const delta = getCircularOffset(index, safeIndex, proposals.length);
              const isActive = delta === 0;
              const ringStyle = getRingStyle(delta, isZoomed);
              const renderKey = makeOutfitRenderKey(
                silhouette,
                proposal.items.map((i) => i.id),
              );
              const cachedRender = rendersByKey[renderKey];
              const useAiImage =
                displayMode === 'ai' &&
                singleViewMode === 'front' &&
                !showHeatmap &&
                Boolean(cachedRender?.dataUrl);

              return (
                <div
                  key={proposal.id}
                  data-runway-item-index={index}
                  data-runway-active={isActive ? 'true' : 'false'}
                  style={ringStyle}
                  className="rw-actor flex h-[295px] w-[155px] flex-col items-center justify-end sm:h-[375px] sm:w-[200px] lg:h-[420px] lg:w-[225px]"
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
                    {useAiImage && cachedRender ? (
                      <img
                        src={cachedRender.dataUrl}
                        alt={`Render realista IA del outfit Opción ${index + 1}`}
                        data-outfit-ai-render="true"
                        className="h-full w-full object-contain object-bottom drop-shadow-[0_12px_18px_rgba(0,0,0,0.16)]"
                      />
                    ) : (
                      renderFigureSvg(proposal, singleViewMode, `rw-${index}`)
                    )}
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
                            className={`pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border text-[11px] font-semibold transition-transform ${
                              highlighted
                                ? 'scale-115 border-[var(--rw-cta)] bg-[var(--rw-cta)] text-[var(--rw-cta-ink)]'
                                : 'luca-glass-pill text-[var(--rw-ink)] hover:scale-110'
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

      {/* Barra inferior flotante de controles en vidrio */}
      <div className="mx-auto mt-1 flex w-full max-w-[780px] items-center gap-2.5 px-1 sm:gap-4">
        <div className="luca-glass-pill flex w-full items-center gap-2 rounded-full px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={proposals.length <= 1}
            aria-label="Outfit anterior"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--rw-ink)] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
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
                  className={`group flex min-w-0 cursor-pointer flex-col gap-1 pt-1 text-left transition-[flex-grow] duration-300 ${
                    active ? 'flex-[2.2] sm:flex-[2.6]' : 'flex-1'
                  }`}
                >
                  <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-[var(--rw-line)]/70">
                    {active && (
                      <span
                        key={`${proposal.id}-${isPlaying ? 'play' : 'static'}`}
                        className={`rw-tick-progress block h-full w-full rounded-full bg-[var(--rw-ink)] ${
                          isPlaying && !isZoomed && !isStageHovered ? 'is-running' : ''
                        }`}
                      />
                    )}
                  </span>
                  <span className="flex items-baseline gap-1.5 truncate text-[11px] tabular-nums">
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
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--rw-ink)] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
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
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--rw-ink)] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
