import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { GarmentCategory } from '@luca/domain';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { GarmentCardPreviewSvg } from '@/features/fitting/GarmentCardPreviewSvg';
import {
  analyzeGarmentPhoto,
  getApiConsent,
  setApiConsent,
} from '@/infrastructure/api-client/client';
import type { GarmentTagSuggestion } from '@/infrastructure/api-client/generated.types';
import { sanitizeImageForUpload } from '@/infrastructure/api-client/imageSanitizer';
import { suggestManualTags } from './manualTagger';
import {
  CATEGORY_LABELS,
  formatVisualSpecSummary,
  type FormalityLevel,
  type GarmentVisualSpec,
} from './types';

export interface PhotoIngestValue {
  readonly dataUrl?: string;
  readonly backDataUrl?: string;
  readonly width?: number;
  readonly height?: number;
  readonly source?: 'api' | 'manual';
  readonly dominantColorHex: string;
  readonly paletteHex?: readonly string[];
}

export interface PhotoIngestSectionProps {
  value: PhotoIngestValue;
  category: GarmentCategory;
  formality: FormalityLevel;
  elasticity: number;
  visualSpec?: GarmentVisualSpec;
  onChange: (next: PhotoIngestValue) => void;
  onApplyTagSuggestion?: (suggestion: GarmentTagSuggestion) => void;
  onDesignRejectedChange?: (rejectedReason: string | null) => void;
}

const PATTERN_BADGE_LABELS: Record<string, string> = {
  solid: 'Color sólido',
  horizontal_stripes: 'Rayas horizontales',
  vertical_stripes: 'Rayas verticales',
  plaid: 'Cuadros sencillos',
  dots: 'Lunares sencillos',
  colorblock: 'Bloques de color',
  ribbed: 'Tejido canalé',
};

