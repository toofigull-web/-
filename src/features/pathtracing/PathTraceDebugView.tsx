import React, { useEffect, useState, useMemo } from 'react';
import type { DrawPath } from './types';
import { tracePathsForImage } from './tracePathsForImage';

export interface PathTraceDebugViewProps {
  /**
   * Source image URL or object URL to inspect
   */
  imageSrc: string;
  width?: number;
  threshold?: number;
}

/**
 * PathTraceDebugView Component
 *
 * Dev-only isolated visual verification tool (NOT wired into App.tsx or main user flow).
 * Allows a human engineer to load an image, inspect the edge-traced paths as an SVG
 * overlay superimposed over the source image, and review statistics (stroke count,
 * point density, and total path length in pixels).
 */
export const PathTraceDebugView: React.FC<PathTraceDebugViewProps> = ({
  imageSrc,
  width = 360,
  threshold = 48,
}) => {
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 640,
  });
  const [loading, setLoading] = useState(true);
  const [selectedStroke, setSelectedStroke] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      try {
        const traced = tracePathsForImage(img, { threshold, maxTraceDimension: 720 });
        if (!cancelled) {
          setPaths(traced);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to trace paths for image:', err);
        if (!cancelled) setLoading(false);
      }
    };

    img.onerror = () => {
      if (!cancelled) setLoading(false);
    };

    img.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc, threshold]);

  const totalLength = useMemo(() => paths.reduce((acc, p) => acc + p.lengthPx, 0), [paths]);

  const displayHeight = (width / (imageSize.width || 1)) * (imageSize.height || 1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        gap: '1.5rem',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--ink)' }}>Path Trace Visual Inspection Harness</h3>
        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'var(--dim)' }}>
          Strokes: {paths.length} — Total Length: {Math.round(totalLength)}px — Threshold:{' '}
          {threshold}
        </p>
      </div>

      <div
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${displayHeight}px`,
          backgroundColor: 'var(--surface2)',
          border: '2px solid var(--line)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        {/* Source image underneath */}
        <img
          src={imageSrc}
          alt="Source to trace"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: 0.35,
          }}
        />

        {/* Traced SVG paths on top */}
        <svg
          viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {paths.map((p, idx) => {
            const isSelected = selectedStroke === p.id;
            const pointsString = p.points.map((pt) => `${pt.x},${pt.y}`).join(' ');

            // Graduated hue across path sequence to show drawing order visually
            const hue = Math.round((idx / Math.max(1, paths.length - 1)) * 280);
            const strokeColor = isSelected ? '#ff3b30' : `hsl(${hue}, 85%, 45%)`;

            return (
              <polyline
                key={p.id}
                points={pointsString}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? 3 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>

        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              color: 'var(--dim)',
            }}
          >
            Extracting contours...
          </div>
        )}
      </div>

      {/* Stroke inspector chips */}
      {paths.length > 0 && (
        <div
          style={{
            maxWidth: '600px',
            maxHeight: '120px',
            overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.25rem',
            padding: '0.5rem',
            backgroundColor: 'var(--surface2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
          }}
        >
          {paths.slice(0, 40).map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedStroke(selectedStroke === p.id ? null : p.id)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--line)',
                backgroundColor: selectedStroke === p.id ? 'var(--brand)' : 'var(--surface)',
                color: selectedStroke === p.id ? '#ffffff' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              #{idx + 1} ({Math.round(p.lengthPx)}px)
            </button>
          ))}
          {paths.length > 40 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--dim)', alignSelf: 'center' }}>
              +{paths.length - 40} more...
            </span>
          )}
        </div>
      )}
    </div>
  );
};
