import { useMemo, useState } from 'react';
import {
  analyzeClosetUsage,
  createBodyModel,
  evaluateGarmentColorHarmony,
  fromCm,
  recommendSize,
  simulateWishlistUnlock,
  validateBodyMeasurements,
  type FitZone,
  type GarmentSizeInput,
} from '@luca/domain';
import { ArrowLeft, CalendarCheck, CheckCircle2, Pencil, Ruler, Shirt, Trash2 } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
import { getActiveSeasonId, useColorStore } from '@/features/color/colorStore';
import { useFittingStore, type ViewerMode } from '@/features/fitting/store';
import { toOutfitGarmentInputs, useOutfitsStore } from '@/features/outfits/outfitsStore';
import { AvatarViewer } from '@/features/fitting/svg/AvatarViewer';
import { FIT_STATE_HEX, FIT_STATE_LABELS } from '@/features/fitting/svg/heatmapMeta';
import { findSimilarGarments } from './closetSearch';
import {
  CATEGORY_LABELS,
  FORMALITY_LABELS,
  PATTERN_LABELS,
  SEASON_LABELS,
  STATUS_LABELS,
  STYLE_LABELS,
  type GarmentWithSizes,
} from './types';

const ZONE_LABELS: Readonly<Record<FitZone, string>> = {
  chest: 'Pecho',
  waist: 'Cintura',
  hip: 'Cadera',
  shoulders: 'Hombros',
  back: 'Espalda',
};

function formatEase(easeCm: number, unit: 'cm' | 'in'): string {
  const sign = easeCm >= 0 ? '+' : '-';
  return `${sign}${fromCm(Math.abs(easeCm), unit).toFixed(1)} ${unit}`;
}

export interface GarmentDetailViewProps {
  item: GarmentWithSizes;
  allItems?: readonly GarmentWithSizes[];
  onBack: () => void;
  onSelectGarment?: (garmentId: string) => void;
  onEdit: (item: GarmentWithSizes) => void;
  onDelete: (garmentId: string) => Promise<void>;
  onOpenInFitting: () => void;
}

