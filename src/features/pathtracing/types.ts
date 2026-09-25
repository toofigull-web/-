export interface Point2D {
  x: number;
  y: number;
}

export interface DrawPath {
  id: string;
  points: Point2D[];
  lengthPx: number;
}

/**
 * Computes the total Euclidean length in pixels along an ordered polyline.
 */
export function computePathLength(points: Point2D[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

/**
 * Sorts paths into a deterministic drawing sequence.
 * Default strategy: Natural reading order (top-to-bottom, then left-to-right)
 * based on each stroke's start point or bounding center.
 * If two strokes start at the same vertical level (within a tolerance band of 8px),
 * they are sorted left-to-right.
 */
export function orderPaths(paths: DrawPath[], bandTolerance = 8): DrawPath[] {
  return [...paths].sort((a, b) => {
    const pA = a.points[0] ?? { x: 0, y: 0 };
    const pB = b.points[0] ?? { x: 0, y: 0 };

    const dy = pA.y - pB.y;
    if (Math.abs(dy) > bandTolerance) {
      return dy;
    }
    return pA.x - pB.x;
  });
}
