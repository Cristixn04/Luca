import { fromCm, toCm, type GarmentCategory, type MeasurementUnit } from '@luca/domain';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { CATEGORY_FLAT_FIELDS, type SizeOptionDraft } from './types';

export interface SizeTableEditorProps {
  category: GarmentCategory;
  unit: MeasurementUnit;
  sizes: readonly SizeOptionDraft[];
  onChange: (nextSizes: SizeOptionDraft[]) => void;
}

export function SizeTableEditor({ category, unit, sizes, onChange }: SizeTableEditorProps) {
  const fields = CATEGORY_FLAT_FIELDS[category];

  const handleLabelChange = (index: number, label: string) => {
    const next = sizes.map((row, idx) => (idx === index ? { ...row, label } : row));
    onChange(next);
  };

  const handleMeasureChange = (index: number, fieldKey: string, rawValue: string) => {
    const trimmed = rawValue.trim();
    const next = sizes.map((row, idx) => {
      if (idx !== index) return row;
      const flat = { ...row.flatMeasuresCm } as Record<string, number | undefined>;
      if (trimmed === '') {
        delete flat[fieldKey];
      } else {
        const parsed = Number.parseFloat(trimmed);
        if (Number.isFinite(parsed) && parsed > 0) {
          flat[fieldKey] = Number(toCm(parsed, unit).toFixed(2));
        }
      }
      return { ...row, flatMeasuresCm: flat };
    });
    onChange(next);
  };

  const handleAddRow = () => {
    const suggestedLabels = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const used = new Set(sizes.map((s) => s.label.trim().toUpperCase()));
    const nextLabel = suggestedLabels.find((lbl) => !used.has(lbl)) ?? `T${sizes.length + 1}`;
    onChange([...sizes, { label: nextLabel, flatMeasuresCm: {} }]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(sizes.filter((_, idx) => idx !== index));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Tabla de tallas (en plano · {unit})</p>
          <p className="text-xs text-muted">
            Mide la prenda extendida de costura a costura; Luca multiplica por 2 pecho, cintura y
            cadera.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAddRow}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Añadir talla
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-bg text-muted">
              <th className="px-2.5 py-2 font-semibold">Talla</th>
              {fields.map((field) => (
                <th key={field.key} className="px-2.5 py-2 font-semibold">
                  {field.shortLabel} ({unit})
                </th>
              ))}
              <th className="w-10 px-2 py-2 text-right font-semibold">
                <span className="sr-only">Quitar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((row, rowIndex) => (
              <tr key={row.id ?? `row-${rowIndex}`} className="border-b border-border last:border-0">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    aria-label={`Etiqueta de talla fila ${rowIndex + 1}`}
                    placeholder="M"
                    required
                    value={row.label}
                    onChange={(event) => handleLabelChange(rowIndex, event.target.value)}
                    className="w-16 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1 text-center font-medium text-ink"
                  />
                </td>
                {fields.map((field) => {
                  const valCm = row.flatMeasuresCm[field.key];
                  const display = valCm !== undefined ? fromCm(valCm, unit) : '';
                  return (
                    <td key={field.key} className="px-2 py-1.5">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        step={unit === 'cm' ? 0.5 : 0.25}
                        aria-label={`${field.label} talla ${row.label || rowIndex + 1}`}
                        placeholder="—"
                        value={display}
                        onChange={(event) =>
                          handleMeasureChange(rowIndex, field.key, event.target.value)
                        }
                        className="tabular-nums w-20 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1 text-right text-ink"
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={sizes.length <= 1}
                    aria-label={`Eliminar talla ${row.label || rowIndex + 1}`}
                    onClick={() => handleRemoveRow(rowIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
