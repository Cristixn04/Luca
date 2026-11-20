import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  Crop,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
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
import {
  sanitizeImageForUpload,
  type CropRectNormalized,
} from '@/infrastructure/api-client/imageSanitizer';

export interface PhotoIngestValue {
  readonly dataUrl?: string;
  readonly width?: number;
  readonly height?: number;
  readonly source?: 'api' | 'manual';
  readonly dominantColorHex: string;
  readonly paletteHex?: readonly string[];
}

export interface PhotoIngestSectionProps {
  value: PhotoIngestValue;
  onChange: (next: PhotoIngestValue) => void;
}

const DEFAULT_CROP: CropRectNormalized = { top: 0, right: 0, bottom: 0, left: 0 };

export function PhotoIngestSection({ value, onChange }: PhotoIngestSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [consent, setConsent] = useState<boolean>(() => getApiConsent());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [crop, setCrop] = useState<CropRectNormalized>(DEFAULT_CROP);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressNote, setProgressNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processManual = async (file: File, nextCrop: CropRectNormalized) => {
    setError(null);
    setAnalyzing(true);
    setProgressNote('Recortando y limpiando metadatos EXIF en tu dispositivo...');
    try {
      const sanitized = await sanitizeImageForUpload(file, { crop: nextCrop });
      onChange({
        dataUrl: sanitized.dataUrl,
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

  const processWithApi = async (file: File) => {
    setError(null);
    setAnalyzing(true);
    setProgressNote('Reduciendo a ≤ 1024 px y eliminando EXIF antes de enviar...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const sanitized = await sanitizeImageForUpload(file);
      if (controller.signal.aborted) return;

      setProgressNote('Recortando fondo y calculando color dominante en CIELAB...');
      const response = await analyzeGarmentPhoto(sanitized.blob, {
        signal: controller.signal,
      });

      onChange({
        dataUrl: `data:image/png;base64,${response.cutout_png_base64}`,
        width: response.width,
        height: response.height,
        source: 'api',
        dominantColorHex: response.dominant_color_hex,
        paletteHex: response.palette_hex,
      });
      setProgressNote(
        `Recorte completado en ${response.processing_ms} ms (${response.provider}). Puedes editar el color.`,
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
      await processManual(file, crop);
    } else if (consent) {
      await processWithApi(file);
    } else {
      // Sin consentimiento aún: previsualiza en modo manual local sin tocar la red.
      await processManual(file, DEFAULT_CROP);
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

  const handleGrantConsentAndAnalyze = async () => {
    setApiConsent(true);
    setConsent(true);
    setManualMode(false);
    if (selectedFile) {
      await processWithApi(selectedFile);
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
      await processManual(selectedFile, next);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-bg p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Foto de la prenda</span>
          <Badge variant={consent && !manualMode ? 'accent' : 'neutral'}>
            {consent && !manualMode ? 'API con permiso' : 'Solo local (manual)'}
          </Badge>
        </div>

        {consent && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRevokeConsent}>
            Desactivar API
          </Button>
        )}
      </div>

      {/* Zona de subida: archivo, arrastrar y cámara móvil (T6.7) */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed p-4 text-center transition-colors ${
          dragging ? 'border-accent bg-surface' : 'border-border bg-surface/50'
        }`}
      >
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
            <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg p-2">
              <img
                src={value.dataUrl}
                alt="Vista previa de la prenda"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Cambiar foto
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedFile(null);
                  setProgressNote(null);
                  onChange({ dominantColorHex: value.dominantColorHex });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Quitar foto
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">
              Arrastra una foto aquí (JPEG, PNG o WEBP) o elige una opción:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
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

      {/* Consentimiento explícito antes de usar la API (RF-34 / T6.6) */}
      {!consent && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-xs">
          <div className="flex items-start gap-2 text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <strong>Consentimiento para recorte automático:</strong> antes de enviarse, tu foto se
              reduce a ≤ 1024 px y se borran sus metadatos EXIF/GPS. La API la procesa solo en
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
              Permitir recorte automático (API)
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
