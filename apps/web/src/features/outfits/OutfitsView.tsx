import { useEffect, useMemo, useState } from 'react';
import {
  OCCASION_RULES,
  OUTFIT_OCCASIONS,
  createBodyModel,
  generateDiverseOutfits,
  validateBodyMeasurements,
  type OutfitOccasion,
  type OutfitProposal,
} from '@luca/domain';
import {
  ArrowRight,
  CalendarCheck,
  CloudSun,
  Heart,
  LocateFixed,
  Plus,
  Shirt,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { useClosetStore } from '@/features/closet/closetStore';
import {
  CATEGORY_LABELS,
  formatVisualSpecSummary,
  type GarmentDraft,
  type GarmentWithSizes,
} from '@/features/closet/types';
import { getActiveSeasonId, useColorStore } from '@/features/color/colorStore';
import { useFittingStore, type ViewerMode } from '@/features/fitting/store';
import { useTasteStore } from '@/features/taste/tasteStore';
import {
  ApiConsentRequiredError,
  fetchWeatherByCoordinates,
  getApiConsent,
  renderOutfitOnMannequin,
  setApiConsent,
} from '@/infrastructure/api-client/client';
import { OutfitRunwayCarousel } from './OutfitRunwayCarousel';
import { makeOutfitRenderKey, toOutfitGarmentInputs, useOutfitsStore } from './outfitsStore';
import { captureMannequinSvgToPngBlob, dataUrlToBlob } from './renderSnapshot';

const CITY_PRESETS: readonly { label: string; tempC: number }[] = [
  { label: 'Bogotá · 14 °C', tempC: 14 },
  { label: 'Madrid · 18 °C', tempC: 18 },
  { label: 'CDMX · 21 °C', tempC: 21 },
  { label: 'Bucaramanga · 26 °C', tempC: 26 },
  { label: 'Frío · 8 °C', tempC: 8 },
];

const DEMO_WARDROBE_DRAFTS: readonly GarmentDraft[] = [
  {
    category: 'tshirt',
    name: 'Camiseta blanca de algodón',
    brand: 'Taller Norte',
    status: 'owned',
    price: 32,
    elasticity: 0.05,
    formality: 2,
    pattern: 'solid',
    style: 'minimalist',
    seasons: ['spring', 'summer'],
    tags: ['básico', 'algodón'],
    dominantColorHex: '#F3EFE6',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 } }],
  },
  {
    category: 'long_sleeve',
    name: 'Camisa azul cielo Oxford',
    brand: 'Estudio Sur',
    status: 'owned',
    price: 58,
    elasticity: 0.02,
    formality: 3,
    pattern: 'solid',
    style: 'classic',
    seasons: ['spring', 'autumn', 'winter'],
    tags: ['oficina', 'oxford'],
    dominantColorHex: '#5C82A6',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 51, shoulders: 45.5, backWidth: 42.5 } }],
  },
  {
    category: 'tshirt',
    name: 'Polo terracota suave',
    brand: 'Taller Norte',
    status: 'owned',
    price: 44,
    elasticity: 0.06,
    formality: 2,
    pattern: 'solid',
    style: 'casual',
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['polo', 'diario'],
    dominantColorHex: '#C45733',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 } }],
  },
  {
    category: 'pants',
    name: 'Pantalón chino arena',
    brand: 'Estudio Sur',
    status: 'owned',
    price: 68,
    elasticity: 0.04,
    formality: 3,
    pattern: 'solid',
    style: 'classic',
    seasons: ['spring', 'summer', 'autumn'],
    tags: ['chino', 'oficina'],
    dominantColorHex: '#C9B99F',
    sizes: [{ label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 79 } }],
  },
  {
    category: 'pants',
    name: 'Jean azul oscuro recto',
    brand: 'Taller Norte',
    status: 'owned',
    price: 75,
    elasticity: 0.03,
    formality: 2,
    pattern: 'solid',
    style: 'casual',
    seasons: ['spring', 'autumn', 'winter'],
    tags: ['denim', 'recto'],
    dominantColorHex: '#1F3A68',
    sizes: [{ label: '32', flatMeasuresCm: { waistFlat: 41, hipFlat: 52, inseam: 80 } }],
  },
  {
    category: 'jacket',
    name: 'Chaqueta verde oliva',
    brand: 'Estudio Sur',
    status: 'owned',
    price: 115,
    elasticity: 0.02,
    formality: 3,
    pattern: 'solid',
    style: 'classic',
    seasons: ['autumn', 'winter'],
    tags: ['abrigo', 'entretiempo'],
    dominantColorHex: '#4B5724',
    sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 54, shoulders: 46, backWidth: 43 } }],
  },
];

