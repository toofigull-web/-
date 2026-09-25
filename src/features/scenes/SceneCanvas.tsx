import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Scene, AspectRatioFit } from './types';
import { computeContainFit } from './types';

export interface RevealPolyline {
  /** Points in NATURAL IMAGE PIXEL space (same space as Phase 5 DrawPaths). */
  points: { x: number; y: number }[];
}

export interface SceneCanvasProps {
  scene: Scene;
  targetAspectRatio?: number; // width / height, defaults to 9/16 (0.5625)
  className?: string;
  backgroundColor?: string;
  /**
   * Optional progressive-reveal mode (Phase 6). When provided (even as an
   * empty array), only the portion of the image covered by these polylines
   * (in natural image pixel space) is shown; everything else stays as the
   * background fill. Omit entirely (undefined) to keep Phase 3's original
   * static full-image behavior unchanged.
   */
  revealPolylines?: RevealPolyline[];
  /** Width in px to draw each revealed stroke (display-space pixels). */
  strokeWidthPx?: number;
  /**
   * Optional explicit display size override, in CSS pixels. When provided,
   * SceneCanvas skips its own container measurement and uses these exactly
   * — used by AnimatedScene (Phase 6) so the canvas and the sibling
   * HandOverlay agree on identical pixel dimensions for coordinate mapping.
   * Omit for Phase 3's original self-measuring behavior.
   */
  displayWidth?: number;
  displayHeight?: number;
  /**
   * Called after each draw with the contain-fit rect used, so a parent
   * (AnimatedScene) can map image-space points into this same canvas's
   * display space for the hand overlay.
   */
  onFitComputed?: (fit: AspectRatioFit, cssWidth: number, cssHeight: number) => void;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  scene,
  targetAspectRatio = 9 / 16,
  className = '',
  backgroundColor,
  revealPolylines,
  strokeWidthPx = 10,
  displayWidth,
  displayHeight,
  onFitComputed,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  // --- Load phase: only re-runs when the actual image source changes. ---
  // Kept separate from drawing so that Phase 6's per-frame reveal updates
  // never re-fetch/re-decode the image — they just redraw from the
  // already-loaded <img> element.
  useEffect(() => {
    let isCancelled = false;
    setLoadError(false);
    setImageReady(false);

    // NO new URL.createObjectURL is called — reuses the existing objectUrl.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCancelled) return;
      imgElRef.current = img;
      setImageReady(true);
    };
    img.onerror = () => {
      if (isCancelled) return;
      setLoadError(true);
    };
    img.src = scene.image.objectUrl;

    return () => {
      isCancelled = true;
    };
  }, [scene.image.objectUrl]);

  // --- Draw phase: runs on load, on resize, and on every reveal update. ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imgElRef.current;
    if (!canvas || !container || !img) return;

    const rect = container.getBoundingClientRect();
    const cssWidth = displayWidth ?? Math.max(rect.width, 100);
    const cssHeight = displayHeight ?? cssWidth / targetAspectRatio;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const backingWidth = Math.round(cssWidth * dpr);
    const backingHeight = Math.round(cssHeight * dpr);

    canvas.width = backingWidth;
    canvas.height = backingHeight;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    let bgColor = backgroundColor;
    if (!bgColor && typeof window !== 'undefined') {
      const computed = window.getComputedStyle(canvas);
      bgColor =
        computed.getPropertyValue('--surface2').trim() ||
        computed.getPropertyValue('--bg').trim() ||
        '#f1f1f9';
    }
    bgColor = bgColor || '#f1f1f9';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const naturalWidth = img.naturalWidth || scene.image.width || 100;
    const naturalHeight = img.naturalHeight || scene.image.height || 100;
    const fit = computeContainFit(naturalWidth, naturalHeight, cssWidth, cssHeight);

    onFitComputed?.(fit, cssWidth, cssHeight);

    if (!revealPolylines) {
      // Phase 3 behavior: draw the full static image, unchanged.
      ctx.drawImage(
        img,
        fit.sourceX,
        fit.sourceY,
        fit.sourceWidth,
        fit.sourceHeight,
        fit.destX,
        fit.destY,
        fit.destWidth,
        fit.destHeight,
      );
      ctx.restore();
      return;
    }

    // Phase 6 progressive-reveal mode: composite the full image through a
    // stroke mask built from the revealed polylines, so only the drawn
    // portion of the artwork is visible. Everything else stays as the
    // background fill already painted above.
    if (revealPolylines.length === 0) {
      ctx.restore();
      return;
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = backingWidth;
    maskCanvas.height = backingHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      ctx.restore();
      return;
    }
    maskCtx.scale(dpr, dpr);
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = strokeWidthPx;
    maskCtx.strokeStyle = '#000';

    const scaleX = fit.destWidth / (fit.sourceWidth || 1);
    const scaleY = fit.destHeight / (fit.sourceHeight || 1);

    for (const line of revealPolylines) {
      if (line.points.length === 0) continue;
      maskCtx.beginPath();
      line.points.forEach((p, i) => {
        const cx = fit.destX + p.x * scaleX;
        const cy = fit.destY + p.y * scaleY;
        if (i === 0) maskCtx.moveTo(cx, cy);
        else maskCtx.lineTo(cx, cy);
      });
      if (line.points.length === 1) {
        const p = line.points[0]!;
        const cx = fit.destX + p.x * scaleX;
        const cy = fit.destY + p.y * scaleY;
        maskCtx.lineTo(cx + 0.01, cy + 0.01);
      }
      maskCtx.stroke();
    }

    const imageLayer = document.createElement('canvas');
    imageLayer.width = backingWidth;
    imageLayer.height = backingHeight;
    const imgCtx = imageLayer.getContext('2d');
    if (!imgCtx) {
      ctx.restore();
      return;
    }
    imgCtx.scale(dpr, dpr);
    imgCtx.drawImage(
      img,
      fit.sourceX,
      fit.sourceY,
      fit.sourceWidth,
      fit.sourceHeight,
      fit.destX,
      fit.destY,
      fit.destWidth,
      fit.destHeight,
    );
    imgCtx.globalCompositeOperation = 'destination-in';
    imgCtx.setTransform(1, 0, 0, 1, 0, 0);
    imgCtx.drawImage(maskCanvas, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(imageLayer, 0, 0);
    ctx.restore();
  }, [
    scene.image.width,
    scene.image.height,
    targetAspectRatio,
    backgroundColor,
    revealPolylines,
    strokeWidthPx,
    displayWidth,
    displayHeight,
    onFitComputed,
  ]);

  useEffect(() => {
    if (!imageReady) return;
    draw();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined' || displayWidth) {
      // Skip observer entirely when an explicit size is supplied — the
      // parent (AnimatedScene) owns sizing in that case.
      return;
    }
    const resizeObserver = new ResizeObserver(() => draw());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [imageReady, draw, displayWidth]);

  return (
    <div
      ref={containerRef}
      className={`scene-canvas-container ${className}`}
      style={{
        width: '100%',
        aspectRatio: `${targetAspectRatio}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        backgroundColor: 'var(--surface2)',
      }}
    >
      <canvas
        ref={canvasRef}
        className="scene-canvas-element"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      {loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface2)',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          Failed to render preview
        </div>
      )}
    </div>
  );
};
