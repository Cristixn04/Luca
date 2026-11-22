import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
  createBodyModel,
  evaluateGarmentFit,
  validateBodyMeasurements,
  type AvatarView,
  type BodyMeasurements,
  type GarmentCategory,
  type GarmentFlatMeasurements,
} from '@luca/domain';
import { AlertCircle, Ruler, Shirt } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { HEATMAP_TOKENS } from '@/design-system/tokens';
import { useClosetStore } from '@/features/closet/closetStore';
import { CATEGORY_LABELS } from '@/features/closet/types';
import { useVaultStore } from '@/features/vault/vaultStore';
import { useT } from '@/i18n/i18nStore';
import { GarmentCardPreviewSvg } from './GarmentCardPreviewSvg';
import { applyClosetItemToFitting, GarmentPanel } from './GarmentPanel';
import { MeasurementsPanel } from './MeasurementsPanel';
import { SpatialGarmentCarousel, type SpatialCarouselItem } from './SpatialGarmentCarousel';
import { DEFAULT_GARMENT_PRESETS, useFittingStore } from './store';
import { BackAvatarSvg } from './svg/BackAvatarSvg';
import {
  FrontAvatarSvg,
  isLowerCategory,
  type OutfitLayerOverlay,
} from './svg/FrontAvatarSvg';
import { isSafeDataImageUrl, type GarmentVisualMeta } from './svg/garmentVisuals';
import { getHeatmapPatternId } from './svg/heatmapMeta';
import { HeatmapPatternDefs } from './svg/heatmapPatterns';
import { SideAvatarSvg } from './svg/SideAvatarSvg';

const SINGLE_VIEWS: readonly AvatarView[] = ['front', 'side', 'back'];

const VIEW_TABS: readonly { id: AvatarView; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'side', label: 'Perfil' },
  { id: 'back', label: 'Espalda' },
];

const DOCK_COLOR_SWATCHES: readonly { name: string; hex: string }[] = [
  { name: 'Marfil', hex: '#F3EFE6' },
  { name: 'Piedra', hex: '#C9C4BA' },
  { name: 'Petróleo', hex: '#1F5F6B' },
  { name: 'Azul marino', hex: '#27324D' },
  { name: 'Oliva', hex: '#4B5724' },
  { name: 'Carbón', hex: '#3B3C3F' },
];

const QUICK_SIZE_SCALE: readonly { label: string; factor: number }[] = [
  { label: 'XS', factor: 0.92 },
  { label: 'S', factor: 0.96 },
  { label: 'M', factor: 1.0 },
  { label: 'L', factor: 1.06 },
  { label: 'XL', factor: 1.12 },
];

interface PairedGarmentLayer {
  readonly closetGarmentId?: string;
  readonly category: GarmentCategory;
  readonly name: string;
  readonly colorHex: string;
  readonly sizeLabel: string;
  readonly elasticity: number;
  readonly flatMeasuresCm: GarmentFlatMeasurements;
  readonly meta?: GarmentVisualMeta;
}

export interface FittingRoomProps {
  onOpenCloset?: () => void;
}

