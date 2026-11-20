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
import { CheckCircle2, EyeOff, Info, Palette, RotateCcw, Shirt, Sun } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
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

export interface ColorViewProps {
  onOpenGarmentInCloset?: (garmentId: string) => void;
}

interface SwatchPickerProps {
  title: string;
  description: string;
  inputId: string;
  valueHex: string;
  options: readonly GuidedSwatchOption[];
  onChange: (hex: string) => void;
}

function SwatchPicker({
  title,
  description,
  inputId,
  valueHex,
  options,
  onChange,
}: SwatchPickerProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <label
          htmlFor={inputId}
          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1 text-xs text-muted"
        >
          <span>Ajuste fino</span>
          <input
            id={inputId}
            type="color"
            value={valueHex}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="h-5 w-7 cursor-pointer rounded-xs border border-border bg-transparent p-0"
          />
          <span className="tabular-nums font-medium text-ink">{valueHex}</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {options.map((opt) => {
          const selected = opt.hex.toUpperCase() === valueHex.toUpperCase();
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.hex)}
              className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-[var(--radius-sm)] border p-2 text-left transition-colors ${
                selected
                  ? 'border-accent bg-surface ring-1 ring-accent'
                  : 'border-border bg-bg hover:border-accent/60'
              }`}
            >
              <span
                className="block h-7 w-full rounded-xs border border-border"
                style={{ backgroundColor: opt.hex }}
                aria-hidden="true"
              />
              <span className="line-clamp-1 text-xs font-medium text-ink">{opt.label}</span>
              <span className="line-clamp-1 text-[11px] text-muted">{opt.hint}</span>
            </button>
          );
        })}
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
      .filter((item) => Boolean(item.garment.dominantColorHex))
      .map((item) => ({
        item,
        harmony: evaluateGarmentColorHarmony(item.garment.dominantColorHex!, activeSeasonId),
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
    setSavedNotice('Perfil de color guardado cifrado en tu dispositivo.');
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
    setSavedNotice(`Estación activa actualizada a ${SEASON_PALETTES[seasonId].label}.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="color-heading" className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="color-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t.headings.color}
            </h1>
            {isIgnored && <Badge>Pausada</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isIgnored ? 'primary' : 'outline'}
            size="sm"
            disabled={busy}
            onClick={() => void setIgnored(!isIgnored)}
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            {isIgnored ? 'Volver a activar colorimetría' : 'Ignorar colorimetría'}
          </Button>
          {profile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setSkinHex(DEFAULT_COLOR_SWATCHES.skinHex);
                setHairHex(DEFAULT_COLOR_SWATCHES.hairHex);
                setEyeHex(DEFAULT_COLOR_SWATCHES.eyeHex);
                setSavedNotice(null);
                void deleteProfile();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Restablecer
            </Button>
          )}
        </div>
      </section>

      {/* Consejos de luz natural (T8.2) */}
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 text-xs text-muted">
        <Sun className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-ink">Consejos de luz para elegir tus muestras</p>
          <p>
            Observa tu rostro frente a una ventana con <strong>luz natural indirecta</strong> (sin
            sol directo ni bombillas amarillas) y con el brillo de pantalla en modo neutro. La
            colorimetría es una guía de estilo orientativa, nunca una regla rígida: puedes elegir tu
            estación manualmente o ignorarla por completo.
          </p>
        </div>
      </div>

      {isIgnored ? (
        <Card data-testid="color-ignored-banner">
          <CardHeader>
            <CardTitle>Colorimetría pausada por tu decisión</CardTitle>
            <CardDescription>
              Luca no aplicará filtros ni etiquetas de estación en tu clóset mientras esta opción
              esté activa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => void setIgnored(false)}>
              Reactivar análisis de color
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          {/* Selector guiado de piel, cabello y ojos */}
          <Card>
            <CardHeader>
              <CardTitle>Tus rasgos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <SwatchPicker
                title="1. Tono de piel (rostro / cuello)"
                description="Elige la muestra más cercana a la zona interior de tu muñeca o mandíbula."
                inputId="color-skin-custom"
                valueHex={skinHex}
                options={SKIN_SWATCHES}
                onChange={setSkinHex}
              />

              <SwatchPicker
                title="2. Color natural de cabello"
                description="Usa tu tono en la raíz bajo luz natural."
                inputId="color-hair-custom"
                valueHex={hairHex}
                options={HAIR_SWATCHES}
                onChange={setHairHex}
              />

              <SwatchPicker
                title="3. Color de ojos"
                description="Selecciona el matiz dominante del iris."
                inputId="color-eye-custom"
                valueHex={eyeHex}
                options={EYE_SWATCHES}
                onChange={setEyeHex}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Info className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{analysis.explanation}</span>
                </div>
                <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                  <Palette className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Guardando...' : 'Guardar perfil de color'}
                </Button>
              </div>

              {savedNotice && (
                <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-accent">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{savedNotice}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Resultado: Top 2, confianza, paleta y afinidad del clóset */}
          <div className="flex flex-col gap-5">
            <Card data-testid="color-result-card">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Resultado: {activePalette.label}</CardTitle>
                  <Badge variant="accent" className="tabular-nums">
                    Confianza {Math.round(analysis.confidence * 100)} %
                  </Badge>
                </div>
                <CardDescription>{activePalette.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Top 2 de estaciones */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { rank: '1ª opción sugerida', candidate: analysis.primary },
                    { rank: '2ª opción probable', candidate: analysis.secondary },
                  ].map(({ rank, candidate }) => {
                    const isActive = activeSeasonId === candidate.seasonId;
                    return (
                      <button
                        key={candidate.seasonId}
                        type="button"
                        onClick={() => void handleSelectSeason(candidate.seasonId)}
                        className={`flex cursor-pointer flex-col gap-1 rounded-[var(--radius-sm)] border p-3 text-left transition-colors ${
                          isActive
                            ? 'border-accent bg-bg ring-1 ring-accent'
                            : 'border-border bg-bg hover:border-accent/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-muted">{rank}</span>
                          <Badge className="tabular-nums">
                            {Math.round(candidate.score * 100)} %
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-ink">{candidate.label}</span>
                        <span className="text-xs text-muted">{candidate.reason}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selector manual de cualquiera de las 12 estaciones */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs">
                  <label htmlFor="color-season-override" className="font-medium text-muted">
                    Elegir otra estación manualmente:
                  </label>
                  <select
                    id="color-season-override"
                    value={activeSeasonId}
                    onChange={(event) => void handleSelectSeason(event.target.value as ColorSeasonId)}
                    className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 text-xs text-ink"
                  >
                    {COLOR_SEASONS.map((seasonId) => (
                      <option key={seasonId} value={seasonId}>
                        {SEASON_PALETTES[seasonId].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desglose de dimensiones */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                    <p className="text-muted">Subtono</p>
                    <p className="tabular-nums font-semibold text-ink">
                      {analysis.dimensions.undertone === 'warm'
                        ? 'Cálido'
                        : analysis.dimensions.undertone === 'cool'
                          ? 'Frío'
                          : 'Neutro'}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                    <p className="text-muted">Valor (L*)</p>
                    <p className="tabular-nums font-semibold text-ink">
                      {analysis.dimensions.valueScoreL.toFixed(0)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                    <p className="text-muted">Croma (C*)</p>
                    <p className="tabular-nums font-semibold text-ink">
                      {analysis.dimensions.chromaScoreC.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                    <p className="text-muted">Contraste</p>
                    <p className="tabular-nums font-semibold text-ink">
                      {analysis.dimensions.contrastDeltaL.toFixed(0)} L*
                    </p>
                  </div>
                </div>

                {/* Paleta de 14 colores de la estación */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink">
                      Paleta sugerida ({activePalette.colors.length} tonos)
                    </span>
                    <span className="text-muted">
                      Metales: {activePalette.bestMetals.join(' · ')}
                    </span>
                  </div>
                  <div
                    data-testid="season-palette-grid"
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  >
                    {activePalette.colors.map((swatch) => (
                      <div
                        key={`${activePalette.id}-${swatch.hex}`}
                        className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg p-1.5"
                      >
                        <span
                          className="h-7 w-7 shrink-0 rounded-xs border border-border"
                          style={{ backgroundColor: swatch.hex }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-ink">{swatch.name}</p>
                          <p className="tabular-nums text-[10px] text-muted">
                            {ROLE_LABELS[swatch.role]} · {swatch.hex}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Afinidad con prendas del clóset */}
            <Card data-testid="closet-harmony-card">
              <CardHeader className="pb-3">
                <CardTitle>Afinidad de tu clóset</CardTitle>
                <CardDescription>Prendas más afines a {activePalette.label}</CardDescription>
              </CardHeader>
              <CardContent>
                {closetHarmony.length === 0 ? (
                  <p className="text-xs text-muted">
                    Añade prendas con color de referencia en tu Clóset para ver aquí su afinidad
                    con tu paleta estacional.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {closetHarmony.slice(0, 6).map(({ item, harmony }) => (
                      <li key={item.garment.id}>
                        <button
                          type="button"
                          onClick={() => onOpenGarmentInCloset?.(item.garment.id)}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-left transition-colors hover:border-accent"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border"
                              style={{ backgroundColor: harmony.garmentHex }}
                              aria-hidden="true"
                            >
                              <Shirt className="h-3.5 w-3.5 text-white" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink">
                                {item.garment.name}
                              </p>
                              <p className="truncate text-[11px] text-muted">
                                Cercano a {harmony.closestColor.name} · ΔE₀₀{' '}
                                {harmony.minDeltaE00.toFixed(1)}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className="shrink-0 tabular-nums"
                            style={{
                              borderColor: HARMONY_BAND_COLORS[harmony.band],
                              color: HARMONY_BAND_COLORS[harmony.band],
                            }}
                          >
                            {harmony.scorePercent} %
                          </Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
