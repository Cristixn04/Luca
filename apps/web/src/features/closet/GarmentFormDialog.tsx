import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { GARMENT_CATEGORIES, type GarmentCategory } from '@luca/domain';
import { X } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { useFittingStore } from '@/features/fitting/store';
import { validateGarmentDraft } from './closetService';
import { PhotoIngestSection, type PhotoIngestValue } from './PhotoIngestSection';
import { SizeTableEditor } from './SizeTableEditor';
import {
  CATEGORY_LABELS,
  FORMALITY_LABELS,
  STATUS_LABELS,
  type FormalityLevel,
  type GarmentDraft,
  type GarmentStatus,
  type GarmentWithSizes,
  type SizeOptionDraft,
} from './types';

export interface GarmentFormDialogProps {
  open: boolean;
  editing?: GarmentWithSizes | null;
  onClose: () => void;
  onSave: (draft: GarmentDraft, editingId?: string) => Promise<void>;
}

function defaultSizesForCategory(category: GarmentCategory): SizeOptionDraft[] {
  if (category === 'pants' || category === 'shorts' || category === 'skirt') {
    return [
      { label: 'S', flatMeasuresCm: { waistFlat: 38, hipFlat: 49 } },
      { label: 'M', flatMeasuresCm: { waistFlat: 41, hipFlat: 52 } },
      { label: 'L', flatMeasuresCm: { waistFlat: 44, hipFlat: 55 } },
    ];
  }
  if (category === 'dress') {
    return [
      { label: 'S', flatMeasuresCm: { chestFlat: 46, waistFlat: 38, hipFlat: 49 } },
      { label: 'M', flatMeasuresCm: { chestFlat: 49, waistFlat: 41, hipFlat: 52 } },
    ];
  }
  return [
    { label: 'S', flatMeasuresCm: { chestFlat: 47, shoulders: 43.5, backWidth: 40 } },
    { label: 'M', flatMeasuresCm: { chestFlat: 50, shoulders: 45.5, backWidth: 42 } },
    { label: 'L', flatMeasuresCm: { chestFlat: 54, shoulders: 47.5, backWidth: 44.5 } },
  ];
}

