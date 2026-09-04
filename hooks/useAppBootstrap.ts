import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { fontAssets } from '@/constants/fonts';
import { getDatabase } from '@/db/database';
import { configureNotifications } from '@/lib/notifications/reminders';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useItemsStore } from '@/store/useItemsStore';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface BootstrapState {
  ready: boolean;
  error: Error | null;
}

/**
 * One-time app startup: open + migrate SQLite, then hydrate the stores.
 *
 * Everything here is local, so the app is fully usable the moment this
 * resolves — no network round-trip is involved at any point.
 */
export function useAppBootstrap(): BootstrapState {
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // On iOS `fontAssets` is empty — SF Pro is already on the device — so this
  // resolves immediately and costs nothing. Elsewhere it loads the four Inter
  // cuts. `fontError` is deliberately treated as success: a missing webfont
  // should degrade to the system face, never hold the splash screen hostage.
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Opening the database runs pending migrations before anything reads.
        await getDatabase();

        await Promise.all([
          useSettingsStore.getState().hydrate(),
          useCategoriesStore.getState().hydrate(),
          useItemsStore.getState().hydrate(),
        ]);

        // Notification config is best-effort; failure must not block launch.
        void configureNotifications().catch(() => undefined);

        if (!cancelled) setDataReady(true);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught : new Error(String(caught)));
          setDataReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready: dataReady && (fontsLoaded || fontError !== null), error };
}