export function PhotoIngestSection({
  value,
  category,
  formality,
  elasticity,
  visualSpec,
  onChange,
  onApplyTagSuggestion,
  onDesignRejectedChange,
}: PhotoIngestSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [consent, setConsent] = useState<boolean>(() => getApiConsent());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzedCategory, setAnalyzedCategory] = useState<GarmentCategory | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [lastSuggestion, setLastSuggestion] = useState<GarmentTagSuggestion | null>(null);

  const clearRejection = () => {
    setRejectionReason(null);
    onDesignRejectedChange?.(null);
  };

  const processOfflineFallback = async (file: File, targetCat: GarmentCategory) => {
    setError(null);
    clearRejection();
    setAnalyzing(true);
    setProgressNote('Extrayendo color dominante y creando gemelo digital base en tu dispositivo...');
    try {
      const sanitized = await sanitizeImageForUpload(file);
      onChange({
        dataUrl: sanitized.dataUrl,
        width: sanitized.width,
        height: sanitized.height,
        source: 'manual',
        dominantColorHex: sanitized.localColorHex,
      });
      const localSuggestion = suggestManualTags({
        category: targetCat,
        dominantColorHex: sanitized.localColorHex,
        formality,
        elasticity,
        hasBackPhoto: false,
      });
      setLastSuggestion(localSuggestion);
      setAnalyzedCategory(targetCat);
      onApplyTagSuggestion?.(localSuggestion);
      setProgressNote('Gemelo digital base generado localmente sin conexión.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la imagen.');
      setProgressNote(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const processWithAiAgent = async (file: File, targetCat: GarmentCategory) => {
    setError(null);
    clearRejection();
    setAnalyzing(true);
    setProgressNote(
      `Eliminando EXIF y analizando exclusivamente la prenda «${CATEGORY_LABELS[targetCat]}» con el agente IA...`,
    );

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const sanitized = await sanitizeImageForUpload(file);
      if (controller.signal.aborted) return;

      const response = await analyzeGarmentPhoto(sanitized.blob, {
        includeTags: true,
        targetCategory: targetCat,
        signal: controller.signal,
      });

      const tagging = response.tagging;
      const isRejected =
        tagging?.design_supported === false || tagging?.visual_spec?.design_supported === false;

      if (isRejected) {
        const reason =
          tagging?.rejection_reason ??
          tagging?.visual_spec?.rejection_reason ??
          'Esta prenda tiene un estampado o gráfico demasiado complejo. Sube una prenda de color sólido o estampado sencillo (rayas, cuadros, bloques de color o lunares).';
        setRejectionReason(reason);
        onDesignRejectedChange?.(reason);
        setProgressNote(null);
        setLastSuggestion(null);
        setAnalyzedCategory(targetCat);
        return;
      }

      const exactPrimaryHex =
        tagging?.visual_spec?.primary_color_hex ?? response.dominant_color_hex;

      onChange({
        dataUrl: sanitized.dataUrl,
        width: response.width,
        height: response.height,
        source: 'api',
        dominantColorHex: exactPrimaryHex,
        paletteHex: response.palette_hex,
      });

      if (tagging) {
        setLastSuggestion(tagging);
        onApplyTagSuggestion?.(tagging);
      } else {
        const fallback = suggestManualTags({
          category: targetCat,
          dominantColorHex: exactPrimaryHex,
          formality,
          elasticity,
          hasBackPhoto: false,
        });
        setLastSuggestion(fallback);
        onApplyTagSuggestion?.(fallback);
      }

      setAnalyzedCategory(targetCat);
      setProgressNote(
        response.tagging_warning
          ? `${response.tagging_warning} Se generó el gemelo digital base.`
          : `Gemelo digital generado en ${response.processing_ms} ms para «${CATEGORY_LABELS[targetCat]}».`,
      );
    } catch (err) {
      if (controller.signal.aborted) {
        setProgressNote('Análisis cancelado.');
      } else {
        setError(
          err instanceof Error
            ? `${err.message} Se puede continuar creando el gemelo base sin conexión.`
            : 'No se pudo conectar con la API de IA.',
        );
        // Respaldo automático local para no bloquear al usuario si la API está apagada
        await processOfflineFallback(file, targetCat);
      }
    } finally {
      abortRef.current = null;
      setAnalyzing(false);
    }
  };

  const handleFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    clearRejection();

    if (consent) {
      await processWithAiAgent(file, category);
    } else {
      // Concede consentimiento al usar el flujo IA principal si ya aceptó, o procesa localmente
      await processOfflineFallback(file, category);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFileChosen(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFileChosen(event.dataTransfer.files?.[0]);
  };

  const handleEnableAiAndAnalyze = async () => {
    setApiConsent(true);
    setConsent(true);
    if (selectedFile) {
      await processWithAiAgent(selectedFile, category);
    }
  };

  const handleClearPhoto = () => {
    abortRef.current?.abort();
    setSelectedFile(null);
    setAnalyzedCategory(null);
    setLastSuggestion(null);
    setProgressNote(null);
    setError(null);
    clearRejection();
    onChange({ dominantColorHex: '#1F5F6B' });
  };

  const activeSpec = visualSpec ?? lastSuggestion?.visual_spec ?? undefined;
  const specSummary = formatVisualSpecSummary(activeSpec);
  const categoryChangedSinceAnalysis =
    selectedFile !== null && analyzedCategory !== null && analyzedCategory !== category;

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide text-ink">
            Foto de referencia → Gemelo digital IA
          </span>
        </div>
        <Badge variant="accent">Enfoque: {CATEGORY_LABELS[category]}</Badge>
      </div>

      <p className="text-xs text-muted">
        Sube una foto de la prenda. La IA aislará únicamente la categoría{' '}
        <strong className="text-ink">{CATEGORY_LABELS[category]}</strong> (aunque aparezcan otras
        prendas) y generará su versión digital a medida para el avatar. Solo se admiten{' '}
        <strong className="text-ink">colores sólidos y estampados sencillos</strong> (rayas,
        cuadros, bloques de color o lunares).
      </p>

      {/* Aviso de consentimiento IA (1 clic, persiste en el dispositivo) */}
      {!consent && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-accent/30 bg-accent/8 px-3 py-2 text-xs">
          <div className="flex items-start gap-2 text-ink">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              Activa el agente IA para analizar la foto y generar el gemelo digital idéntico (sin
              EXIF, procesada solo en memoria).
            </span>
          </div>
          <Button type="button" size="sm" onClick={() => void handleEnableAiAndAnalyze()}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Activar agente IA
          </Button>
        </div>
      )}

      {/* Inputs ocultos de archivo y cámara */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Seleccionar foto de la prenda"
        onChange={handleInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Tomar foto con cámara"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Zona de carga / drag & drop */}
      {!value.dataUrl && !rejectionReason && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? 'border-accent bg-accent/10' : 'border-border bg-bg/60'
          }`}
        >
          <ImagePlus className="h-7 w-7 text-accent" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">
              Arrastra la foto de tu {CATEGORY_LABELS[category].toLowerCase()} aquí
            </span>
            <span className="text-[11px] text-muted">
              JPG, PNG o WEBP · Colores sólidos o estampados sencillos
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={analyzing}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              Subir foto de referencia
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={analyzing}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              Usar cámara
            </Button>
          </div>
        </div>
      )}

      {/* Estado de análisis en curso */}
      {analyzing && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs text-ink"
        >
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
            {progressNote ?? 'Analizando prenda con IA...'}
          </span>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted hover:text-ink"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Cancelar
          </button>
        </div>
      )}

      {/* Aviso de rechazo de diseño complejo (puerta estricta de diseños sencillos) */}
      {rejectionReason && (
        <div
          role="alert"
          data-testid="complex-design-rejection"
          className="flex flex-col gap-2.5 rounded-2xl border border-[#C2410C]/45 bg-[#C2410C]/10 p-3.5 text-xs"
        >
          <div className="flex items-start gap-2 text-[#C2410C]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <strong className="font-semibold">Diseño no admitido para gemelo digital</strong>
              <p className="text-ink">{rejectionReason}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                clearRejection();
                fileInputRef.current?.click();
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              Elegir otra foto
            </Button>
            {selectedFile && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleClearPhoto()}
              >
                Quitar foto
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Comparativa en vivo: Foto de referencia vs Gemelo digital sintetizado */}
      {value.dataUrl && !rejectionReason && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--glass-border)] bg-bg/75 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-surface/70 p-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Foto de referencia
              </span>
              <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-bg/50 p-1">
                <img
                  src={value.dataUrl}
                  alt="Foto de referencia de la prenda"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            <div
              data-testid="digital-twin-preview"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-accent/35 bg-accent/5 p-2.5"
            >
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Gemelo digital
              </span>
              <div className="flex h-32 w-full items-center justify-center p-1">
                <GarmentCardPreviewSvg
                  category={category}
                  colorHex={activeSpec?.primary_color_hex ?? value.dominantColorHex}
                  meta={{
                    visualSpec: activeSpec,
                    pattern: lastSuggestion?.pattern,
                  }}
                  className="h-full w-auto"
                />
              </div>
            </div>
          </div>

          {/* Ficha resumida del gemelo digital generado */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                style={{ backgroundColor: activeSpec?.primary_color_hex ?? value.dominantColorHex }}
                aria-hidden="true"
              />
              <span className="font-mono text-ink">
                {(activeSpec?.primary_color_hex ?? value.dominantColorHex).toUpperCase()}
              </span>
              {activeSpec?.secondary_color_hex && (
                <>
                  <span
                    className="ml-1 inline-block h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: activeSpec.secondary_color_hex }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-muted">
                    {activeSpec.secondary_color_hex.toUpperCase()}
                  </span>
                </>
              )}
              {activeSpec?.pattern_type && (
                <Badge>{PATTERN_BADGE_LABELS[activeSpec.pattern_type] ?? activeSpec.pattern_type}</Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {categoryChangedSinceAnalysis && selectedFile && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={analyzing}
                  onClick={() =>
                    void (consent
                      ? processWithAiAgent(selectedFile, category)
                      : processOfflineFallback(selectedFile, category))
                  }
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Re-analizar como {CATEGORY_LABELS[category]}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={analyzing}
                onClick={() => fileInputRef.current?.click()}
              >
                Cambiar foto
              </Button>
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={handleClearPhoto}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted hover:text-[#C2410C]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {specSummary && (
            <p className="text-[11px] text-muted">
              <strong className="text-ink">Patronaje detectado:</strong> {specSummary}
            </p>
          )}
        </div>
      )}

      {progressNote && !analyzing && !error && !rejectionReason && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-accent">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {progressNote}
        </p>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-[#C2410C]">
          {error}
        </p>
      )}

      {/* Botón compacto de etiquetas locales offline para pruebas y modo sin conexión */}
      {!value.dataUrl && !analyzing && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              const localSuggestion = suggestManualTags({
                category,
                dominantColorHex: value.dominantColorHex,
                formality,
                elasticity,
                hasBackPhoto: false,
              });
              setLastSuggestion(localSuggestion);
              onApplyTagSuggestion?.(localSuggestion);
              setProgressNote('Sugerencias locales aplicadas (modo sin conexión).');
            }}
            className="cursor-pointer text-[11px] font-medium text-muted underline decoration-dotted underline-offset-4 hover:text-ink"
          >
            Sugerir etiquetas locales
          </button>
        </div>
      )}

      {lastSuggestion && lastSuggestion.provider === 'manual-local' && (
        <div
          data-testid="tag-suggestion-panel"
          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg/70 px-3 py-2 text-[11px] text-muted"
        >
          <span>
            Perfil local ({lastSuggestion.provider}) · {CATEGORY_LABELS[lastSuggestion.category]}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onApplyTagSuggestion?.(lastSuggestion)}
          >
            Aplicar sugerencias
          </Button>
        </div>
      )}
    </div>
  );
}
