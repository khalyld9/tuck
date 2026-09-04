import { create } from 'zustand';

import { createId } from '@/lib/id';

/**
 * Ephemeral UI state: snackbars and the pending "undo" buffer.
 * Deliberately separate from data stores — none of this is persisted.
 */

export interface SnackbarAction {
  label: string;
  onPress: () => void | Promise<void>;
}

export interface Snackbar {
  id: string;
  message: string;
  action?: SnackbarAction;
  /** Milliseconds before auto-dismiss. */
  duration: number;
  tone: 'default' | 'success' | 'danger';
}

interface UiState {
  snackbar: Snackbar | null;
  showSnackbar: (input: {
    message: string;
    action?: SnackbarAction;
    duration?: number;
    tone?: Snackbar['tone'];
  }) => void;
  dismissSnackbar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  snackbar: null,

  showSnackbar: ({ message, action, duration = 4200, tone = 'default' }) => {
    set({ snackbar: { id: createId('s'), message, action, duration, tone } });
  },

  dismissSnackbar: () => set({ snackbar: null }),
}));

/** Imperative helper so non-React code (repositories, handlers) can notify. */
export const snackbar = {
  show: (message: string, action?: SnackbarAction) =>
    useUiStore.getState().showSnackbar({ message, action }),
  success: (message: string, action?: SnackbarAction) =>
    useUiStore.getState().showSnackbar({ message, action, tone: 'success' }),
  error: (message: string) =>
    useUiStore.getState().showSnackbar({ message, tone: 'danger' }),
};
