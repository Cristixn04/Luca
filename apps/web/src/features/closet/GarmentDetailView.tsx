import { useMemo, useState } from 'react';
import {
  createBodyModel,
  fromCm,
  recommendSize,
  validateBodyMeasurements,
  type FitZone,
  type GarmentSizeInput,
} from '@luca/domain';
import { ArrowLeft, CheckCircle2, Pencil, Ruler, Trash2 } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
import { useFittingStore, type M2GarmentCategory, type ViewerMode } from '@/features/fitting/store';
import { AvatarViewer } from '@/features/fitting/svg/AvatarViewer';
import { FIT_STATE_HEX, FIT_STATE_LABELS } from '@/features/fitting/svg/heatmapMeta';
import { CATEGORY_LABELS, FORMALITY_LABELS, STATUS_LABELS, type GarmentWithSizes } from './types';

const ZONE_LABELS: Readonly<Record<FitZone, string>> = {
  chest: 'Pecho',
  waist: 'Cintura',
  hip: 'Cadera',
  shoulders: 'Hombros',
  back: 'Espalda',
};

function mapToFrontTemplate(category: GarmentWithSizes['garment']['category']): M2GarmentCategory {
  if (category === 'pants' || category === 'shorts' || category === 'skirt') {
    return 'pants';
  }
  return 'tshirt';
}

function formatEase(easeCm: number, unit: 'cm' | 'in'): string {
  const sign = easeCm >= 0 ? '+' : '-';
  return `${sign}${fromCm(Math.abs(easeCm), unit).toFixed(1)} ${unit}`;
}

export interface GarmentDetailViewProps {
  item: GarmentWithSizes;
  onBack: () => void;
  onEdit: (item: GarmentWithSizes) => void;
  onDelete: (garmentId: string) => Promise<void>;
  onOpenInFitting: () => void;
}

