import { create } from 'zustand';

import { FALLBACK_CATEGORY_ID } from '@/constants/categories';
import { categoriesRepo } from '@/db/repositories';
import type { CategoryToneName } from '@/constants/theme';
import type { Category, CategoryWithCount } from '@/types/models';

interface CategoriesState {
  categories: CategoryWithCount[];
  byId: Record<string, CategoryWithCount>;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (input: { name: string; icon?: string; tone?: CategoryToneName }) => Promise<Category>;
  update: (
    id: string,
    changes: { name?: string; icon?: string; tone?: CategoryToneName }
  ) => Promise<void>;
  remove: (id: string) => Promise<boolean>;
  /** Never returns undefined — falls back to "Other" so the UI can't break. */
  resolve: (id: string | null | undefined) => CategoryWithCount;
}

const FALLBACK: CategoryWithCount = {
  id: FALLBACK_CATEGORY_ID,
  name: 'Other',
  icon: 'bookmark',
  tone: 'neutral',
  sortOrder: 99,
  isSystem: true,
  createdAt: 0,
  itemCount: 0,
};

function index(categories: CategoryWithCount[]): Record<string, CategoryWithCount> {
  const map: Record<string, CategoryWithCount> = {};
  for (const category of categories) map[category.id] = category;
  return map;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  byId: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const categories = await categoriesRepo.listCategoriesWithCounts();
    set({ categories, byId: index(categories), hydrated: true });
  },

  refresh: async () => {
    const categories = await categoriesRepo.listCategoriesWithCounts();
    set({ categories, byId: index(categories), hydrated: true });
  },

  create: async (input) => {
    const category = await categoriesRepo.createCategory(input);
    await get().refresh();
    return category;
  },

  update: async (id, changes) => {
    await categoriesRepo.updateCategory(id, changes);
    await get().refresh();
  },

  remove: async (id) => {
    const removed = await categoriesRepo.deleteCategory(id);
    if (removed) await get().refresh();
    return removed;
  },

  resolve: (id) => {
    if (!id) return FALLBACK;
    return get().byId[id] ?? FALLBACK;
  },
}));

export const selectCategories = (state: CategoriesState) => state.categories;
export const selectCategoriesById = (state: CategoriesState) => state.byId;
