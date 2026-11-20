import { useEffect, useMemo, useState } from 'react';
import {
  GARMENT_CATEGORIES,
  createBodyModel,
  recommendSize,
  validateBodyMeasurements,
  type GarmentCategory,
} from '@luca/domain';
import { Plus, Search, Shirt, Sparkles } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system/components/Card';
import { useFittingStore } from '@/features/fitting/store';
import { useClosetStore, type ClosetSortBy } from './closetStore';
import { GarmentDetailView } from './GarmentDetailView';
import { GarmentFormDialog } from './GarmentFormDialog';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type FormalityLevel,
  type GarmentDraft,
  type GarmentStatus,
  type GarmentWithSizes,
} from './types';

export interface ClosetViewProps {
  onOpenInFitting: () => void;
}

export function ClosetView({ onOpenInFitting }: ClosetViewProps) {
  const items = useClosetStore((s) => s.items);
  const loaded = useClosetStore((s) => s.loaded);
  const busy = useClosetStore((s) => s.busy);
  const selectedId = useClosetStore((s) => s.selectedId);

  const search = useClosetStore((s) => s.search);
  const categoryFilter = useClosetStore((s) => s.categoryFilter);
  const statusFilter = useClosetStore((s) => s.statusFilter);
  const formalityFilter = useClosetStore((s) => s.formalityFilter);
  const sortBy = useClosetStore((s) => s.sortBy);

  const loadCloset = useClosetStore((s) => s.loadCloset);
  const addGarment = useClosetStore((s) => s.addGarment);
  const editGarment = useClosetStore((s) => s.editGarment);
  const removeGarment = useClosetStore((s) => s.removeGarment);
  const seedSamples = useClosetStore((s) => s.seedSamples);
  const selectGarment = useClosetStore((s) => s.selectGarment);
  const setSearch = useClosetStore((s) => s.setSearch);
  const setCategoryFilter = useClosetStore((s) => s.setCategoryFilter);
  const setStatusFilter = useClosetStore((s) => s.setStatusFilter);
  const setFormalityFilter = useClosetStore((s) => s.setFormalityFilter);
  const setSortBy = useClosetStore((s) => s.setSortBy);
  const resetFilters = useClosetStore((s) => s.resetFilters);

  const bodyMeasurements = useFittingStore((s) => s.bodyMeasurements);
  const fitPreference = useFittingStore((s) => s.fitPreference);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GarmentWithSizes | null>(null);

  useEffect(() => {
    if (!loaded) {
      void loadCloset();
    }
  }, [loadCloset, loaded]);

  const bodyModel = useMemo(() => {
    const m = { required: bodyMeasurements };
    return validateBodyMeasurements(m).valid ? createBodyModel(m) : null;
  }, [bodyMeasurements]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = items.filter(({ garment }) => {
      if (categoryFilter !== 'all' && garment.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && garment.status !== statusFilter) return false;
      if (formalityFilter !== 'all' && garment.formality !== formalityFilter) return false;

      if (query.length > 0) {
        const haystack = [
          garment.name,
          garment.brand,
          CATEGORY_LABELS[garment.category],
          ...garment.tags,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.garment.name.localeCompare(b.garment.name);
        case 'price_asc':
          return (a.garment.price ?? Number.POSITIVE_INFINITY) - (b.garment.price ?? Number.POSITIVE_INFINITY);
        case 'price_desc':
          return (b.garment.price ?? -1) - (a.garment.price ?? -1);
        case 'recent':
        default:
          return b.garment.updatedAt.localeCompare(a.garment.updatedAt);
      }
    });
  }, [categoryFilter, formalityFilter, items, search, sortBy, statusFilter]);

  const selectedItem = useMemo(
    () => (selectedId ? items.find((item) => item.garment.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const handleSave = async (draft: GarmentDraft, editingId?: string) => {
    if (editingId) {
      await editGarment(editingId, draft);
    } else {
      await addGarment(draft);
    }
  };

  if (selectedItem) {
    return (
      <>
        <GarmentDetailView
          item={selectedItem}
          onBack={() => selectGarment(null)}
          onEdit={(target) => {
            setEditingItem(target);
            setFormOpen(true);
          }}
          onDelete={async (id) => {
            await removeGarment(id);
          }}
          onOpenInFitting={onOpenInFitting}
        />
        <GarmentFormDialog
          open={formOpen}
          editing={editingItem}
          onClose={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="closet-heading"
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="accent">Clóset local · v0.3</Badge>
            <Badge className="tabular-nums">{items.length} prendas</Badge>
          </div>
          <h1 id="closet-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Clóset local
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Registra tus prendas con sus tablas de tallas en plano para ver al instante qué talla te
            favorece según tu preferencia de calce.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Añadir prenda
        </Button>
      </section>

      {/* Barra de búsqueda, filtros y orden (T4.4) */}
      <div className="grid gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Buscar prendas en el clóset"
            placeholder="Buscar por nombre, marca o etiqueta..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-bg py-1.5 pr-3 pl-9 text-sm text-ink"
          />
        </div>

        <select
          aria-label="Filtrar por categoría"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as 'all' | GarmentCategory)}
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
        >
          <option value="all">Todas las categorías</option>
          {GARMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por estado"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | GarmentStatus)}
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-sm text-ink"
        >
          <option value="all">Propia y deseos</option>
          <option value="owned">{STATUS_LABELS.owned}</option>
          <option value="wishlist">{STATUS_LABELS.wishlist}</option>
        </select>

        <div className="flex gap-2">
          <select
            aria-label="Filtrar por formalidad"
            value={formalityFilter}
            onChange={(event) => {
              const raw = event.target.value;
              setFormalityFilter(
                raw === 'all' ? 'all' : (Number.parseInt(raw, 10) as FormalityLevel),
              );
            }}
            className="w-1/2 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-sm text-ink"
          >
            <option value="all">Formalidad</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <select
            aria-label="Ordenar prendas"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as ClosetSortBy)}
            className="w-1/2 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-sm text-ink"
          >
            <option value="recent">Recientes</option>
            <option value="name_asc">Nombre A–Z</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>
        </div>
      </div>

      {/* Estados vacíos o grilla de prendas */}
      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tu clóset está vacío</CardTitle>
            <CardDescription>
              Guarda tu primera prenda con sus medidas en plano para recibir recomendaciones de
              talla cifradas en tu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Añadir primera prenda
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void seedSamples()}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Cargar 2 prendas de ejemplo
            </Button>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin resultados con estos filtros</CardTitle>
            <CardDescription>
              Prueba limpiando la búsqueda o seleccionando otra categoría.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="secondary" size="sm" onClick={resetFilters}>
              Restablecer filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {filteredItems.map((item) => {
            const { garment, sizes } = item;
            const rec =
              bodyModel && sizes.length > 0
                ? recommendSize(
                    bodyModel,
                    sizes.map((s) => ({
                      category: garment.category,
                      sizeLabel: s.label,
                      elasticity: garment.elasticity,
                      flatMeasuresCm: s.flatMeasuresCm,
                    })),
                    fitPreference,
                  )
                : null;

            return (
              <Card
                key={garment.id}
                className="flex flex-col justify-between transition-colors hover:border-accent/60"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] border border-border"
                        style={{ backgroundColor: garment.dominantColorHex ?? '#1F5F6B' }}
                        aria-hidden="true"
                      >
                        <Shirt className="h-3.5 w-3.5 text-white" />
                      </span>
                      <Badge>{CATEGORY_LABELS[garment.category]}</Badge>
                    </div>
                    <Badge variant={garment.status === 'wishlist' ? 'accent' : 'neutral'}>
                      {STATUS_LABELS[garment.status]}
                    </Badge>
                  </div>

                  <CardTitle className="mt-2 truncate text-base">{garment.name}</CardTitle>
                  <CardDescription className="truncate">
                    {garment.brand || 'Sin marca'} · {sizes.length} talla(s)
                    {garment.price !== undefined ? ` · $${garment.price.toFixed(0)}` : ''}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  {item.image?.dataUrl && (
                    <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg p-2">
                      <img
                        src={item.image.dataUrl}
                        alt={`Foto de ${garment.name}`}
                        className="max-h-full max-w-full object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {rec && (
                    <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-2.5 py-1.5 text-xs">
                      <span className="text-muted">Talla sugerida</span>
                      <span className="font-semibold text-accent">{rec.recommendedSize}</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => selectGarment(garment.id)}
                  >
                    Ver calce y tallas
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GarmentFormDialog
        open={formOpen}
        editing={editingItem}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
