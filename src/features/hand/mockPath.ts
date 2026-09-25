import type { Point2D } from './handTransform';

/**
 * Generates a deterministic sequence of {x, y} coordinates for testing hand clamping.
 * Deliberately visits all four corners and all four edges of the canvas to stress-test
 * the clamping engine under extreme boundary conditions.
 */
export function generateMockPath(
  canvasWidth: number,
  canvasHeight: number,
  pointCount = 100,
): Point2D[] {
  // Key boundary milestones:
  // 1. Center
  // 2. Top-Left Corner (0, 0)
  // 3. Top Edge (w/2, 0)
  // 4. Top-Right Corner (w, 0)
  // 5. Right Edge (w, h/2)
  // 6. Bottom-Right Corner (w, h)
  // 7. Bottom Edge (w/2, h)
  // 8. Bottom-Left Corner (0, h)
  // 9. Left Edge (0, h/2)
  // 10. Center Return (w/2, h/2)
  const milestones: Point2D[] = [
    { x: canvasWidth / 2, y: canvasHeight / 2 },
    { x: 0, y: 0 },
    { x: canvasWidth / 2, y: 0 },
    { x: canvasWidth, y: 0 },
    { x: canvasWidth, y: canvasHeight / 2 },
    { x: canvasWidth, y: canvasHeight },
    { x: canvasWidth / 2, y: canvasHeight },
    { x: 0, y: canvasHeight },
    { x: 0, y: canvasHeight / 2 },
    { x: canvasWidth / 2, y: canvasHeight / 2 },
  ];

  const points: Point2D[] = [];
  const segments = milestones.length - 1;
  const pointsPerSegment = Math.max(1, Math.ceil(pointCount / segments));

  for (let s = 0; s < segments; s++) {
    const p1 = milestones[s];
    const p2 = milestones[s + 1];
    if (!p1 || !p2) continue;

    for (let i = 0; i < pointsPerSegment; i++) {
      const t = i / pointsPerSegment;
      points.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
      });
    }
  }

  // Ensure exact final endpoint is included
  const last = milestones[milestones.length - 1];
  if (last) {
    points.push({ ...last });
  }

  return points;
}
