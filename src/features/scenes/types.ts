import type { UploadedImage } from '../upload/types';

export interface Scene {
  id: string;
  image: UploadedImage;
  order: number;
  durationMs: number;
  holdMs: number;
}

/**
 * Sensible product defaults matching the real video generation whiteboard defaults:
 * - DEFAULT_SCENE_DURATION_MS = 4800 (4.8s total scene time for drawing animation + pause)
 * - DEFAULT_SCENE_HOLD_MS = 1900 (1.9s pause after drawing completes before transition)
 */
export const DEFAULT_SCENE_DURATION_MS = 4800;
export const DEFAULT_SCENE_HOLD_MS = 1900;

/**
 * Pure function to convert an array of UploadedImage objects into an ordered Scene list.
 * Order corresponds directly to the array index (0-based order).
 */
export function toScenes(
  images: UploadedImage[],
  durationMs = DEFAULT_SCENE_DURATION_MS,
  holdMs = DEFAULT_SCENE_HOLD_MS,
): Scene[] {
  return images.map((image, index) => ({
    id: `scene-${image.id || index}-${index}`,
    image,
    order: index,
    durationMs,
    holdMs,
  }));
}

export interface AspectRatioFit {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  destX: number;
  destY: number;
  destWidth: number;
  destHeight: number;
}

/**
 * Computes destination rectangle for contain-fitting a source image into a canvas frame.
 * Does not stretch: scales proportionally, centers in frame, letterboxes/pillarboxes empty areas.
 */
export function computeContainFit(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): AspectRatioFit {
  if (imageWidth <= 0 || imageHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      destX: 0,
      destY: 0,
      destWidth: canvasWidth,
      destHeight: canvasHeight,
    };
  }

  const imageAspect = imageWidth / imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let destWidth = canvasWidth;
  let destHeight = canvasHeight;

  if (imageAspect > canvasAspect) {
    // Image is wider than canvas frame: fit to canvas width, letterbox top & bottom
    destWidth = canvasWidth;
    destHeight = canvasWidth / imageAspect;
  } else {
    // Image is taller than or equal to canvas frame: fit to canvas height, pillarbox left & right
    destHeight = canvasHeight;
    destWidth = canvasHeight * imageAspect;
  }

  const destX = (canvasWidth - destWidth) / 2;
  const destY = (canvasHeight - destHeight) / 2;

  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth: imageWidth,
    sourceHeight: imageHeight,
    destX,
    destY,
    destWidth,
    destHeight,
  };
}
