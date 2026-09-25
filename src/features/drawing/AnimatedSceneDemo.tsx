import React, { useState, useCallback } from 'react';
import { toScenes } from '../scenes/types';
import type { Scene } from '../scenes/types';
import { tracePathsForImage } from '../pathtracing/tracePathsForImage';
import type { DrawPath } from '../pathtracing/types';
import { AnimatedScene } from './AnimatedScene';

/**
 * Isolated, dev-only end-to-end proof: pick a real image -> trace it
 * (Phase 5) -> animate it (Phase 6) -> hand tracks the reveal without
 * ever being clipped, regardless of where the pen currently is on the
 * canvas.
 *
 * NOT wired into App.tsx / the production flow, same rule as
 * HandEngineDemo (Phase 4) and PathTraceDebugView (Phase 5).
 */
export const AnimatedSceneDemo: React.FC = () => {
  const [scene, setScene] = useState<Scene | null>(null);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [status, setStatus] = useState<string>('Pick an image to trace and animate.');

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    setStatus('Loading image…');

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const uploadedImage = {
        id: `demo-${Date.now()}`,
        file,
        objectUrl,
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      const [newScene] = toScenes([uploadedImage]);
      if (!newScene) return;

      setStatus('Tracing edges…');
      const tracedPaths = tracePathsForImage(img);
      setPaths(tracedPaths);
      setScene(newScene);
      setStatus(`Traced ${tracedPaths.length} stroke(s). Playing…`);
    };
    img.onerror = () => setStatus('Failed to load image.');
    img.src = objectUrl;
  }, []);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '1rem' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--dim)' }}>{status}</p>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {scene && (
        <div style={{ marginTop: '1rem' }}>
          <AnimatedScene scene={scene} paths={paths} loop />
        </div>
      )}
    </div>
  );
};
