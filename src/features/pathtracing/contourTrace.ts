import type { Point2D } from './types';
import type { BinaryEdgeMap } from './edgeDetection';

/**
 * Douglas-Peucker Polyline Simplification Algorithm.
 * Recursively reduces the number of points in a curve while preserving its overall shape
 * within an epsilon tolerance distance (in pixels).
 */
export function simplifyPolyline(points: Point2D[], epsilon = 1.5): Point2D[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;

  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const lineLenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i]!;
    let dist = 0;

    if (lineLenSq === 0) {
      const px = pt.x - first.x;
      const py = pt.y - first.y;
      dist = Math.sqrt(px * px + py * py);
    } else {
      // Perpendicular distance from pt to line segment [first, last]
      const numerator = Math.abs(dy * pt.x - dx * pt.y + last.x * first.y - last.y * first.x);
      dist = numerator / Math.sqrt(lineLenSq);
    }

    if (dist > maxDistance) {
      maxDistance = dist;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const rec1 = simplifyPolyline(points.slice(0, index + 1), epsilon);
    const rec2 = simplifyPolyline(points.slice(index), epsilon);
    return [...rec1.slice(0, -1), ...rec2];
  }

  return [first, last];
}

export interface ContourTraceOptions {
  /**
   * Minimum number of raw pixel points required to form a stroke polyline.
   * Discards isolated speckles and tiny noise fragments.
   * Default: 6
   */
  minContourLength?: number;

  /**
   * Epsilon distance tolerance in pixels for Douglas-Peucker simplification pass.
   * Default: 1.5 px
   */
  simplifyTolerance?: number;
}

/**
 * 8-connectivity pixel neighbor offsets:
 * [dx, dy]
 */
const NEIGHBORS_8: [number, number][] = [
  [1, 0], // right
  [1, 1], // down-right
  [0, 1], // down
  [-1, 1], // down-left
  [-1, 0], // left
  [-1, -1], // up-left
  [0, -1], // up
  [1, -1], // up-right
];

/**
 * Pure function traceContours
 *
 * Walks the binary edge map using connected 8-neighborhood topological contour tracing,
 * producing ordered arrays of {x, y} coordinate points representing continuous drawable strokes.
 *
 * ALGORITHM LIMITATIONS (documented frankly per project guidelines):
 * 1. Does not merge separate nearby strokes or bridge small 1-2px anti-aliasing gaps.
 * 2. Does not fit higher-order Bezier or spline curves; outputs piecewise linear polylines.
 * 3. Traces thick edges as multiple parallel contours (outer and inner perimeter) unless thinned.
 * 4. Boundary loops that re-enter themselves are terminated when revisiting visited edge pixels.
 */
export function traceContours(
  edgeMap: BinaryEdgeMap,
  options: ContourTraceOptions = {},
): Point2D[][] {
  const { width, height, data } = edgeMap;
  const minLength = options.minContourLength ?? 6;
  const simplifyTol = options.simplifyTolerance ?? 1.5;

  const visited = new Uint8Array(width * height);
  const polylines: Point2D[][] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Start a new contour if we find an unvisited edge pixel
      if (data[idx] === 1 && visited[idx] === 0) {
        const rawPoints: Point2D[] = [];
        let currX = x;
        let currY = y;

        rawPoints.push({ x: currX, y: currY });
        visited[currX + currY * width] = 1;

        let moving = true;
        while (moving) {
          moving = false;

          // Search 8-connected neighbors for the next unvisited edge pixel
          for (const [ndx, ndy] of NEIGHBORS_8) {
            const nx = currX + ndx;
            const ny = currY + ndy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (data[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                currX = nx;
                currY = ny;
                rawPoints.push({ x: currX, y: currY });
                moving = true;
                break;
              }
            }
          }
        }

        // If the path reached minimum length, simplify and retain
        if (rawPoints.length >= minLength) {
          const simplified = simplifyPolyline(rawPoints, simplifyTol);
          if (simplified.length >= 2) {
            polylines.push(simplified);
          }
        }
      }
    }
  }

  return polylines;
}
