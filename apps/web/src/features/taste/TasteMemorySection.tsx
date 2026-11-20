import { useEffect, useState } from 'react';
import {
  TASTE_FEATURE_CATEGORIES,
  serializeTasteKey,
  type TasteFeatureAffinity,
  type TasteFeatureCategory,
} from '@luca/domain';
import { Ban, CheckCircle2, Pause, Pin, Play, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
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
  '1': 'Nivel 1 · Deportivo',
  '2': 'Nivel 2 · Casual',
  '3': 'Nivel 3 · Smart casual',
  '4': 'Nivel 4 · Oficina',
  '5': 'Nivel 5 · Formal',
};

const QUICK_COLOR_FAMILIES = ['neutro', 'azul', 'verde', 'tierra', 'calido', 'violeta'] as const;

function formatFeatureValue(value: string): string {
  return VALUE_LABELS_ES[value] ?? value;
}

export function TasteMemorySection() {
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
    <Card data-testid="taste-memory-section">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Tus gustos aprendidos</CardTitle>
            <Badge variant={profile.activeInScoring && !prefs.learningPaused ? 'accent' : 'neutral'}>
              {statusLabel}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={prefs.learningPaused ? 'primary' : 'outline'}
              onClick={async () => {
                await setLearningPaused(!prefs.learningPaused);
                setNotice(
                  !prefs.learningPaused
                    ? 'Aprendizaje pausado. Tus interacciones nuevas no se registrarán.'
                    : 'Aprendizaje reanudado.',
                );
              }}
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
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await forgetAllTaste();
                setNotice('Se olvidaron todos tus gustos y reglas aprendidas.');
              }}
              className="border-[#C2410C] text-[#C2410C]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Olvidar todos mis gustos
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {notice && (
          <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}

        {/* Control explícito de familias de color (fijar o vetar manda sobre lo aprendido) */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-ink">Colores fijados o vetados</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_COLOR_FAMILIES.map((family) => {
              const key = serializeTasteKey('color_family', family);
              const rule = prefs.rules[key];
              return (
                <div
                  key={family}
                  className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs"
                >
                  <span className="font-medium text-ink">{formatFeatureValue(family)}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={rule === 'pinned' ? 'primary' : 'outline'}
                      aria-label={`Fijar color ${formatFeatureValue(family)}`}
                      onClick={() =>
                        void setExplicitRule(
                          'color_family',
                          family,
                          rule === 'pinned' ? null : 'pinned',
                        )
                      }
                    >
                      <Pin className="h-3 w-3" aria-hidden="true" />
                      Fijar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={rule === 'vetoed' ? 'primary' : 'outline'}
                      aria-label={`Vetar color ${formatFeatureValue(family)}`}
                      onClick={() =>
                        void setExplicitRule(
                          'color_family',
                          family,
                          rule === 'vetoed' ? null : 'vetoed',
                        )
                      }
                    >
                      <Ban className="h-3 w-3" aria-hidden="true" />
                      Vetar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista transparente de afinidades por categoría */}
        {profile.rankedAffinities.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] border border-border bg-bg p-3 text-xs text-muted">
            Todavía no hay afinidades registradas. Marca «Me gusta», guarda o registra el uso de
            outfits para empezar a personalizar tus recomendaciones.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {TASTE_FEATURE_CATEGORIES.map((category) => {
              const rows = grouped.get(category) ?? [];
              if (rows.length === 0) return null;

              return (
                <div key={category} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-ink">
                      {CATEGORY_LABELS_ES[category]}
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await forgetCategory(category);
                        setNotice(`Olvidados los gustos de ${CATEGORY_LABELS_ES[category].toLowerCase()}.`);
                      }}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Olvidar categoría
                    </Button>
                  </div>

                  <ul className="grid gap-2 sm:grid-cols-2">
                    {rows.map((entry) => {
                      const pct = Math.round(entry.affinity * 100);
                      return (
                        <li
                          key={entry.key}
                          className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">
                              {formatFeatureValue(entry.value)}
                            </p>
                            <p className="tabular-nums text-[11px] text-muted">
                              Afinidad {pct} % · {entry.supportingEvents} interacción(es)
                              {entry.explicitRule === 'pinned'
                                ? ' · Fijado'
                                : entry.explicitRule === 'vetoed'
                                  ? ' · Vetado'
                                  : ''}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={entry.explicitRule === 'pinned' ? 'primary' : 'outline'}
                              onClick={() =>
                                void setExplicitRule(
                                  entry.category,
                                  entry.value,
                                  entry.explicitRule === 'pinned' ? null : 'pinned',
                                )
                              }
                            >
                              Fijar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={entry.explicitRule === 'vetoed' ? 'primary' : 'outline'}
                              onClick={() =>
                                void setExplicitRule(
                                  entry.category,
                                  entry.value,
                                  entry.explicitRule === 'vetoed' ? null : 'vetoed',
                                )
                              }
                            >
                              Vetar
                            </Button>
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

        {/* Política de retención (T10.6) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="taste-retention-select" className="font-medium text-muted">
              Conservar historial detallado:
            </label>
            <select
              id="taste-retention-select"
              value={prefs.retentionMonths}
              onChange={(event) =>
                void setRetentionMonths(Number(event.target.value) as RetentionMonths)
              }
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1 text-xs text-ink"
            >
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
              <option value={24}>24 meses</option>
            </select>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              const summary = await compactByRetention();
              setNotice(
                summary.compactedEvents > 0
                  ? `Compactados ${summary.compactedEvents} eventos antiguos.`
                  : 'No hay eventos anteriores al periodo de retención.',
              );
            }}
          >
            Aplicar retención ahora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
