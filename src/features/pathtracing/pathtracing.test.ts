import { describe, it, expect } from 'bun:test';
import { detectEdges } from './edgeDetection';
import { traceContours, simplifyPolyline } from './contourTrace';
import { computePathLength, orderPaths } from './types';
import type { DrawPath } from './types';

/**
 * Creates a synthetic ImageData instance of given dimensions.
 */
function createSyntheticImageData(
  width: number,
  height: number,
  filler: (x: number, y: number) => [number, number, number, number],
): ImageData {
  const buffer = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = filler(x, y);
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // ImageData constructor polyfill if in headless test environment
  if (typeof ImageData !== 'undefined') {
    return new ImageData(buffer, width, height);
  }
  return {
    width,
    height,
    data: buffer,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('Phase 5 Path Tracing Feature Tests', () => {
  describe('1. Edge Detection on Synthetic Test Image (Black square on white background)', () => {
    // 50x50 image with white background (255) and black square (0) from x=15..34, y=15..34
    const width = 50;
    const height = 50;
    const sqX1 = 15;
    const sqX2 = 34;
    const sqY1 = 15;
    const sqY2 = 34;

    const testImage = createSyntheticImageData(width, height, (x, y) => {
      const isInsideSquare = x >= sqX1 && x <= sqX2 && y >= sqY1 && y <= sqY2;
      const v = isInsideSquare ? 0 : 255;
      return [v, v, v, 255];
    });

    it('produces binary edge pixels at the expected square boundaries and zero edges in flat regions', () => {
      const edgeMap = detectEdges(testImage, { threshold: 48 });

      expect(edgeMap.width).toBe(width);
      expect(edgeMap.height).toBe(height);

      // Center of the square (x=25, y=25) is solid black -> gradient should be 0 (no edge)
      const centerIdx = 25 * width + 25;
      expect(edgeMap.data[centerIdx]).toBe(0);

      // Top-left outer region (x=5, y=5) is solid white -> gradient should be 0 (no edge)
      const outerIdx = 5 * width + 5;
      expect(edgeMap.data[outerIdx]).toBe(0);

      // Along the top boundary y=15, from x=16..33, edge must be detected
      let topEdgeCount = 0;
      for (let x = sqX1; x <= sqX2; x++) {
        // Look within +/- 1 pixel of boundary
        if (
          edgeMap.data[(sqY1 - 1) * width + x] === 1 ||
          edgeMap.data[sqY1 * width + x] === 1 ||
          edgeMap.data[(sqY1 + 1) * width + x] === 1
        ) {
          topEdgeCount++;
        }
      }
      expect(topEdgeCount).toBeGreaterThan(15);

      // Along the left boundary x=15, from y=16..33, edge must be detected
      let leftEdgeCount = 0;
      for (let y = sqY1; y <= sqY2; y++) {
        if (
          edgeMap.data[y * width + sqX1 - 1] === 1 ||
          edgeMap.data[y * width + sqX1] === 1 ||
          edgeMap.data[y * width + sqX1 + 1] === 1
        ) {
          leftEdgeCount++;
        }
      }
      expect(leftEdgeCount).toBeGreaterThan(15);
    });
  });

  describe('2. Contour Tracing on Synthetic Test Image', () => {
    it('produces at least one continuous polyline tracing the perimeter of the synthetic square', () => {
      const width = 60;
      const height = 60;
      const sqX1 = 20;
      const sqX2 = 40;
      const sqY1 = 20;
      const sqY2 = 40;

      const testImage = createSyntheticImageData(width, height, (x, y) => {
        const isInside = x >= sqX1 && x <= sqX2 && y >= sqY1 && y <= sqY2;
        const v = isInside ? 0 : 255;
        return [v, v, v, 255];
      });

      const edgeMap = detectEdges(testImage, { threshold: 48 });
      const polylines = traceContours(edgeMap, { minContourLength: 6, simplifyTolerance: 1.0 });

      // There must be at least one traced stroke
      expect(polylines.length).toBeGreaterThanOrEqual(1);

      // The main contour should have points that span around the square boundary (~20..40 in both X and Y)
      const mainContour = polylines[0]!;
      expect(mainContour.length).toBeGreaterThanOrEqual(4);

      const xs = mainContour.map((p) => p.x);
      const ys = mainContour.map((p) => p.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // The bounding extents of the traced stroke should tightly match the square perimeter (within 2px)
      expect(minX).toBeGreaterThanOrEqual(sqX1 - 2);
      expect(maxX).toBeLessThanOrEqual(sqX2 + 2);
      expect(minY).toBeGreaterThanOrEqual(sqY1 - 2);
      expect(maxY).toBeLessThanOrEqual(sqY2 + 2);
    });

    it('simplifies collinear points accurately with Douglas-Peucker', () => {
      // 10 collinear points along y = 10 from x = 0 to 90
      const straightLine = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 10 }));
      const simplified = simplifyPolyline(straightLine, 1.0);

      // A straight line has 0 perpendicular deviation, so it simplifies down to just 2 endpoints
      expect(simplified.length).toBe(2);
      expect(simplified[0]).toEqual({ x: 0, y: 10 });
      expect(simplified[1]).toEqual({ x: 90, y: 10 });
    });
  });

  describe('3. computePathLength accuracy verification', () => {
    it('computes lengthPx correctly for a horizontal straight line of known length', () => {
      const line = [
        { x: 10, y: 50 },
        { x: 110, y: 50 },
      ];
      expect(computePathLength(line)).toBeCloseTo(100, 4);
    });

    it('computes lengthPx correctly for a diagonal straight line (3-4-5 triangle)', () => {
      const diagonal = [
        { x: 0, y: 0 },
        { x: 30, y: 40 },
      ];
      expect(computePathLength(diagonal)).toBeCloseTo(50, 4);
    });

    it('computes lengthPx correctly for a multi-segment zigzag polyline', () => {
      const zigzag = [
        { x: 0, y: 0 },
        { x: 10, y: 0 }, // +10
        { x: 10, y: 20 }, // +20
        { x: 30, y: 20 }, // +20
      ];
      expect(computePathLength(zigzag)).toBeCloseTo(50, 4);
    });

    it('returns 0 for empty or single-point paths', () => {
      expect(computePathLength([])).toBe(0);
      expect(computePathLength([{ x: 10, y: 10 }])).toBe(0);
    });
  });

  describe('4. orderPaths sorting sequence verification', () => {
    it('sorts paths strictly top-to-bottom, and left-to-right within the same band', () => {
      const pathBottomRight: DrawPath = {
        id: 'p-br',
        points: [
          { x: 200, y: 300 },
          { x: 250, y: 350 },
        ],
        lengthPx: 50,
      };

      const pathTopRight: DrawPath = {
        id: 'p-tr',
        points: [
          { x: 200, y: 50 },
          { x: 250, y: 60 },
        ],
        lengthPx: 50,
      };

      const pathTopLeft: DrawPath = {
        id: 'p-tl',
        points: [
          { x: 50, y: 50 },
          { x: 80, y: 55 },
        ],
        lengthPx: 50,
      };

      const pathMiddle: DrawPath = {
        id: 'p-mid',
        points: [
          { x: 100, y: 150 },
          { x: 120, y: 170 },
        ],
        lengthPx: 50,
      };

      // Input in mixed order
      const unsorted = [pathBottomRight, pathMiddle, pathTopRight, pathTopLeft];
      const sorted = orderPaths(unsorted, 8);

      // Expected natural reading order:
      // 1. pathTopLeft (y=50, x=50)
      // 2. pathTopRight (y=50, x=200)
      // 3. pathMiddle (y=150)
      // 4. pathBottomRight (y=300)
      expect(sorted[0]!.id).toBe('p-tl');
      expect(sorted[1]!.id).toBe('p-tr');
      expect(sorted[2]!.id).toBe('p-mid');
      expect(sorted[3]!.id).toBe('p-br');
    });
  });
});