export function GarmentFormDialog({ open, editing, onClose, onSave }: GarmentFormDialogProps) {
  const unit = useFittingStore((s) => s.unit);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [category, setCategory] = useState<GarmentCategory>('tshirt');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState<GarmentStatus>('owned');
  const [priceText, setPriceText] = useState('');
  const [elasticityPct, setElasticityPct] = useState('5');
  const [formality, setFormality] = useState<FormalityLevel>(2);
  const [tagsText, setTagsText] = useState('');
  const [dominantColorHex, setDominantColorHex] = useState('#1F5F6B');
  const [photo, setPhoto] = useState<PhotoIngestValue>({ dominantColorHex: '#1F5F6B' });
  const [sizes, setSizes] = useState<SizeOptionDraft[]>(() => defaultSizesForCategory('tshirt'));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setCategory(editing.garment.category);
      setName(editing.garment.name);
      setBrand(editing.garment.brand);
      setStatus(editing.garment.status);
      setPriceText(editing.garment.price !== undefined ? String(editing.garment.price) : '');
      setElasticityPct(String(Math.round(editing.garment.elasticity * 100)));
      setFormality(editing.garment.formality);
      setTagsText(editing.garment.tags.join(', '));
      const colorHex = editing.garment.dominantColorHex ?? '#1F5F6B';
      setDominantColorHex(colorHex);
      setPhoto({
        dominantColorHex: colorHex,
        ...(editing.image
          ? {
              dataUrl: editing.image.dataUrl,
              width: editing.image.width,
              height: editing.image.height,
              source: editing.image.source,
            }
          : {}),
      });
      setSizes(
        editing.sizes.map((s) => ({
          id: s.id,
          label: s.label,
          flatMeasuresCm: { ...s.flatMeasuresCm },
        })),
      );
    } else {
      setCategory('tshirt');
      setName('');
      setBrand('');
      setStatus('owned');
      setPriceText('');
      setElasticityPct('5');
      setFormality(2);
      setTagsText('');
      setDominantColorHex('#1F5F6B');
      setPhoto({ dominantColorHex: '#1F5F6B' });
      setSizes(defaultSizesForCategory('tshirt'));
    }
    setErrors([]);
  }, [editing, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
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

  const handleCategoryChange = (nextCategory: GarmentCategory) => {
    setCategory(nextCategory);
    if (!editing) {
      setSizes(defaultSizesForCategory(nextCategory));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedPrice = priceText.trim() === '' ? undefined : Number.parseFloat(priceText);
    const parsedElasticity = Number.parseFloat(elasticityPct) / 100;

    const draft: GarmentDraft = {
      category,
      name,
      brand,
      status,
      ...(parsedPrice !== undefined ? { price: parsedPrice } : {}),
      elasticity: Number.isFinite(parsedElasticity) ? parsedElasticity : 0,
      formality,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      dominantColorHex,
      image: photo.dataUrl
        ? {
            dataUrl: photo.dataUrl,
            width: photo.width,
            height: photo.height,
            source: photo.source ?? 'manual',
          }
        : editing?.image
          ? null
          : undefined,
      sizes,
    };

    const validationErrors = validateGarmentDraft(draft);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await onSave(draft, editing?.garment.id);
      onClose();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'No se pudo guardar la prenda.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="w-full max-w-2xl"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {editing ? 'Editar prenda' : 'Añadir prenda al clóset'}
            </h2>
            <p className="text-xs text-muted">
              Se guarda localmente en tu dispositivo (cifrada si tu bóveda está activa).
            </p>
          </div>
          <form method="dialog">
            <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar formulario">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-name" className="text-xs font-medium text-muted">
                Nombre *
              </label>
              <input
                id="garment-form-name"
                type="text"
                required
                maxLength={100}
                placeholder="Ej. Camisa Oxford blanca"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-brand" className="text-xs font-medium text-muted">
                Marca
              </label>
              <input
                id="garment-form-brand"
                type="text"
                maxLength={60}
                placeholder="Opcional"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-category" className="text-xs font-medium text-muted">
                Categoría
              </label>
              <select
                id="garment-form-category"
                value={category}
                onChange={(event) => handleCategoryChange(event.target.value as GarmentCategory)}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              >
                {GARMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-status" className="text-xs font-medium text-muted">
                Estado
              </label>
              <select
                id="garment-form-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as GarmentStatus)}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              >
                <option value="owned">{STATUS_LABELS.owned}</option>
                <option value="wishlist">{STATUS_LABELS.wishlist}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-price" className="text-xs font-medium text-muted">
                Precio (opcional)
              </label>
              <input
                id="garment-form-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={priceText}
                onChange={(event) => setPriceText(event.target.value)}
                className="tabular-nums rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-elasticity" className="text-xs font-medium text-muted">
                Elasticidad (%)
              </label>
              <input
                id="garment-form-elasticity"
                type="number"
                min="0"
                max="35"
                step="1"
                value={elasticityPct}
                onChange={(event) => setElasticityPct(event.target.value)}
                className="tabular-nums rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-formality" className="text-xs font-medium text-muted">
                Formalidad
              </label>
              <select
                id="garment-form-formality"
                value={formality}
                onChange={(event) =>
                  setFormality(Number.parseInt(event.target.value, 10) as FormalityLevel)
                }
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
              >
                {([1, 2, 3, 4, 5] as const).map((level) => (
                  <option key={level} value={level}>
                    {FORMALITY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="garment-form-color" className="text-xs font-medium text-muted">
                Color de referencia
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="garment-form-color"
                  type="color"
                  value={dominantColorHex}
                  onChange={(event) => setDominantColorHex(event.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-[var(--radius-sm)] border border-border bg-bg p-0.5"
                />
                <span className="tabular-nums text-xs text-muted">{dominantColorHex}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="garment-form-tags" className="text-xs font-medium text-muted">
              Etiquetas (separadas por coma)
            </label>
            <input
              id="garment-form-tags"
              type="text"
              placeholder="verano, algodón, oficina"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
            />
          </div>

          <PhotoIngestSection
            value={{ ...photo, dominantColorHex }}
            onChange={(next) => {
              setPhoto(next);
              setDominantColorHex(next.dominantColorHex);
            }}
          />

          <SizeTableEditor category={category} unit={unit} sizes={sizes} onChange={setSizes} />

          {errors.length > 0 && (
            <div role="alert" className="flex flex-col gap-1 text-xs font-medium text-[#C2410C]">
              {errors.map((err) => (
                <p key={err}>{err}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar prenda'}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
