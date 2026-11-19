import {
  fromCm,
  toCm,
  type FitPreference,
  type FitReport,
  type FitZone,
  type GarmentFlatMeasurements,
} from '@luca/domain';
import { Shirt, Trash2 } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system/components/Card';
import { useFittingStore, type M2GarmentCategory } from './store';
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

const GARMENT_FIELDS: Record<M2GarmentCategory, readonly GarmentFieldSpec[]> = {
  tshirt: [
    { key: 'chestFlat', label: 'Pecho en plano', hint: 'Axila a axila (×2)' },
    { key: 'shoulders', label: 'Hombros', hint: 'Costura a costura' },
    { key: 'backWidth', label: 'Ancho de espalda', hint: 'Opcional' },
  ],
  pants: [
    { key: 'waistFlat', label: 'Cintura en plano', hint: 'Borde a borde (×2)' },
    { key: 'hipFlat', label: 'Cadera en plano', hint: 'Zona más ancha (×2)' },
  ],
};

function formatEase(easeCm: number, unit: 'cm' | 'in'): string {
  const sign = easeCm >= 0 ? '+' : '-';
  const abs = fromCm(Math.abs(easeCm), unit);
  return `${sign}${abs.toFixed(1)} ${unit}`;
}

export interface GarmentPanelProps {
  fitReport: FitReport | null;
}

export function GarmentPanel({ fitReport }: GarmentPanelProps) {
  const unit = useFittingStore((s) => s.unit);
  const garmentEnabled = useFittingStore((s) => s.garmentEnabled);
  const garmentCategory = useFittingStore((s) => s.garmentCategory);
  const garmentName = useFittingStore((s) => s.garmentName);
  const garmentSizeLabel = useFittingStore((s) => s.garmentSizeLabel);
  const garmentElasticity = useFittingStore((s) => s.garmentElasticity);
  const garmentFlatMeasures = useFittingStore((s) => s.garmentFlatMeasures);
  const fitPreference = useFittingStore((s) => s.fitPreference);

  const setGarmentCategory = useFittingStore((s) => s.setGarmentCategory);
  const setGarmentName = useFittingStore((s) => s.setGarmentName);
  const setGarmentSizeLabel = useFittingStore((s) => s.setGarmentSizeLabel);
  const setGarmentElasticity = useFittingStore((s) => s.setGarmentElasticity);
  const setGarmentFlatMeasure = useFittingStore((s) => s.setGarmentFlatMeasure);
  const clearGarment = useFittingStore((s) => s.clearGarment);
  const restoreDefaultGarment = useFittingStore((s) => s.restoreDefaultGarment);
  const setFitPreference = useFittingStore((s) => s.setFitPreference);

  if (!garmentEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prenda temporal</CardTitle>
          <CardDescription>Sin prenda activa en el probador</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 text-sm text-muted">
          <p>
            Elige una plantilla de prenda para ingresar medidas en plano y ver el mapa de calor en
            tiempo real.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => restoreDefaultGarment('tshirt')}
            >
              <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
              Probar camiseta
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => restoreDefaultGarment('pants')}
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
          <div>
            <CardTitle>Prenda</CardTitle>
            <CardDescription>Medidas en plano (tabla de tallas)</CardDescription>
          </div>
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
        {/* Selector de categoría */}
        <div className="flex gap-1.5" role="group" aria-label="Tipo de prenda">
          <Button
            type="button"
            size="sm"
            variant={garmentCategory === 'tshirt' ? 'primary' : 'outline'}
            aria-pressed={garmentCategory === 'tshirt'}
            onClick={() => setGarmentCategory('tshirt')}
          >
            Camiseta
          </Button>
          <Button
            type="button"
            size="sm"
            variant={garmentCategory === 'pants' ? 'primary' : 'outline'}
            aria-pressed={garmentCategory === 'pants'}
            onClick={() => setGarmentCategory('pants')}
          >
            Pantalón
          </Button>
        </div>

        {/* Nombre y talla */}
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
