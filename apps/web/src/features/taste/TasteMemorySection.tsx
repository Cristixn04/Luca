import { useEffect, useState } from 'react';
import {
  TASTE_FEATURE_CATEGORIES,
  serializeTasteKey,
  type TasteFeatureAffinity,
  type TasteFeatureCategory,
} from '@luca/domain';
import { Ban, CheckCircle2, Pause, Pin, Play, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useTasteStore, type RetentionMonths } from './tasteStore';

const CATEGORY_LABELS_ES: Readonly<Record<TasteFeatureCategory, string>> = {
  color_family: 'Familia de color',
  category: 'Tipo de prenda',
  formality: 'Formalidad',
  pattern: 'Patrón',
  fit_band: 'Calce',
};

const VALUE_LABELS_ES: Readonly<Record<string, string>> = {
  neutro: 'Neutro',
  azul: 'Azul',
  verde: 'Verde',
  tierra: 'Tierra',
  calido: 'Cálido',
  violeta: 'Violeta',
  tshirt: 'Camiseta',
  long_sleeve: 'Manga larga',
  jacket: 'Chaqueta',
  pants: 'Pantalón',
  shorts: 'Short',
  skirt: 'Falda',
  dress: 'Vestido',
  solid: 'Liso',
  striped: 'Rayas',
  plaid: 'Cuadros',
  floral: 'Floral',
  graphic: 'Gráfico',
  textured: 'Texturizado',
  other: 'Otro',
  tense: 'Tenso',
  tight: 'Ajustado',
  regular: 'Regular',
  loose: 'Holgado',
  oversize: 'Oversize',
  '1': 'Deportivo',
  '2': 'Casual',
  '3': 'Smart casual',
  '4': 'Oficina',
  '5': 'Formal',
};

const QUICK_COLOR_FAMILIES: readonly {
  id: 'neutro' | 'azul' | 'verde' | 'tierra' | 'calido' | 'violeta';
  hex: string;
}[] = [
  { id: 'neutro', hex: '#C6C1B8' },
  { id: 'azul', hex: '#2F5B8C' },
  { id: 'verde', hex: '#3E7358' },
  { id: 'tierra', hex: '#8F6240' },
  { id: 'calido', hex: '#CC6337' },
  { id: 'violeta', hex: '#6F4E8F' },
];

function formatFeatureValue(value: string): string {
  return VALUE_LABELS_ES[value] ?? value;
}

export interface TasteMemorySectionProps {
  className?: string;
}