export function FittingRoom({ onOpenCloset }: FittingRoomProps = {}) {
  const t = useT();
  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const optionalMeasurements = useFittingStore((s) => s.optionalMeasurements);
  const mannequinSilhouette = useFittingStore((s) => s.mannequinSilhouette);
  const setMannequinSilhouette = useFittingStore((s) => s.setMannequinSilhouette);
  const viewMode = useFittingStore((s) => s.viewMode);
  const setViewMode = useFittingStore((s) => s.setViewMode);
  const garmentEnabled = useFittingStore((s) => s.garmentEnabled);
  const garmentSource = useFittingStore((s) => s.garmentSource);
  const selectedClosetGarmentId = useFittingStore((s) => s.selectedClosetGarmentId);
  const garmentCategory = useFittingStore((s) => s.garmentCategory);
  const garmentName = useFittingStore((s) => s.garmentName);
  const garmentColorHex = useFittingStore((s) => s.garmentColorHex);
  const setGarmentColorHex = useFittingStore((s) => s.setGarmentColorHex);
  const garmentSizeLabel = useFittingStore((s) => s.garmentSizeLabel);
  const garmentElasticity = useFittingStore((s) => s.garmentElasticity);
  const garmentFlatMeasures = useFittingStore((s) => s.garmentFlatMeasures);
  const showHeatmap = useFittingStore((s) => s.showHeatmap);
  const toggleHeatmap = useFittingStore((s) => s.toggleHeatmap);
  const closetItems = useClosetStore((s) => s.items);
  const closetLoaded = useClosetStore((s) => s.loaded);
  const loadCloset = useClosetStore((s) => s.loadCloset);

  // Barra vertical derecha con dos apartados desplegables mutuamente excluyentes (Prenda | Medidas)
  const [activeDrawer, setActiveDrawer] = useState<'garment' | 'measurements' | null>(null);
  // Capa compañera opcional cuando el usuario combina desde el carrusel superior e inferior
  const [pairedLayer, setPairedLayer] = useState<PairedGarmentLayer | null>(null);
  const [scanTick, setScanTick] = useState(0);
  const [upperSheenTick, setUpperSheenTick] = useState(0);
  const [lowerSheenTick, setLowerSheenTick] = useState(0);
  const [isDesktopArc, setIsDesktopArc] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    const mq = window.matchMedia('(min-width: 768px)');
    return mq ? mq.matches : true;
  });
  const touchStartX = useRef<number | null>(null);
  const userClearedRef = useRef(false);
  const prevClosetCountRef = useRef(closetItems.length);

  useEffect(() => {
    if (!closetLoaded) {
      void loadCloset();
    }
  }, [closetLoaded, loadCloset]);

  // Si el usuario añade nuevas prendas al clóset, vuelve a permitir selección automática
  useEffect(() => {
    if (closetItems.length > prevClosetCountRef.current) {
      userClearedRef.current = false;
    }
    prevClosetCountRef.current = closetItems.length;
  }, [closetItems.length]);

  // Sincronización en vivo Clóset <-> Probador (añadir, editar, eliminar) sin afectar Prenda rápida
  useEffect(() => {
    if (!closetLoaded) return;

    if (pairedLayer?.closetGarmentId) {
      const freshPaired = closetItems.find((c) => c.garment.id === pairedLayer.closetGarmentId);
      if (!freshPaired) {
        setPairedLayer(null);
      } else {
        const freshColor =
          freshPaired.garment.visualSpec?.primary_color_hex ??
          freshPaired.garment.dominantColorHex ??
          '#1F5F6B';
        const freshSize =
          freshPaired.sizes.find((s) => s.label === pairedLayer.sizeLabel) ?? freshPaired.sizes[0];
        if (
          freshPaired.garment.name !== pairedLayer.name ||
          freshColor !== pairedLayer.colorHex ||
          freshPaired.garment.category !== pairedLayer.category ||
          freshPaired.garment.elasticity !== pairedLayer.elasticity ||
          (freshSize && freshSize.label !== pairedLayer.sizeLabel) ||
          freshPaired.garment.visualSpec !== pairedLayer.meta?.visualSpec
        ) {
          setPairedLayer({
            closetGarmentId: freshPaired.garment.id,
            category: freshPaired.garment.category,
            name: freshPaired.garment.name,
            colorHex: freshColor,
            sizeLabel: freshSize?.label ?? pairedLayer.sizeLabel,
            elasticity: freshPaired.garment.elasticity,
            flatMeasuresCm: freshSize ? { ...freshSize.flatMeasuresCm } : pairedLayer.flatMeasuresCm,
            meta: {
              name: freshPaired.garment.name,
              pattern: freshPaired.garment.pattern,
              style: freshPaired.garment.style,
              tags: freshPaired.garment.tags,
              visualSpec: freshPaired.garment.visualSpec,
              imageUrl: freshPaired.image?.dataUrl,
              backImageUrl: freshPaired.image?.backDataUrl,
            },
          });
        }
      }
    }

    if (garmentSource === 'quick' && garmentEnabled) {
      return;
    }

    if (closetItems.length === 0) {
      if (garmentEnabled || selectedClosetGarmentId !== null) {
        useFittingStore.getState().clearGarment();
        setPairedLayer(null);
      }
      return;
    }

    if (selectedClosetGarmentId) {
      const existing = closetItems.find((item) => item.garment.id === selectedClosetGarmentId);
      if (existing) {
        const freshColor =
          existing.garment.visualSpec?.primary_color_hex ??
          existing.garment.dominantColorHex ??
          '#1F5F6B';
        const matchedSize =
          existing.sizes.find((s) => s.label === garmentSizeLabel) ?? existing.sizes[0];
        const needsSync =
          !garmentEnabled ||
          existing.garment.name !== garmentName ||
          existing.garment.category !== garmentCategory ||
          existing.garment.elasticity !== garmentElasticity ||
          freshColor !== garmentColorHex ||
          (matchedSize && matchedSize.label !== garmentSizeLabel);
        if (needsSync && !userClearedRef.current) {
          applyClosetItemToFitting(existing, matchedSize?.label);
        }
        return;
      }
      userClearedRef.current = false;
      applyClosetItemToFitting(closetItems[0]!);
      return;
    }

    if (!garmentEnabled && !userClearedRef.current) {
      applyClosetItemToFitting(closetItems[0]!);
    }
  }, [
    closetItems,
    closetLoaded,
    garmentCategory,
    garmentColorHex,
    garmentElasticity,
    garmentEnabled,
    garmentName,
    garmentSizeLabel,
    garmentSource,
    pairedLayer,
    selectedClosetGarmentId,
  ]);

  useEffect(() => {
    if (!activeDrawer) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDrawer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDrawer]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 768px)');
    if (!mq) return;
    setIsDesktopArc(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDesktopArc(event.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const selectedClosetItem = useMemo(
    () =>
      garmentSource === 'closet' && selectedClosetGarmentId
        ? (closetItems.find((item) => item.garment.id === selectedClosetGarmentId) ?? null)
        : null,
    [closetItems, garmentSource, selectedClosetGarmentId],
  );

  const garmentVisualMeta: GarmentVisualMeta = useMemo(() => {
    if (selectedClosetItem) {
      return {
        name: selectedClosetItem.garment.name,
        pattern: selectedClosetItem.garment.pattern,
        style: selectedClosetItem.garment.style,
        tags: selectedClosetItem.garment.tags,
        visualSpec: selectedClosetItem.garment.visualSpec,
        imageUrl: selectedClosetItem.image?.dataUrl,
        backImageUrl: selectedClosetItem.image?.backDataUrl,
      };
    }
    return {
      name: garmentName,
    };
  }, [garmentName, selectedClosetItem]);

  // Elementos del carrusel superior: exclusivamente prendas reales del clóset (camisas, manga larga, chaquetas y vestidos)
  const upperCarouselItems = useMemo<SpatialCarouselItem[]>(() => {
    return closetItems
      .filter((item) => !isLowerCategory(item.garment.category))
      .map((item) => ({
        id: `closet-${item.garment.id}`,
        source: 'closet',
        closetGarmentId: item.garment.id,
        category: item.garment.category,
        name: item.garment.name,
        brand: item.garment.brand,
        sizeLabel: item.sizes[0]?.label ?? 'M',
        colorHex:
          item.garment.visualSpec?.primary_color_hex ??
          item.garment.dominantColorHex ??
          '#1F5F6B',
        imageUrl: item.image?.dataUrl,
        meta: {
          name: item.garment.name,
          pattern: item.garment.pattern,
          style: item.garment.style,
          tags: item.garment.tags,
          visualSpec: item.garment.visualSpec,
          imageUrl: item.image?.dataUrl,
          backImageUrl: item.image?.backDataUrl,
        },
      }));
  }, [closetItems]);

  // Elementos del carrusel inferior: exclusivamente prendas reales del clóset (pantalones, shorts y faldas)
  const lowerCarouselItems = useMemo<SpatialCarouselItem[]>(() => {
    return closetItems
      .filter((item) => isLowerCategory(item.garment.category))
      .map((item) => ({
        id: `closet-${item.garment.id}`,
        source: 'closet',
        closetGarmentId: item.garment.id,
        category: item.garment.category,
        name: item.garment.name,
        brand: item.garment.brand,
        sizeLabel: item.sizes[0]?.label ?? '32',
        colorHex:
          item.garment.visualSpec?.primary_color_hex ??
          item.garment.dominantColorHex ??
          '#1F3A68',
        imageUrl: item.image?.dataUrl,
        meta: {
          name: item.garment.name,
          pattern: item.garment.pattern,
          style: item.garment.style,
          tags: item.garment.tags,
          visualSpec: item.garment.visualSpec,
          imageUrl: item.image?.dataUrl,
          backImageUrl: item.image?.backDataUrl,
        },
      }));
  }, [closetItems]);

  const activeCarouselItemId = useMemo(() => {
    if (!garmentEnabled) return null;
    if (garmentSource === 'closet' && selectedClosetGarmentId) {
      return `closet-${selectedClosetGarmentId}`;
    }
    return null;
  }, [garmentEnabled, garmentSource, selectedClosetGarmentId]);

  const activeUpperId = useMemo(() => {
    if (!garmentEnabled) return null;
    if (!isLowerCategory(garmentCategory)) return activeCarouselItemId;
    if (pairedLayer?.closetGarmentId && !isLowerCategory(pairedLayer.category)) {
      return `closet-${pairedLayer.closetGarmentId}`;
    }
    return null;
  }, [activeCarouselItemId, garmentCategory, garmentEnabled, pairedLayer]);

  const activeLowerId = useMemo(() => {
    if (!garmentEnabled) return null;
    if (isLowerCategory(garmentCategory)) return activeCarouselItemId;
    if (pairedLayer?.closetGarmentId && isLowerCategory(pairedLayer.category)) {
      return `closet-${pairedLayer.closetGarmentId}`;
    }
    return null;
  }, [activeCarouselItemId, garmentCategory, garmentEnabled, pairedLayer]);

  const handleSelectCarouselItem = (item: SpatialCarouselItem, slot: 'upper' | 'lower') => {
    userClearedRef.current = false;

    // Si cambia de zona (superior <-> inferior) y no es vestido, conserva la prenda anterior como capa combinada
    if (garmentEnabled) {
      const currentIsLower = isLowerCategory(garmentCategory);
      const nextIsLower = slot === 'lower';
      if (item.category === 'dress') {
        setPairedLayer(null);
      } else if (currentIsLower !== nextIsLower) {
        if (garmentCategory === 'dress') {
          setPairedLayer(null);
        } else {
          setPairedLayer({
            ...(garmentSource === 'closet' && selectedClosetGarmentId
              ? { closetGarmentId: selectedClosetGarmentId }
              : {}),
            category: garmentCategory,
            name: garmentName,
            colorHex: garmentColorHex,
            sizeLabel: garmentSizeLabel,
            elasticity: garmentElasticity,
            flatMeasuresCm: { ...garmentFlatMeasures },
            meta: garmentVisualMeta,
          });
        }
      }
    }

    if (item.source === 'closet' && item.closetGarmentId) {
      const full = closetItems.find((c) => c.garment.id === item.closetGarmentId);
      if (full) {
        applyClosetItemToFitting(full);
      }
    }

    setScanTick((n) => n + 1);
    if (slot === 'upper') setUpperSheenTick((n) => n + 1);
    else setLowerSheenTick((n) => n + 1);
  };

  const selectHandlerRef = useRef(handleSelectCarouselItem);
  selectHandlerRef.current = handleSelectCarouselItem;

  const handleSelectUpper = useCallback((item: SpatialCarouselItem) => {
    selectHandlerRef.current(item, 'upper');
  }, []);

  const handleSelectLower = useCallback((item: SpatialCarouselItem) => {
    selectHandlerRef.current(item, 'lower');
  }, []);

  const measurements: BodyMeasurements = useMemo(
    () => ({
      required: bodyMeasurements,
      ...(Object.keys(optionalMeasurements).length > 0 ? { optional: optionalMeasurements } : {}),
    }),
    [bodyMeasurements, optionalMeasurements],
  );

  const validation = useMemo(() => validateBodyMeasurements(measurements), [measurements]);

  const vaultStatus = useVaultStore((s) => s.status);
  const persistCurrentMeasurements = useVaultStore((s) => s.persistCurrentMeasurements);
  const lastSavedJsonRef = useRef<string>(
    JSON.stringify({ required: bodyMeasurements, optional: optionalMeasurements }),
  );

  useEffect(() => {
    if (!validation.valid) return;
    if (vaultStatus !== 'unlocked' && vaultStatus !== 'plaintext') return;

    const serialized = JSON.stringify({
      required: bodyMeasurements,
      optional: optionalMeasurements,
    });
    if (serialized === lastSavedJsonRef.current) return;

    const timer = window.setTimeout(() => {
      lastSavedJsonRef.current = serialized;
      void persistCurrentMeasurements(bodyMeasurements, optionalMeasurements);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [
    bodyMeasurements,
    optionalMeasurements,
    persistCurrentMeasurements,
    validation.valid,
    vaultStatus,
  ]);

  const bodyModel = useMemo(() => {
    if (!validation.valid) {
      return null;
    }
    return createBodyModel(measurements);
  }, [measurements, validation.valid]);

  const fitReport = useMemo(() => {
    if (!bodyModel || !garmentEnabled) {
      return null;
    }
    return evaluateGarmentFit(bodyModel, {
      category: garmentCategory,
      sizeLabel: garmentSizeLabel,
      elasticity: garmentElasticity,
      flatMeasuresCm: garmentFlatMeasures,
    });
  }, [
    bodyModel,
    garmentCategory,
    garmentElasticity,
    garmentEnabled,
    garmentFlatMeasures,
    garmentSizeLabel,
  ]);

  // Si hay prenda combinada (superior + inferior desde ambos carruseles), compone capas coherentes
  const outfitLayers = useMemo<OutfitLayerOverlay | undefined>(() => {
    if (!bodyModel || !garmentEnabled || !fitReport || !pairedLayer) return undefined;
    if (garmentCategory === 'dress') return undefined;

    const pairedFit = evaluateGarmentFit(bodyModel, {
      category: pairedLayer.category,
      sizeLabel: pairedLayer.sizeLabel,
      elasticity: pairedLayer.elasticity,
      flatMeasuresCm: pairedLayer.flatMeasuresCm,
    });

    const activeIsLower = isLowerCategory(garmentCategory);
    if (activeIsLower && !isLowerCategory(pairedLayer.category)) {
      return {
        topFitReport: pairedFit,
        topColorHex: pairedLayer.colorHex,
        topVariant: pairedLayer.category,
        topMeta: pairedLayer.meta,
        bottomFitReport: fitReport,
        bottomColorHex: garmentColorHex,
        bottomVariant: garmentCategory,
        bottomMeta: garmentVisualMeta,
      };
    }

    if (!activeIsLower && isLowerCategory(pairedLayer.category)) {
      return {
        topFitReport: fitReport,
        topColorHex: garmentColorHex,
        topVariant: garmentCategory,
        topMeta: garmentVisualMeta,
        bottomFitReport: pairedFit,
        bottomColorHex: pairedLayer.colorHex,
        bottomVariant: pairedLayer.category,
        bottomMeta: pairedLayer.meta,
      };
    }

    return undefined;
  }, [
    bodyModel,
    fitReport,
    garmentCategory,
    garmentColorHex,
    garmentEnabled,
    garmentVisualMeta,
    pairedLayer,
  ]);

  const activeView: AvatarView = viewMode === 'all' ? 'front' : viewMode;

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 40) return;

    const currentIdx = SINGLE_VIEWS.indexOf(activeView);
    if (currentIdx === -1) return;

    const nextIdx =
      deltaX < 0
        ? (currentIdx + 1) % SINGLE_VIEWS.length
        : (currentIdx - 1 + SINGLE_VIEWS.length) % SINGLE_VIEWS.length;

    setViewMode(SINGLE_VIEWS[nextIdx]!);
  };

  // Tallas rápidas en el dock inferior (reales si la prenda es del clóset, o XS..XL escaladas)
  const dockSizes = useMemo(() => {
    if (selectedClosetItem && selectedClosetItem.sizes.length > 0) {
      return selectedClosetItem.sizes.map((s) => ({
        label: s.label,
        onSelect: () => applyClosetItemToFitting(selectedClosetItem, s.label),
      }));
    }
    const basePreset = DEFAULT_GARMENT_PRESETS[garmentCategory];
    return QUICK_SIZE_SCALE.map((entry) => ({
      label: entry.label,
      onSelect: () => {
        const scaled: Record<string, number> = {};
        for (const [k, v] of Object.entries(basePreset.flatMeasuresCm)) {
          if (typeof v === 'number') {
            scaled[k] = Number((v * entry.factor).toFixed(1));
          }
        }
        useFittingStore.setState({
          garmentEnabled: true,
          garmentSizeLabel: entry.label,
          garmentFlatMeasures: scaled as GarmentFlatMeasurements,
        });
      },
    }));
  }, [garmentCategory, selectedClosetItem]);

  const activeColorName =
    DOCK_COLOR_SWATCHES.find((c) => c.hex.toLowerCase() === garmentColorHex.toLowerCase())?.name ??
    garmentColorHex.toUpperCase();

  const isTorsoEstimated = bodyModel?.landmarks.torsoEstimated ?? false;
  const anyDepthEstimated = bodyModel
    ? bodyModel.sections.chest.depthEstimated ||
      bodyModel.sections.waist.depthEstimated ||
      bodyModel.sections.hip.depthEstimated
    : false;
  const isBackEstimated = bodyModel
    ? bodyModel.backWidthEstimated || bodyModel.backLengthEstimated
    : false;

  return (
    <div
      className={`vf-stage-shift relative flex w-full flex-col gap-3 ${
        activeDrawer ? 'md:pr-16 lg:pr-[468px]' : 'md:pr-16'
      }`}
    >
      {/* ESCENARIO PRINCIPAL A ANCHO COMPLETO: Maniquí Central + Doble Carrusel 3D + Dock Inferior */}
      <section
        aria-labelledby="fitting-heading"
        className="flex min-w-0 w-full flex-col gap-3 bg-transparent"
      >
          {/* Barra superior del Probador con título y controles en cápsulas de vidrio */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-baseline gap-3">
              <h1
                id="fitting-heading"
                className="font-display text-2xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-3xl"
              >
                {t.headings.fitting}
              </h1>
              {pairedLayer && garmentEnabled && (
                <button
                  type="button"
                  onClick={() => setPairedLayer(null)}
                  className="vf-glass cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted transition-colors hover:text-ink"
                >
                  Limpiar combinación
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Selector Mujer / Hombre */}
              <div
                role="group"
                aria-label="Tipo de maniquí"
                className="vf-glass inline-flex items-center gap-0.5 rounded-full p-1"
              >
                {(
                  [
                    { id: 'female', label: 'Mujer' },
                    { id: 'male', label: 'Hombre' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={mannequinSilhouette === opt.id}
                    onClick={() => setMannequinSilhouette(opt.id)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                      mannequinSilhouette === opt.id
                        ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-xs'
                        : 'text-[var(--vf-nav-muted-ink)] hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Selector de vistas: Frente | Perfil | Espalda */}
              <div
                role="group"
                aria-label="Selector de vistas del avatar"
                className="vf-glass inline-flex items-center gap-0.5 rounded-full p-1"
              >
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeView === tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                      activeView === tab.id
                        ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-xs'
                        : 'text-[var(--vf-nav-muted-ink)] hover:text-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Mapa de calor */}
              <label className="vf-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-ink">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={toggleHeatmap}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                Mapa de calor
              </label>
            </div>
          </div>

          {/* Escenario Espacial Central */}
          {!bodyModel ? (
            <div
              role="alert"
              className="vf-glass flex flex-col items-center justify-center gap-2 rounded-[24px] px-6 py-20 text-center"
            >
              <AlertCircle className="h-6 w-6 text-[#C2410C]" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">
                Corrige las medidas fuera de rango para dibujar el avatar
              </p>
              <p className="max-w-xs text-xs text-muted">
                Revisa los campos marcados en el panel de medidas para volver a calcular el modelo
                corporal.
              </p>
            </div>
          ) : (
            <div
              data-testid="avatar-swipe-stage"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative flex w-full flex-col items-center justify-center overflow-hidden pt-2"
            >
              {/* Escenario desktop/tablet: Doble arco 3D (Superior arriba, Inferior abajo) rodeando al maniquí central */}
              <div className="relative flex w-full flex-col items-center">
                {/* Maniquí central a altura completa (z-30 sobre el centro despejado de ambos arcos) */}
                <div
                  data-avatar-view={activeView}
                  data-mannequin-silhouette={mannequinSilhouette}
                  className="pointer-events-none relative z-30 flex h-[410px] w-[225px] flex-col items-center justify-end sm:h-[455px] sm:w-[250px] xl:h-[470px] xl:w-[260px]"
                >
                  {/* Etiqueta de estimado coherente si faltan medidas opcionales */}
                  {activeView === 'front' && isTorsoEstimated && (
                    <Badge
                      data-estimated-badge="front"
                      className="vf-glass pointer-events-auto absolute right-0 top-1 z-40 text-[10px]"
                    >
                      Torso: estimado
                    </Badge>
                  )}
                  {activeView === 'side' && anyDepthEstimated && (
                    <Badge
                      data-estimated-badge="side"
                      className="vf-glass pointer-events-auto absolute right-0 top-1 z-40 text-[10px]"
                    >
                      Fondo: estimado
                    </Badge>
                  )}
                  {activeView === 'back' && isBackEstimated && (
                    <Badge
                      data-estimated-badge="back"
                      className="vf-glass pointer-events-auto absolute right-0 top-1 z-40 text-[10px]"
                    >
                      Espalda: estimado
                    </Badge>
                  )}

                  <div className="relative flex h-full w-full items-end justify-center">
                    {activeView === 'front' && (
                      <FrontAvatarSvg
                        model={bodyModel}
                        silhouette={mannequinSilhouette}
                        garmentCategory={garmentCategory}
                        fitReport={fitReport}
                        showHeatmap={showHeatmap}
                        garmentColorHex={garmentColorHex}
                        garmentMeta={garmentVisualMeta}
                        outfitLayers={outfitLayers}
                        frameless
                      />
                    )}
                    {activeView === 'side' && (
                      <SideAvatarSvg
                        model={bodyModel}
                        silhouette={mannequinSilhouette}
                        garmentCategory={garmentCategory}
                        fitReport={fitReport}
                        showHeatmap={showHeatmap}
                        garmentColorHex={garmentColorHex}
                        garmentMeta={garmentVisualMeta}
                        outfitLayers={outfitLayers}
                        frameless
                      />
                    )}
                    {activeView === 'back' && (
                      <BackAvatarSvg
                        model={bodyModel}
                        silhouette={mannequinSilhouette}
                        garmentCategory={garmentCategory}
                        fitReport={fitReport}
                        showHeatmap={showHeatmap}
                        garmentColorHex={garmentColorHex}
                        garmentMeta={garmentVisualMeta}
                        outfitLayers={outfitLayers}
                        frameless
                      />
                    )}

                    {/* Efecto barrido scan-line al cambiar de prenda en los carruseles */}
                    {scanTick > 0 && (
                      <div
                        key={scanTick}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                      >
                        <span className="vf-scan-bar" />
                      </div>
                    )}
                  </div>
                  <span className="rw-floor-shadow" aria-hidden="true" />
                </div>

                {/* Doble carrusel espacial 3D en escritorio (Superior arriba, Inferior directamente abajo) o franjas táctiles en móvil */}
                {isDesktopArc ? (
                  <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex flex-col gap-3">
                    <div className="pointer-events-auto">
                      <SpatialGarmentCarousel
                        slot="upper"
                        label="Prendas superiores"
                        items={upperCarouselItems}
                        activeItemId={activeUpperId}
                        onSelectItem={handleSelectUpper}
                        layout="arc"
                        compactArc={Boolean(activeDrawer)}
                        sheenTick={upperSheenTick}
                      />
                    </div>
                    <div className="pointer-events-auto">
                      <SpatialGarmentCarousel
                        slot="lower"
                        label="Prendas inferiores"
                        items={lowerCarouselItems}
                        activeItemId={activeLowerId}
                        onSelectItem={handleSelectLower}
                        layout="arc"
                        compactArc={Boolean(activeDrawer)}
                        sheenTick={lowerSheenTick}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex w-full flex-col gap-3">
                    <SpatialGarmentCarousel
                      slot="upper"
                      label="Prendas superiores · Camisas y vestidos"
                      items={upperCarouselItems}
                      activeItemId={activeUpperId}
                      onSelectItem={handleSelectUpper}
                      layout="strip"
                    />
                    <SpatialGarmentCarousel
                      slot="lower"
                      label="Prendas inferiores · Pantalones, shorts y faldas"
                      items={lowerCarouselItems}
                      activeItemId={activeLowerId}
                      onSelectItem={handleSelectLower}
                      layout="strip"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dock inferior flotante de vidrio (o barra de estado vacío cuando el clóset aún no tiene prendas) */}
          {garmentEnabled ? (
            <div className="mx-auto mt-1 flex w-full max-w-[680px] flex-wrap items-center justify-between gap-4 rounded-[24px] px-4 py-3 vf-glass">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--vf-glass-border)] bg-bg/45 p-1.5">
                  {!garmentVisualMeta.visualSpec && isSafeDataImageUrl(garmentVisualMeta.imageUrl) ? (
                    <img
                      src={garmentVisualMeta.imageUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <GarmentCardPreviewSvg
                      category={garmentCategory}
                      colorHex={garmentColorHex}
                      meta={garmentVisualMeta}
                      className="h-full w-full"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{garmentName}</p>
                  <p className="truncate text-xs text-muted">
                    {CATEGORY_LABELS[garmentCategory]}
                    {garmentSource === 'quick' ? ' · Prenda rápida' : ''}
                    {pairedLayer ? ` + ${pairedLayer.name}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                {/* Selector circular de talla */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium leading-none text-muted">Talla</span>
                  <div className="flex items-center gap-1.5" role="group" aria-label="Talla rápida">
                    {dockSizes.slice(0, 5).map((sz) => {
                      const active = garmentSizeLabel === sz.label;
                      return (
                        <button
                          key={sz.label}
                          type="button"
                          aria-pressed={active}
                          onClick={sz.onSelect}
                          className={`flex h-[30px] min-w-[30px] cursor-pointer items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition-transform active:scale-90 ${
                            active
                              ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                              : 'bg-[var(--vf-chip-bg)] text-ink hover:opacity-85'
                          }`}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color: editable en prenda rápida; muestra el color real del clóset en prendas guardadas */}
                {garmentSource === 'quick' ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium leading-none text-muted">
                      Color · {activeColorName}
                    </span>
                    <div className="flex items-center gap-2" role="group" aria-label="Color de prenda">
                      {DOCK_COLOR_SWATCHES.map((swatch) => {
                        const active = garmentColorHex.toLowerCase() === swatch.hex.toLowerCase();
                        return (
                          <button
                            key={swatch.hex}
                            type="button"
                            aria-label={`Color ${swatch.name}`}
                            aria-pressed={active}
                            onClick={() => setGarmentColorHex(swatch.hex)}
                            style={{ backgroundColor: swatch.hex }}
                            className={`h-[18px] w-[18px] cursor-pointer rounded-full border border-white/70 shadow-xs transition-transform hover:scale-115 ${
                              active ? 'ring-2 ring-[var(--vf-chip-active-bg)] ring-offset-2 ring-offset-transparent' : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium leading-none text-muted">Color</span>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                      <span
                        className="inline-block h-[16px] w-[16px] rounded-full border border-white/70 shadow-xs"
                        style={{ backgroundColor: garmentColorHex }}
                        aria-hidden="true"
                      />
                      <span className="tabular-nums">{activeColorName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto mt-1 flex w-full max-w-[640px] flex-wrap items-center justify-between gap-3 rounded-[24px] px-5 py-3 vf-glass">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-xs font-semibold text-ink">
                  {closetItems.length === 0
                    ? 'Tu clóset aún no tiene prendas'
                    : 'Sin prenda puesta en el probador'}
                </p>
                <p className="text-[11px] text-muted">
                  {closetItems.length === 0
                    ? 'Añade prendas en Clóset para verlas aquí o usa una prenda rápida temporal.'
                    : 'Elige una prenda de tu clóset o prueba una prenda rápida en el panel derecho.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {closetItems.length === 0 && onOpenCloset && (
                  <button
                    type="button"
                    onClick={onOpenCloset}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90"
                  >
                    <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                    Ir al Clóset
                  </button>
                )}
                {closetItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      userClearedRef.current = false;
                      applyClosetItemToFitting(closetItems[0]!);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90"
                  >
                    <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                    Probar prenda del clóset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDrawer('garment')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-bg)] px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:opacity-85"
                >
                  Probar prenda rápida
                </button>
              </div>
            </div>
          )}

          {/* Leyenda accesible del mapa de calor en píldora de vidrio */}
          <div
            aria-label="Leyenda del mapa de calor"
            className="vf-glass mx-auto flex flex-wrap items-center justify-center gap-3 rounded-full px-4 py-1.5"
          >
            {HEATMAP_TOKENS.map((token) => (
              <div key={token.state} className="flex items-center gap-1.5 text-xs text-ink">
                <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
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
      </section>

      {/* BARRA VERTICAL FLOTANTE DERECHA (estilo aside.rail.glass de la interfaz base) */}
      <aside
        aria-label="Paneles de información del probador"
        data-testid="fitting-vertical-rail"
        className="vf-glass fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full p-1.5 sm:right-5 sm:p-2 lg:right-6"
      >
        {(
          [
            { id: 'garment', label: 'Prenda', ariaLabel: 'Panel de prenda', icon: Shirt, hasAlert: false },
            {
              id: 'measurements',
              label: 'Medidas',
              ariaLabel: 'Panel de medidas',
              icon: Ruler,
              hasAlert: !validation.valid,
            },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isOpen = activeDrawer === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.ariaLabel}
              aria-expanded={isOpen}
              aria-pressed={isOpen}
              title={item.label}
              onClick={() => setActiveDrawer((prev) => (prev === item.id ? null : item.id))}
              className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all duration-200 sm:h-[42px] sm:w-[42px] ${
                isOpen
                  ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-sm'
                  : 'text-[var(--vf-nav-muted-ink)] hover:bg-white/25 hover:text-ink'
              }`}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
              {item.hasAlert && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#C2410C]"
                />
              )}
              {!activeDrawer && (
                <span
                  aria-hidden="true"
                  className="vf-glass pointer-events-none absolute right-[calc(100%+10px)] hidden whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:inline-block"
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {/* PANEL DESPLEGABLE FLOTANTE (respetando margen superior bajo header/aviso y margen inferior sobre el footer) */}
      {activeDrawer && (
        <div
          key={activeDrawer}
          data-testid={`fitting-drawer-${activeDrawer}`}
          className="vf-drawer-enter fixed right-[66px] top-[110px] z-40 flex max-h-[calc(100dvh-176px)] w-[min(388px,calc(100vw-80px))] flex-col sm:right-[82px] lg:right-[90px]"
        >
          {activeDrawer === 'garment' ? (
            <GarmentPanel
              fitReport={fitReport}
              onManualCategorySelect={() => {
                userClearedRef.current = false;
                setPairedLayer(null);
              }}
              onClearAllGarments={() => {
                userClearedRef.current = true;
                setPairedLayer(null);
              }}
              onOpenCloset={onOpenCloset}
              onClose={() => setActiveDrawer(null)}
            />
          ) : (
            <MeasurementsPanel
              validation={validation}
              onClose={() => setActiveDrawer(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
