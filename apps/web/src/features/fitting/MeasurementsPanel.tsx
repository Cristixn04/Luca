import { useState } from 'react';
import {
  fromCm,
  toCm,
  type RequiredBodyMeasurements,
  type ValidationResult,
} from '@luca/domain';
import { AlertTriangle, BookOpen, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system/components/Card';
import { MeasuringGuideDialog } from './MeasuringGuideDialog';
import { useFittingStore } from './store';

interface FieldSpec {
  readonly key: keyof RequiredBodyMeasurements;
  readonly label: string;
  readonly stepCm: number;
}

const BODY_FIELDS: readonly FieldSpec[] = [
  { key: 'height', label: 'Altura', stepCm: 1 },
  { key: 'shoulders', label: 'Hombros', stepCm: 0.5 },
  { key: 'chest', label: 'Pecho', stepCm: 0.5 },
  { key: 'waist', label: 'Cintura', stepCm: 0.5 },
  { key: 'hip', label: 'Cadera', stepCm: 0.5 },
  { key: 'inseam', label: 'Entrepierna', stepCm: 0.5 },
];

export interface MeasurementsPanelProps {
  validation: ValidationResult;
}

export function MeasurementsPanel({ validation }: MeasurementsPanelProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  const unit = useFittingStore((s) => s.unit);
  const hideNumbers = useFittingStore((s) => s.hideNumbers);
  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const setUnit = useFittingStore((s) => s.setUnit);
  const toggleHideNumbers = useFittingStore((s) => s.toggleHideNumbers);
  const setBodyMeasure = useFittingStore((s) => s.setBodyMeasure);
  const resetBodyMeasures = useFittingStore((s) => s.resetBodyMeasures);

  const errorByField = new Map(validation.errors.map((err) => [err.field, err.message]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Medidas</CardTitle>
            <CardDescription>Cálculo local en tu dispositivo</CardDescription>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Unidad de medida">
            <Button
              type="button"
              size="sm"
              variant={unit === 'cm' ? 'primary' : 'outline'}
              aria-pressed={unit === 'cm'}
              onClick={() => setUnit('cm')}
            >
              cm
            </Button>
            <Button
              type="button"
              size="sm"
              variant={unit === 'in' ? 'primary' : 'outline'}
              aria-pressed={unit === 'in'}
              onClick={() => setUnit('in')}
            >
              in
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          {BODY_FIELDS.map((field) => {
            const rawCm = bodyMeasurements[field.key];
            const displayValue = Number.isFinite(rawCm) && rawCm >= 0 ? fromCm(rawCm, unit) : '';
            const fieldError = errorByField.get(`required.${field.key}`);
            const inputId = `measure-${field.key}`;
            const errorId = `${inputId}-error`;

            return (
              <div key={field.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={inputId} className="text-sm font-medium text-ink">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id={inputId}
                      type={hideNumbers ? 'password' : 'number'}
                      inputMode="decimal"
                      step={unit === 'cm' ? field.stepCm : 0.25}
                      value={displayValue}
                      aria-invalid={fieldError ? 'true' : undefined}
                      aria-describedby={fieldError ? errorId : undefined}
                      onChange={(event) => {
                        const parsed = Number.parseFloat(event.target.value);
                        if (Number.isNaN(parsed)) {
                          setBodyMeasure(field.key, Number.NaN);
                          return;
                        }
                        if (parsed < 0) {
                          setBodyMeasure(field.key, parsed);
                          return;
                        }
                        setBodyMeasure(field.key, Number(toCm(parsed, unit).toFixed(2)));
                      }}
                      className="tabular-nums w-24 rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-ink"
                    />
                    <span className="w-6 text-xs text-muted">{unit}</span>
                  </div>
                </div>
                {fieldError && (
                  <p id={errorId} role="alert" className="text-xs text-[#C2410C]">
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {validation.warnings.length > 0 && (
          <div
            role="status"
            className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border bg-bg p-2.5 text-xs text-muted"
          >
            {validation.warnings.map((warning) => (
              <div key={warning.code} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E0A526]" aria-hidden="true" />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={() => setGuideOpen(true)}>
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Guía de medición
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleHideNumbers}
            aria-pressed={hideNumbers}
          >
            {hideNumbers ? (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {hideNumbers ? 'Mostrar cifras' : 'Ocultar cifras'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetBodyMeasures}
            aria-label="Restablecer medidas de ejemplo"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restablecer
          </Button>
        </div>

        <MeasuringGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
      </CardContent>
    </Card>
  );
}
