import { useEffect, useRef } from 'react';
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
import { Shirt, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
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

function applyClosetItemToFitting(item: GarmentWithSizes, preferredSizeLabel?: string) {
  const size =
    (preferredSizeLabel ? item.sizes.find((s) => s.label === preferredSizeLabel) : undefined) ??
    item.sizes[0];

  useFittingStore.setState({
    garmentEnabled: true,
    garmentSource: 'closet',
    selectedClosetGarmentId: item.garment.id,
    garmentCategory: item.garment.category,
    garmentName: item.garment.name,
    garmentColorHex: item.garment.dominantColorHex ?? '#1F5F6B',
    garmentSizeLabel: size?.label ?? 'M',
    garmentElasticity: item.garment.elasticity,
    garmentFlatMeasures: size ? { ...size.flatMeasuresCm } : {},
  });
}

export interface GarmentPanelProps {
  fitReport: FitReport | null;
}

export function GarmentPanel({ fitReport }: GarmentPanelProps) {
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
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (!closetLoaded) {
      void loadCloset();
    }
  }, [closetLoaded, loadCloset]);

  // Si hay prendas guardadas al abrir el Probador, activa el desplegable de Mi clóset automáticamente.
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (closetItems.length === 0) return;

    autoSelectedRef.current = true;
    if (selectedClosetGarmentId) {
      const existing = closetItems.find((item) => item.garment.id === selectedClosetGarmentId);
      if (existing) {
        applyClosetItemToFitting(existing, garmentSizeLabel);
        return;
      }
    }
    applyClosetItemToFitting(closetItems[0]!);
  }, [closetItems, garmentSizeLabel, selectedClosetGarmentId]);

  const selectedClosetItem =
    closetItems.find((item) => item.garment.id === selectedClosetGarmentId) ?? null;

  const handleSwitchToCloset = () => {
    autoSelectedRef.current = true;
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

  const handleSwitchToQuick = () => {
    autoSelectedRef.current = true;
    restoreDefaultGarment(garmentCategory);
    useFittingStore.setState({
      garmentSource: 'quick',
      selectedClosetGarmentId: null,
    });
  };

  if (!garmentEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prenda</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 text-sm text-muted">
          <p>Sin prenda activa en el probador.</p>
          <div className="flex flex-wrap gap-2">
            {closetItems.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => applyClosetItemToFitting(closetItems[0]!)}
              >
                <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                Elegir de mi clóset
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={closetItems.length > 0 ? 'secondary' : 'primary'}
              onClick={() => {
                restoreDefaultGarment('tshirt');
                useFittingStore.setState({ garmentSource: 'quick', selectedClosetGarmentId: null });
              }}
            >
              <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
              Probar camiseta
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                restoreDefaultGarment('pants');
                useFittingStore.setState({ garmentSource: 'quick', selectedClosetGarmentId: null });
              }}
            >
              Probar pantalón
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fields = GARMENT_FIELDS[garmentCategory];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Prenda</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearGarment}
            aria-label="Quitar prenda del probador"
            title="Quitar prenda del probador"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Conmutador de origen: Mi clóset (desplegable de prendas guardadas) vs Prenda rápida */}
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Origen de la prenda">
          <Button
            type="button"
            size="sm"
            variant={garmentSource === 'closet' ? 'primary' : 'outline'}
            aria-pressed={garmentSource === 'closet'}
            onClick={handleSwitchToCloset}
          >
            <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
            Mi clóset ({closetItems.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={garmentSource === 'quick' ? 'primary' : 'outline'}
            aria-pressed={garmentSource === 'quick'}
            onClick={handleSwitchToQuick}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Prenda rápida
          </Button>
        </div>

        {garmentSource === 'closet' ? (
          closetItems.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-bg p-3 text-xs text-muted">
              <p>Aún no tienes prendas guardadas en tu clóset.</p>
              <div>
                <Button type="button" size="sm" variant="secondary" onClick={handleSwitchToQuick}>
                  Ajustar prenda rápida
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_84px] gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="closet-garment-select" className="text-xs font-medium text-muted">
                  Prenda guardada
                </label>
                <select
                  id="closet-garment-select"
                  value={selectedClosetItem?.garment.id ?? closetItems[0]!.garment.id}
                  onChange={(event) => {
                    const found = closetItems.find((item) => item.garment.id === event.target.value);
                    if (found) applyClosetItemToFitting(found);
                  }}
                  className="w-full truncate rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-sm text-ink"
                >
                  {closetItems.map((item) => (
                    <option key={item.garment.id} value={item.garment.id}>
                      {item.garment.name} · {CATEGORY_LABELS[item.garment.category]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="closet-size-select" className="text-xs font-medium text-muted">
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
                  className="w-full rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-center text-sm font-medium text-ink"
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
            {/* Selector de categoría (las 7 categorías completas en modo prenda rápida) */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de prenda">
              {GARMENT_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  size="sm"
                  variant={garmentCategory === cat ? 'primary' : 'outline'}
                  aria-pressed={garmentCategory === cat}
                  onClick={() => setGarmentCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>

            {/* Nombre y talla libres solo en prenda rápida */}
            <div className="grid grid-cols-[1fr_76px] gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="garment-name" className="text-xs font-medium text-muted">
                  Nombre
                </label>
                <input
                  id="garment-name"
                  type="text"
                  value={garmentName}
                  onChange={(event) => setGarmentName(event.target.value)}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-sm text-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="garment-size" className="text-xs font-medium text-muted">
                  Talla
                </label>
                <input
                  id="garment-size"
                  type="text"
                  value={garmentSizeLabel}
                  onChange={(event) => setGarmentSizeLabel(event.target.value)}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-center text-sm font-medium text-ink"
                />
              </div>
            </div>
          </>
        )}

        {/* Medidas en plano */}
        <div className="flex flex-col gap-2.5">
          {fields.map((field) => {
            const rawCm = garmentFlatMeasures[field.key];
            const displayVal = rawCm !== undefined ? fromCm(rawCm, unit) : '';
            const inputId = `garment-${field.key}`;

            return (
              <div key={field.key} className="flex items-center justify-between gap-2">
                <div>
                  <label htmlFor={inputId} className="block text-sm font-medium text-ink">
                    {field.label}
                  </label>
                  <span className="text-xs text-muted">{field.hint}</span>
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
                    className="tabular-nums w-20 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-right text-sm text-ink"
                  />
                  <span className="w-6 text-xs text-muted">{unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Elasticidad */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Elasticidad de la tela</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Elasticidad de la tela">
            {ELASTICITY_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                size="sm"
                variant={garmentElasticity === preset.value ? 'primary' : 'outline'}
                aria-pressed={garmentElasticity === preset.value}
                onClick={() => setGarmentElasticity(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Preferencia de calce (T2.7) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Preferencia de calce</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preferencia de calce">
            {PREFERENCE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={fitPreference === option.value ? 'primary' : 'outline'}
                aria-pressed={fitPreference === option.value}
                onClick={() => setFitPreference(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Desglose numérico por zona */}
        {fitReport && fitReport.evaluatedZones.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
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
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-2 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-ink">{ZONE_LABELS[zone.zone]}</span>
                      <span className="text-muted">
                        La prenda queda {FIT_STATE_LABELS[zone.state].toLowerCase()}
                        {zone.elasticCompensated ? ' (por elasticidad)' : ''}
                        {matchesPreference ? ' · coincide con tu preferencia' : ''}
                      </span>
                    </div>
                    <span
                      className="tabular-nums shrink-0 font-semibold"
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
      </CardContent>
    </Card>
  );
}