export function GarmentDetailView({
  item,
  allItems = [],
  onBack,
  onSelectGarment,
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
  const [photoSide, setPhotoSide] = useState<'front' | 'back'>('front');

  const colorProfile = useColorStore((s) => s.profile);
  const activeSeasonId = useMemo(() => getActiveSeasonId(colorProfile), [colorProfile]);
  const colorHarmony = useMemo(() => {
    if (!activeSeasonId || !garment.dominantColorHex) return null;
    return evaluateGarmentColorHarmony(garment.dominantColorHex, activeSeasonId);
  }, [activeSeasonId, garment.dominantColorHex]);

  const wearLogs = useOutfitsStore((s) => s.wearLogs);
  const logGarmentWear = useOutfitsStore((s) => s.logGarmentWear);
  const [wearNotice, setWearNotice] = useState<string | null>(null);

  const similarGarments = useMemo(
    () => findSimilarGarments(item, allItems, 4),
    [allItems, item],
  );

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

  const closetUsage = useMemo(() => {
    const pool = allItems.length > 0 ? allItems : [item];
    const inputs = toOutfitGarmentInputs(pool, wearLogs, bodyModel, fitPreference);
    const metrics = analyzeClosetUsage(inputs, {
      occasion: 'casual',
      temperatureC: 21,
      bodyModel,
      fitPreference,
      seasonId: activeSeasonId,
    });
    const currentInput = inputs.find((g) => g.id === garment.id);
    const wishlistUnlock =
      garment.status === 'wishlist' && currentInput
        ? simulateWishlistUnlock(
            currentInput,
            inputs.filter((g) => g.status === 'owned'),
            {
              occasion: 'casual',
              temperatureC: 21,
              bodyModel,
              fitPreference,
              seasonId: activeSeasonId,
            },
          )
        : null;
    return {
      metrics: metrics[garment.id] ?? null,
      wishlistUnlock,
    };
  }, [activeSeasonId, allItems, bodyModel, fitPreference, garment.id, garment.status, item, wearLogs]);

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
      garmentSource: 'closet',
      selectedClosetGarmentId: garment.id,
      garmentCategory: garment.category,
      garmentName: garment.name,
      garmentColorHex: garment.dominantColorHex ?? '#1F5F6B',
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
          {garment.status === 'owned' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={async () => {
                await logGarmentWear(garment.id);
                setWearNotice('Uso registrado hoy.');
              }}
            >
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Registrar uso hoy
            </Button>
          )}
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
          {garment.style && <Badge>{STYLE_LABELS[garment.style]}</Badge>}
          {garment.pattern && <Badge>{PATTERN_LABELS[garment.pattern]}</Badge>}
          {garment.seasons && garment.seasons.length > 0 && (
            <Badge>{garment.seasons.map((s) => SEASON_LABELS[s]).join(' · ')}</Badge>
          )}
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
                garmentCategory={garment.category}
                fitReport={activeEvaluation.report}
                showHeatmap={showHeatmap}
                garmentColorHex={garment.dominantColorHex}
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
          {item.image?.dataUrl && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>Foto guardada</CardTitle>
                  </div>
                  {item.image.backDataUrl && (
                    <div
                      role="group"
                      aria-label="Seleccionar cara de la foto"
                      className="flex items-center gap-1"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant={photoSide === 'front' ? 'primary' : 'outline'}
                        aria-pressed={photoSide === 'front'}
                        onClick={() => setPhotoSide('front')}
                      >
                        Frente
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={photoSide === 'back' ? 'primary' : 'outline'}
                        aria-pressed={photoSide === 'back'}
                        onClick={() => setPhotoSide('back')}
                      >
                        Espalda
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                  <img
                    src={
                      photoSide === 'back' && item.image.backDataUrl
                        ? item.image.backDataUrl
                        : item.image.dataUrl
                    }
                    alt={
                      photoSide === 'back' && item.image.backDataUrl
                        ? `Foto de espalda de ${garment.name}`
                        : `Foto de frente de ${garment.name}`
                    }
                    className="max-h-full max-w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
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

          {closetUsage.metrics && (
            <Card data-testid="garment-usage-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Uso y costo por uso</CardTitle>
                  {closetUsage.metrics.isOrphan && <Badge>Prenda huérfana</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs">
                {garment.status === 'wishlist' && closetUsage.wishlistUnlock ? (
                  <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-accent/40 bg-bg px-3 py-2">
                    <span className="text-muted">Al comprarla desbloquea</span>
                    <span className="tabular-nums font-semibold text-accent">
                      {closetUsage.wishlistUnlock.unlocksOutfitsCount} outfit(s) nuevos
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2.5">
                      <p className="text-muted">Usos registrados</p>
                      <p data-testid="garment-wear-count" className="tabular-nums text-base font-bold text-ink">
                        {closetUsage.metrics.wearCount}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2.5">
                      <p className="text-muted">Versatilidad</p>
                      <p className="tabular-nums text-base font-bold text-ink">
                        {closetUsage.metrics.versatility} outfit(s)
                      </p>
                    </div>
                  </div>
                )}

                {closetUsage.metrics.cpw !== null && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2.5">
                      <p className="text-muted">Costo por uso actual</p>
                      <p data-testid="garment-cpw-value" className="tabular-nums font-semibold text-ink">
                        ${closetUsage.metrics.cpw.toFixed(2)}
                      </p>
                    </div>
                    {closetUsage.metrics.projectedCpw !== null && (
                      <div className="rounded-[var(--radius-sm)] border border-border bg-bg p-2.5">
                        <p className="text-muted">Proyectado (30 usos)</p>
                        <p className="tabular-nums font-semibold text-ink">
                          ${closetUsage.metrics.projectedCpw.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {wearNotice && (
                  <p role="status" className="font-medium text-accent">
                    {wearNotice}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {colorHarmony && (
            <Card data-testid="garment-color-harmony-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Afinidad con tu paleta</CardTitle>
                  <Badge variant="accent" className="tabular-nums">
                    {colorHarmony.scorePercent} %
                  </Badge>
                </div>
                <CardDescription>
                  Estación activa: {colorHarmony.seasonLabel} · ΔE₀₀{' '}
                  {colorHarmony.minDeltaE00.toFixed(1)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs">
                <p className="text-muted">{colorHarmony.reason}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                    <span
                      className="h-6 w-6 shrink-0 rounded-xs border border-border"
                      style={{ backgroundColor: colorHarmony.garmentHex }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted">Prenda</p>
                      <p className="tabular-nums truncate font-semibold text-ink">
                        {colorHarmony.garmentHex}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                    <span
                      className="h-6 w-6 shrink-0 rounded-xs border border-border"
                      style={{ backgroundColor: colorHarmony.closestColor.hex }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] text-muted">
                        {colorHarmony.closestColor.name}
                      </p>
                      <p className="tabular-nums truncate font-semibold text-ink">
                        {colorHarmony.closestColor.hex}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted">
                  <span className="tabular-nums">
                    ΔL*: {colorHarmony.breakdown.deltaL >= 0 ? '+' : ''}
                    {colorHarmony.breakdown.deltaL.toFixed(1)}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">
                    ΔC*: {colorHarmony.breakdown.deltaC >= 0 ? '+' : ''}
                    {colorHarmony.breakdown.deltaC.toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {similarGarments.length > 0 && (
            <Card data-testid="similar-garments-card">
              <CardHeader className="pb-3">
                <CardTitle>Prendas similares</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {similarGarments.map((match) => (
                    <li key={match.item.garment.id}>
                      <button
                        type="button"
                        onClick={() => onSelectGarment?.(match.item.garment.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-left transition-colors hover:border-accent"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border"
                            style={{
                              backgroundColor: match.item.garment.dominantColorHex ?? '#1F5F6B',
                            }}
                            aria-hidden="true"
                          >
                            <Shirt className="h-3.5 w-3.5 text-white" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">
                              {match.item.garment.name}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {match.reasons.join(' · ')}
                            </p>
                          </div>
                        </div>
                        <Badge className="shrink-0 tabular-nums">{match.scorePercent} %</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
