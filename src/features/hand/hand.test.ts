import { describe, it, expect } from 'bun:test';
import {
  HAND_WIDTH_PX,
  HAND_HEIGHT_PX,
  HAND_ANCHOR,
  computeHandBoundingBoxAfterRotation,
  clampHandPosition,
  computeHandRotation,
} from './handTransform';
import { generateMockPath } from './mockPath';

describe('Phase 4 Hand Engine & Math Verification', () => {
  const scaledWidth = 360;
  const scale = scaledWidth / HAND_WIDTH_PX;
  const scaledHeight = HAND_HEIGHT_PX * scale;
  const scaledAnchor = {
    x: HAND_ANCHOR.x * scale,
    y: HAND_ANCHOR.y * scale,
  };

  describe('1. Asset Dimensions and Anchor Constants', () => {
    it('matches exact specified pixel constants', () => {
      expect(HAND_WIDTH_PX).toBe(2752);
      expect(HAND_HEIGHT_PX).toBe(1536);
      expect(HAND_ANCHOR.x).toBe(671);
      expect(HAND_ANCHOR.y).toBe(891);
    });
  });

  describe('2. computeHandBoundingBoxAfterRotation trigonometric tests', () => {
    it('computes exact box at 0° rotation', () => {
      const bbox = computeHandBoundingBoxAfterRotation(scaledWidth, scaledHeight, scaledAnchor, 0);

      // At 0 deg:
      // minX = -scaledAnchor.x
      // maxX = scaledWidth - scaledAnchor.x
      // minY = -scaledAnchor.y
      // maxY = scaledHeight - scaledAnchor.y
      expect(bbox.minX).toBeCloseTo(-scaledAnchor.x, 2);
      expect(bbox.maxX).toBeCloseTo(scaledWidth - scaledAnchor.x, 2);
      expect(bbox.minY).toBeCloseTo(-scaledAnchor.y, 2);
      expect(bbox.maxY).toBeCloseTo(scaledHeight - scaledAnchor.y, 2);
      expect(bbox.width).toBeCloseTo(scaledWidth, 2);
      expect(bbox.height).toBeCloseTo(scaledHeight, 2);
    });

    it('computes exact box at 90° rotation', () => {
      const bbox = computeHandBoundingBoxAfterRotation(scaledWidth, scaledHeight, scaledAnchor, 90);

      // Rotating 90 deg clockwise transforms (x, y) into (-y, x)
      // Width and height of the box should be swapped
      expect(bbox.width).toBeCloseTo(scaledHeight, 2);
      expect(bbox.height).toBeCloseTo(scaledWidth, 2);
    });

    it('computes exact box at 180° rotation', () => {
      const bbox = computeHandBoundingBoxAfterRotation(
        scaledWidth,
        scaledHeight,
        scaledAnchor,
        180,
      );

      // Rotating 180 deg flips coordinates
      expect(bbox.width).toBeCloseTo(scaledWidth, 2);
      expect(bbox.height).toBeCloseTo(scaledHeight, 2);
      expect(bbox.minX).toBeCloseTo(-(scaledWidth - scaledAnchor.x), 2);
      expect(bbox.maxX).toBeCloseTo(scaledAnchor.x, 2);
    });

    it('computes correct corner bounds at an odd angle (37°)', () => {
      const bbox = computeHandBoundingBoxAfterRotation(scaledWidth, scaledHeight, scaledAnchor, 37);

      // Bounding box of rotated rectangle at 37° must be strictly larger than unrotated dims
      expect(bbox.width).toBeGreaterThan(0);
      expect(bbox.height).toBeGreaterThan(0);
      expect(bbox.maxX).toBeGreaterThan(bbox.minX);
      expect(bbox.maxY).toBeGreaterThan(bbox.minY);

      // Geometric property: W_rot = W*cos(theta) + H*sin(theta)
      const rad = (37 * Math.PI) / 180;
      const expectedWidth = scaledWidth * Math.cos(rad) + scaledHeight * Math.sin(rad);
      const expectedHeight = scaledWidth * Math.sin(rad) + scaledHeight * Math.cos(rad);
      expect(bbox.width).toBeCloseTo(expectedWidth, 1);
      expect(bbox.height).toBeCloseTo(expectedHeight, 1);
    });
  });

  describe('3. clampHandPosition at four corners and angles (Direct Anti-Clipping Proof)', () => {
    const canvasWidth = 720;
    const canvasHeight = 1280;
    const testAngles = [0, 90, 180, 37];
    const testCorners = [
      { name: 'Top-Left (0, 0)', x: 0, y: 0 },
      { name: 'Top-Right (w, 0)', x: canvasWidth, y: 0 },
      { name: 'Bottom-Right (w, h)', x: canvasWidth, y: canvasHeight },
      { name: 'Bottom-Left (0, h)', x: 0, y: canvasHeight },
    ];

    testAngles.forEach((angle) => {
      testCorners.forEach((corner) => {
        it(`guarantees rotated hand bounding box stays fully within [0, ${canvasWidth}] x [0, ${canvasHeight}] at ${corner.name} and ${angle}°`, () => {
          const clamped = clampHandPosition(
            corner.x,
            corner.y,
            scaledWidth,
            scaledHeight,
            scaledAnchor,
            angle,
            canvasWidth,
            canvasHeight,
            0,
          );

          // The resulting bounding box must not exceed [0, canvasWidth] in X
          expect(clamped.boundingBox.minX).toBeGreaterThanOrEqual(-0.01);
          expect(clamped.boundingBox.maxX).toBeLessThanOrEqual(canvasWidth + 0.01);

          // The resulting bounding box must not exceed [0, canvasHeight] in Y
          expect(clamped.boundingBox.minY).toBeGreaterThanOrEqual(-0.01);
          expect(clamped.boundingBox.maxY).toBeLessThanOrEqual(canvasHeight + 0.01);
        });
      });
    });

    it('respects safeAreaMargin (e.g. 10px padding from canvas border)', () => {
      const margin = 10;
      const clamped = clampHandPosition(
        0,
        0,
        scaledWidth,
        scaledHeight,
        scaledAnchor,
        0,
        canvasWidth,
        canvasHeight,
        margin,
      );

      expect(clamped.boundingBox.minX).toBeGreaterThanOrEqual(margin - 0.01);
      expect(clamped.boundingBox.minY).toBeGreaterThanOrEqual(margin - 0.01);
      expect(clamped.boundingBox.maxX).toBeLessThanOrEqual(canvasWidth - margin + 0.01);
      expect(clamped.boundingBox.maxY).toBeLessThanOrEqual(canvasHeight - margin + 0.01);
    });
  });

  describe('4. computeHandRotation direction mirroring rules', () => {
    it('sets flipHorizontal: false when moving left-to-right (dx > 0)', () => {
      const res = computeHandRotation({ dx: 10, dy: 0 });
      expect(res.flipHorizontal).toBe(false);
    });

    it('sets flipHorizontal: true when moving right-to-left (dx < 0)', () => {
      const res = computeHandRotation({ dx: -10, dy: 0 });
      expect(res.flipHorizontal).toBe(true);
    });

    it('handles neutral stationary vector', () => {
      const res = computeHandRotation({ dx: 0, dy: 0 });
      expect(res.flipHorizontal).toBe(false);
      expect(res.rotationDegrees).toBe(0);
    });
  });

  describe('5. generateMockPath coverage', () => {
    it('generates a path covering edges and corners', () => {
      const path = generateMockPath(360, 640, 50);
      expect(path.length).toBeGreaterThanOrEqual(50);

      const hasTopLeft = path.some((p) => p.x === 0 && p.y === 0);
      const hasTopRight = path.some((p) => p.x === 360 && p.y === 0);
      const hasBottomRight = path.some((p) => p.x === 360 && p.y === 640);
      const hasBottomLeft = path.some((p) => p.x === 0 && p.y === 640);

      expect(hasTopLeft).toBe(true);
      expect(hasTopRight).toBe(true);
      expect(hasBottomRight).toBe(true);
      expect(hasBottomLeft).toBe(true);
    });
  });
});
