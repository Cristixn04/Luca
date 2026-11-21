import { useState } from 'react';
import {
  fromCm,
  toCm,
  type OptionalBodyMeasurements,
  type RequiredBodyMeasurements,
  type ValidationResult,
} from '@luca/domain';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RotateCcw,
  X,
} from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { MeasuringGuideDialog } from './MeasuringGuideDialog';
import { useFittingStore } from './store';

interface RequiredFieldSpec {
  readonly key: keyof RequiredBodyMeasurements;
  readonly label: string;
  readonly stepCm: number;
}

interface OptionalFieldSpec {
  readonly key: keyof OptionalBodyMeasurements;
  readonly label: string;
  readonly hint: string;
  readonly stepCm: number;
}

const BODY_FIELDS: readonly RequiredFieldSpec[] = [
  { key: 'height', label: 'Altura', stepCm: 1 },
  { key: 'shoulders', label: 'Hombros', stepCm: 0.5 },
  { key: 'chest', label: 'Pecho', stepCm: 0.5 },
  { key: 'waist', label: 'Cintura', stepCm: 0.5 },
  { key: 'hip', label: 'Cadera', stepCm: 0.5 },
  { key: 'inseam', label: 'Entrepierna', stepCm: 0.5 },
];

const OPTIONAL_FIELDS: readonly OptionalFieldSpec[] = [
  { key: 'torsoLength', label: 'Largo de torso', hint: 'Mejora frente y perfil', stepCm: 0.5 },
  { key: 'chestDepth', label: 'Fondo de pecho', hint: 'Perfil (frente a espalda)', stepCm: 0.5 },
  { key: 'waistDepth', label: 'Fondo de cintura', hint: 'Perfil (frente a espalda)', stepCm: 0.5 },
  { key: 'hipDepth', label: 'Fondo de cadera', hint: 'Perfil (frente a espalda)', stepCm: 0.5 },
  { key: 'backWidth', label: 'Ancho de espalda', hint: 'Mejora vista espalda', stepCm: 0.5 },
  { key: 'backLength', label: 'Largo de espalda', hint: 'Mejora vista espalda', stepCm: 0.5 },
];

export interface MeasurementsPanelProps {
  validation: ValidationResult;
  onClose?: () => void;
}

