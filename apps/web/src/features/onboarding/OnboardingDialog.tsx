import { useEffect, useId, useRef, useState } from 'react';
import {
  EYE_SWATCHES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  classifyColorProfile,
  fromCm,
  toCm,
} from '@luca/domain';
import { CheckCircle2, ChevronLeft, ChevronRight, Palette, Ruler, Shirt, X } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { useClosetStore } from '@/features/closet/closetStore';
import { DEFAULT_COLOR_SWATCHES, useColorStore } from '@/features/color/colorStore';
import { useFittingStore } from '@/features/fitting/store';
import { useI18nStore } from '@/i18n/i18nStore';

const ONBOARDING_KEY = 'luca-onboarding-done';

export function isOnboardingCompleted(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Ignora restricciones de almacenamiento
  }
}

export interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  onFinishToSection?: (section: 'fitting' | 'closet' | 'color') => void;
}

export function OnboardingDialog({ open, onClose, onFinishToSection }: OnboardingDialogProps) {
  const locale = useI18nStore((s) => s.locale);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const unit = useFittingStore((s) => s.unit);
  const setUnit = useFittingStore((s) => s.setUnit);
  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const setBodyMeasure = useFittingStore((s) => s.setBodyMeasure);

  const saveColorProfile = useColorStore((s) => s.saveProfile);
  const addGarment = useClosetStore((s) => s.addGarment);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [skinHex, setSkinHex] = useState(DEFAULT_COLOR_SWATCHES.skinHex);
  const [hairHex, setHairHex] = useState(DEFAULT_COLOR_SWATCHES.hairHex);
  const [eyeHex, setEyeHex] = useState(DEFAULT_COLOR_SWATCHES.eyeHex);
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);

  const colorPreview = classifyColorProfile({ skinHex, hairHex, eyeHex });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep(1);
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  const handleClose = () => {
    markOnboardingCompleted();
    onClose();
  };

  const handleSaveColorAndNext = async () => {
    setBusy(true);
    try {
      await saveColorProfile({ skinHex, hairHex, eyeHex, ignored: false });
      setStep(3);
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async (mode: 'custom' | 'skip') => {
    setBusy(true);
    try {
      if (mode === 'custom' && firstName.trim()) {
        await addGarment({
          category: 'tshirt',
          name: firstName.trim(),
          brand: '',
          status: 'owned',
          elasticity: 0.05,
          formality: 2,
          tags: ['básico'],
          dominantColorHex: '#1F5F6B',
          sizes: [{ label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45, backWidth: 42 } }],
        });
      }
      markOnboardingCompleted();
      onClose();
      onFinishToSection?.(mode === 'skip' ? 'fitting' : 'closet');
    } finally {
      setBusy(false);
    }
  };

  const isEn = locale === 'en';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="w-full max-w-xl"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="accent">
                {isEn ? `Step ${step} of 3` : `Paso ${step} de 3`}
              </Badge>
            </div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {isEn ? 'Quick start guide' : 'Guía de inicio rápido'}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isEn ? 'Close guide' : 'Cerrar guía'}
            onClick={handleClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Paso 1: Medidas */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Ruler className="h-4 w-4 text-accent" aria-hidden="true" />
                {isEn ? '1. Your body measurements' : '1. Tus medidas principales'}
              </p>
              <div className="flex gap-1" role="group" aria-label="Unidades">
                <Button
                  type="button"
                  size="sm"
                  variant={unit === 'cm' ? 'primary' : 'outline'}
                  onClick={() => setUnit('cm')}
                >
                  cm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={unit === 'in' ? 'primary' : 'outline'}
                  onClick={() => setUnit('in')}
                >
                  in
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ['height', isEn ? 'Height' : 'Altura'],
                  ['chest', isEn ? 'Chest' : 'Pecho'],
                  ['waist', isEn ? 'Waist' : 'Cintura'],
                  ['hip', isEn ? 'Hip' : 'Cadera'],
                  ['shoulders', isEn ? 'Shoulders' : 'Hombros'],
                  ['inseam', isEn ? 'Inseam' : 'Entrepierna'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex flex-col gap-1 text-xs font-medium text-muted">
                  <span>
                    {label} ({unit})
                  </span>
                  <input
                    type="number"
                    step={unit === 'cm' ? 0.5 : 0.25}
                    value={fromCm(bodyMeasurements[field], unit)}
                    onChange={(event) => {
                      const val = Number.parseFloat(event.target.value);
                      if (Number.isFinite(val) && val > 0) {
                        setBodyMeasure(field, Number(toCm(val, unit).toFixed(1)));
                      }
                    }}
                    className="tabular-nums rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-sm text-ink"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-between gap-2 border-t border-border pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                {isEn ? 'Skip guide' : 'Omitir guía'}
              </Button>
              <Button type="button" size="sm" onClick={() => setStep(2)}>
                {isEn ? 'Next: Color' : 'Siguiente: Color'}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* Paso 2: Colorimetría */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Palette className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? '2. Your color traits (optional)' : '2. Tus rasgos de color (opcional)'}
            </p>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <p className="mb-1.5 font-medium text-muted">{isEn ? 'Skin' : 'Piel'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKIN_SWATCHES.slice(0, 6).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSkinHex(opt.hex)}
                      aria-label={opt.label}
                      className={`h-7 w-7 cursor-pointer rounded-full border ${
                        skinHex.toUpperCase() === opt.hex.toUpperCase()
                          ? 'ring-2 ring-accent border-accent'
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: opt.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 font-medium text-muted">{isEn ? 'Hair' : 'Cabello'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {HAIR_SWATCHES.slice(0, 6).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHairHex(opt.hex)}
                      aria-label={opt.label}
                      className={`h-7 w-7 cursor-pointer rounded-full border ${
                        hairHex.toUpperCase() === opt.hex.toUpperCase()
                          ? 'ring-2 ring-accent border-accent'
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: opt.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 font-medium text-muted">{isEn ? 'Eyes' : 'Ojos'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {EYE_SWATCHES.slice(0, 6).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEyeHex(opt.hex)}
                      aria-label={opt.label}
                      className={`h-7 w-7 cursor-pointer rounded-full border ${
                        eyeHex.toUpperCase() === opt.hex.toUpperCase()
                          ? 'ring-2 ring-accent border-accent'
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: opt.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs">
              <span className="text-muted">
                {isEn ? 'Suggested season' : 'Estación sugerida'}
              </span>
              <span className="font-semibold text-accent">{colorPreview.primary.label}</span>
            </div>

            <div className="flex justify-between gap-2 border-t border-border pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {isEn ? 'Back' : 'Atrás'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(3)}>
                  {isEn ? 'Skip' : 'Omitir'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleSaveColorAndNext()}
                >
                  {isEn ? 'Save & continue' : 'Guardar y seguir'}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Primera prenda */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Shirt className="h-4 w-4 text-accent" aria-hidden="true" />
              {isEn ? '3. Your first garment' : '3. Tu primera prenda'}
            </p>

            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              <span>{isEn ? 'Garment name (optional)' : 'Nombre de tu prenda (opcional)'}</span>
              <input
                type="text"
                placeholder={isEn ? 'e.g. White linen shirt' : 'Ej. Camisa blanca de lino'}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              />
            </label>

            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {isEn ? 'Back' : 'Atrás'}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleFinish(firstName.trim() ? 'custom' : 'skip')}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {firstName.trim()
                    ? isEn
                      ? 'Save garment & finish'
                      : 'Guardar prenda y terminar'
                    : isEn
                      ? 'Finish'
                      : 'Terminar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
