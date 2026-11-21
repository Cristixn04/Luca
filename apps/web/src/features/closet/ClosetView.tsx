import { useEffect, useMemo, useState } from 'react';
import {
  GARMENT_CATEGORIES,
  analyzeClosetUsage,
  createBodyModel,
  evaluateGarmentColorHarmony,
  recommendSize,
  simulateWishlistUnlock,
  validateBodyMeasurements,
  type GarmentCategory,
} from '@luca/domain';
import { Plus, RotateCcw, Search, Sparkles } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { getActiveSeasonId, useColorStore } from '@/features/color/colorStore';
import { applyClosetItemToFitting } from '@/features/fitting/GarmentPanel';
import { useFittingStore } from '@/features/fitting/store';
import { toOutfitGarmentInputs, useOutfitsStore } from '@/features/outfits/outfitsStore';
import { useT } from '@/i18n/i18nStore';
import { ClosetRackStage, type RackItemMeta } from './ClosetRackStage';
import { createClosetSearchIndex } from './closetSearch';
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
  const t = useT();
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

  const colorProfile = useColorStore((s) => s.profile);
  const colorLoaded = useColorStore((s) => s.loaded);
  const loadColorProfile = useColorStore((s) => s.loadProfile);

  const wearLogs = useOutfitsStore((s) => s.wearLogs);
  const outfitsLoaded = useOutfitsStore((s) => s.loaded);
  const loadOutfits = useOutfitsStore((s) => s.loadAll);
  const logGarmentWear = useOutfitsStore((s) => s.logGarmentWear);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GarmentWithSizes | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      void loadCloset();
    }
  }, [loadCloset, loaded]);

  useEffect(() => {
    if (!colorLoaded) {
      void loadColorProfile();
    }
  }, [colorLoaded, loadColorProfile]);

  useEffect(() => {
    if (!outfitsLoaded) {
      void loadOutfits();
    }
  }, [loadOutfits, outfitsLoaded]);

  const activeSeasonId = useMemo(() => getActiveSeasonId(colorProfile), [colorProfile]);

  const bodyModel = useMemo(() => {
    const m = { required: bodyMeasurements };
    return validateBodyMeasurements(m).valid ? createBodyModel(m) : null;
  }, [bodyMeasurements]);

  const outfitInputs = useMemo(
    () => toOutfitGarmentInputs(items, wearLogs, bodyModel, fitPreference),
    [bodyModel, fitPreference, items, wearLogs],
  );

  const usageMetricsById = useMemo(
    () =>
      analyzeClosetUsage(outfitInputs, {
        occasion: 'casual',
        temperatureC: 21,
        bodyModel,
        fitPreference,
        seasonId: activeSeasonId,
      }),
    [activeSeasonId, bodyModel, fitPreference, outfitInputs],
  );

  const wishlistUnlocksById = useMemo(() => {
    const ownedInputs = outfitInputs.filter((g) => g.status === 'owned');
    const result: Record<string, number> = {};
    for (const input of outfitInputs) {
      if (input.status === 'wishlist') {
        result[input.id] = simulateWishlistUnlock(input, ownedInputs, {
          occasion: 'casual',
          temperatureC: 21,
          bodyModel,
          fitPreference,
          seasonId: activeSeasonId,
        }).unlocksOutfitsCount;
      }
    }
    return result;
  }, [activeSeasonId, bodyModel, fitPreference, outfitInputs]);

  const searchIndex = useMemo(() => createClosetSearchIndex(items), [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim();
    const candidates = query.length > 0 ? searchIndex.search(query) : items;

    const matched = candidates.filter(({ garment }) => {
      if (categoryFilter !== 'all' && garment.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && garment.status !== statusFilter) return false;
      if (formalityFilter !== 'all' && garment.formality !== formalityFilter) return false;
      return true;
    });

    if (query.length > 0 && sortBy === 'recent') {
      return matched;
    }

    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.garment.name.localeCompare(b.garment.name);
        case 'price_asc':
          return (
            (a.garment.price ?? Number.POSITIVE_INFINITY) -
            (b.garment.price ?? Number.POSITIVE_INFINITY)
          );
        case 'price_desc':
          return (b.garment.price ?? -1) - (a.garment.price ?? -1);
        case 'recent':
        default:
          return b.garment.updatedAt.localeCompare(a.garment.updatedAt);
      }
    });
  }, [categoryFilter, formalityFilter, items, search, searchIndex, sortBy, statusFilter]);

  // Si un filtro oculta la prenda actualmente en spotlight, cerramos el spotlight limpiamente
  const effectiveSpotlightId = useMemo(() => {
    if (!spotlightId) return null;
    return filteredItems.some((item) => item.garment.id === spotlightId) ? spotlightId : null;
  }, [filteredItems, spotlightId]);

  const rackEntries = useMemo<RackItemMeta[]>(
    () =>
      filteredItems.map((item) => {
        const { garment, sizes } = item;
        const recommendation =
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
        const harmony =
          activeSeasonId && garment.dominantColorHex
            ? evaluateGarmentColorHarmony(garment.dominantColorHex, activeSeasonId)
            : null;
        return {
          item,
          recommendation,
          harmony,
          usage: usageMetricsById[garment.id],
          wishlistUnlocks: wishlistUnlocksById[garment.id],
        };
      }),
    [
      activeSeasonId,
      bodyModel,
      filteredItems,
      fitPreference,
      usageMetricsById,
      wishlistUnlocksById,
    ],
  );

  const selectedItem = useMemo(
    () => (selectedId ? (items.find((item) => item.garment.id === selectedId) ?? null) : null),
    [items, selectedId],
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    formalityFilter !== 'all' ||
    sortBy !== 'recent';

  const handleSave = async (draft: GarmentDraft, editingId?: string) => {
    if (editingId) {
      await editGarment(editingId, draft);
    } else {
      await addGarment(draft);
    }
  };

  const handleOpenInFittingRoom = (item: GarmentWithSizes, recommendedSize?: string) => {
    applyClosetItemToFitting(item, recommendedSize);
    onOpenInFitting();
  };

  if (selectedItem) {
    return (
      <>
        <GarmentDetailView
          key={selectedItem.garment.id}
          item={selectedItem}
          allItems={items}
          onBack={() => selectGarment(null)}
          onSelectGarment={(id) => selectGarment(id)}
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
    <div className="flex min-h-[calc(100dvh-215px)] w-full flex-col justify-between gap-3">
      {/* Encabezado limpio del Clóset */}
      <section
        aria-labelledby="closet-heading"
        className={`flex flex-wrap items-center justify-between gap-3 px-1 transition-opacity duration-300 ${
          effectiveSpotlightId ? 'pointer-events-none opacity-25' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <h1
            id="closet-heading"
            className="font-display text-2xl font-normal tracking-[-0.025em] text-[var(--rw-ink)] sm:text-3xl"
          >
            {t.headings.closet}
          </h1>
          <span className="vf-glass inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tabular-nums text-muted">
            {hasActiveFilters
              ? `${filteredItems.length} de ${items.length} prendas`
              : `${items.length} prendas`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--rw-cta)] px-4 py-2 text-xs font-medium text-[var(--rw-cta-ink)] shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Añadir prenda
        </button>
      </section>

      {/* Escenario principal: Perchero 3D con prendas colgadas o estados vacíos en vidrio */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <div className="vf-glass-drawer flex max-w-md flex-col items-center gap-4 rounded-[28px] p-8 text-center">
            <h2 className="font-display text-xl font-medium tracking-tight text-ink">
              Tu clóset está vacío
            </h2>
            <p className="text-sm text-muted">
              Guarda tu primera prenda con sus medidas en plano para colgarla en el perchero y
              recibir recomendaciones de talla cifradas en tu dispositivo.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
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
            </div>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <div className="vf-glass-drawer flex max-w-md flex-col items-center gap-3 rounded-[28px] p-7 text-center">
            <h2 className="font-display text-lg font-medium text-ink">
              Sin resultados con estos filtros
            </h2>
            <p className="text-sm text-muted">
              Prueba limpiando la búsqueda o seleccionando otra categoría en la barra inferior.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={resetFilters}>
              Restablecer filtros
            </Button>
          </div>
        </div>
      ) : (
        <ClosetRackStage
          entries={rackEntries}
          spotlightId={effectiveSpotlightId}
          onSelectSpotlight={setSpotlightId}
          onOpenInFittingRoom={handleOpenInFittingRoom}
          onOpenDetail={(garmentId) => selectGarment(garmentId)}
          onEdit={(target) => {
            setEditingItem(target);
            setFormOpen(true);
          }}
          onDelete={async (id) => {
            await removeGarment(id);
          }}
          onLogWear={async (id) => {
            await logGarmentWear(id);
          }}
        />
      )}

      {/* BARRA INFERIOR DE FILTROS EN VIDRIO LÍQUIDO (estilo .vf-glass consistente con los demás apartados) */}
      <div
        data-testid="closet-filter-dock"
        aria-label="Filtros y búsqueda del clóset"
        className={`mx-auto w-full max-w-[1060px] transition-opacity duration-300 ${
          effectiveSpotlightId ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="vf-glass flex flex-wrap items-center gap-2 rounded-[24px] p-2 sm:rounded-full sm:px-3 sm:py-2">
          {/* Búsqueda libre MiniSearch */}
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Buscar prendas en el clóset"
              placeholder="Buscar prenda, tela o estilo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] py-1.5 pr-3 pl-8 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <select
            aria-label="Filtrar por categoría"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as 'all' | GarmentCategory)}
            className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
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
            className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="all">Propia y deseos</option>
            <option value="owned">{STATUS_LABELS.owned}</option>
            <option value="wishlist">{STATUS_LABELS.wishlist}</option>
          </select>

          <select
            aria-label="Filtrar por formalidad"
            value={formalityFilter}
            onChange={(event) => {
              const raw = event.target.value;
              setFormalityFilter(
                raw === 'all' ? 'all' : (Number.parseInt(raw, 10) as FormalityLevel),
              );
            }}
            className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
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
            className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-pill-bg)] px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="recent">Recientes</option>
            <option value="name_asc">Nombre A–Z</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              aria-label="Restablecer filtros del clóset"
              onClick={resetFilters}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[var(--vf-chip-bg)] px-2.5 py-1.5 text-[11px] font-medium text-ink transition-colors hover:bg-[var(--vf-nav-indicator-bg)] hover:text-[var(--vf-nav-active-ink)]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>
      </div>

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
