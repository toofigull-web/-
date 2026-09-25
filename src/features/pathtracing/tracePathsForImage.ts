import type { DrawPath } from './types';
import { computePathLength, orderPaths } from './types';
import { detectEdges } from './edgeDetection';
import type { EdgeDetectionOptions } from './edgeDetection';
import { traceContours } from './contourTrace';
import type { ContourTraceOptions } from './contourTrace';

export interface PathTracingOptions extends EdgeDetectionOptions, ContourTraceOptions {
  /**
   * Optional max dimension to downscale the image for tracing if source resolution is very large.
   * Keeps synchronous edge extraction under ~20-50ms without blocking UI.
   * Default: 720 px
   */
  maxTraceDimension?: number;
}

/**
 * Pure integration function: tracePathsForImage
 *
 * Takes a source HTMLImageElement or ImageBitmap:
 * 1. Renders source to an in-memory offscreen canvas (scaling down if exceeds maxTraceDimension).
 * 2. Extracts raw ImageData buffer.
 * 3. Runs detectEdges (Sobel convolution + binary thresholding).
 * 4. Runs traceContours (8-connectivity boundary walking + Douglas-Peucker simplification).
 * 5. Maps polylines into DrawPath instances with computed lengthPx.
 * 6. Scales coordinates back to original image coordinate space if downscaling occurred.
 * 7. Applies orderPaths to sort strokes into natural top-to-bottom reading sequence.
 *
 * Signature is clean and deterministic — ready for Phase 6 Hand Animation Engine consumption.
 */
export function tracePathsForImage(
  imageElement: HTMLImageElement | ImageBitmap,
  options: PathTracingOptions = {},
): DrawPath[] {
  const origWidth = 'naturalWidth' in imageElement ? imageElement.naturalWidth : imageElement.width;
  const origHeight =
    'naturalHeight' in imageElement ? imageElement.naturalHeight : imageElement.height;

  if (origWidth === 0 || origHeight === 0) {
    return [];
  }

  // Calculate tracing dimensions (optional downsampling for fast processing)
  const maxDim = options.maxTraceDimension ?? 720;
  let traceWidth = origWidth;
  let traceHeight = origHeight;

  if (origWidth > maxDim || origHeight > maxDim) {
    if (origWidth >= origHeight) {
      traceWidth = maxDim;
      traceHeight = Math.round((origHeight / origWidth) * maxDim);
    } else {
      traceHeight = maxDim;
      traceWidth = Math.round((origWidth / origHeight) * maxDim);
    }
  }

  // Create offscreen canvas for pixel extraction
  // Works with both document.createElement('canvas') in DOM and OffscreenCanvas in worker
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(traceWidth, traceHeight);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = traceWidth;
    canvas.height = traceHeight;
  } else {
    return [];
  }

  const ctx = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    return [];
  }

  ctx.drawImage(imageElement, 0, 0, traceWidth, traceHeight);
  const imageData = ctx.getImageData(0, 0, traceWidth, traceHeight);

  // 1. Edge detection
  const edgeMap = detectEdges(imageData, options);

  // 2. Contour extraction
  const rawPolylines = traceContours(edgeMap, options);

  // 3. Map to DrawPath with scale correction back to original coordinates
  const scaleX = origWidth / traceWidth;
  const scaleY = origHeight / traceHeight;

  const rawPaths: DrawPath[] = rawPolylines.map((polyline, idx) => {
    const scaledPoints = polyline.map((p) => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));

    return {
      id: `stroke-${idx + 1}`,
      points: scaledPoints,
      lengthPx: computePathLength(scaledPoints),
    };
  });

  // 4. Order paths into natural drawing sequence
  return orderPaths(rawPaths);
}
