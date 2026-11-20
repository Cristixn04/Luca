import type { GarmentCategory } from '@luca/domain';
import { create } from 'zustand';
import { getVaultServiceInstance, useVaultStore } from '@/features/vault/vaultStore';
import {
  createGarment,
  deleteGarment,
  listGarmentsWithSizes,
  seedSampleGarments,
  updateGarment,
} from './closetService';
import type { FormalityLevel, GarmentDraft, GarmentStatus, GarmentWithSizes } from './types';

export type ClosetSortBy = 'recent' | 'name_asc' | 'price_asc' | 'price_desc';

export interface ClosetStoreState {
  items: GarmentWithSizes[];
  loaded: boolean;
  busy: boolean;
  error: string | null;
  selectedId: string | null;

  search: string;
  categoryFilter: 'all' | GarmentCategory;
  statusFilter: 'all' | GarmentStatus;
  formalityFilter: 'all' | FormalityLevel;
  sortBy: ClosetSortBy;

  loadCloset: () => Promise<void>;
  addGarment: (draft: GarmentDraft) => Promise<GarmentWithSizes>;
  editGarment: (garmentId: string, draft: GarmentDraft) => Promise<GarmentWithSizes>;
  removeGarment: (garmentId: string) => Promise<void>;
  seedSamples: () => Promise<void>;
  selectGarment: (garmentId: string | null) => void;
  setSearch: (search: string) => void;
  setCategoryFilter: (category: 'all' | GarmentCategory) => void;
  setStatusFilter: (status: 'all' | GarmentStatus) => void;
  setFormalityFilter: (formality: 'all' | FormalityLevel) => void;
  setSortBy: (sortBy: ClosetSortBy) => void;
  resetFilters: () => void;
  clearMemory: () => void;
}

export const useClosetStore = create<ClosetStoreState>((set) => ({
  items: [],
  loaded: false,
  busy: false,
  error: null,
  selectedId: null,

  search: '',
  categoryFilter: 'all',
  statusFilter: 'all',
  formalityFilter: 'all',
  sortBy: 'recent',

  loadCloset: async () => {
    set({ busy: true, error: null });
    try {
      const vault = getVaultServiceInstance();
      const items = await listGarmentsWithSizes(vault);
      set({ items, loaded: true, busy: false });
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo cargar el clóset.',
      });
    }
  },

  addGarment: async (draft) => {
    set({ busy: true, error: null });
    try {
      const vault = getVaultServiceInstance();
      const created = await createGarment(vault, draft);
      set((state) => ({
        items: [created, ...state.items],
        loaded: true,
        busy: false,
      }));
      useVaultStore.setState((s) => ({ eventCount: s.eventCount + 1 }));
      return created;
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo guardar la prenda.',
      });
      throw err;
    }
  },

  editGarment: async (garmentId, draft) => {
    set({ busy: true, error: null });
    try {
      const vault = getVaultServiceInstance();
      const updated = await updateGarment(vault, garmentId, draft);
      set((state) => ({
        items: state.items.map((item) => (item.garment.id === garmentId ? updated : item)),
        busy: false,
      }));
      useVaultStore.setState((s) => ({ eventCount: s.eventCount + 1 }));
      return updated;
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo actualizar la prenda.',
      });
      throw err;
    }
  },

  removeGarment: async (garmentId) => {
    set({ busy: true, error: null });
    try {
      const vault = getVaultServiceInstance();
      await deleteGarment(vault, garmentId);
      set((state) => ({
        items: state.items.filter((item) => item.garment.id !== garmentId),
        selectedId: state.selectedId === garmentId ? null : state.selectedId,
        busy: false,
      }));
      useVaultStore.setState((s) => ({ eventCount: s.eventCount + 1 }));
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudo eliminar la prenda.',
      });
      throw err;
    }
  },

  seedSamples: async () => {
    set({ busy: true, error: null });
    try {
      const vault = getVaultServiceInstance();
      const created = await seedSampleGarments(vault);
      set((state) => ({
        items: [...created, ...state.items],
        loaded: true,
        busy: false,
      }));
      useVaultStore.setState((s) => ({ eventCount: s.eventCount + created.length }));
    } catch (err) {
      set({
        busy: false,
        error: err instanceof Error ? err.message : 'No se pudieron cargar las prendas de ejemplo.',
      });
    }
  },

  selectGarment: (selectedId) => set({ selectedId }),
  setSearch: (search) => set({ search }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setFormalityFilter: (formalityFilter) => set({ formalityFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () =>
    set({
      search: '',
      categoryFilter: 'all',
      statusFilter: 'all',
      formalityFilter: 'all',
      sortBy: 'recent',
    }),
  clearMemory: () =>
    set({
      items: [],
      loaded: false,
      busy: false,
      error: null,
      selectedId: null,
    }),
}));
