import type { DrawPath, Point2D } from '../pathtracing/types';
import type { AspectRatioFit } from '../scenes/types';
import type { Vector2D } from '../hand/handTransform';

/**
 * A single revealed (or partially revealed) stroke, in the SAME coordinate
 * space as the input DrawPath points (natural image pixel space). Consumers
 * that need canvas/display coordinates must transform these separately via
 * mapImagePointToCanvas / mapImagePolylineToCanvas.
 */
export interface RevealedSegment {
  pathId: string;
  points: Point2D[];
}

export interface DrawingState {
  /** Fully or partially revealed portion of each path, in image pixel space. */
  revealedSegments: RevealedSegment[];
  /** Current pen-tip position, in image pixel space. */
  currentPoint: Point2D;
  /** Current travel direction (unit-ish vector, not normalized), image pixel space. */
  currentDirection: Vector2D;
  /** 0..1 overall progress across all paths combined. */
  progress: number;
}

const ZERO_POINT: Point2D = { x: 0, y: 0 };
const DEFAULT_DIRECTION: Vector2D = { dx: 1, dy: 0 };

/**
 * Walks a single path's points and returns the sub-polyline covering the
 * first `targetLength` pixels of that path's cumulative length, plus the
 * exact interpolated end point and the local direction vector there.
 *
 * Returns null if targetLength <= 0 (nothing revealed yet on this path).
 */
function walkPathToLength(
  points: Point2D[],
  targetLength: number,
): { revealed: Point2D[]; endPoint: Point2D; direction: Vector2D } | null {
  if (points.length === 0 || targetLength <= 0) return null;
  if (points.length === 1) {
    return { revealed: [points[0]!], endPoint: points[0]!, direction: DEFAULT_DIRECTION };
  }

  const revealed: Point2D[] = [points[0]!];
  let accumulated = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (accumulated + segmentLength >= targetLength) {
      // Interpolate exactly to targetLength within this segment.
      const remaining = targetLength - accumulated;
      const t = segmentLength === 0 ? 0 : remaining / segmentLength;
      const endPoint: Point2D = {
        x: p1.x + dx * t,
        y: p1.y + dy * t,
      };
      revealed.push(endPoint);

      // Local direction: use the segment's direction (stable even when
      // remaining is tiny, unlike differencing against the interpolated
      // point which could be numerically unstable for very short segments).
      const direction: Vector2D =
        segmentLength === 0 ? DEFAULT_DIRECTION : { dx, dy };

      return { revealed, endPoint, direction };
    }

    accumulated += segmentLength;
    revealed.push(p2);
  }

  // targetLength reaches or exceeds the full path: fully revealed.
  const last = points[points.length - 1]!;
  const secondLast = points[points.length - 2]!;
  const direction: Vector2D = { dx: last.x - secondLast.x, dy: last.y - secondLast.y };
  return { revealed, endPoint: last, direction };
}

/**
 * Pure function computing which portions of an ordered list of DrawPaths
 * are revealed at a given point in time, assuming CONSTANT PIXEL-SPEED
 * drawing across the combined length of all paths (not constant time per
 * path) — a long stroke takes proportionally longer to draw than a short one.
 *
 * @param paths        Ordered DrawPaths (see pathtracing/types.ts orderPaths).
 * @param elapsedMs     Milliseconds elapsed since drawing started for this scene.
 * @param totalDrawMs   Total duration allotted for the drawing phase (this is
 *                      scene.durationMs - scene.holdMs, NOT the full scene
 *                      duration — the hold phase has no further reveal).
 */
export function computeDrawingState(
  paths: DrawPath[],
  elapsedMs: number,
  totalDrawMs: number,
): DrawingState {
  const totalLength = paths.reduce((sum, p) => sum + p.lengthPx, 0);

  if (paths.length === 0 || totalLength <= 0) {
    return {
      revealedSegments: [],
      currentPoint: ZERO_POINT,
      currentDirection: DEFAULT_DIRECTION,
      progress: 0,
    };
  }

  const clampedElapsed = Math.max(0, Math.min(elapsedMs, totalDrawMs));
  const progress = totalDrawMs <= 0 ? 1 : clampedElapsed / totalDrawMs;
  const targetTraveled = totalLength * progress;

  const revealedSegments: RevealedSegment[] = [];
  let remaining = targetTraveled;
  let currentPoint: Point2D = paths[0]!.points[0] ?? ZERO_POINT;
  let currentDirection: Vector2D = DEFAULT_DIRECTION;
  let foundActivePath = false;

  for (const path of paths) {
    if (remaining <= 0) break;

    const walked = walkPathToLength(path.points, remaining);
    if (!walked) continue;

    revealedSegments.push({ pathId: path.id, points: walked.revealed });
    currentPoint = walked.endPoint;
    currentDirection = walked.direction;
    foundActivePath = true;

    remaining -= path.lengthPx;
  }

  if (!foundActivePath) {
    // progress === 0 exactly: nothing revealed, pen sits at the very first point.
    currentPoint = paths[0]!.points[0] ?? ZERO_POINT;
  }

  return {
    revealedSegments,
    currentPoint,
    currentDirection,
    progress,
  };
}

/**
 * Transforms a single point from natural image pixel space into canvas
 * display space, using the same contain-fit rect Phase 3's SceneCanvas
 * uses to place the image. This is the coordinate bridge between Phase 5's
 * traced paths (image space) and the canvas/HandOverlay (display space).
 *
 * Because computeContainFit never crops (sourceWidth/Height always equal
 * the full natural image dimensions), this is a simple linear scale + offset.
 */
export function mapImagePointToCanvas(point: Point2D, fit: AspectRatioFit): Point2D {
  if (fit.sourceWidth <= 0 || fit.sourceHeight <= 0) {
    return { x: fit.destX, y: fit.destY };
  }
  return {
    x: fit.destX + (point.x / fit.sourceWidth) * fit.destWidth,
    y: fit.destY + (point.y / fit.sourceHeight) * fit.destHeight,
  };
}

export function mapImagePolylineToCanvas(points: Point2D[], fit: AspectRatioFit): Point2D[] {
  return points.map((p) => mapImagePointToCanvas(p, fit));
}

/**
 * Maps a direction vector from image space to canvas space. Since the
 * contain-fit transform is a uniform-per-axis scale (no rotation/skew),
 * direction vectors scale the same way points do, componentwise.
 */
export function mapDirectionToCanvas(direction: Vector2D, fit: AspectRatioFit): Vector2D {
  if (fit.sourceWidth <= 0 || fit.sourceHeight <= 0) {
    return direction;
  }
  const scaleX = fit.destWidth / fit.sourceWidth;
  const scaleY = fit.destHeight / fit.sourceHeight;
  return { dx: direction.dx * scaleX, dy: direction.dy * scaleY };
}
