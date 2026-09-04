import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';

/**
 * Guards against a swipe also registering as a tap.
 *
 * A row is both a `Pressable` (opens the detail screen) and a pan target
 * (archive / favourite). Those are two different input systems: the pan lives
 * in react-native-gesture-handler, the press in React Native's responder
 * system. RNGH cancels the responder on native when a gesture activates, but
 * that coordination is not reliable everywhere — most visibly on web, where
 * finishing a swipe would archive the row *and* navigate into it.
 *
 * So the swipe explicitly closes the gate while it is active and for a short
 * beat after release, and `Pressable` refuses to fire while it is shut.
 */
interface SwipeGate {
  /** Called by the pan gesture when it activates and when it settles. */
  setSwiping: (swiping: boolean) => void;
  /** Called by Pressable — true means "swallow this press". */
  isBlocked: () => boolean;
}

/** Long enough to cover the release, short enough to never eat a real tap. */
const GRACE_MS = 220;

const SwipeGateContext = createContext<SwipeGate | null>(null);

export function SwipeGateProvider({ children }: { children: ReactNode }) {
  const swiping = useRef(false);
  const releasedAt = useRef(0);

  const value = useMemo<SwipeGate>(
    () => ({
      setSwiping: (next) => {
        if (!next && swiping.current) releasedAt.current = Date.now();
        swiping.current = next;
      },
      isBlocked: () => swiping.current || Date.now() - releasedAt.current < GRACE_MS,
    }),
    []
  );

  return <SwipeGateContext.Provider value={value}>{children}</SwipeGateContext.Provider>;
}

/**
 * Read the gate. Returns null outside a swipeable row, so pressables
 * everywhere else in the app are completely unaffected.
 */
export function useSwipeGate(): SwipeGate | null {
  return useContext(SwipeGateContext);
}
