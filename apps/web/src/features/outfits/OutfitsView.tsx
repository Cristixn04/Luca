import { useEffect, useMemo, useState } from 'react';
import {
  OCCASION_RULES,
  OUTFIT_OCCASIONS,
  createBodyModel,
  evaluateGarmentFit,
  generateDiverseOutfits,
  getGarmentSlot,
  validateBodyMeasurements,
  type OutfitOccasion,
  type OutfitProposal,
} from '@luca/domain';
import {
  Bookmark,
  CalendarCheck,
  CloudSun,
  Heart,
  LocateFixed,
  Shirt,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { useClosetStore } from '@/features/closet/closetStore';
import { CATEGORY_LABELS, type GarmentDraft, type GarmentWithSizes } from '@/features/closet/types';
import { getActiveSeasonId, useColorStore } from '@/features/color/colorStore';
import { useFittingStore, type ViewerMode } from '@/features/fitting/store';
import { AvatarViewer } from '@/features/fitting/svg/AvatarViewer';
import type { OutfitLayerOverlay } from '@/features/fitting/svg/FrontAvatarSvg';
import { useTasteStore } from '@/features/taste/tasteStore';
import { fetchWeatherByCoordinates } from '@/infrastructure/api-client/client';
import { toOutfitGarmentInputs, useOutfitsStore } from './outfitsStore';

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

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums font-semibold text-ink">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
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

  const savedOutfits = useOutfitsStore((s) => s.savedOutfits);
  const wearLogs = useOutfitsStore((s) => s.wearLogs);
  const outfitsLoaded = useOutfitsStore((s) => s.loaded);
  const loadOutfits = useOutfitsStore((s) => s.loadAll);
  const saveProposal = useOutfitsStore((s) => s.saveProposal);
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
    return (visible.length > 0 ? visible : raw).slice(0, 3);
  }, [activeSeasonId, bodyModel, dismissedIds, fitPreference, garmentInputs, occasion, tasteProfile, temperatureC]);

  const activeProposal: OutfitProposal | null =
    proposals[Math.min(selectedIndex, Math.max(0, proposals.length - 1))] ?? null;

  const outfitLayers: OutfitLayerOverlay | undefined = useMemo(() => {
    if (!bodyModel || !activeProposal) return undefined;

    const topItem =
      activeProposal.items.find((i) => getGarmentSlot(i.category) === 'outerwear') ??
      activeProposal.items.find((i) => getGarmentSlot(i.category) === 'top') ??
      activeProposal.items.find((i) => getGarmentSlot(i.category) === 'one_piece');

    const bottomItem = activeProposal.items.find((i) => getGarmentSlot(i.category) === 'bottom');

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
  }, [activeProposal, bodyModel]);

  const handleUseLocation = () => {
    if (!('geolocation' in navigator)) {
      setWeatherNote('Tu navegador no admite geolocalización. Ajusta la temperatura manualmente.');
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
      () => {
        setWeatherBusy(false);
        setWeatherNote('Permiso de ubicación denegado. Usa el control manual de temperatura.');
      },
      { timeout: 6000 },
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
        tastePaused ? 'Aprendizaje pausado.' : 'Preferencia negativa registrada en tu memoria local.',
      );
    }
  };

  const displayedSaved = favoritesOnly ? savedOutfits.filter((o) => o.favorite) : savedOutfits;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="outfits-heading" className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="outfits-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Outfits
          </h1>
        </div>
        {proposals.length > 0 && (
          <Badge className="tabular-nums">{proposals.length} propuestas</Badge>
        )}
      </section>

      {/* Selector de ocasión y clima */}
      <div className="grid gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted">Ocasión</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Seleccionar ocasión">
            {OUTFIT_OCCASIONS.map((occ) => (
              <Button
                key={occ}
                type="button"
                size="sm"
                variant={occasion === occ ? 'primary' : 'outline'}
                aria-pressed={occasion === occ}
                onClick={() => {
                  setOccasion(occ);
                  setSelectedIndex(0);
                }}
              >
                {OCCASION_RULES[occ].label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="outfit-temp-input" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <CloudSun className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Temperatura: <span className="tabular-nums text-ink">{temperatureC} °C</span>
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={weatherBusy}
              onClick={handleUseLocation}
            >
              <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              {weatherBusy ? 'Consultando...' : 'Usar ubicación'}
            </Button>
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
            className="w-full accent-[var(--accent)]"
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
                className="cursor-pointer rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-0.5 text-[11px] text-muted hover:border-accent hover:text-ink"
              >
                {city.label}
              </button>
            ))}
          </div>
          {weatherNote && <p className="text-xs text-accent">{weatherNote}</p>}
        </div>
      </div>

      {/* Propuestas o estado vacío */}
      {proposals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Necesitas al menos una prenda superior e inferior propias</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={seedingDemo}
              onClick={() => void handleSeedDemoCloset()}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {seedingDemo ? 'Cargando prendas...' : 'Cargar 6 prendas de ejemplo'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selector de las 3 propuestas diversas */}
          <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Propuestas de outfits">
            {proposals.map((proposal, index) => {
              const active = index === Math.min(selectedIndex, proposals.length - 1);
              return (
                <button
                  key={proposal.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedIndex(index);
                    setActionNotice(null);
                  }}
                  className={`flex cursor-pointer flex-col gap-2 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-accent bg-surface ring-1 ring-accent'
                      : 'border-border bg-surface/60 hover:border-accent/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">Opción {index + 1}</span>
                    <Badge variant={active ? 'accent' : 'neutral'} className="tabular-nums">
                      {proposal.score.total} / 100
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {proposal.items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-0.5 text-[11px] text-ink"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border"
                          style={{ backgroundColor: item.dominantColorHex ?? '#1F5F6B' }}
                          aria-hidden="true"
                        />
                        <span className="max-w-[110px] truncate">{item.name}</span>
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {activeProposal && (
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_minmax(310px,400px)]">
              {/* Avatar en capas en las tres vistas (T9.6) */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Vista combinada</CardTitle>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={showHeatmap}
                        onChange={() => setShowHeatmap((v) => !v)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      Mapa de calor
                    </label>
                  </div>
                </CardHeader>
                <CardContent>
                  {bodyModel ? (
                    <AvatarViewer
                      model={bodyModel}
                      garmentCategory="tshirt"
                      fitReport={null}
                      showHeatmap={showHeatmap}
                      outfitLayers={outfitLayers}
                      viewMode={viewMode}
                      onChangeViewMode={setViewMode}
                    />
                  ) : (
                    <p className="text-sm text-muted">
                      Verifica tus medidas en el Probador para ver el avatar.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Prendas, desglose y acciones */}
              <div className="flex flex-col gap-5">
                <Card data-testid="outfit-breakdown-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>Puntaje del outfit</CardTitle>
                      <Badge variant="accent" className="tabular-nums">
                        {activeProposal.score.total} / 100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <ScoreBar label="Color" value={activeProposal.score.color} />
                    <ScoreBar label="Calce" value={activeProposal.score.fit} />
                    <ScoreBar label="Estilo" value={activeProposal.score.style} />
                    <ScoreBar label="Ocasión y clima" value={activeProposal.score.occasion} />
                    <ScoreBar label="Variedad" value={activeProposal.score.variety} />
                    {activeProposal.score.tasteActive && activeProposal.score.taste !== null && (
                      <ScoreBar label="Gusto" value={activeProposal.score.taste} />
                    )}

                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleFeedback('outfit_liked')}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                        Me gusta
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleFeedback('outfit_disliked')}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                        No me gusta
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleFeedback('outfit_dismissed')}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Descartar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button type="button" size="sm" onClick={() => void handleSave(false)}>
                        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                        Guardar outfit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleSave(true)}
                      >
                        <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                        Favorito
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleWearProposal()}
                      >
                        <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Usé este outfit hoy
                      </Button>
                    </div>

                    {actionNotice && (
                      <p role="status" className="text-xs font-medium text-accent">
                        {actionNotice}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Prendas incluidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col gap-2.5">
                      {activeProposal.items.map((item) => {
                        const full = itemsById.get(item.id);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => onOpenGarmentInCloset?.(item.id)}
                              className="flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-bg p-2.5 text-left transition-colors hover:border-accent"
                            >
                              {full?.image?.dataUrl ? (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface p-1">
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
                                <span
                                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border"
                                  style={{ backgroundColor: item.dominantColorHex ?? '#1F5F6B' }}
                                  aria-hidden="true"
                                >
                                  <Shirt className="h-5 w-5 text-white" />
                                </span>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                                <p className="truncate text-xs text-muted">
                                  {CATEGORY_LABELS[item.category]}
                                  {item.wearCount !== undefined ? ` · ${item.wearCount} uso(s)` : ''}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Outfits guardados y favoritos (T9.7) */}
      {savedOutfits.length > 0 && (
        <Card data-testid="saved-outfits-card">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Outfits guardados ({displayedSaved.length})</CardTitle>
              <Button
                type="button"
                size="sm"
                variant={favoritesOnly ? 'primary' : 'outline'}
                onClick={() => setFavoritesOnly((v) => !v)}
              >
                <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                Solo favoritos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayedSaved.map((saved) => (
                <div
                  key={saved.id}
                  className="flex flex-col justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-bg p-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{saved.name}</p>
                      <Badge className="shrink-0 tabular-nums">{saved.score.total}</Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {OCCASION_RULES[saved.occasion].label} · {saved.temperatureC} °C
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await logOutfitWear(saved.garmentIds, saved.id);
                        setActionNotice(`Uso registrado para "${saved.name}".`);
                      }}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Usé hoy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={saved.favorite ? 'primary' : 'outline'}
                      aria-label={saved.favorite ? 'Quitar de favoritos' : 'Marcar favorito'}
                      onClick={() => void toggleFavorite(saved.id)}
                    >
                      <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Eliminar ${saved.name}`}
                      onClick={() => void deleteSavedOutfit(saved.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
