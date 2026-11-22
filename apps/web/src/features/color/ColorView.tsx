import { useEffect, useMemo, useState } from 'react';
import {
  COLOR_SEASONS,
  EYE_SWATCHES,
  HAIR_SWATCHES,
  SEASON_PALETTES,
  SKIN_SWATCHES,
  classifyColorProfile,
  evaluateGarmentColorHarmony,
  getSeasonPalette,
  type ColorSeasonId,
  type GuidedSwatchOption,
  type HarmonyBand,
  type PaletteColorRole,
} from '@luca/domain';
import { Check, CheckCircle2, EyeOff, Palette, Pipette, RotateCcw, Shirt, Sun } from 'lucide-react';
import { useClosetStore } from '@/features/closet/closetStore';
import { useT } from '@/i18n/i18nStore';
import { DEFAULT_COLOR_SWATCHES, useColorStore } from './colorStore';

const ROLE_LABELS: Readonly<Record<PaletteColorRole, string>> = {
  neutral: 'Neutro',
  core: 'Base',
  accent: 'Acento',
};

const HARMONY_BAND_COLORS: Readonly<Record<HarmonyBand, string>> = {
  excellent: '#1B7F5A',
  good: '#1F5F6B',
  neutral: '#8A6D1F',
  clashing: '#C2410C',
};

function isLightHex(hex: string | undefined): boolean {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.66;
}

function getMetalGradient(metal: string): string {
  const m = metal.toLowerCase();
  if (m.includes('rosa')) {
    return 'radial-gradient(circle at 30% 30%, #F7D7CE, #D59486 58%, #9A5E52)';
  }
  if (m.includes('cobre') || m.includes('bronce')) {
    return 'radial-gradient(circle at 30% 30%, #E7B889, #B36F3F 58%, #73401F)';
  }
  if (m.includes('plata') || m.includes('platino') || m.includes('blanco')) {
    return 'radial-gradient(circle at 30% 30%, #F8FAFC, #C4CBD4 58%, #7E8794)';
  }
  if (m.includes('oro') || m.includes('dorad') || m.includes('champ')) {
    return 'radial-gradient(circle at 30% 30%, #FBF0BE, #D4AA4A 58%, #8F6B1E)';
  }
  return 'radial-gradient(circle at 30% 30%, #EAE6DE, #B8B1A6 58%, #7A7368)';
}

export interface ColorViewProps {
  onOpenGarmentInCloset?: (garmentId: string) => void;
}

interface CircularSwatchRowProps {
  title: string;
  inputId: string;
  valueHex: string;
  options: readonly GuidedSwatchOption[];
  onChange: (hex: string) => void;
}

