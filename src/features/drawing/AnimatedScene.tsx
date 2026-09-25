import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Scene, AspectRatioFit } from '../scenes/types';
import { SceneCanvas, type RevealPolyline } from '../scenes/SceneCanvas';
import { HandOverlay } from '../hand/HandOverlay';
import type { DrawPath } from '../pathtracing/types';
import {
  computeDrawingState,
  mapImagePointToCanvas,
  mapDirectionToCanvas,
} from './drawingProgress';
import { usePenSoundSync } from '../audio/usePenSoundSync';

export interface AnimatedSceneProps {
  scene: Scene;
  /** Ordered, traced strokes for this scene's image (Phase 5 output). */
  paths: DrawPath[];
  targetAspectRatio?: number;
  handSizePx?: number;
  safeAreaMargin?: number;
  strokeWidthPx?: number;
  /** Loops back to the start after the hold phase ends. Default true —
   * convenient for the dev demo; the real product's Timeline Editor
   * (later phase) will drive playback explicitly instead. */
  loop?: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * Combines SceneCanvas's Phase 6 reveal mode with Phase 4's HandOverlay,
 * driven by a single requestAnimationFrame loop, so the image progressively
 * draws in while the hand tracks the pen tip in real time.
 *
 * CRITICAL INVARIANT: HandOverlay is rendered as a SIBLING of SceneCanvas
 * here, not nested inside it — it shares no overflow:hidden ancestor with
 * the canvas/image, so it is clamped only against the full canvas frame
 * (Phase 4's math), never by the image reveal mask.
 */
export const AnimatedScene: React.FC<AnimatedSceneProps> = ({
  scene,
  paths,
  targetAspectRatio = 9 / 16,
  handSizePx = 220,
  safeAreaMargin = 12,
  strokeWidthPx = 10,
  loop = true,
  onComplete,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [fit, setFit] = useState<AspectRatioFit | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  const totalDrawMs = Math.max(0, scene.durationMs - scene.holdMs);
  const totalSceneMs = Math.max(1, scene.durationMs);

  // AnimatedScene owns sizing (rather than letting SceneCanvas measure
  // itself) so the canvas and the HandOverlay always agree on identical
  // pixel dimensions for coordinate mapping.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 100);
      const height = width / targetAspectRatio;
      setDisplaySize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    update();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [targetAspectRatio]);

  // Drawing/hold animation loop.
  useEffect(() => {
    let cancelled = false;
    startTimeRef.current = null;

    const tick = (now: number) => {
      if (cancelled) return;
      if (startTimeRef.current === null) startTimeRef.current = now;
      let elapsed = now - startTimeRef.current;

      if (elapsed >= totalSceneMs) {
        if (loop) {
          startTimeRef.current = now;
          elapsed = 0;
        } else {
          setElapsedMs(totalSceneMs);
          onComplete?.();
          return;
        }
      }

      setElapsedMs(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [totalSceneMs, loop, onComplete, scene.id]);

  const handleFitComputed = useCallback((f: AspectRatioFit) => {
    setFit(f);
  }, []);

  const drawingState = computeDrawingState(
    paths,
    Math.min(elapsedMs, totalDrawMs),
    totalDrawMs,
  );

  const revealPolylines: RevealPolyline[] = drawingState.revealedSegments.map((seg) => ({
    points: seg.points,
  }));

  const canvasPoint = fit
    ? mapImagePointToCanvas(drawingState.currentPoint, fit)
    : { x: 0, y: 0 };
  const canvasDirection = fit
    ? mapDirectionToCanvas(drawingState.currentDirection, fit)
    : { dx: 1, dy: 0 };

  // Phase 7: sync the pen-scratch sound to active drawing only — not the
  // hold phase, not before drawing starts, not after it completes.
  const isDrawingActive = drawingState.progress > 0 && drawingState.progress < 1;
  usePenSoundSync(drawingState.progress, isDrawingActive);

  return (
    <div
      ref={containerRef}
      className={`animated-scene ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${targetAspectRatio}`,
      }}
    >
      {displaySize.width > 0 && (
        <>
          <SceneCanvas
            scene={scene}
            targetAspectRatio={targetAspectRatio}
            revealPolylines={revealPolylines}
            strokeWidthPx={strokeWidthPx}
            displayWidth={displaySize.width}
            displayHeight={displaySize.height}
            onFitComputed={handleFitComputed}
          />
          {fit && (
            <HandOverlay
              canvasWidth={displaySize.width}
              canvasHeight={displaySize.height}
              pathPoint={canvasPoint}
              directionVector={canvasDirection}
              handSizePx={handSizePx}
              safeAreaMargin={safeAreaMargin}
            />
          )}
        </>
      )}
    </div>
  );
};