export function GarmentDetailView({
  item,
  onBack,
  onEdit,
  onDelete,
  onOpenInFitting,
}: GarmentDetailViewProps) {
  const { garment, sizes } = item;
  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const optionalMeasurements = useFittingStore((s) => s.optionalMeasurements);
  const fitPreference = useFittingStore((s) => s.fitPreference);
  const unit = useFittingStore((s) => s.unit);
  const showHeatmap = useFittingStore((s) => s.showHeatmap);
  const toggleHeatmap = useFittingStore((s) => s.toggleHeatmap);
  const [detailViewMode, setDetailViewMode] = useState<ViewerMode>('front');

  const measurements = useMemo(
    () => ({
      required: bodyMeasurements,
      ...(Object.keys(optionalMeasurements).length > 0 ? { optional: optionalMeasurements } : {}),
    }),
    [bodyMeasurements, optionalMeasurements],
  );
  const validation = useMemo(() => validateBodyMeasurements(measurements), [measurements]);

  const bodyModel = useMemo(
    () => (validation.valid ? createBodyModel(measurements) : null),
    [measurements, validation.valid],
  );

  const sizeInputs: GarmentSizeInput[] = useMemo(
    () =>
      sizes.map((size) => ({
        category: garment.category,
        sizeLabel: size.label,
        elasticity: garment.elasticity,
        flatMeasuresCm: size.flatMeasuresCm,
      })),
    [garment.category, garment.elasticity, sizes],
  );

  const recommendation = useMemo(() => {
    if (!bodyModel || sizeInputs.length === 0) return null;
    return recommendSize(bodyModel, sizeInputs, fitPreference);
  }, [bodyModel, fitPreference, sizeInputs]);

  const [selectedSizeLabel, setSelectedSizeLabel] = useState<string | null>(null);
  const activeLabel = selectedSizeLabel ?? recommendation?.recommendedSize ?? sizes[0]?.label ?? '';

  const activeEvaluation = useMemo(
    () =>
      recommendation?.ranked.find((ev) => ev.sizeLabel === activeLabel) ??
      recommendation?.best ??
      null,
    [activeLabel, recommendation],
  );

  const handleLoadInFitting = () => {
    const selectedSize = sizes.find((s) => s.label === activeLabel) ?? sizes[0];
    if (!selectedSize) return;

    useFittingStore.setState({
      garmentEnabled: true,
      garmentCategory: mapToFrontTemplate(garment.category),
      garmentName: garment.name,
      garmentSizeLabel: selectedSize.label,
      garmentElasticity: garment.elasticity,
      garmentFlatMeasures: { ...selectedSize.flatMeasuresCm },
    });
    onOpenInFitting();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al clóset
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleLoadInFitting}>
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir en Probador
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Editar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onDelete(garment.id)}
            className="border-[#C2410C] text-[#C2410C]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      </div>

      <section aria-labelledby="garment-detail-title" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{CATEGORY_LABELS[garment.category]}</Badge>
          <Badge>{STATUS_LABELS[garment.status]}</Badge>
          <Badge>{FORMALITY_LABELS[garment.formality]}</Badge>
          {garment.price !== undefined && (
            <Badge className="tabular-nums">${garment.price.toFixed(2)}</Badge>
          )}
        </div>
        <h1 id="garment-detail-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
          {garment.name}
        </h1>
        <p className="text-sm text-muted">
          {garment.brand ? `${garment.brand} · ` : ''}
          Elasticidad {(garment.elasticity * 100).toFixed(0)} %
          {garment.tags.length > 0 ? ` · ${garment.tags.join(', ')}` : ''}
        </p>
      </section>

      {recommendation && (
        <div
          data-testid="recommended-size-banner"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-accent/40 bg-surface p-4"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-ink">
                Talla recomendada: <span className="text-accent">{recommendation.recommendedSize}</span>
              </p>
              <p className="text-xs text-muted">{recommendation.best.reason}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Seleccionar talla">
            {sizes.map((size) => (
              <Button
                key={size.id}
                type="button"
                size="sm"
                variant={activeLabel === size.label ? 'primary' : 'outline'}
                aria-pressed={activeLabel === size.label}
                onClick={() => setSelectedSizeLabel(size.label)}
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_minmax(300px,380px)]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Probador · Talla {activeLabel}</CardTitle>
                <CardDescription>Vista de frente con mapa de calor</CardDescription>
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
            {bodyModel && activeEvaluation ? (
              <AvatarViewer
                model={bodyModel}
                garmentCategory={mapToFrontTemplate(garment.category)}
                fitReport={activeEvaluation.report}
                showHeatmap={showHeatmap}
                viewMode={detailViewMode}
                onChangeViewMode={setDetailViewMode}
              />
            ) : (
              <p className="text-sm text-muted">
                Verifica que tus medidas corporales en el Probador sean válidas para ver el avatar.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          {activeEvaluation && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Calce · Talla {activeEvaluation.sizeLabel}</CardTitle>
                  <Badge
                    style={{
                      borderColor: FIT_STATE_HEX[activeEvaluation.report.overallState],
                      color: FIT_STATE_HEX[activeEvaluation.report.overallState],
                    }}
                  >
                    {FIT_STATE_LABELS[activeEvaluation.report.overallState]}
                  </Badge>
                </div>
                <CardDescription>{activeEvaluation.reason}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {activeEvaluation.report.evaluatedZones.map((zone) => (
                    <li
                      key={zone.zone}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-ink">{ZONE_LABELS[zone.zone]}</p>
                        <p className="text-muted">
                          La prenda queda {FIT_STATE_LABELS[zone.state].toLowerCase()}
                          {zone.elasticCompensated ? ' (por elasticidad)' : ''}
                        </p>
                      </div>
                      <span
                        className="tabular-nums font-semibold"
                        style={{ color: FIT_STATE_HEX[zone.state] }}
                      >
                        {formatEase(zone.easeCm, unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {recommendation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Comparativa de tallas</CardTitle>
                <CardDescription>Ordenadas por cercanía a tu preferencia ({fitPreference})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="py-1.5 pr-2 font-semibold">Talla</th>
                        <th className="py-1.5 pr-2 font-semibold">Veredicto</th>
                        <th className="py-1.5 text-right font-semibold">Distancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendation.ranked.map((row) => (
                        <tr key={row.sizeLabel} className="border-b border-border last:border-0">
                          <td className="py-2 pr-2 font-semibold text-ink">
                            {row.sizeLabel}
                            {row.sizeLabel === recommendation.recommendedSize && (
                              <span className="ml-1.5 text-[11px] font-medium text-accent">
                                (sugerida)
                              </span>
                            )}
                          </td>
                          <td
                            className="py-2 pr-2 font-medium"
                            style={{ color: FIT_STATE_HEX[row.report.overallState] }}
                          >
                            {FIT_STATE_LABELS[row.report.overallState]}
                          </td>
                          <td className="tabular-nums py-2 text-right text-muted">
                            {row.targetDistanceCm.toFixed(1)} cm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
