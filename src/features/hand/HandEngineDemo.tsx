import React, { useEffect, useState, useRef, useMemo } from 'react';
import { HandOverlay } from './HandOverlay';
import { generateMockPath } from './mockPath';
import type { Point2D, Vector2D } from './handTransform';

export interface HandEngineDemoProps {
  width?: number;
  height?: number;
}

/**
 * HandEngineDemo Component
 *
 * Isolated dev-only visual proof harness (NOT wired into App.tsx or main product flow).
 * Animates the hand along generateMockPath using requestAnimationFrame, rendering
 * HandOverlay over a plain canvas-sized frame so the human engineer can visually inspect
 * and verify that the hand never clips even when the pen tip sits directly on a corner.
 */
export const HandEngineDemo: React.FC<HandEngineDemoProps> = ({ width = 360, height = 640 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const animRef = useRef<number | null>(null);

  const path = useMemo(() => generateMockPath(width, height, 120), [width, height]);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      if (time - lastTime > 40) {
        // ~25fps step update
        setCurrentIndex((prev) => (prev + 1) % path.length);
        lastTime = time;
      }
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [path.length]);

  const currentPoint = path[currentIndex] || { x: width / 2, y: height / 2 };
  const nextPoint = path[(currentIndex + 1) % path.length] || currentPoint;
  const directionVector: Vector2D = {
    dx: nextPoint.x - currentPoint.x,
    dy: nextPoint.y - currentPoint.y,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        gap: '1rem',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--ink)' }}>Hand Engine Dev Test Harness</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--dim)' }}>
          Point: ({Math.round(currentPoint.x)}, {Math.round(currentPoint.y)}) — Direction: (
          {directionVector.dx.toFixed(1)}, {directionVector.dy.toFixed(1)})
        </p>
      </div>

      {/* Canvas container representing 9:16 target viewport */}
      <div
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'var(--surface2)',
          border: '2px solid var(--line)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          overflow: 'visible', // Proof that hand extends outside safely without clipping
        }}
      >
        {/* Synthetic artwork bounds (inner box) */}
        <div
          style={{
            position: 'absolute',
            inset: '30px',
            border: '1px dashed var(--soft)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--dim)',
            fontSize: '0.75rem',
            pointerEvents: 'none',
          }}
        >
          Inner Artwork Bounds
        </div>

        {/* Current target point marker */}
        <div
          style={{
            position: 'absolute',
            left: `${currentPoint.x - 4}px`,
            top: `${currentPoint.y - 4}px`,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand)',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        />

        {/* Hand Overlay Component */}
        <HandOverlay
          canvasWidth={width}
          canvasHeight={height}
          pathPoint={currentPoint}
          directionVector={directionVector}
          handSizePx={300}
        />
      </div>
    </div>
  );
};
