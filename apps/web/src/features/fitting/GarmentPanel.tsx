import { useEffect } from 'react';
import {
  GARMENT_CATEGORIES,
  fromCm,
  toCm,
  type FitPreference,
  type FitReport,
  type FitZone,
  type GarmentCategory,
  type GarmentFlatMeasurements,
} from '@luca/domain';
import { Shirt, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { useClosetStore } from '@/features/closet/closetStore';
import { CATEGORY_LABELS, type GarmentWithSizes } from '@/features/closet/types';
import { useFittingStore } from './store';
import { FIT_STATE_HEX, FIT_STATE_LABELS } from './svg/heatmapMeta';

const ZONE_LABELS: Readonly<Record<FitZone, string>> = {
  chest: 'Pecho',
  waist: 'Cintura',
  hip: 'Cadera',
  shoulders: 'Hombros',
  back: 'Espalda',
};

const ELASTICITY_PRESETS = [
  { label: 'Plana (0 %)', value: 0 },
  { label: 'Punto (5 %)', value: 0.05 },
  { label: 'Elastano (15 %)', value: 0.15 },
] as const;

const PREFERENCE_OPTIONS: readonly { value: FitPreference; label: string }[] = [
  { value: 'tight', label: 'Ajustado' },
  { value: 'regular', label: 'Regular' },
  { value: 'loose', label: 'Holgado' },
];

interface GarmentFieldSpec {
  readonly key: keyof GarmentFlatMeasurements;
  readonly label: string;
  readonly hint: string;
}

const UPPER_FIELDS: readonly GarmentFieldSpec[] = [
  { key: 'chestFlat', label: 'Pecho en plano', hint: 'Axila a axila (×2)' },
  { key: 'shoulders', label: 'Hombros', hint: 'Costura a costura' },
  { key: 'backWidth', label: 'Ancho de espalda', hint: 'Opcional' },
];

const LOWER_FIELDS: readonly GarmentFieldSpec[] = [
  { key: 'waistFlat', label: 'Cintura en plano', hint: 'Borde a borde (×2)' },
  { key: 'hipFlat', label: 'Cadera en plano', hint: 'Zona más ancha (×2)' },
];

const GARMENT_FIELDS: Record<GarmentCategory, readonly GarmentFieldSpec[]> = {
  tshirt: UPPER_FIELDS,
  long_sleeve: UPPER_FIELDS,
  jacket: UPPER_FIELDS,
  pants: LOWER_FIELDS,
  shorts: LOWER_FIELDS,
  skirt: LOWER_FIELDS,
  dress: [
    { key: 'chestFlat', label: 'Pecho en plano', hint: 'Axila a axila (×2)' },
    { key: 'waistFlat', label: 'Cintura en plano', hint: 'Borde a borde (×2)' },
    { key: 'hipFlat', label: 'Cadera en plano', hint: 'Zona más ancha (×2)' },
  ],
};

function formatEase(easeCm: number, unit: 'cm' | 'in'): string {
  const sign = easeCm >= 0 ? '+' : '-';
  const abs = fromCm(Math.abs(easeCm), unit);
  return `${sign}${abs.toFixed(1)} ${unit}`;
}

export function applyClosetItemToFitting(item: GarmentWithSizes, preferredSizeLabel?: string) {
  const size =
    (preferredSizeLabel ? item.sizes.find((s) => s.label === preferredSizeLabel) : undefined) ??
    item.sizes[0];

  useFittingStore.setState({
    garmentEnabled: true,
    garmentSource: 'closet',
    selectedClosetGarmentId: item.garment.id,
    garmentCategory: item.garment.category,
    garmentName: item.garment.name,
    garmentColorHex:
      item.garment.visualSpec?.primary_color_hex ?? item.garment.dominantColorHex ?? '#1F5F6B',
    garmentSizeLabel: size?.label ?? 'M',
    garmentElasticity: item.garment.elasticity,
    garmentFlatMeasures: size ? { ...size.flatMeasuresCm } : {},
  });
}

export interface GarmentPanelProps {
  fitReport: FitReport | null;
  onManualCategorySelect?: () => void;
  onClearAllGarments?: () => void;
  onOpenCloset?: () => void;
  onClose?: () => void;
}

export function GarmentPanel({
  fitReport,
  onManualCategorySelect,
  onClearAllGarments,
  onOpenCloset,
  onClose,
}: GarmentPanelProps) {
  const unit = useFittingStore((s) => s.unit);
  const garmentEnabled = useFittingStore((s) => s.garmentEnabled);
  const garmentSource = useFittingStore((s) => s.garmentSource);
  const selectedClosetGarmentId = useFittingStore((s) => s.selectedClosetGarmentId);
  const garmentCategory = useFittingStore((s) => s.garmentCategory);
  const garmentName = useFittingStore((s) => s.garmentName);
  const garmentSizeLabel = useFittingStore((s) => s.garmentSizeLabel);
  const garmentElasticity = useFittingStore((s) => s.garmentElasticity);
  const garmentFlatMeasures = useFittingStore((s) => s.garmentFlatMeasures);
  const fitPreference = useFittingStore((s) => s.fitPreference);

  const setGarmentSource = useFittingStore((s) => s.setGarmentSource);
  const setGarmentCategory = useFittingStore((s) => s.setGarmentCategory);
  const setGarmentName = useFittingStore((s) => s.setGarmentName);
  const setGarmentSizeLabel = useFittingStore((s) => s.setGarmentSizeLabel);
  const setGarmentElasticity = useFittingStore((s) => s.setGarmentElasticity);
  const setGarmentFlatMeasure = useFittingStore((s) => s.setGarmentFlatMeasure);
  const clearGarment = useFittingStore((s) => s.clearGarment);
  const restoreDefaultGarment = useFittingStore((s) => s.restoreDefaultGarment);
  const setFitPreference = useFittingStore((s) => s.setFitPreference);

  const closetItems = useClosetStore((s) => s.items);
  const closetLoaded = useClosetStore((s) => s.loaded);
  const loadCloset = useClosetStore((s) => s.loadCloset);

  useEffect(() => {
    if (!closetLoaded) {
      void loadCloset();
    }
  }, [closetLoaded, loadCloset]);

  const selectedClosetItem =
    closetItems.find((item) => item.garment.id === selectedClosetGarmentId) ?? null;

  const handleSwitchToCloset = () => {
    if (selectedClosetItem) {
      setGarmentSource('closet');
      return;
    }
    if (closetItems.length > 0) {
      applyClosetItemToFitting(closetItems[0]!);
    } else {
      setGarmentSource('closet');
    }
  };

  const handleSwitchToQuick = (category: GarmentCategory = garmentCategory) => {
    onManualCategorySelect?.();
    restoreDefaultGarment(category);
    useFittingStore.setState({
      garmentSource: 'quick',
      selectedClosetGarmentId: null,
    });
  };

  const handleClear = () => {
    onClearAllGarments?.();
    clearGarment();
  };

  if (!garmentEnabled) {
    return (
      <section
        aria-label="Configuración de prenda"
        className="vf-glass-drawer flex max-h-full flex-col overflow-hidden rounded-[24px]"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--glass-divider)] px-5 pb-3 pt-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">Prenda</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de prenda"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--vf-chip-bg)] text-muted transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="vf-drawer-scroll flex flex-1 min-h-0 flex-col items-start gap-3.5 overflow-y-auto overscroll-contain px-5 py-4 text-xs text-muted">
          <p>
            {closetItems.length > 0
              ? 'Sin prenda activa en el probador. Elige una de tu clóset o prueba una prenda rápida.'
              : 'Tu clóset aún no tiene prendas. Añade prendas reales en Clóset o prueba una prenda rápida temporal.'}
          </p>

          <div className="flex flex-wrap gap-2">
            {closetItems.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onManualCategorySelect?.();
                  applyClosetItemToFitting(closetItems[0]!);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90"
              >
                <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                Elegir de mi clóset ({closetItems.length})
              </button>
            ) : (
              onOpenCloset && (
                <button
                  type="button"
                  onClick={onOpenCloset}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-active-bg)] px-3.5 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)] transition-opacity hover:opacity-90"
                >
                  <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                  Ir al Clóset
                </button>
              )
            )}
          </div>

          <div className="flex w-full flex-col gap-2 border-t border-[var(--glass-divider)] pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-ink">Prenda rápida</span>
              <span className="text-[11px] text-muted">
                Solo para probar medidas aquí · no se guarda en tu clóset.
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de prenda rápida">
              {GARMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSwitchToQuick(cat)}
                  className="cursor-pointer rounded-full bg-[var(--vf-chip-bg)] px-3 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-[var(--vf-chip-active-bg)] hover:text-[var(--vf-chip-active-ink)]"
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const fields = GARMENT_FIELDS[garmentCategory];

  return (
    <section
      aria-label="Configuración de prenda"
      className="vf-glass-drawer flex max-h-full flex-col overflow-hidden rounded-[24px]"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--glass-divider)] px-5 pb-3 pt-4">
        <div className="min-w-0 flex flex-col">
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">Prenda</h2>
          <span className="truncate text-[11px] text-muted">
            {garmentName || CATEGORY_LABELS[garmentCategory]}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleClear}
            aria-label="Quitar prenda del probador"
            title="Quitar prenda del probador"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--vf-chip-bg)] text-muted transition-colors hover:text-ink"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de prenda"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--vf-chip-bg)] text-muted transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="vf-drawer-scroll flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-3.5">
        {/* Conmutador de origen en cápsula */}
        <div
          className="grid grid-cols-2 gap-1 rounded-full bg-[var(--vf-chip-bg)] p-1"
          role="group"
          aria-label="Origen de la prenda"
        >
          <button
            type="button"
            aria-pressed={garmentSource === 'closet'}
            onClick={handleSwitchToCloset}
            className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              garmentSource === 'closet'
                ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
            Mi clóset ({closetItems.length})
          </button>
          <button
            type="button"
            aria-pressed={garmentSource === 'quick'}
            onClick={() => handleSwitchToQuick()}
            className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              garmentSource === 'quick'
                ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-xs'
                : 'text-muted hover:text-ink'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Prenda rápida
          </button>
        </div>

        {garmentSource === 'closet' ? (
          closetItems.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--vf-chip-bg)] p-3 text-xs text-muted">
              <p>Aún no tienes prendas guardadas en tu clóset.</p>
              <div className="flex flex-wrap gap-2">
                {onOpenCloset && (
                  <button
                    type="button"
                    onClick={onOpenCloset}
                    className="inline-flex cursor-pointer items-center rounded-full bg-[var(--vf-chip-active-bg)] px-3 py-1.5 text-xs font-medium text-[var(--vf-chip-active-ink)]"
                  >
                    Ir al Clóset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSwitchToQuick()}
                  className="inline-flex cursor-pointer items-center rounded-full bg-[var(--vf-chip-bg)] px-3 py-1.5 text-xs font-medium text-ink"
                >
                  Ajustar prenda rápida
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="closet-garment-select" className="text-[11px] font-medium text-muted">
                  Prenda guardada
                </label>
                <select
                  id="closet-garment-select"
                  value={selectedClosetItem?.garment.id ?? closetItems[0]!.garment.id}
                  onChange={(event) => {
                    const found = closetItems.find((item) => item.garment.id === event.target.value);
                    if (found) {
                      onManualCategorySelect?.();
                      applyClosetItemToFitting(found);
                    }
                  }}
                  className="w-full truncate rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2.5 py-1.5 text-xs font-medium text-ink"
                >
                  {closetItems.map((item) => (
                    <option key={item.garment.id} value={item.garment.id}>
                      {item.garment.name} · {CATEGORY_LABELS[item.garment.category]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="closet-size-select" className="text-[11px] font-medium text-muted">
                  Talla
                </label>
                <select
                  id="closet-size-select"
                  value={garmentSizeLabel}
                  onChange={(event) => {
                    if (selectedClosetItem) {
                      applyClosetItemToFitting(selectedClosetItem, event.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2 py-1.5 text-center text-xs font-semibold text-ink"
                >
                  {(selectedClosetItem?.sizes ?? []).map((size) => (
                    <option key={size.id} value={size.label}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        ) : (
          <>
            <p className="text-[11px] text-muted">
              Prueba rápida temporal · no se guarda en tu clóset.
            </p>
            {/* Selector de categoría (las 7 categorías completas en modo prenda rápida) */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de prenda">
              {GARMENT_CATEGORIES.map((cat) => {
                const active = garmentCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      onManualCategorySelect?.();
                      setGarmentCategory(cat);
                    }}
                    className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                      active
                        ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)] shadow-xs'
                        : 'bg-[var(--vf-chip-bg)] text-ink hover:bg-[var(--vf-chip-bg)]/80'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>

            {/* Nombre y talla libres solo en prenda rápida */}
            <div className="grid grid-cols-[1fr_76px] gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="garment-name" className="text-[11px] font-medium text-muted">
                  Nombre
                </label>
                <input
                  id="garment-name"
                  type="text"
                  value={garmentName}
                  onChange={(event) => setGarmentName(event.target.value)}
                  className="rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2.5 py-1.5 text-xs font-medium text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="garment-size" className="text-[11px] font-medium text-muted">
                  Talla
                </label>
                <input
                  id="garment-size"
                  type="text"
                  value={garmentSizeLabel}
                  onChange={(event) => setGarmentSizeLabel(event.target.value)}
                  className="rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2.5 py-1.5 text-center text-xs font-semibold text-ink"
                />
              </div>
            </div>
          </>
        )}

        {/* Medidas en plano */}
        <div className="flex flex-col gap-2">
          {fields.map((field) => {
            const rawCm = garmentFlatMeasures[field.key];
            const displayVal = rawCm !== undefined ? fromCm(rawCm, unit) : '';
            const inputId = `garment-${field.key}`;

            return (
              <div key={field.key} className="flex items-center justify-between gap-2">
                <div>
                  <label htmlFor={inputId} className="block text-xs font-medium text-ink">
                    {field.label}
                  </label>
                  <span className="text-[11px] text-muted">{field.hint}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    id={inputId}
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step={unit === 'cm' ? 0.5 : 0.25}
                    value={displayVal}
                    onChange={(event) => {
                      const val = event.target.value.trim();
                      if (val === '') {
                        setGarmentFlatMeasure(field.key, undefined);
                        return;
                      }
                      const parsed = Number.parseFloat(val);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setGarmentFlatMeasure(field.key, Number(toCm(parsed, unit).toFixed(2)));
                      }
                    }}
                    className="tabular-nums w-20 rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2.5 py-1 text-right text-xs font-medium text-ink"
                  />
                  <span className="w-5 text-[11px] text-muted">{unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Elasticidad */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted">Elasticidad de la tela</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Elasticidad de la tela">
            {ELASTICITY_PRESETS.map((preset) => {
              const active = garmentElasticity === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGarmentElasticity(preset.value)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                      : 'bg-[var(--vf-chip-bg)] text-ink hover:bg-[var(--vf-chip-bg)]/80'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferencia de calce */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted">Preferencia de calce</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preferencia de calce">
            {PREFERENCE_OPTIONS.map((option) => {
              const active = fitPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFitPreference(option.value)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-[var(--vf-chip-active-bg)] text-[var(--vf-chip-active-ink)]'
                      : 'bg-[var(--vf-chip-bg)] text-ink hover:bg-[var(--vf-chip-bg)]/80'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Veredicto y desglose numérico por zona */}
        {fitReport && fitReport.evaluatedZones.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-[var(--glass-divider)] pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                Veredicto ({garmentSizeLabel || 'Sin talla'})
              </span>
              <Badge
                style={{
                  borderColor: FIT_STATE_HEX[fitReport.overallState],
                  color: FIT_STATE_HEX[fitReport.overallState],
                }}
              >
                {FIT_STATE_LABELS[fitReport.overallState]}
              </Badge>
            </div>

            <ul className="flex flex-col gap-1.5" aria-label="Desglose de holgura por zona">
              {fitReport.evaluatedZones.map((zone) => {
                const matchesPreference = zone.state === fitPreference;
                return (
                  <li
                    key={zone.zone}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--glass-border)] bg-bg/55 px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[11.5px] font-semibold leading-tight text-ink">
                        {ZONE_LABELS[zone.zone]}
                      </span>
                      <span className="text-[10.5px] leading-snug text-muted">
                        La prenda queda {FIT_STATE_LABELS[zone.state].toLowerCase()}
                        {zone.elasticCompensated ? ' (elasticidad)' : ''}
                        {matchesPreference ? ' · tu preferencia' : ''}
                      </span>
                    </div>
                    <span
                      className="tabular-nums shrink-0 text-[11.5px] font-semibold"
                      style={{ color: FIT_STATE_HEX[zone.state] }}
                    >
                      {formatEase(zone.easeCm, unit)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
