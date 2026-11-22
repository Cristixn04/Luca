import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { GARMENT_CATEGORIES, type GarmentCategory } from '@luca/domain';
import { X } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { useFittingStore } from '@/features/fitting/store';
import type { GarmentTagSuggestion } from '@/infrastructure/api-client/generated.types';
import { validateGarmentDraft } from './closetService';
import { PhotoIngestSection, type PhotoIngestValue } from './PhotoIngestSection';
import { SizeTableEditor } from './SizeTableEditor';
import {
  CATEGORY_LABELS,
  FORMALITY_LABELS,
  GARMENT_STYLES,
  STYLE_LABELS,
  type FormalityLevel,
  type GarmentDraft,
  type GarmentPattern,
  type GarmentSeason,
  type GarmentStyle,
  type GarmentVisualSpec,
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

  // Campos visibles solicitados: nombre, categoría, formalidad, estilo, tallaje y foto de referencia
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>('tshirt');
  const [formality, setFormality] = useState<FormalityLevel>(2);
  const [style, setStyle] = useState<GarmentStyle | ''>('casual');
  const [sizes, setSizes] = useState<SizeOptionDraft[]>(() => defaultSizesForCategory('tshirt'));
  const [photo, setPhoto] = useState<PhotoIngestValue>({ dominantColorHex: '#1F5F6B' });

  // Metadatos derivados automáticamente por el agente IA (o preservados al editar)
  const [dominantColorHex, setDominantColorHex] = useState('#1F5F6B');
  const [elasticity, setElasticity] = useState(0.05);
  const [pattern, setPattern] = useState<GarmentPattern | undefined>('solid');
  const [seasons, setSeasons] = useState<GarmentSeason[]>(['spring', 'summer', 'autumn']);
  const [tags, setTags] = useState<string[]>([]);
  const [visualSpec, setVisualSpec] = useState<GarmentVisualSpec | undefined>(undefined);
  const [designRejectedReason, setDesignRejectedReason] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setCategory(editing.garment.category);
      setName(editing.garment.name);
      setFormality(editing.garment.formality);
      setStyle(editing.garment.style ?? 'casual');
      setElasticity(editing.garment.elasticity);
      setPattern(editing.garment.pattern);
      setSeasons([...(editing.garment.seasons ?? ['spring', 'summer', 'autumn'])]);
      setTags([...editing.garment.tags]);
      const colorHex = editing.garment.dominantColorHex ?? '#1F5F6B';
      setDominantColorHex(colorHex);
      setVisualSpec(editing.garment.visualSpec);
      setPhoto({
        dominantColorHex: colorHex,
        ...(editing.image
          ? {
              dataUrl: editing.image.dataUrl,
              ...(editing.image.backDataUrl ? { backDataUrl: editing.image.backDataUrl } : {}),
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
      setFormality(2);
      setStyle('casual');
      setElasticity(0.05);
      setPattern('solid');
      setSeasons(['spring', 'summer', 'autumn']);
      setTags([]);
      setDominantColorHex('#1F5F6B');
      setVisualSpec(undefined);
      setPhoto({ dominantColorHex: '#1F5F6B' });
      setSizes(defaultSizesForCategory('tshirt'));
    }
    setDesignRejectedReason(null);
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

  const handleApplyTagSuggestion = (suggestion: GarmentTagSuggestion) => {
    // Nunca sobreescribe la categoría elegida explícitamente por el usuario
    setPattern(suggestion.pattern);
    setStyle(suggestion.style);
    setFormality(suggestion.formality);
    setSeasons([...suggestion.seasons]);
    if (typeof suggestion.estimated_elasticity === 'number') {
      setElasticity(suggestion.estimated_elasticity);
    }
    if (!name.trim() && suggestion.suggested_name) {
      setName(suggestion.suggested_name);
    }
    if (suggestion.visual_spec) {
      setVisualSpec(suggestion.visual_spec);
      if (suggestion.visual_spec.primary_color_hex) {
        setDominantColorHex(suggestion.visual_spec.primary_color_hex);
      }
    }
    setTags(Array.from(new Set(suggestion.suggested_tags)));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (designRejectedReason) {
      setErrors([designRejectedReason]);
      return;
    }

    const draft: GarmentDraft = {
      category,
      name,
      brand: editing?.garment.brand ?? '',
      status: editing?.garment.status ?? 'owned',
      ...(editing?.garment.price !== undefined ? { price: editing.garment.price } : {}),
      elasticity,
      formality,
      ...(pattern ? { pattern } : {}),
      ...(style ? { style } : {}),
      ...(seasons.length > 0 ? { seasons } : {}),
      tags,
      dominantColorHex,
      ...(visualSpec ? { visualSpec } : {}),
      image: photo.dataUrl
        ? {
            dataUrl: photo.dataUrl,
            ...(photo.backDataUrl ? { backDataUrl: photo.backDataUrl } : {}),
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
        if (open) onClose();
      }}
      className="vf-glass-drawer m-auto max-h-[90vh] w-[min(94vw,42rem)] overflow-y-auto rounded-[28px] p-0 text-ink"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-divider)] pb-4">
          <div>
            <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight text-ink">
              {editing ? 'Editar prenda' : 'Añadir prenda al clóset'}
            </h2>
            <p className="text-xs text-muted">
              Selecciona la categoría y sube una foto de referencia: la IA generará su gemelo
              digital a medida para el avatar 2D.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* 1. Categoría (primero para que el agente IA aísle exactamente esa prenda en la foto) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="garment-category" className="text-xs font-medium text-muted">
            Categoría *
          </label>
          <select
            id="garment-category"
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value as GarmentCategory)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            {GARMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Foto de referencia → Gemelo digital IA */}
        <PhotoIngestSection
          key={open ? (editing?.garment.id ?? 'new') : 'closed'}
          value={photo}
          category={category}
          formality={formality}
          elasticity={elasticity}
          visualSpec={visualSpec}
          onChange={(nextPhoto) => {
            setPhoto(nextPhoto);
            setDominantColorHex(nextPhoto.dominantColorHex);
          }}
          onApplyTagSuggestion={handleApplyTagSuggestion}
          onDesignRejectedChange={setDesignRejectedReason}
        />

        {/* 3. Nombre, Formalidad y Estilo */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="garment-name" className="text-xs font-medium text-muted">
              Nombre *
            </label>
            <input
              id="garment-name"
              type="text"
              required
              maxLength={120}
              placeholder="Ej. Camiseta rayas azul marino"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="garment-formality" className="text-xs font-medium text-muted">
              Formalidad
            </label>
            <select
              id="garment-formality"
              value={formality}
              onChange={(event) =>
                setFormality(Number.parseInt(event.target.value, 10) as FormalityLevel)
              }
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <option key={level} value={level}>
                  {FORMALITY_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="garment-style" className="text-xs font-medium text-muted">
              Estilo
            </label>
            <select
              id="garment-style"
              value={style}
              onChange={(event) => setStyle(event.target.value as GarmentStyle | '')}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {GARMENT_STYLES.map((s) => (
                <option key={s} value={s}>
                  {STYLE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Apartado de tallaje (medidas en plano para ajuste exacto al avatar 2D) */}
        <SizeTableEditor category={category} unit={unit} sizes={sizes} onChange={setSizes} />

        {errors.length > 0 && (
          <div
            role="alert"
            className="rounded-2xl border border-[#C2410C]/40 bg-[#C2410C]/10 p-3 text-xs text-[#C2410C]"
          >
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--glass-divider)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || Boolean(designRejectedReason)}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar prenda'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
