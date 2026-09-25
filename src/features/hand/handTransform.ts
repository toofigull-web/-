import handPenAsset from './assets/handPen.png';

export interface Point2D {
  x: number;
  y: number;
}

export interface Vector2D {
  dx: number;
  dy: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ClampedHandPosition {
  clampedAnchorX: number;
  clampedAnchorY: number;
  offsetX: number;
  offsetY: number;
  boundingBox: BoundingBox;
}

export interface HandRotationResult {
  rotationDegrees: number;
  flipHorizontal: boolean;
}

/**
 * Hand asset exact pixel dimensions read directly from handPen.png:
 * HAND_WIDTH_PX = 2752
 * HAND_HEIGHT_PX = 1536
 */
export const HAND_WIDTH_PX = 2752;
export const HAND_HEIGHT_PX = 1536;

/**
 * Measured pen-tip anchor coordinate from top-left corner in pixels:
 * PEN_TIP_X = 671
 * PEN_TIP_Y = 891
 */
export const HAND_ANCHOR: Point2D = {
  x: 671,
  y: 891,
};

/**
 * Real static asset import resolved by Vite at build time.
 * If the asset is ever missing from disk, Vite build fails loudly.
 */
export const HAND_ASSET_URL = handPenAsset;

/**
 * Computes the axis-aligned bounding box (AABB) of the rotated hand sprite relative to its anchor point.
 * Does exact trigonometry rotating all 4 sprite corners around the anchor point.
 *
 * Corners of the unrotated sprite relative to anchor (0, 0):
 * - Top-Left:     (-anchor.x, -anchor.y)
 * - Top-Right:    (handWidth - anchor.x, -anchor.y)
 * - Bottom-Right: (handWidth - anchor.x, handHeight - anchor.y)
 * - Bottom-Left:  (-anchor.x, handHeight - anchor.y)
 */
export function computeHandBoundingBoxAfterRotation(
  handWidth: number,
  handHeight: number,
  anchor: Point2D,
  rotationDegrees: number,
  flipHorizontal = false,
): BoundingBox {
  const rad = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // When flipHorizontal is true, the local X-coordinates relative to the anchor flip signs
  const xLeft = flipHorizontal ? anchor.x : -anchor.x;
  const xRight = flipHorizontal ? -(handWidth - anchor.x) : handWidth - anchor.x;
  const yTop = -anchor.y;
  const yBottom = handHeight - anchor.y;

  const corners: Point2D[] = [
    { x: xLeft, y: yTop },
    { x: xRight, y: yTop },
    { x: xRight, y: yBottom },
    { x: xLeft, y: yBottom },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    const rx = corner.x * cos - corner.y * sin;
    const ry = corner.x * sin + corner.y * cos;

    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Clamps the desired anchor position so the ENTIRE rotated hand bounding box stays strictly
 * within the canvas frame [0, canvasWidth] x [0, canvasHeight] (minus safeAreaMargin).
 *
 * For any given anchor position (A_x, A_y):
 * The canvas-space bounding box extends from:
 *   [A_x + bbox.minX, A_x + bbox.maxX] in X
 *   [A_y + bbox.minY, A_y + bbox.maxY] in Y
 *
 * To guarantee no clipping:
 *   minAllowedAnchorX = safeAreaMargin - bbox.minX
 *   maxAllowedAnchorX = (canvasWidth - safeAreaMargin) - bbox.maxX
 *   minAllowedAnchorY = safeAreaMargin - bbox.minY
 *   maxAllowedAnchorY = (canvasHeight - safeAreaMargin) - bbox.maxY
 */
export function clampHandPosition(
  desiredAnchorX: number,
  desiredAnchorY: number,
  handWidth: number,
  handHeight: number,
  anchor: Point2D,
  rotationDegrees: number,
  canvasWidth: number,
  canvasHeight: number,
  safeAreaMargin = 0,
  flipHorizontal = false,
): ClampedHandPosition {
  const bbox = computeHandBoundingBoxAfterRotation(
    handWidth,
    handHeight,
    anchor,
    rotationDegrees,
    flipHorizontal,
  );

  const minX = safeAreaMargin - bbox.minX;
  const maxX = canvasWidth - safeAreaMargin - bbox.maxX;
  const minY = safeAreaMargin - bbox.minY;
  const maxY = canvasHeight - safeAreaMargin - bbox.maxY;

  // Handle cases where hand bounding box is wider or taller than the canvas itself
  const clampedAnchorX =
    minX <= maxX ? Math.min(Math.max(desiredAnchorX, minX), maxX) : (minX + maxX) / 2;
  const clampedAnchorY =
    minY <= maxY ? Math.min(Math.max(desiredAnchorY, minY), maxY) : (minY + maxY) / 2;

  return {
    clampedAnchorX,
    clampedAnchorY,
    offsetX: clampedAnchorX - desiredAnchorX,
    offsetY: clampedAnchorY - desiredAnchorY,
    boundingBox: {
      minX: clampedAnchorX + bbox.minX,
      minY: clampedAnchorY + bbox.minY,
      maxX: clampedAnchorX + bbox.maxX,
      maxY: clampedAnchorY + bbox.maxY,
      width: bbox.width,
      height: bbox.height,
    },
  };
}

/**
 * Computes hand rotation angle and horizontal-flip flag based on travel direction vector.
 *
 * Rule:
 * 1. Default base hand orientation holds pen pointing down-left at roughly -35° to -45°.
 * 2. When moving right-to-left (dx < 0), the hand is flipped horizontally (`flipHorizontal: true`)
 *    so the drawing hand naturally moves ahead of the drawn stroke, matching real whiteboard pen grip.
 * 3. Subtle dynamic pitch (±15°) follows the vertical slope (dy / (|dx| + epsilon)).
 */
export function computeHandRotation(directionVector: Vector2D): HandRotationResult {
  const { dx, dy } = directionVector;

  // If stationary / zero vector, return neutral 0° rotation without flip
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return {
      rotationDegrees: 0,
      flipHorizontal: false,
    };
  }

  const flipHorizontal = dx < 0;
  const effectiveDx = Math.abs(dx);

  // Pitch angle calculated from vertical component, clamped between -20° and +20°
  const angleRad = Math.atan2(dy, Math.max(effectiveDx, 0.1));
  const rawDegrees = (angleRad * 180) / Math.PI;
  const clampedDegrees = Math.max(-20, Math.min(20, rawDegrees * 0.4));

  return {
    rotationDegrees: clampedDegrees,
    flipHorizontal,
  };
}
