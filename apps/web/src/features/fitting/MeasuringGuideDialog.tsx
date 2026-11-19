import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/design-system/components/Button';

export interface MeasuringGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

const GUIDE_ITEMS = [
  {
    name: 'Altura',
    detail: 'De pie, descalzo y con la espalda recta contra una pared, desde el suelo hasta la coronilla.',
  },
  {
    name: 'Ancho de hombros',
    detail: 'En línea recta de un extremo óseo del hombro al otro (medida lineal, no contorno).',
  },
  {
    name: 'Pecho',
    detail: 'Contorno horizontal alrededor de la parte más amplia del torso, con la cinta paralela al suelo.',
  },
  {
    name: 'Cintura',
    detail: 'Contorno alrededor de la zona natural de flexión del torso, sin apretar la cinta.',
  },
  {
    name: 'Cadera',
    detail: 'Contorno horizontal alrededor de la parte más ancha de la cadera, con pies juntos.',
  },
  {
    name: 'Entrepierna',
    detail: 'Desde el tiro hasta el tobillo por la cara interna de la pierna.',
  },
] as const;

export function MeasuringGuideDialog({ open, onClose }: MeasuringGuideDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
        onClose();
      }}
      onCancel={() => {
        onClose();
      }}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              Guía de medición corporal
            </h2>
            <p className="text-xs text-muted">
              Usa una cinta métrica flexible, paralela al suelo y sin comprimir.
            </p>
          </div>
          <form method="dialog">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Cerrar guía de medición"
              autoFocus
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="flex items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg p-3">
            <svg
              viewBox="0 0 140 260"
              className="h-56 w-auto"
              role="img"
              aria-label="Diagrama ilustrado de zonas de medición corporal"
            >
              <circle cx="70" cy="24" r="14" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.5" />
              <path
                d="M 62 40 L 42 50 L 44 82 L 50 116 L 42 146 L 46 244 L 62 244 L 68 164 L 72 164 L 78 244 L 94 244 L 98 146 L 90 116 L 96 82 L 98 50 L 78 40 Z"
                fill="var(--surface)"
                stroke="var(--muted)"
                strokeWidth="1.5"
              />
              {/* Líneas guía */}
              <line x1="36" y1="50" x2="104" y2="50" stroke="var(--accent)" strokeWidth="2" />
              <line x1="38" y1="80" x2="102" y2="80" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 2" />
              <line x1="44" y1="116" x2="96" y2="116" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 2" />
              <line x1="36" y1="146" x2="104" y2="146" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 2" />
              <line x1="70" y1="164" x2="70" y2="244" stroke="var(--accent)" strokeWidth="2" />
            </svg>
          </div>

          <ul className="flex flex-col gap-2.5 text-sm">
            {GUIDE_ITEMS.map((item) => (
              <li key={item.name} className="rounded-[var(--radius-sm)] border border-border bg-bg p-2.5">
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>
  );
}