function CircularSwatchRow({
  title,
  inputId,
  valueHex,
  options,
  onChange,
}: CircularSwatchRowProps) {
  const matchedOption = options.find((opt) => opt.hex.toUpperCase() === valueHex.toUpperCase());
  const isCustom = !matchedOption;
  const lightCustom = isLightHex(valueHex);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {title}
          </h3>
          <span className="truncate text-xs font-medium text-ink">
            {matchedOption ? matchedOption.label : 'Personalizado'}
          </span>
        </div>
        <span className="shrink-0 tabular-nums text-[11px] font-medium text-muted">
          {valueHex.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 2xl:gap-2.5">
        {options.map((opt) => {
          const selected = opt.hex.toUpperCase() === valueHex.toUpperCase();
          const lightSwatch = isLightHex(opt.hex);
          return (
            <button
              key={opt.id}
              type="button"
              aria-label={opt.label}
              aria-pressed={selected}
              title={`${opt.label} · ${opt.hint}`}
              onClick={() => onChange(opt.hex)}
              style={{ backgroundColor: opt.hex }}
              className={`group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vf-chip-active-bg)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent 2xl:h-10 2xl:w-10 ${
                selected
                  ? 'scale-105 border-white/90 shadow-md ring-2 ring-[var(--vf-chip-active-bg)] ring-offset-2 ring-offset-transparent'
                  : 'border-black/15 shadow-xs dark:border-white/25'
              }`}
            >
              {selected && (
                <Check
                  className={`h-3.5 w-3.5 ${lightSwatch ? 'text-[#151413]' : 'text-white'}`}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}

        {/* Selector circular de ajuste fino */}
        <label
          htmlFor={inputId}
          title="Ajuste fino de color"
          className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-all duration-200 hover:scale-110 focus-within:ring-2 focus-within:ring-[var(--vf-chip-active-bg)] focus-within:ring-offset-2 2xl:h-10 2xl:w-10 ${
            isCustom
              ? 'scale-105 border-white/90 shadow-md ring-2 ring-[var(--vf-chip-active-bg)] ring-offset-2 ring-offset-transparent'
              : 'border-dashed border-[var(--glass-border)] bg-[var(--vf-chip-bg)] text-muted hover:text-ink'
          }`}
          style={isCustom ? { backgroundColor: valueHex } : undefined}
        >
          <Pipette
            className={`h-3.5 w-3.5 ${
              isCustom ? (lightCustom ? 'text-[#151413]' : 'text-white') : 'text-current'
            }`}
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="color"
            aria-label={`Ajuste fino ${title}`}
            value={valueHex}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

export function ColorView({ onOpenGarmentInCloset }: ColorViewProps) {
  const t = useT();
  const profile = useColorStore((s) => s.profile);
  const loaded = useColorStore((s) => s.loaded);
  const busy = useColorStore((s) => s.busy);
  const loadProfile = useColorStore((s) => s.loadProfile);
  const saveProfile = useColorStore((s) => s.saveProfile);
  const setOverrideSeason = useColorStore((s) => s.setOverrideSeason);
  const setIgnored = useColorStore((s) => s.setIgnored);
  const deleteProfile = useColorStore((s) => s.deleteProfile);

  const closetItems = useClosetStore((s) => s.items);
  const closetLoaded = useClosetStore((s) => s.loaded);
  const loadCloset = useClosetStore((s) => s.loadCloset);

  const [skinHex, setSkinHex] = useState<string>(profile?.skinHex ?? DEFAULT_COLOR_SWATCHES.skinHex);
  const [hairHex, setHairHex] = useState<string>(profile?.hairHex ?? DEFAULT_COLOR_SWATCHES.hairHex);
  const [eyeHex, setEyeHex] = useState<string>(profile?.eyeHex ?? DEFAULT_COLOR_SWATCHES.eyeHex);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | PaletteColorRole>('all');

  useEffect(() => {
    if (!loaded) {
      void loadProfile();
    }
  }, [loadProfile, loaded]);

  useEffect(() => {
    if (!closetLoaded) {
      void loadCloset();
    }
  }, [closetLoaded, loadCloset]);

  useEffect(() => {
    if (profile) {
      setSkinHex(profile.skinHex);
      setHairHex(profile.hairHex);
      setEyeHex(profile.eyeHex);
    }
  }, [profile]);

  const analysis = useMemo(
    () => classifyColorProfile({ skinHex, hairHex, eyeHex }),
    [eyeHex, hairHex, skinHex],
  );

  const activeSeasonId: ColorSeasonId = profile?.overrideSeasonId ?? analysis.primary.seasonId;
  const activePalette = useMemo(() => getSeasonPalette(activeSeasonId), [activeSeasonId]);
  const isIgnored = profile?.ignored ?? false;

  const closetHarmony = useMemo(() => {
    if (isIgnored || closetItems.length === 0) return [];
    return closetItems
      .map((item) => ({
        item,
        colorHex: item.garment.visualSpec?.primary_color_hex ?? item.garment.dominantColorHex,
      }))
      .filter((entry): entry is { item: (typeof closetItems)[number]; colorHex: string } =>
        Boolean(entry.colorHex),
      )
      .map(({ item, colorHex }) => ({
        item,
        harmony: evaluateGarmentColorHarmony(colorHex, activeSeasonId),
      }))
      .sort((a, b) => b.harmony.harmonyScore - a.harmony.harmonyScore);
  }, [activeSeasonId, closetItems, isIgnored]);

  const handleSave = async () => {
    setSavedNotice(null);
    await saveProfile({
      skinHex,
      hairHex,
      eyeHex,
      overrideSeasonId: profile?.overrideSeasonId,
      ignored: false,
    });
    setSavedNotice('Perfil de color guardado.');
  };

  const handleSelectSeason = async (seasonId: ColorSeasonId) => {
    const nextOverride = seasonId === analysis.primary.seasonId ? undefined : seasonId;
    if (profile) {
      await setOverrideSeason(nextOverride);
    } else {
      await saveProfile({
        skinHex,
        hairHex,
        eyeHex,
        overrideSeasonId: nextOverride,
        ignored: false,
      });
    }
    setSavedNotice(`Estación: ${SEASON_PALETTES[seasonId].label}.`);
  };

  const undertoneLabel =
    analysis.dimensions.undertone === 'warm'
      ? 'Cálido'
      : analysis.dimensions.undertone === 'cool'
        ? 'Frío'
        : 'Neutro';

  const undertonePercent =
    analysis.dimensions.undertone === 'warm'
      ? 84
      : analysis.dimensions.undertone === 'cool'
        ? 20
        : 52;

  const dimensionMeters = [
    {
      label: 'Subtono',
      value: undertoneLabel,
      pct: undertonePercent,
    },
    {
      label: 'Valor (L*)',
      value: `${analysis.dimensions.valueScoreL.toFixed(0)} L*`,
      pct: Math.max(8, Math.min(100, analysis.dimensions.valueScoreL)),
    },
    {
      label: 'Croma (C*)',
      value: analysis.dimensions.chromaScoreC.toFixed(1),
      pct: Math.max(8, Math.min(100, (analysis.dimensions.chromaScoreC / 60) * 100)),
    },
    {
      label: 'Contraste',
      value: `${analysis.dimensions.contrastDeltaL.toFixed(0)} L*`,
      pct: Math.max(8, Math.min(100, (analysis.dimensions.contrastDeltaL / 80) * 100)),
    },
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-3.5 xl:gap-4">
      {/* Encabezado compacto a ancho completo */}
      <section
        aria-labelledby="color-heading"
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-1"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1
            id="color-heading"
            className="font-display text-2xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-3xl"
          >
            {t.headings.color}
          </h1>
          <span
            title="Usa luz natural indirecta frente a una ventana para comparar mejor tus tonos."
            className="vf-glass hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-muted sm:inline-flex"
          >
            <Sun className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Luz natural indirecta
          </span>
          {isIgnored && (
            <span className="vf-glass rounded-full px-3 py-1 text-[11px] font-semibold text-ink">
              Pausada
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void setIgnored(!isIgnored)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
              isIgnored
                ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                : 'vf-glass text-ink hover:opacity-90'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            {isIgnored ? 'Volver a activar colorimetría' : 'Ignorar colorimetría'}
          </button>

          {profile && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSkinHex(DEFAULT_COLOR_SWATCHES.skinHex);
                setHairHex(DEFAULT_COLOR_SWATCHES.hairHex);
                setEyeHex(DEFAULT_COLOR_SWATCHES.eyeHex);
                setSavedNotice(null);
                void deleteProfile();
              }}
              className="vf-glass inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restablecer
            </button>
          )}
        </div>
      </section>

      {isIgnored ? (
        <section
          data-testid="color-ignored-banner"
          className="vf-glass-drawer flex flex-1 flex-col items-start justify-center gap-4 rounded-[26px] p-8"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-semibold text-ink">Colorimetría pausada</h2>
            <p className="text-sm text-muted">
              No se mostrarán etiquetas de estación en tu clóset ni en outfits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void setIgnored(false)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--vf-chip-active-bg)] px-4 py-2 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90"
          >
            Reactivar análisis de color
          </button>
        </section>
      ) : (
        /* Bento de 2 filas a alto y ancho completos (aprovecha el 100 % de la pantalla sin scroll) */
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 xl:gap-4">
          {/* FILA SUPERIOR (flex-1): Rasgos | Estación y métricas | Tu clóset */}
          <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-12 xl:gap-4">
            {/* COLUMNA 1: Rasgos en círculos (Piel · Cabello · Ojos) */}
            <section
              aria-label="Tus rasgos de color"
              className="vf-glass-drawer flex min-h-0 flex-col justify-between gap-3 rounded-[26px] p-4 xl:p-5 lg:col-span-5"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--glass-divider)] pb-2.5">
                <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                  Tus rasgos
                </h2>
                <div className="flex items-center -space-x-1.5" aria-hidden="true">
                  {[skinHex, hairHex, eyeHex].map((hex, i) => (
                    <span
                      key={i}
                      className="h-5 w-5 rounded-full border-2 border-[var(--vf-glass-bg)] shadow-xs"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-evenly gap-3 py-1">
                <CircularSwatchRow
                  title="Piel"
                  inputId="color-skin-custom"
                  valueHex={skinHex}
                  options={SKIN_SWATCHES}
                  onChange={setSkinHex}
                />

                <div className="border-t border-[var(--glass-divider)] pt-3">
                  <CircularSwatchRow
                    title="Cabello"
                    inputId="color-hair-custom"
                    valueHex={hairHex}
                    options={HAIR_SWATCHES}
                    onChange={setHairHex}
                  />
                </div>

                <div className="border-t border-[var(--glass-divider)] pt-3">
                  <CircularSwatchRow
                    title="Ojos"
                    inputId="color-eye-custom"
                    valueHex={eyeHex}
                    options={EYE_SWATCHES}
                    onChange={setEyeHex}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-divider)] pt-3">
                {savedNotice ? (
                  <p
                    role="status"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-accent"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{savedNotice}</span>
                  </p>
                ) : (
                  <span className="text-[11px] text-muted">Cifrado en este dispositivo</span>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSave()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-4 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                  {busy ? 'Guardando...' : 'Guardar perfil de color'}
                </button>
              </div>
            </section>

            {/* COLUMNA 2: Estación activa + Top 2 + Barras de dimensión + Metales */}
            <section
              data-testid="color-result-card"
              aria-label="Resultado de estación"
              className="vf-glass-drawer flex min-h-0 flex-col justify-between gap-3.5 rounded-[26px] p-4 xl:p-5 lg:col-span-4"
            >
              {/* Encabezado de estación + selector manual */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-divider)] pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                    {activePalette.label}
                  </h2>
                  <span className="rounded-full bg-[var(--vf-chip-bg)] px-2.5 py-0.5 tabular-nums text-[11px] font-semibold text-ink">
                    Confianza {Math.round(analysis.confidence * 100)} %
                  </span>
                </div>

                <label htmlFor="color-season-override" className="sr-only">
                  Elegir estación manualmente
                </label>
                <select
                  id="color-season-override"
                  aria-label="Elegir estación manualmente"
                  value={activeSeasonId}
                  onChange={(event) => void handleSelectSeason(event.target.value as ColorSeasonId)}
                  className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--vf-chip-bg)] px-3 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
                >
                  {COLOR_SEASONS.map((seasonId) => (
                    <option key={seasonId} value={seasonId}>
                      {SEASON_PALETTES[seasonId].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contenido central distribuido de forma uniforme */}
              <div className="flex flex-1 flex-col justify-evenly gap-3">
                {/* Top 2 opciones */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { rank: '1ª opción', candidate: analysis.primary },
                    { rank: '2ª opción', candidate: analysis.secondary },
                  ].map(({ rank, candidate }) => {
                    const isActive = activeSeasonId === candidate.seasonId;
                    return (
                      <button
                        key={candidate.seasonId}
                        type="button"
                        onClick={() => void handleSelectSeason(candidate.seasonId)}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                          isActive
                            ? 'border-[var(--vf-chip-active-bg)] bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                            : 'border-[var(--glass-border)] bg-[var(--vf-chip-bg)] text-ink hover:border-ink/35'
                        }`}
                      >
                        <div className="min-w-0">
                          <span
                            className={`block text-[10px] font-medium uppercase tracking-[0.12em] ${
                              isActive ? 'opacity-75' : 'text-muted'
                            }`}
                          >
                            {rank}
                          </span>
                          <span className="block truncate text-xs font-semibold">
                            {candidate.label}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 tabular-nums text-[11px] font-semibold ${
                            isActive ? 'bg-white/20' : 'bg-bg/70 text-ink'
                          }`}
                        >
                          {Math.round(candidate.score * 100)} %
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 4 dimensiones con barras visuales limpias */}
                <div className="grid grid-cols-2 gap-2.5">
                  {dimensionMeters.map((metric) => (
                    <div
                      key={metric.label}
                      className="flex flex-col gap-1.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/60 px-3 py-2.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10.5px] font-medium text-muted">{metric.label}</span>
                        <span className="tabular-nums text-xs font-semibold text-ink">
                          {metric.value}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--vf-chip-active-bg)] transition-all duration-300"
                          style={{ width: `${metric.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metales recomendados en círculos metálicos */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-divider)] pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Metales
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {activePalette.bestMetals.map((metal) => (
                    <span
                      key={metal}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--vf-chip-bg)] px-2.5 py-1 text-[11px] font-medium text-ink"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-black/15 shadow-xs dark:border-white/25"
                        style={{ background: getMetalGradient(metal) }}
                        aria-hidden="true"
                      />
                      {metal}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* COLUMNA 3: Afinidad con prendas reales del clóset */}
            <section
              data-testid="closet-harmony-card"
              aria-label="Afinidad de tu clóset"
              className="vf-glass-drawer flex min-h-0 flex-col gap-3 rounded-[26px] p-4 xl:p-5 lg:col-span-3"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--glass-divider)] pb-2.5">
                <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                  Tu clóset
                </h2>
                <span className="rounded-full bg-[var(--vf-chip-bg)] px-2.5 py-0.5 tabular-nums text-[11px] font-semibold text-muted">
                  {closetHarmony.length}
                </span>
              </div>

              {closetHarmony.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--vf-chip-bg)] text-muted">
                    <Shirt className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="max-w-[200px] text-xs text-muted">
                    Añade prendas en Clóset para ver su afinidad con tu paleta.
                  </p>
                </div>
              ) : (
                <ul className="vf-drawer-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                  {closetHarmony.map(({ item, harmony }) => {
                    const lightGarment = isLightHex(harmony.garmentHex);
                    return (
                      <li key={item.garment.id}>
                        <button
                          type="button"
                          onClick={() => onOpenGarmentInCloset?.(item.garment.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/60 px-3 py-2 text-left transition-all hover:border-ink/35 hover:bg-[var(--vf-chip-bg)]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/15 shadow-xs dark:border-white/25"
                              style={{ backgroundColor: harmony.garmentHex }}
                              aria-hidden="true"
                            >
                              <Shirt
                                className={`h-3.5 w-3.5 ${
                                  lightGarment ? 'text-[#151413]/85' : 'text-white/95'
                                }`}
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink">
                                {item.garment.name}
                              </p>
                              <p className="truncate text-[10.5px] text-muted">
                                {harmony.closestColor.name} · ΔE₀₀ {harmony.minDeltaE00.toFixed(1)}
                              </p>
                            </div>
                          </div>
                          <span
                            className="shrink-0 rounded-full border px-2 py-0.5 tabular-nums text-[11px] font-semibold"
                            style={{
                              borderColor: HARMONY_BAND_COLORS[harmony.band],
                              color: HARMONY_BAND_COLORS[harmony.band],
                            }}
                          >
                            {harmony.scorePercent} %
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* FILA INFERIOR A ANCHO COMPLETO: Galería circular de los 14 tonos de la estación */}
          <section
            aria-label="Paleta sugerida de la estación"
            className="vf-glass-drawer flex shrink-0 flex-col gap-3.5 rounded-[26px] p-4 xl:px-6 xl:py-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                  Paleta · {activePalette.label}
                </h2>
                <span className="rounded-full bg-[var(--vf-chip-bg)] px-2.5 py-0.5 tabular-nums text-[11px] font-medium text-muted">
                  {activePalette.colors.length} tonos
                </span>
              </div>

              {/* Filtro visual rápido por rol (resalta sin ocultar nodos para mantener el mapa completo) */}
              <div
                className="flex flex-wrap items-center gap-1 rounded-full bg-[var(--vf-chip-bg)] p-1"
                role="group"
                aria-label="Resaltar rol de color"
              >
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'neutral', label: 'Neutros' },
                    { id: 'core', label: 'Base' },
                    { id: 'accent', label: 'Acentos' },
                  ] as const
                ).map((opt) => {
                  const active = roleFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRoleFilter(opt.id)}
                      className={`cursor-pointer rounded-full px-3 py-0.5 text-[11px] font-medium transition-all ${
                        active
                          ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              data-testid="season-palette-grid"
              className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-7 xl:grid-cols-14"
            >
              {activePalette.colors.map((swatch) => {
                const dimmed = roleFilter !== 'all' && swatch.role !== roleFilter;
                return (
                  <div
                    key={`${activePalette.id}-${swatch.hex}`}
                    title={`${swatch.name} · ${ROLE_LABELS[swatch.role]} · ${swatch.hex}`}
                    className={`group flex flex-col items-center gap-1.5 text-center transition-opacity duration-200 ${
                      dimmed ? 'opacity-25' : 'opacity-100'
                    }`}
                  >
                    <span
                      className="h-10 w-10 rounded-full border border-black/15 shadow-sm transition-transform duration-200 group-hover:scale-110 dark:border-white/25 xl:h-11 xl:w-11 2xl:h-14 2xl:w-14"
                      style={{ backgroundColor: swatch.hex }}
                      aria-hidden="true"
                    />
                    <span className="line-clamp-2 w-full text-[10.5px] font-medium leading-[1.15] text-ink">
                      {swatch.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