export function MeasurementsPanel({ validation, onClose }: MeasurementsPanelProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [showOptionals, setShowOptionals] = useState(false);

  const unit = useFittingStore((s) => s.unit);
  const hideNumbers = useFittingStore((s) => s.hideNumbers);
  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const optionalMeasurements = useFittingStore((s) => s.optionalMeasurements);
  const setUnit = useFittingStore((s) => s.setUnit);
  const toggleHideNumbers = useFittingStore((s) => s.toggleHideNumbers);
  const setBodyMeasure = useFittingStore((s) => s.setBodyMeasure);
  const setOptionalMeasure = useFittingStore((s) => s.setOptionalMeasure);
  const resetBodyMeasures = useFittingStore((s) => s.resetBodyMeasures);

  const errorByField = new Map(validation.errors.map((err) => [err.field, err.message]));
  const measuredOptionalCount = Object.values(optionalMeasurements).filter(
    (v) => v !== undefined,
  ).length;

  return (
    <section
      aria-label="Medidas corporales"
      className="vf-glass-drawer flex max-h-full flex-col overflow-hidden rounded-[24px]"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-divider)] px-5 pb-3 pt-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-ink">Medidas</h2>
          <p className="text-[11px] text-muted">Cálculo local en tu dispositivo</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="inline-flex rounded-full bg-[var(--vf-chip-bg)] p-0.5"
            role="group"
            aria-label="Unidad de medida"
          >
            <button
              type="button"
              aria-pressed={unit === 'cm'}
              onClick={() => setUnit('cm')}
              className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                unit === 'cm'
                  ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              cm
            </button>
            <button
              type="button"
              aria-pressed={unit === 'in'}
              onClick={() => setUnit('in')}
              className={`cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                unit === 'in'
                  ? 'bg-[var(--vf-nav-indicator-bg)] text-[var(--vf-nav-active-ink)] shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              in
            </button>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de medidas"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--vf-chip-bg)] text-muted transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="vf-drawer-scroll flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-3.5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {BODY_FIELDS.map((field) => {
            const rawCm = bodyMeasurements[field.key];
            const displayValue = Number.isFinite(rawCm) && rawCm >= 0 ? fromCm(rawCm, unit) : '';
            const fieldError = errorByField.get(`required.${field.key}`);
            const inputId = `measure-${field.key}`;
            const errorId = `${inputId}-error`;

            return (
              <div key={field.key} className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-[11px] font-medium text-muted">
                  {field.label}
                </label>
                <div className="flex items-center gap-1">
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
                    className="tabular-nums w-full rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2.5 py-1.5 text-right text-xs font-medium text-ink"
                  />
                  <span className="w-5 shrink-0 text-[11px] text-muted">{unit}</span>
                </div>
                {fieldError && (
                  <p id={errorId} role="alert" className="text-[11px] text-[#C2410C]">
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Sección colapsable de medidas opcionales para perfil y espalda */}
        <div className="border-t border-[var(--glass-divider)] pt-2.5">
          <button
            type="button"
            aria-expanded={showOptionals}
            onClick={() => setShowOptionals((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl py-1 text-left text-xs font-semibold text-ink transition-colors hover:opacity-80"
          >
            <span className="flex items-center gap-2">
              <span>Medidas opcionales (perfil y espalda)</span>
              <Badge variant={measuredOptionalCount > 0 ? 'accent' : 'neutral'}>
                {measuredOptionalCount}/6
              </Badge>
            </span>
            {showOptionals ? (
              <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
            )}
          </button>

          {showOptionals && (
            <div className="mt-2.5 flex flex-col gap-2">
              {OPTIONAL_FIELDS.map((field) => {
                const rawCm = optionalMeasurements[field.key];
                const displayValue =
                  rawCm !== undefined && Number.isFinite(rawCm) && rawCm >= 0
                    ? fromCm(rawCm, unit)
                    : '';
                const fieldError = errorByField.get(`optional.${field.key}`);
                const inputId = `optional-${field.key}`;
                const errorId = `${inputId}-error`;

                return (
                  <div key={field.key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label htmlFor={inputId} className="block text-xs font-medium text-ink">
                          {field.label}
                        </label>
                        <span className="text-[10px] text-muted">{field.hint}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          id={inputId}
                          type={hideNumbers ? 'password' : 'number'}
                          inputMode="decimal"
                          step={unit === 'cm' ? field.stepCm : 0.25}
                          placeholder="est."
                          value={displayValue}
                          aria-invalid={fieldError ? 'true' : undefined}
                          aria-describedby={fieldError ? errorId : undefined}
                          onChange={(event) => {
                            const raw = event.target.value.trim();
                            if (raw === '') {
                              setOptionalMeasure(field.key, undefined);
                              return;
                            }
                            const parsed = Number.parseFloat(raw);
                            if (Number.isNaN(parsed)) {
                              setOptionalMeasure(field.key, undefined);
                              return;
                            }
                            if (parsed < 0) {
                              setOptionalMeasure(field.key, parsed);
                              return;
                            }
                            setOptionalMeasure(field.key, Number(toCm(parsed, unit).toFixed(2)));
                          }}
                          className="tabular-nums w-20 rounded-xl border border-[var(--glass-border)] bg-bg/70 px-2 py-1 text-right text-xs text-ink"
                        />
                        <span className="w-5 text-[11px] text-muted">{unit}</span>
                      </div>
                    </div>
                    {fieldError && (
                      <p id={errorId} role="alert" className="text-[11px] text-[#C2410C]">
                        {fieldError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {validation.warnings.length > 0 && (
          <div
            role="status"
            className="flex flex-col gap-1 rounded-2xl border border-[var(--glass-border)] bg-bg/55 p-2.5 text-xs text-muted"
          >
            {validation.warnings.map((warning) => (
              <div key={warning.code} className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E0A526]"
                  aria-hidden="true"
                />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--vf-chip-bg)] px-3 py-1.5 text-[11px] font-medium text-ink transition-colors hover:bg-[var(--vf-chip-bg)]/80"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Guía de medición
          </button>
          <button
            type="button"
            onClick={toggleHideNumbers}
            aria-pressed={hideNumbers}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink"
          >
            {hideNumbers ? (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {hideNumbers ? 'Mostrar cifras' : 'Ocultar cifras'}
          </button>
          <button
            type="button"
            onClick={resetBodyMeasures}
            aria-label="Restablecer medidas de ejemplo"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restablecer
          </button>
        </div>

        <MeasuringGuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} />
      </div>
    </section>
  );
}