export function TasteMemorySection({ className = '' }: TasteMemorySectionProps) {
  const prefs = useTasteStore((s) => s.prefs);
  const profile = useTasteStore((s) => s.profile);
  const loaded = useTasteStore((s) => s.loaded);
  const loadTaste = useTasteStore((s) => s.loadTaste);
  const setLearningPaused = useTasteStore((s) => s.setLearningPaused);
  const setRetentionMonths = useTasteStore((s) => s.setRetentionMonths);
  const setExplicitRule = useTasteStore((s) => s.setExplicitRule);
  const forgetCategory = useTasteStore((s) => s.forgetCategory);
  const forgetAllTaste = useTasteStore((s) => s.forgetAllTaste);
  const compactByRetention = useTasteStore((s) => s.compactByRetention);

  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      void loadTaste();
    }
  }, [loadTaste, loaded]);

  const grouped = new Map<TasteFeatureCategory, TasteFeatureAffinity[]>();
  for (const cat of TASTE_FEATURE_CATEGORIES) {
    grouped.set(cat, []);
  }
  for (const entry of profile.rankedAffinities) {
    grouped.get(entry.category)?.push(entry);
  }

  const statusLabel = prefs.learningPaused
    ? 'Aprendizaje pausado'
    : profile.isColdStart
      ? `Aprendiendo (${profile.totalScoringEvents} / ${profile.coldStartThreshold})`
      : 'Aprendizaje activo';

  return (
    <section
      data-testid="taste-memory-section"
      aria-label="Tus gustos aprendidos"
      className={`vf-glass-drawer flex min-h-0 flex-col justify-between gap-3.5 rounded-[26px] p-4 xl:p-5 ${className}`}
    >
      {/* Encabezado + estado + controles principales */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--glass-divider)] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">
            Tus gustos
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 tabular-nums text-[11px] font-semibold ${
              profile.activeInScoring && !prefs.learningPaused
                ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                : 'bg-[var(--vf-chip-bg)] text-muted'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={async () => {
              await setLearningPaused(!prefs.learningPaused);
              setNotice(
                !prefs.learningPaused ? 'Aprendizaje pausado.' : 'Aprendizaje reanudado.',
              );
            }}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              prefs.learningPaused
                ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                : 'bg-[var(--vf-chip-bg)] text-ink hover:opacity-85'
            }`}
          >
            {prefs.learningPaused ? (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Reanudar aprendizaje
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                Pausar aprendizaje
              </>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              await forgetAllTaste();
              setNotice('Se olvidaron todos tus gustos y reglas aprendidas.');
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#C2410C]/45 bg-[#C2410C]/8 px-3 py-1.5 text-xs font-medium text-[#C2410C] transition-colors hover:bg-[#C2410C]/15"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Olvidar todos mis gustos
          </button>
        </div>
      </div>

      {/* Reglas explícitas de familias de color en círculos */}
      <div className="flex shrink-0 flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Preferencias de color
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_COLOR_FAMILIES.map((family) => {
            const key = serializeTasteKey('color_family', family.id);
            const rule = prefs.rules[key];
            const label = formatFeatureValue(family.id);

            return (
              <div
                key={family.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                  rule === 'pinned'
                    ? 'border-[var(--vf-chip-active-bg)]/50 bg-[var(--vf-chip-bg)]'
                    : rule === 'vetoed'
                      ? 'border-[#C2410C]/40 bg-[#C2410C]/6'
                      : 'border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/60'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-black/15 shadow-xs dark:border-white/25"
                    style={{ backgroundColor: family.hex }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-ink">{label}</span>
                    {rule && (
                      <span className="block text-[10px] font-medium text-muted">
                        {rule === 'pinned' ? 'Fijado' : 'Vetado'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Fijar color ${label}`}
                    aria-pressed={rule === 'pinned'}
                    title={`Fijar ${label}`}
                    onClick={() =>
                      void setExplicitRule(
                        'color_family',
                        family.id,
                        rule === 'pinned' ? null : 'pinned',
                      )
                    }
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all ${
                      rule === 'pinned'
                        ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                        : 'bg-bg/65 text-muted hover:text-ink'
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Vetar color ${label}`}
                    aria-pressed={rule === 'vetoed'}
                    title={`Vetar ${label}`}
                    onClick={() =>
                      void setExplicitRule(
                        'color_family',
                        family.id,
                        rule === 'vetoed' ? null : 'vetoed',
                      )
                    }
                    className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all ${
                      rule === 'vetoed'
                        ? 'bg-[#C2410C] text-white shadow-xs'
                        : 'bg-bg/65 text-muted hover:text-[#C2410C]'
                    }`}
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Afinidades aprendidas (zona flexible con scroll interno encapsulado) */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 border-t border-[var(--glass-divider)] pt-3">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Afinidades detectadas
        </span>

        {profile.rankedAffinities.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/35 px-4 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--vf-chip-bg)] text-muted">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="max-w-xs text-xs text-muted">
              Sin afinidades aún. Marca «Me gusta» o guarda outfits para personalizar sugerencias.
            </p>
          </div>
        ) : (
          <div className="vf-drawer-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
            {TASTE_FEATURE_CATEGORIES.map((category) => {
              const rows = grouped.get(category) ?? [];
              if (rows.length === 0) return null;

              return (
                <div key={category} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold text-ink">
                      {CATEGORY_LABELS_ES[category]}
                    </h3>
                    <button
                      type="button"
                      onClick={async () => {
                        await forgetCategory(category);
                        setNotice(
                          `Olvidados los gustos de ${CATEGORY_LABELS_ES[category].toLowerCase()}.`,
                        );
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-muted transition-colors hover:text-[#C2410C]"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Olvidar categoría
                    </button>
                  </div>

                  <ul className="grid gap-2 sm:grid-cols-2">
                    {rows.map((entry) => {
                      const pct = Math.round(entry.affinity * 100);
                      return (
                        <li
                          key={entry.key}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--vf-chip-bg)]/60 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-semibold text-ink">
                                {formatFeatureValue(entry.value)}
                              </span>
                              <span className="shrink-0 tabular-nums text-[11px] font-semibold text-ink">
                                {pct} %
                              </span>
                            </div>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                              <div
                                className="h-full rounded-full bg-[var(--vf-chip-active-bg)]"
                                style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                              />
                            </div>
                            <p className="mt-1 tabular-nums text-[10px] text-muted">
                              {entry.supportingEvents} interacción(es)
                              {entry.explicitRule === 'pinned'
                                ? ' · Fijado'
                                : entry.explicitRule === 'vetoed'
                                  ? ' · Vetado'
                                  : ''}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Fijar ${formatFeatureValue(entry.value)}`}
                              aria-pressed={entry.explicitRule === 'pinned'}
                              onClick={() =>
                                void setExplicitRule(
                                  entry.category,
                                  entry.value,
                                  entry.explicitRule === 'pinned' ? null : 'pinned',
                                )
                              }
                              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all ${
                                entry.explicitRule === 'pinned'
                                  ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                                  : 'bg-bg/65 text-muted hover:text-ink'
                              }`}
                            >
                              <Pin className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Vetar ${formatFeatureValue(entry.value)}`}
                              aria-pressed={entry.explicitRule === 'vetoed'}
                              onClick={() =>
                                void setExplicitRule(
                                  entry.category,
                                  entry.value,
                                  entry.explicitRule === 'vetoed' ? null : 'vetoed',
                                )
                              }
                              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all ${
                                entry.explicitRule === 'vetoed'
                                  ? 'bg-[#C2410C] text-white'
                                  : 'bg-bg/65 text-muted hover:text-[#C2410C]'
                              }`}
                            >
                              <Ban className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie compacto: retención + estado */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-divider)] pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="taste-retention-select" className="text-[11px] font-medium text-muted">
            Retención
          </label>
          <select
            id="taste-retention-select"
            value={prefs.retentionMonths}
            onChange={(event) =>
              void setRetentionMonths(Number(event.target.value) as RetentionMonths)
            }
            className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--vf-chip-bg)] px-2.5 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>
          <button
            type="button"
            onClick={async () => {
              const summary = await compactByRetention();
              setNotice(
                summary.compactedEvents > 0
                  ? `Compactados ${summary.compactedEvents} eventos antiguos.`
                  : 'Sin eventos antiguos por compactar.',
              );
            }}
            className="cursor-pointer rounded-full bg-[var(--vf-chip-bg)] px-3 py-1 text-[11px] font-medium text-ink transition-opacity hover:opacity-85"
          >
            Aplicar retención ahora
          </button>
        </div>

        {notice && (
          <p role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}
      </div>
    </section>
  );
}