export interface OutfitsViewProps {
  onOpenGarmentInCloset?: (garmentId: string) => void;
}

function isLightHex(hex: string | undefined): boolean {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.68;
}

function EditorialScoreBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[var(--rw-muted)]">{label}</span>
        <span className="tabular-nums font-medium text-[var(--rw-ink)]">{value}</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--glass-divider)]">
        <div
          className="h-full rounded-full bg-[var(--rw-ink)] transition-[width] duration-300 ease-[var(--ease-out)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function OutfitsView({ onOpenGarmentInCloset }: OutfitsViewProps) {
  const closetItems = useClosetStore((s) => s.items);
  const closetLoaded = useClosetStore((s) => s.loaded);
  const loadCloset = useClosetStore((s) => s.loadCloset);
  const addGarment = useClosetStore((s) => s.addGarment);

  const colorProfile = useColorStore((s) => s.profile);
  const colorLoaded = useColorStore((s) => s.loaded);
  const loadColorProfile = useColorStore((s) => s.loadProfile);

  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const optionalMeasurements = useFittingStore((s) => s.optionalMeasurements);
  const fitPreference = useFittingStore((s) => s.fitPreference);
  const mannequinSilhouette = useFittingStore((s) => s.mannequinSilhouette);
  const setMannequinSilhouette = useFittingStore((s) => s.setMannequinSilhouette);

  const savedOutfits = useOutfitsStore((s) => s.savedOutfits);
  const wearLogs = useOutfitsStore((s) => s.wearLogs);
  const rendersByKey = useOutfitsStore((s) => s.rendersByKey);
  const outfitsLoaded = useOutfitsStore((s) => s.loaded);
  const loadOutfits = useOutfitsStore((s) => s.loadAll);
  const saveProposal = useOutfitsStore((s) => s.saveProposal);
  const saveOutfitRender = useOutfitsStore((s) => s.saveOutfitRender);
  const toggleFavorite = useOutfitsStore((s) => s.toggleFavorite);
  const deleteSavedOutfit = useOutfitsStore((s) => s.deleteSavedOutfit);
  const logOutfitWear = useOutfitsStore((s) => s.logOutfitWear);

  const tasteProfile = useTasteStore((s) => s.profile);
  const tasteLoaded = useTasteStore((s) => s.loaded);
  const tastePaused = useTasteStore((s) => s.prefs.learningPaused);
  const loadTaste = useTasteStore((s) => s.loadTaste);
  const recordOutfitFeedback = useTasteStore((s) => s.recordOutfitFeedback);

  const [occasion, setOccasion] = useState<OutfitOccasion>('casual');
  const [temperatureC, setTemperatureC] = useState<number>(21);
  const [weatherNote, setWeatherNote] = useState<string | null>(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewerMode>('front');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'parametric' | 'ai'>('ai');
  const [aiRenderBusy, setAiRenderBusy] = useState(false);
  const [aiRenderNotice, setAiRenderNotice] = useState<string | null>(null);
  const [aiRenderError, setAiRenderError] = useState<string | null>(null);
  const [needsApiConsent, setNeedsApiConsent] = useState(false);

  useEffect(() => {
    if (!closetLoaded) void loadCloset();
  }, [closetLoaded, loadCloset]);

  useEffect(() => {
    if (!colorLoaded) void loadColorProfile();
  }, [colorLoaded, loadColorProfile]);

  useEffect(() => {
    if (!outfitsLoaded) void loadOutfits();
  }, [loadOutfits, outfitsLoaded]);

  useEffect(() => {
    if (!tasteLoaded) void loadTaste();
  }, [loadTaste, tasteLoaded]);

  const bodyModel = useMemo(() => {
    const m = {
      required: bodyMeasurements,
      ...(Object.keys(optionalMeasurements).length > 0 ? { optional: optionalMeasurements } : {}),
    };
    return validateBodyMeasurements(m).valid ? createBodyModel(m) : null;
  }, [bodyMeasurements, optionalMeasurements]);

  const activeSeasonId = useMemo(() => getActiveSeasonId(colorProfile), [colorProfile]);

  const garmentInputs = useMemo(
    () => toOutfitGarmentInputs(closetItems, wearLogs, bodyModel, fitPreference),
    [bodyModel, closetItems, fitPreference, wearLogs],
  );

  const itemsById = useMemo(() => {
    const map = new Map<string, GarmentWithSizes>();
    for (const item of closetItems) {
      map.set(item.garment.id, item);
    }
    return map;
  }, [closetItems]);

  const proposals = useMemo(() => {
    const raw = generateDiverseOutfits(garmentInputs, {
      occasion,
      temperatureC,
      bodyModel,
      fitPreference,
      seasonId: activeSeasonId,
      tasteProfile,
      count: 6,
    });
    const visible = raw.filter((p) => !dismissedIds.includes(p.id));
    return (visible.length > 0 ? visible : raw).slice(0, 6);
  }, [
    activeSeasonId,
    bodyModel,
    dismissedIds,
    fitPreference,
    garmentInputs,
    occasion,
    tasteProfile,
    temperatureC,
  ]);

  const safeSelectedIndex = Math.min(selectedIndex, Math.max(0, proposals.length - 1));
  const activeProposal: OutfitProposal | null = proposals[safeSelectedIndex] ?? null;

  const handleUseLocation = () => {
    if (!('geolocation' in navigator)) {
      setWeatherNote('Tu navegador no admite geolocalización. Ajusta la temperatura manualmente.');
      return;
    }
    if (typeof navigator.onLine === 'boolean' && !navigator.onLine) {
      setWeatherNote('Sin conexión a internet. Ajusta la temperatura manualmente.');
      return;
    }
    setWeatherBusy(true);
    setWeatherNote(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const summary = await fetchWeatherByCoordinates(pos.coords.latitude, pos.coords.longitude);
          setTemperatureC(Math.round(summary.temperature_c));
          setWeatherNote(`${summary.condition} · ${Math.round(summary.temperature_c)} °C`);
        } catch {
          setWeatherNote('No se pudo consultar el clima. Ajusta la temperatura manualmente.');
        } finally {
          setWeatherBusy(false);
        }
      },
      (geoError) => {
        setWeatherBusy(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setWeatherNote('Permiso de ubicación denegado. Usa el control manual de temperatura.');
        } else if (geoError.code === geoError.TIMEOUT) {
          setWeatherNote('Tiempo de espera agotado al detectar tu ubicación. Intenta de nuevo o ajústalo manualmente.');
        } else {
          setWeatherNote('No se pudo detectar tu ubicación. Usa el control manual de temperatura.');
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  };

  const handleSeedDemoCloset = async () => {
    setSeedingDemo(true);
    try {
      for (const draft of DEMO_WARDROBE_DRAFTS) {
        await addGarment(draft);
      }
      setSelectedIndex(0);
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleSave = async (favorite = false) => {
    if (!activeProposal) return;
    await saveProposal(activeProposal, occasion, temperatureC, { favorite });
    await recordOutfitFeedback(
      'outfit_saved',
      activeProposal.items,
      activeProposal.fitStatesByGarmentId,
    );
    setActionNotice(favorite ? 'Outfit guardado en favoritos.' : 'Outfit guardado.');
  };

  const handleWearProposal = async () => {
    if (!activeProposal) return;
    await logOutfitWear(activeProposal.items.map((i) => i.id));
    await recordOutfitFeedback(
      'wear_logged',
      activeProposal.items,
      activeProposal.fitStatesByGarmentId,
    );
    setActionNotice('Uso registrado para hoy.');
  };

  const executeAiRender = async (activeSvg: SVGSVGElement | null) => {
    if (!activeProposal) return;
    setAiRenderBusy(true);
    setAiRenderError(null);
    setAiRenderNotice('Generando render realista sobre maniquí (sin retención en servidor)...');
    setNeedsApiConsent(false);

    try {
      const mannequinBlob = await captureMannequinSvgToPngBlob(activeSvg);
      const garmentsPayload = activeProposal.items.slice(0, 4).map((item) => {
        const full = itemsById.get(item.id);
        const specSummary = formatVisualSpecSummary(full?.garment.visualSpec);
        const fitState = activeProposal.fitStatesByGarmentId[item.id];
        const imageBlob = dataUrlToBlob(full?.image?.dataUrl) ?? undefined;

        return {
          name: item.name,
          category: item.category,
          ...(item.dominantColorHex ? { color_hex: item.dominantColorHex } : {}),
          ...(fitState ? { fit_summary: `calce ${fitState}` } : {}),
          ...(specSummary ? { visual_spec_summary: specSummary } : {}),
          ...(imageBlob ? { imageBlob } : {}),
        };
      });

      const res = await renderOutfitOnMannequin({
        silhouette: mannequinSilhouette,
        garments: garmentsPayload,
        mannequinBlob,
      });

      const garmentIds = activeProposal.items.map((i) => i.id);
      const renderKey = makeOutfitRenderKey(mannequinSilhouette, garmentIds);
      await saveOutfitRender({
        id: renderKey,
        silhouette: mannequinSilhouette,
        garmentIds,
        dataUrl: `data:image/png;base64,${res.render_png_base64}`,
        width: res.width,
        height: res.height,
        provider: res.provider,
        createdAt: new Date().toISOString(),
      });

      setDisplayMode('ai');
      if (viewMode !== 'front') setViewMode('front');
      if (showHeatmap) setShowHeatmap(false);
      setAiRenderNotice(
        `Render realista listo (${res.provider}, ${(res.processing_ms / 1000).toFixed(1)} s) y guardado cifrado localmente.`,
      );
    } catch (err) {
      if (err instanceof ApiConsentRequiredError) {
        setNeedsApiConsent(true);
        setAiRenderNotice(null);
      } else {
        setAiRenderNotice(null);
        setAiRenderError(
          err instanceof Error
            ? err.message
            : 'No se pudo generar el render realista IA. Sigue activo el maniquí paramétrico.',
        );
      }
    } finally {
      setAiRenderBusy(false);
    }
  };

  const handleRequestAiRender = (activeSvg: SVGSVGElement | null) => {
    if (!getApiConsent()) {
      setNeedsApiConsent(true);
      setAiRenderError(null);
      return;
    }
    void executeAiRender(activeSvg);
  };

  const handleGrantApiConsentAndRender = (activeSvg: SVGSVGElement | null) => {
    setApiConsent(true);
    void executeAiRender(activeSvg);
  };

  const handleFeedback = async (type: 'outfit_liked' | 'outfit_disliked' | 'outfit_dismissed') => {
    if (!activeProposal) return;
    await recordOutfitFeedback(type, activeProposal.items, activeProposal.fitStatesByGarmentId);
    if (type === 'outfit_dismissed') {
      setDismissedIds((prev) => [...prev, activeProposal.id]);
      setSelectedIndex(0);
      setActionNotice('Propuesta descartada.');
    } else if (type === 'outfit_liked') {
      setActionNotice(
        tastePaused ? 'Aprendizaje pausado.' : 'Me gusta registrado en tu memoria local.',
      );
    } else {
      setActionNotice(
        tastePaused
          ? 'Aprendizaje pausado.'
          : 'Preferencia negativa registrada en tu memoria local.',
      );
    }
  };

  const displayedSaved = favoritesOnly ? savedOutfits.filter((o) => o.favorite) : savedOutfits;

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Barra superior libre y flotante: píldoras de ocasión sin caja + cápsula de clima en vidrio */}
      <section
        aria-label="Filtros de ocasión y temperatura"
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
      >
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Seleccionar ocasión">
          <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--rw-muted)]">
            Ocasión
          </span>
          {OUTFIT_OCCASIONS.map((occ) => {
            const active = occasion === occ;
            return (
              <button
                key={occ}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setOccasion(occ);
                  setSelectedIndex(0);
                  setActionNotice(null);
                }}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-[var(--rw-cta)] text-[var(--rw-cta-ink)] shadow-sm'
                    : 'luca-glass-pill text-[var(--rw-muted)] hover:text-[var(--rw-ink)]'
                }`}
              >
                {OCCASION_RULES[occ].label}
              </button>
            );
          })}
        </div>

        {/* Cápsula flotante de vidrio para temperatura y ubicación */}
        <div className="luca-glass-pill flex flex-col gap-1.5 rounded-2xl px-4 py-2.5 lg:min-w-[380px] xl:min-w-[420px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="outfit-temp-input"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--rw-muted)]"
            >
              <CloudSun className="h-3.5 w-3.5 text-[var(--rw-ink)]" aria-hidden="true" />
              Temperatura:{' '}
              <span className="tabular-nums font-semibold text-[var(--rw-ink)]">
                {temperatureC} °C
              </span>
            </label>
            <button
              type="button"
              disabled={weatherBusy}
              onClick={handleUseLocation}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-[var(--rw-muted)] transition-colors hover:text-[var(--rw-ink)] disabled:opacity-50"
            >
              <LocateFixed className="h-3 w-3" aria-hidden="true" />
              {weatherBusy ? 'Consultando...' : 'Usar ubicación'}
            </button>
          </div>

          <input
            id="outfit-temp-input"
            type="range"
            min="0"
            max="38"
            step="1"
            value={temperatureC}
            onChange={(event) => {
              setTemperatureC(Number(event.target.value));
              setSelectedIndex(0);
            }}
            className="w-full accent-[var(--rw-ink)]"
          />

          <div className="flex flex-wrap gap-1.5">
            {CITY_PRESETS.map((city) => (
              <button
                key={city.label}
                type="button"
                onClick={() => {
                  setTemperatureC(city.tempC);
                  setWeatherNote(null);
                  setSelectedIndex(0);
                }}
                className="cursor-pointer rounded-full border border-[var(--glass-border)] px-2.5 py-0.5 text-[10px] text-[var(--rw-muted)] transition-colors hover:border-[var(--rw-ink)]/40 hover:text-[var(--rw-ink)]"
              >
                {city.label}
              </button>
            ))}
          </div>
          {weatherNote && <p className="text-[11px] font-medium text-[var(--rw-ink)]">{weatherNote}</p>}
        </div>
      </section>

      {/* Estado vacío o Escenario abierto con panel lateral de vidrio */}
      {proposals.length === 0 ? (
        <section
          aria-labelledby="outfits-heading"
          className="luca-glass-panel flex flex-col items-start gap-5 rounded-2xl p-6 sm:p-10"
        >
          <div className="flex flex-col gap-2">
            <h1
              id="outfits-heading"
              className="font-display text-3xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-[44px]"
            >
              Outfits
            </h1>
            <p className="max-w-md text-sm text-[var(--rw-muted)]">
              Necesitas al menos una prenda superior e inferior propias para armar combinaciones en
              el carrusel.
            </p>
          </div>
          <button
            type="button"
            disabled={seedingDemo}
            onClick={() => void handleSeedDemoCloset()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--rw-cta)] px-5 py-3 text-sm font-medium text-[var(--rw-cta-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {seedingDemo ? 'Cargando prendas...' : 'Cargar 6 prendas de ejemplo'}
          </button>
        </section>
      ) : (
        <section
          aria-labelledby="outfits-heading"
          className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8"
        >
          {/* Columna izquierda: Carrusel 3D flotante (totalmente libre, sin caja) */}
          <OutfitRunwayCarousel
            proposals={proposals}
            itemsById={itemsById}
            selectedIndex={safeSelectedIndex}
            onSelectIndex={(idx) => {
              setSelectedIndex(idx);
              setHighlightedItemId(null);
              setActionNotice(null);
              setAiRenderError(null);
              setAiRenderNotice(null);
              setNeedsApiConsent(false);
            }}
            bodyModel={bodyModel}
            silhouette={mannequinSilhouette}
            onChangeSilhouette={(nextSilhouette) => {
              setMannequinSilhouette(nextSilhouette);
              setAiRenderError(null);
              setAiRenderNotice(null);
            }}
            occasionLabel={OCCASION_RULES[occasion].label}
            temperatureC={temperatureC}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap((v) => !v)}
            highlightedItemId={highlightedItemId}
            onHighlightItem={setHighlightedItemId}
            rendersByKey={rendersByKey}
            displayMode={displayMode}
            onChangeDisplayMode={setDisplayMode}
            onRequestAiRender={handleRequestAiRender}
            aiRenderBusy={aiRenderBusy}
            aiRenderNotice={aiRenderNotice}
            aiRenderError={aiRenderError}
            needsApiConsent={needsApiConsent}
            onGrantApiConsentAndRender={handleGrantApiConsentAndRender}
            onCancelApiConsent={() => setNeedsApiConsent(false)}
          />

          {/* Columna lateral: Panel flotante de vidrio con prendas, desglose y acciones */}
          {activeProposal && (
            <aside className="luca-glass-panel flex flex-col rounded-2xl">
              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--glass-divider)] px-5 py-4 sm:px-6">
                <h2 className="font-display text-lg font-normal tracking-tight text-[var(--rw-ink)]">
                  En este outfit
                </h2>
                <span className="tabular-nums text-xs font-semibold text-[var(--rw-muted)]">
                  {activeProposal.score.total} / 100
                </span>
              </div>

              {/* Lista de prendas incluidas con miniatura limpia y badge numerado */}
              <ul className="divide-y divide-[var(--glass-divider)] px-5 sm:px-6">
                {activeProposal.items.map((item, idx) => {
                  const full = itemsById.get(item.id);
                  const isHighlighted = highlightedItemId === item.id;
                  const swatchIsLight = isLightHex(item.dominantColorHex);

                  return (
                    <li
                      key={item.id}
                      onMouseEnter={() => setHighlightedItemId(item.id)}
                      onMouseLeave={() => setHighlightedItemId(null)}
                      className={`py-3.5 transition-colors ${
                        isHighlighted ? 'rounded-xl bg-[var(--rw-card)]/45 -mx-2.5 px-2.5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--rw-card)] sm:h-[76px] sm:w-[76px]">
                          {full?.image?.dataUrl ? (
                            <div className="flex h-full w-full items-center justify-center p-1.5">
                              <img
                                src={full.image.dataUrl}
                                alt={item.name}
                                className="max-h-full max-w-full object-contain"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center"
                              style={{ backgroundColor: item.dominantColorHex ?? '#1F5F6B' }}
                              aria-hidden="true"
                            >
                              <Shirt
                                className={`h-6 w-6 ${
                                  swatchIsLight ? 'text-[#151413]/80' : 'text-white/90'
                                }`}
                              />
                            </div>
                          )}
                          <span
                            aria-hidden="true"
                            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--rw-panel)]/90 text-[10px] font-semibold tabular-nums text-[var(--rw-ink)] backdrop-blur-xs"
                          >
                            {idx + 1}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--rw-muted)]">
                            {full?.garment.brand ?? CATEGORY_LABELS[item.category]}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] font-medium text-[var(--rw-ink)]">
                            {item.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--rw-muted)]">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--glass-border)]"
                              style={{ backgroundColor: item.dominantColorHex ?? '#1F5F6B' }}
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {CATEGORY_LABELS[item.category]}
                              {item.wearCount !== undefined ? ` · ${item.wearCount} uso(s)` : ''}
                            </span>
                          </p>
                        </div>

                        {onOpenGarmentInCloset && (
                          <button
                            type="button"
                            onClick={() => onOpenGarmentInCloset(item.id)}
                            aria-label={`Ver ${item.name} en el clóset`}
                            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--rw-muted)] transition-colors hover:bg-[var(--glass-divider)] hover:text-[var(--rw-ink)]"
                          >
                            <Plus className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desglose de puntaje + feedback local */}
              <div
                data-testid="outfit-breakdown-card"
                className="flex flex-col gap-2.5 border-t border-[var(--glass-divider)] px-5 py-4 sm:px-6"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <EditorialScoreBar label="Color" value={activeProposal.score.color} />
                  <EditorialScoreBar label="Calce" value={activeProposal.score.fit} />
                  <EditorialScoreBar label="Estilo" value={activeProposal.score.style} />
                  <EditorialScoreBar label="Ocasión y clima" value={activeProposal.score.occasion} />
                  <EditorialScoreBar label="Variedad" value={activeProposal.score.variety} />
                  {activeProposal.score.tasteActive && activeProposal.score.taste !== null && (
                    <EditorialScoreBar label="Gusto" value={activeProposal.score.taste} />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleFeedback('outfit_liked')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]/45"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                    Me gusta
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFeedback('outfit_disliked')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]/45"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                    No me gusta
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFeedback('outfit_dismissed')}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--rw-muted)] transition-colors hover:text-[var(--rw-ink)]"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Descartar
                  </button>
                </div>
              </div>

              {/* Barra inferior de acciones en vidrio */}
              <div className="mt-auto flex flex-col gap-2.5 border-t border-[var(--glass-divider)] px-5 py-4 sm:px-6">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[var(--rw-ink)]">
                      Opción {safeSelectedIndex + 1}
                    </span>
                    <span className="text-[11px] text-[var(--rw-muted)]">
                      {activeProposal.items.length} prendas combinadas
                    </span>
                  </div>
                  <span className="tabular-nums text-base font-medium text-[var(--rw-ink)]">
                    {activeProposal.score.total} / 100
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave(false)}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--rw-cta)] px-4 py-3 text-[13px] font-medium text-[var(--rw-cta-ink)] transition-opacity hover:opacity-90"
                >
                  <span>Guardar outfit</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave(true)}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]/45"
                  >
                    <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                    Favorito
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleWearProposal()}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]/45"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Usé este outfit hoy
                  </button>
                </div>

                {actionNotice && (
                  <p role="status" className="text-xs font-medium text-[var(--rw-ink)]">
                    {actionNotice}
                  </p>
                )}
              </div>
            </aside>
          )}
        </section>
      )}

      {/* Outfits guardados y favoritos en tarjetas de vidrio flotantes */}
      {savedOutfits.length > 0 && (
        <section data-testid="saved-outfits-card" className="flex flex-col gap-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-normal text-[var(--rw-ink)]">
              Outfits guardados ({displayedSaved.length})
            </h2>
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                favoritesOnly
                  ? 'bg-[var(--rw-cta)] text-[var(--rw-cta-ink)]'
                  : 'luca-glass-pill text-[var(--rw-ink)]'
              }`}
            >
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              Solo favoritos
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedSaved.map((saved) => (
              <div
                key={saved.id}
                className="luca-glass-panel flex flex-col justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[var(--rw-ink)]">{saved.name}</p>
                    <span className="shrink-0 tabular-nums text-xs font-semibold text-[var(--rw-muted)]">
                      {saved.score.total}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--rw-muted)]">
                    {OCCASION_RULES[saved.occasion].label} · {saved.temperatureC} °C
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await logOutfitWear(saved.garmentIds, saved.id);
                      setActionNotice(`Uso registrado para "${saved.name}".`);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium text-[var(--rw-ink)] transition-colors hover:border-[var(--rw-ink)]/45"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Usé hoy
                  </button>
                  <button
                    type="button"
                    aria-label={saved.favorite ? 'Quitar de favoritos' : 'Marcar favorito'}
                    onClick={() => void toggleFavorite(saved.id)}
                    className={`inline-flex cursor-pointer items-center justify-center rounded-full border px-2.5 py-1.5 text-xs transition-colors ${
                      saved.favorite
                        ? 'border-[var(--rw-cta)] bg-[var(--rw-cta)] text-[var(--rw-cta-ink)]'
                        : 'border-[var(--glass-border)] text-[var(--rw-ink)] hover:border-[var(--rw-ink)]/45'
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${saved.name}`}
                    onClick={() => void deleteSavedOutfit(saved.id)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-full px-2 py-1.5 text-xs text-[var(--rw-muted)] transition-colors hover:text-[var(--rw-ink)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
