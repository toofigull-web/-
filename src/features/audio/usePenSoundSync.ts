import { useEffect, useRef } from 'react';
import { PenSoundEngine, type AudioContextFactory } from './penSoundEngine';

/**
 * Pure transition logic, extracted so it's testable without any audio
 * engine or DOM at all: given the previous and current "is drawing
 * actively happening right now" flags, decides what action (if any) the
 * sound engine should take.
 */
export type PenSoundAction = 'start' | 'stop' | 'none';

export function computePenSoundAction(
  wasActive: boolean,
  isActive: boolean,
): PenSoundAction {
  if (!wasActive && isActive) return 'start';
  if (wasActive && !isActive) return 'stop';
  return 'none';
}

/**
 * Starts the pen-scratch loop exactly when active drawing begins and stops
 * it exactly when drawing pauses or completes — never restarts the loop on
 * every frame while drawing continues, since it only acts on true
 * active/inactive transitions (see computePenSoundAction).
 *
 * `progress` is accepted for API symmetry with AnimatedScene's per-frame
 * drawing state, but only `isDrawingActive`'s transitions drive playback.
 */
export function usePenSoundSync(
  progress: number,
  isDrawingActive: boolean,
  audioContextFactory?: AudioContextFactory,
): void {
  const engineRef = useRef<PenSoundEngine | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    // Lazily create the engine on first mount only. Creating an
    // AudioContext eagerly (e.g. at module load) is itself sometimes
    // penalized by browsers; doing it on mount of a component that's
    // about to play sound is the conventional safe point.
    if (!engineRef.current) {
      try {
        engineRef.current = new PenSoundEngine(audioContextFactory);
      } catch {
        // Web Audio unavailable in this environment; sound sync becomes a
        // silent no-op for the lifetime of this component instance.
        engineRef.current = null;
      }
    }
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const action = computePenSoundAction(wasActiveRef.current, isDrawingActive);
    wasActiveRef.current = isDrawingActive;

    const engine = engineRef.current;
    if (!engine) return;

    if (action === 'start') {
      void engine.start();
    } else if (action === 'stop') {
      engine.stop();
    }
    // `progress` intentionally not in the effect's action logic — only
    // referenced so callers can pass it without a lint warning about an
    // unused prop; the dependency array below deliberately does NOT
    // include it, since re-running per-frame would defeat the whole
    // point of only reacting to true activity transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawingActive]);

  void progress;
}
