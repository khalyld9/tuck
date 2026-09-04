import { create } from 'zustand';

import { DEFAULT_SETTINGS, loadSettings, saveSetting, saveSettings } from '@/db/repositories/settingsRepository';
import { setHapticsEnabled } from '@/lib/haptics';
import type { Settings } from '@/types/models';

interface SettingsState extends Settings {
  hydrated: boolean;
  /** Reads persisted settings from SQLite. Called once on launch. */
  hydrate: () => Promise<void>;
  /** Updates one setting and writes through to SQLite. */
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  /** Updates several settings at once. */
  patch: (patch: Partial<Settings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const settings = await loadSettings();
    setHapticsEnabled(settings.hapticsEnabled);
    set({ ...settings, hydrated: true });
  },

  set: async (key, value) => {
    // Optimistic: the UI reflects the change immediately, SQLite catches up.
    set({ [key]: value } as unknown as Partial<SettingsState>);
    if (key === 'hapticsEnabled') setHapticsEnabled(value as boolean);
    await saveSetting(key, value);
  },

  patch: async (patch) => {
    set(patch as Partial<SettingsState>);
    if (patch.hapticsEnabled !== undefined) setHapticsEnabled(patch.hapticsEnabled);
    await saveSettings(patch);
  },

  completeOnboarding: async () => {
    if (get().hasOnboarded) return;
    set({ hasOnboarded: true });
    await saveSetting('hasOnboarded', true);
  },
}));

// ─── Selectors (subscribe to the narrowest slice possible) ─────────────────

export const selectThemePreference = (state: SettingsState) => state.themePreference;
export const selectHapticsEnabled = (state: SettingsState) => state.hapticsEnabled;
export const selectDefaultCategoryId = (state: SettingsState) => state.defaultCategoryId;
export const selectConfirmDeletion = (state: SettingsState) => state.confirmDeletion;
export const selectRemindersEnabled = (state: SettingsState) => state.remindersEnabled;
export const selectHasOnboarded = (state: SettingsState) => state.hasOnboarded;
export const selectSavedViewMode = (state: SettingsState) => state.savedViewMode;
export const selectSavedSort = (state: SettingsState) => state.savedSort;
