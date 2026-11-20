import { useEffect, useMemo, useRef } from 'react';
import {
  createBodyModel,
  evaluateGarmentFit,
  validateBodyMeasurements,
  type BodyMeasurements,
} from '@luca/domain';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/Card';
import { useClosetStore } from '@/features/closet/closetStore';
import { useVaultStore } from '@/features/vault/vaultStore';
import { useT } from '@/i18n/i18nStore';
import { GarmentPanel } from './GarmentPanel';
import { MeasurementsPanel } from './MeasurementsPanel';
import { useFittingStore } from './store';
import { AvatarViewer } from './svg/AvatarViewer';
import type { GarmentVisualMeta } from './svg/garmentVisuals';

export function FittingRoom() {
  const t = useT();
  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const optionalMeasurements = useFittingStore((s) => s.optionalMeasurements);
  const mannequinSilhouette = useFittingStore((s) => s.mannequinSilhouette);
  const setMannequinSilhouette = useFittingStore((s) => s.setMannequinSilhouette);
  const viewMode = useFittingStore((s) => s.viewMode);
  const setViewMode = useFittingStore((s) => s.setViewMode);
  const garmentEnabled = useFittingStore((s) => s.garmentEnabled);
  const garmentSource = useFittingStore((s) => s.garmentSource);
  const selectedClosetGarmentId = useFittingStore((s) => s.selectedClosetGarmentId);
  const garmentCategory = useFittingStore((s) => s.garmentCategory);
  const garmentName = useFittingStore((s) => s.garmentName);
  const garmentColorHex = useFittingStore((s) => s.garmentColorHex);
  const garmentSizeLabel = useFittingStore((s) => s.garmentSizeLabel);
  const garmentElasticity = useFittingStore((s) => s.garmentElasticity);
  const garmentFlatMeasures = useFittingStore((s) => s.garmentFlatMeasures);
  const showHeatmap = useFittingStore((s) => s.showHeatmap);
  const toggleHeatmap = useFittingStore((s) => s.toggleHeatmap);
  const closetItems = useClosetStore((s) => s.items);

  const garmentVisualMeta: GarmentVisualMeta = useMemo(() => {
    if (garmentSource === 'closet' && selectedClosetGarmentId) {
      const selected = closetItems.find((item) => item.garment.id === selectedClosetGarmentId);
      if (selected) {
        return {
          name: selected.garment.name,
          pattern: selected.garment.pattern,
          style: selected.garment.style,
          tags: selected.garment.tags,
          visualSpec: selected.garment.visualSpec,
          imageUrl: selected.image?.dataUrl,
          backImageUrl: selected.image?.backDataUrl,
        };
      }
    }
    return { name: garmentName };
  }, [closetItems, garmentName, garmentSource, selectedClosetGarmentId]);

  const measurements: BodyMeasurements = useMemo(
    () => ({
      required: bodyMeasurements,
      ...(Object.keys(optionalMeasurements).length > 0 ? { optional: optionalMeasurements } : {}),
    }),
    [bodyMeasurements, optionalMeasurements],
  );

  const validation = useMemo(() => validateBodyMeasurements(measurements), [measurements]);

  const vaultStatus = useVaultStore((s) => s.status);
  const persistCurrentMeasurements = useVaultStore((s) => s.persistCurrentMeasurements);
  const lastSavedJsonRef = useRef<string>(
    JSON.stringify({ required: bodyMeasurements, optional: optionalMeasurements }),
  );

  useEffect(() => {
    if (!validation.valid) return;
    if (vaultStatus !== 'unlocked' && vaultStatus !== 'plaintext') return;

    const serialized = JSON.stringify({
      required: bodyMeasurements,
      optional: optionalMeasurements,
    });
    if (serialized === lastSavedJsonRef.current) return;

    const timer = window.setTimeout(() => {
      lastSavedJsonRef.current = serialized;
      void persistCurrentMeasurements(bodyMeasurements, optionalMeasurements);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [
    bodyMeasurements,
    optionalMeasurements,
    persistCurrentMeasurements,
    validation.valid,
    vaultStatus,
  ]);

  const bodyModel = useMemo(() => {
    if (!validation.valid) {
      return null;
    }
    return createBodyModel(measurements);
  }, [measurements, validation.valid]);

  const fitReport = useMemo(() => {
    if (!bodyModel || !garmentEnabled) {
      return null;
    }
    return evaluateGarmentFit(bodyModel, {
      category: garmentCategory,
      sizeLabel: garmentSizeLabel,
      elasticity: garmentElasticity,
      flatMeasuresCm: garmentFlatMeasures,
    });
  }, [
    bodyModel,
    garmentCategory,
    garmentElasticity,
    garmentEnabled,
    garmentFlatMeasures,
    garmentSizeLabel,
  ]);

  const isThreeViews = viewMode === 'all';

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="fitting-heading" className="flex flex-col gap-1">
        <h1 id="fitting-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t.headings.fitting}
        </h1>
      </section>

      <div
        className={
          isThreeViews
            ? 'grid items-start gap-5 xl:grid-cols-[minmax(250px,290px)_1fr_minmax(260px,300px)]'
            : 'grid items-start gap-5 lg:grid-cols-[minmax(260px,310px)_1fr_minmax(280px,330px)]'
        }
      >
        <MeasurementsPanel validation={validation} />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CardTitle>Avatar</CardTitle>
                <div
                  role="group"
                  aria-label="Tipo de maniquí"
                  className="inline-flex rounded-[var(--radius-sm)] border border-border bg-bg p-0.5"
                >
                  {(
                    [
                      { id: 'female', label: 'Mujer' },
                      { id: 'male', label: 'Hombre' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={mannequinSilhouette === opt.id}
                      onClick={() => setMannequinSilhouette(opt.id)}
                      className={`cursor-pointer rounded-[6px] px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        mannequinSilhouette === opt.id
                          ? 'bg-accent text-accent-ink'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={toggleHeatmap}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Mapa de calor
              </label>
            </div>
          </CardHeader>

          <CardContent>
            {bodyModel ? (
              <AvatarViewer
                model={bodyModel}
                silhouette={mannequinSilhouette}
                garmentCategory={garmentCategory}
                fitReport={fitReport}
                showHeatmap={showHeatmap}
                garmentColorHex={garmentColorHex}
                garmentMeta={garmentVisualMeta}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
              />
            ) : (
              <div
                role="alert"
                className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg px-6 py-16 text-center"
              >
                <AlertCircle className="h-6 w-6 text-[#C2410C]" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">
                  Corrige las medidas fuera de rango para dibujar el avatar
                </p>
                <p className="max-w-xs text-xs text-muted">
                  Revisa los campos marcados en el panel de medidas para volver a calcular el
                  modelo corporal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <GarmentPanel fitReport={fitReport} />
      </div>
    </div>
  );
}
