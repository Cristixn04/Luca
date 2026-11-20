import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { GarmentCategory } from '@luca/domain';
import {
  Camera,
  CheckCircle2,
  Crop,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  analyzeGarmentPhoto,
  getApiConsent,
  setApiConsent,
} from '@/infrastructure/api-client/client';
import type { GarmentTagSuggestion } from '@/infrastructure/api-client/generated.types';
import {
  sanitizeImageForUpload,
  type CropRectNormalized,
} from '@/infrastructure/api-client/imageSanitizer';
import { suggestManualTags } from './manualTagger';
import {
  CATEGORY_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
  type FormalityLevel,
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
  onChange: (next: PhotoIngestValue) => void;
  onApplyTagSuggestion?: (suggestion: GarmentTagSuggestion) => void;
}

const DEFAULT_CROP: CropRectNormalized = { top: 0, right: 0, bottom: 0, left: 0 };

function formatConfidence(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)} %`;
}

export function PhotoIngestSection({
  value,
  category,
  formality,
  elasticity,
  onChange,
  onApplyTagSuggestion,
}: PhotoIngestSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [consent, setConsent] = useState<boolean>(() => getApiConsent());
  const [includeAiTags, setIncludeAiTags] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBackFile, setSelectedBackFile] = useState<File | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [crop, setCrop] = useState<CropRectNormalized>(DEFAULT_CROP);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagSuggestion, setTagSuggestion] = useState<GarmentTagSuggestion | null>(null);

  const processManual = async (
    file: File,
    nextCrop: CropRectNormalized,
    backFile?: File | null,
  ) => {
    setError(null);
    setAnalyzing(true);
    setProgressNote('Recortando y limpiando metadatos EXIF en tu dispositivo...');
    try {
      const sanitized = await sanitizeImageForUpload(file, { crop: nextCrop });
      let backDataUrl = value.backDataUrl;
      if (backFile) {
        const sanitizedBack = await sanitizeImageForUpload(backFile);
        backDataUrl = sanitizedBack.dataUrl;
      }
      onChange({
        dataUrl: sanitized.dataUrl,
        ...(backDataUrl ? { backDataUrl } : {}),
        width: sanitized.width,
        height: sanitized.height,
        source: 'manual',
        dominantColorHex: sanitized.localColorHex,
      });
      setProgressNote('Foto lista localmente (EXIF eliminado, cero envío de red).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen localmente.');
      setProgressNote(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const processBackManual = async (backFile: File) => {
    setError(null);
    setAnalyzing(true);
    setProgressNote('Limpiando metadatos EXIF de la foto de espalda en tu dispositivo...');
    try {
      const sanitizedBack = await sanitizeImageForUpload(backFile);
      onChange({
        ...value,
        backDataUrl: sanitizedBack.dataUrl,
      });
      setProgressNote('Foto de espalda lista localmente (EXIF eliminado).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la foto de espalda.');
      setProgressNote(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const processWithApi = async (file: File, backFile?: File | null) => {
    setError(null);
    setAnalyzing(true);
    setProgressNote('Reduciendo a <= 1024 px y eliminando EXIF antes de enviar...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const sanitized = await sanitizeImageForUpload(file);
      if (controller.signal.aborted) return;

      const sanitizedBack = backFile ? await sanitizeImageForUpload(backFile) : null;
      if (controller.signal.aborted) return;

      setProgressNote(
        includeAiTags
          ? 'Recortando fondo, calculando color CIELAB y sugiriendo etiquetas...'
          : 'Recortando fondo y calculando color dominante en CIELAB...',
      );
      const response = await analyzeGarmentPhoto(sanitized.blob, {
        ...(sanitizedBack ? { backBlob: sanitizedBack.blob } : {}),
        includeTags: includeAiTags,
        signal: controller.signal,
      });

      const nextBackDataUrl = response.back_cutout_png_base64
        ? `data:image/png;base64,${response.back_cutout_png_base64}`
        : value.backDataUrl;

      onChange({
        dataUrl: `data:image/png;base64,${response.cutout_png_base64}`,
        ...(nextBackDataUrl ? { backDataUrl: nextBackDataUrl } : {}),
        width: response.width,
        height: response.height,
        source: 'api',
        dominantColorHex: response.dominant_color_hex,
        paletteHex: response.palette_hex,
      });

      if (response.tagging) {
        setTagSuggestion(response.tagging);
      }

      setProgressNote(
        `Recorte completado en ${response.processing_ms} ms (${response.provider}). Puedes editar color y etiquetas.`,
      );
    } catch (err) {
      if (controller.signal.aborted) {
        setProgressNote('Análisis cancelado. Puedes usar el modo manual.');
      } else {
        setError(
          err instanceof Error
            ? `${err.message} Puedes usar el modo manual sin conexión.`
            : 'No se pudo conectar con la API. Usa el modo manual.',
        );
        setProgressNote(null);
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

    if (manualMode) {
      await processManual(file, crop, selectedBackFile);
    } else if (consent) {
      await processWithApi(file, selectedBackFile);
    } else {
      await processManual(file, DEFAULT_CROP, selectedBackFile);
    }
  };

  const handleBackFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setSelectedBackFile(file);
    setError(null);

    if (selectedFile && consent && !manualMode) {
      await processWithApi(selectedFile, file);
    } else {
      await processBackManual(file);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFileChosen(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleBackInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleBackFileChosen(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFileChosen(event.dataTransfer.files?.[0]);
  };

  const handleGrantConsentAndAnalyze = async () => {
    setApiConsent(true);
    setConsent(true);
    setManualMode(false);
    if (selectedFile) {
      await processWithApi(selectedFile, selectedBackFile);
    }
  };

  const handleRevokeConsent = () => {
    setApiConsent(false);
    setConsent(false);
    setManualMode(true);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleCropChange = async (edge: keyof CropRectNormalized, pct: number) => {
    const next = { ...crop, [edge]: pct / 100 };
    setCrop(next);
    if (selectedFile) {
      await processManual(selectedFile, next, selectedBackFile);
    }
  };

  const handleSuggestOfflineTags = () => {
    const suggestion = suggestManualTags({
      category,
      dominantColorHex: value.dominantColorHex,
      formality,
      elasticity,
      hasBackPhoto: Boolean(value.backDataUrl),
    });
    setTagSuggestion(suggestion);
  };

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-bg p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Fotos de la prenda</span>
          <Badge variant={consent && !manualMode ? 'accent' : 'neutral'}>
            {consent && !manualMode ? 'API con permiso' : 'Solo local (manual)'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSuggestOfflineTags}
          >
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            Sugerir etiquetas locales
          </Button>
          {consent && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRevokeConsent}>
              Desactivar API
            </Button>
          )}
        </div>
      </div>

      {/* Zona de subida: frente (obligatorio si se sube foto) + espalda opcional */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed p-3.5 text-center transition-colors ${
            dragging ? 'border-accent bg-surface' : 'border-border bg-surface/50'
          }`}
        >
          <span className="text-xs font-semibold text-ink">Frente</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Seleccionar foto de prenda"
            onChange={handleInputChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            aria-label="Tomar foto con cámara"
            onChange={handleInputChange}
            className="hidden"
          />

          {value.dataUrl ? (
            <div className="flex w-full flex-col items-center gap-2">
              <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                <img
                  src={value.dataUrl}
                  alt="Vista previa frontal de la prenda"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Cambiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFile(null);
                    setProgressNote(null);
                    onChange({
                      dominantColorHex: value.dominantColorHex,
                      ...(value.backDataUrl ? { backDataUrl: value.backDataUrl } : {}),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Quitar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">
                Arrastra una foto (JPEG, PNG o WEBP) o elige una opción:
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Subir archivo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Cámara
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Foto de espalda (opcional) */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface/50 p-3.5 text-center">
          <span className="text-xs font-semibold text-ink">Espalda (opcional)</span>
          <input
            ref={backFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Seleccionar foto de espalda de la prenda"
            onChange={handleBackInputChange}
            className="hidden"
          />

          {value.backDataUrl ? (
            <div className="flex w-full flex-col items-center gap-2">
              <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                <img
                  src={value.backDataUrl}
                  alt="Vista previa trasera de la prenda"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => backFileInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Cambiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedBackFile(null);
                    onChange({
                      dominantColorHex: value.dominantColorHex,
                      ...(value.dataUrl ? { dataUrl: value.dataUrl } : {}),
                      ...(value.width !== undefined ? { width: value.width } : {}),
                      ...(value.height !== undefined ? { height: value.height } : {}),
                      ...(value.source ? { source: value.source } : {}),
                      ...(value.paletteHex ? { paletteHex: value.paletteHex } : {}),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Quitar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">
                Añade la espalda para consultar estampados traseros y mejorar el etiquetado IA.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => backFileInputRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Añadir espalda
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Opción de etiquetado IA cuando la API está autorizada */}
      {consent && !manualMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 text-ink">
            <input
              type="checkbox"
              checked={includeAiTags}
              onChange={(event) => setIncludeAiTags(event.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>Sugerir etiquetas con IA (Gemini Vision · sin almacenamiento en servidor)</span>
          </label>
          {selectedFile && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={analyzing}
              onClick={() => void processWithApi(selectedFile, selectedBackFile)}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Reanalizar
            </Button>
          )}
        </div>
      )}

      {/* Consentimiento explícito antes de usar la API (RF-34 / T6.6) */}
      {!consent && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-xs">
          <div className="flex items-start gap-2 text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <strong>Consentimiento para análisis vía API:</strong> antes de enviarse, tus fotos se
              reducen a &le; 1024 px y se borran sus metadatos EXIF/GPS. La API las procesa solo en
              memoria y no guarda nada.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={analyzing}
              onClick={() => void handleGrantConsentAndAnalyze()}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Permitir recorte y etiquetado (API)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setManualMode(true)}
            >
              <Crop className="h-3.5 w-3.5" aria-hidden="true" />
              Continuar en modo manual
            </Button>
          </div>
        </div>
      )}

      {/* Progreso y cancelación (RNF-02 / T6.7) */}
      {analyzing && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-xs text-ink"
        >
          <span className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden="true" />
            {progressNote ?? 'Procesando foto...'}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar
          </Button>
        </div>
      )}

      {!analyzing && progressNote && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-accent">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{progressNote}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-[#C2410C]">
          {error}
        </p>
      )}

      {/* Panel de sugerencias editables con confianza (T7.2) */}
      {tagSuggestion && (
        <div
          data-testid="tag-suggestion-panel"
          className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-surface p-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Etiquetas sugeridas</span>
              <Badge variant="accent">{tagSuggestion.provider}</Badge>
              <Badge className="tabular-nums">
                Confianza global {formatConfidence(tagSuggestion.overall_confidence)}
              </Badge>
            </div>
            {onApplyTagSuggestion && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => onApplyTagSuggestion(tagSuggestion)}
              >
                Aplicar sugerencias
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge className="tabular-nums">
              {CATEGORY_LABELS[tagSuggestion.category]} ({formatConfidence(tagSuggestion.category_confidence)})
            </Badge>
            <Badge className="tabular-nums">
              {PATTERN_LABELS[tagSuggestion.pattern]} ({formatConfidence(tagSuggestion.pattern_confidence)})
            </Badge>
            <Badge className="tabular-nums">
              {STYLE_LABELS[tagSuggestion.style]} ({formatConfidence(tagSuggestion.style_confidence)})
            </Badge>
            <Badge className="tabular-nums">
              Formalidad {tagSuggestion.formality}/5 ({formatConfidence(tagSuggestion.formality_confidence)})
            </Badge>
            {tagSuggestion.seasons.length > 0 && (
              <Badge className="tabular-nums">
                {tagSuggestion.seasons.map((s) => SEASON_LABELS[s]).join(', ')} (
                {formatConfidence(tagSuggestion.seasons_confidence)})
              </Badge>
            )}
          </div>

          {tagSuggestion.suggested_tags.length > 0 && (
            <p className="text-muted">
              Etiquetas libres: <span className="text-ink">{tagSuggestion.suggested_tags.join(', ')}</span>
            </p>
          )}
        </div>
      )}

      {/* Alternativa manual: recorte rectangular local (T6.8) */}
      {selectedFile && (!consent || manualMode) && (
        <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-sm)] border border-border bg-surface p-2.5 text-xs sm:grid-cols-4">
          {(['top', 'bottom', 'left', 'right'] as const).map((edge) => {
            const labels = { top: 'Arriba', bottom: 'Abajo', left: 'Izquierda', right: 'Derecha' };
            return (
              <label key={edge} className="flex flex-col gap-1 text-muted">
                <span>
                  Recorte {labels[edge]} ({Math.round(crop[edge] * 100)} %)
                </span>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="5"
                  value={Math.round(crop[edge] * 100)}
                  onChange={(event) => void handleCropChange(edge, Number(event.target.value))}
                  className="accent-[var(--accent)]"
                />
              </label>
            );
          })}
        </div>
      )}

      {/* Paleta sugerida editable */}
      {value.paletteHex && value.paletteHex.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Colores detectados:</span>
          {value.paletteHex.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange({ ...value, dominantColorHex: hex })}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-ink hover:border-accent"
            >
              <span
                className="inline-block h-3 w-3 rounded-xs border border-border"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
              />
              <span className="tabular-nums">{hex}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
