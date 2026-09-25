import React from 'react';
import type { Point2D, Vector2D } from './handTransform';
import {
  HAND_WIDTH_PX,
  HAND_HEIGHT_PX,
  HAND_ANCHOR,
  HAND_ASSET_URL,
  clampHandPosition,
  computeHandRotation,
} from './handTransform';

export interface HandOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  pathPoint: Point2D;
  directionVector?: Vector2D;
  handSizePx?: number; // Target display width of the hand sprite
  safeAreaMargin?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * HandOverlay Component
 *
 * Renders the hand PNG as a completely separate, unclipped sibling layer stacked
 * on top of the canvas.
 * - Positioned via CSS transform (translate + rotate) using the pen-tip anchor.
 * - Has no mask, no shared overflow:hidden with the image, and no clip-path tied to image bounds.
 * - Clamped against the full canvas frame so the hand never gets cut off at edges or corners.
 */
export const HandOverlay: React.FC<HandOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  pathPoint,
  directionVector = { dx: 1, dy: 0 },
  handSizePx = 360,
  safeAreaMargin = 0,
  className = '',
  style = {},
}) => {
  // Scale factor from natural asset dimensions to target render size
  const scale = handSizePx / HAND_WIDTH_PX;
  const renderWidth = handSizePx;
  const renderHeight = HAND_HEIGHT_PX * scale;

  // Scaled pen-tip anchor point in display units
  const scaledAnchor: Point2D = {
    x: HAND_ANCHOR.x * scale,
    y: HAND_ANCHOR.y * scale,
  };

  // Compute rotation angle & horizontal flip from travel direction
  const { rotationDegrees, flipHorizontal } = computeHandRotation(directionVector);

  // Pure mathematical clamping against canvas boundaries
  const clamped = clampHandPosition(
    pathPoint.x,
    pathPoint.y,
    renderWidth,
    renderHeight,
    scaledAnchor,
    rotationDegrees,
    canvasWidth,
    canvasHeight,
    safeAreaMargin,
    flipHorizontal,
  );

  /**
   * CSS Transform breakdown:
   * 1. Position the element's origin at the clamped anchor (pen tip).
   * 2. Apply transform-origin at the scaled anchor point.
   * 3. Apply rotate(deg) and optional scaleX(-1) if flipped.
   * 4. Translate by (-scaledAnchor.x, -scaledAnchor.y) so that the pen tip rests exactly on the anchor point.
   */
  const transform = [
    `translate(${clamped.clampedAnchorX}px, ${clamped.clampedAnchorY}px)`,
    `rotate(${rotationDegrees}deg)`,
    flipHorizontal ? 'scaleX(-1)' : '',
    `translate(${-scaledAnchor.x}px, ${-scaledAnchor.y}px)`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`hand-overlay-layer ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        pointerEvents: 'none',
        overflow: 'visible', // CRITICAL: Never clips children
        zIndex: 50,
        ...style,
      }}
      aria-hidden="true"
    >
      <img
        src={HAND_ASSET_URL}
        alt=""
        width={renderWidth}
        height={renderHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${renderWidth}px`,
          height: `${renderHeight}px`,
          transformOrigin: `${scaledAnchor.x}px ${scaledAnchor.y}px`,
          transform,
          willChange: 'transform',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
