import { describe, it, expect, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  computeDrawingState,
  mapImagePointToCanvas,
  mapDirectionToCanvas,
} from './drawingProgress';
import { AnimatedScene } from './AnimatedScene';
import type { DrawPath } from '../pathtracing/types';
import type { AspectRatioFit, Scene } from '../scenes/types';
import type { UploadedImage } from '../upload/types';

describe('Phase 6 Drawing Progress & Coordinate Mapping', () => {
  beforeEach(() => {
    const happyWindow = new Window();
    (globalThis as unknown as Record<string, unknown>).document = happyWindow.document;
    (globalThis as unknown as Record<string, unknown>).window = happyWindow;
  });

  // Two paths: a 100px horizontal line, then a 100px vertical line.
  // Total combined length = 200px, so 25% progress = 50px traveled.
  const twoPaths: DrawPath[] = [
    {
      id: 'a',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      lengthPx: 100,
    },
    {
      id: 'b',
      points: [
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      lengthPx: 100,
    },
  ];

  describe('computeDrawingState at various progress points', () => {
    it('reveals nothing at 0% progress (elapsedMs = 0)', () => {
      const state = computeDrawingState(twoPaths, 0, 1000);
      expect(state.progress).toBe(0);
      expect(state.revealedSegments.length).toBe(0);
      expect(state.currentPoint).toEqual({ x: 0, y: 0 });
    });

    it('reveals exactly half of path A at 25% progress (50px of 200px total)', () => {
      const state = computeDrawingState(twoPaths, 250, 1000); // 25% of 1000ms
      expect(state.progress).toBeCloseTo(0.25, 5);
      expect(state.revealedSegments.length).toBe(1);
      expect(state.revealedSegments[0]!.pathId).toBe('a');
      expect(state.currentPoint.x).toBeCloseTo(50, 5);
      expect(state.currentPoint.y).toBeCloseTo(0, 5);
      // Direction along path A is purely horizontal.
      expect(state.currentDirection.dx).toBeGreaterThan(0);
      expect(state.currentDirection.dy).toBeCloseTo(0, 5);
    });

    it('reveals all of path A and none of path B at exactly the path boundary (50%)', () => {
      const state = computeDrawingState(twoPaths, 500, 1000); // 50% -> 100px traveled
      expect(state.progress).toBeCloseTo(0.5, 5);
      // At the exact boundary, path A is fully revealed and is the active path.
      expect(state.revealedSegments.length).toBe(1);
      expect(state.revealedSegments[0]!.pathId).toBe('a');
      expect(state.currentPoint).toEqual({ x: 100, y: 0 });
    });

    it('reveals half of path B at 75% progress (150px of 200px total)', () => {
      const state = computeDrawingState(twoPaths, 750, 1000);
      expect(state.progress).toBeCloseTo(0.75, 5);
      expect(state.revealedSegments.length).toBe(2);
      expect(state.revealedSegments[1]!.pathId).toBe('b');
      expect(state.currentPoint.x).toBeCloseTo(100, 5);
      expect(state.currentPoint.y).toBeCloseTo(50, 5);
      // Direction along path B is purely vertical.
      expect(state.currentDirection.dx).toBeCloseTo(0, 5);
      expect(state.currentDirection.dy).toBeGreaterThan(0);
    });

    it('reveals both paths fully at 100% progress', () => {
      const state = computeDrawingState(twoPaths, 1000, 1000);
      expect(state.progress).toBe(1);
      expect(state.revealedSegments.length).toBe(2);
      expect(state.currentPoint).toEqual({ x: 100, y: 100 });
    });

    it('clamps elapsedMs beyond totalDrawMs to still report 100% (no overshoot)', () => {
      const state = computeDrawingState(twoPaths, 5000, 1000);
      expect(state.progress).toBe(1);
      expect(state.currentPoint).toEqual({ x: 100, y: 100 });
    });

    it('returns a neutral empty state for an empty path list', () => {
      const state = computeDrawingState([], 500, 1000);
      expect(state.revealedSegments).toEqual([]);
      expect(state.progress).toBe(0);
    });
  });

  describe('Image-space to canvas-space coordinate transform', () => {
    // A 1000x2000 natural image fit into a 300x600 canvas (same aspect
    // ratio, so it should fill exactly with no letterbox/pillarbox offset).
    const fit: AspectRatioFit = {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 1000,
      sourceHeight: 2000,
      destX: 0,
      destY: 0,
      destWidth: 300,
      destHeight: 600,
    };

    it('maps a point at the image origin to the canvas destination origin', () => {
      const p = mapImagePointToCanvas({ x: 0, y: 0 }, fit);
      expect(p).toEqual({ x: 0, y: 0 });
    });

    it('maps the image center to the canvas center at the correct 0.3x scale', () => {
      const p = mapImagePointToCanvas({ x: 500, y: 1000 }, fit);
      expect(p.x).toBeCloseTo(150, 5);
      expect(p.y).toBeCloseTo(300, 5);
    });

    it('respects a non-zero destX/destY offset (pillarboxed frame)', () => {
      const pillarboxed: AspectRatioFit = {
        sourceX: 0,
        sourceY: 0,
        sourceWidth: 1000,
        sourceHeight: 1000,
        destX: 50,
        destY: 0,
        destWidth: 200,
        destHeight: 200,
      };
      const p = mapImagePointToCanvas({ x: 1000, y: 0 }, pillarboxed);
      // Right edge of a square image maps to destX + destWidth.
      expect(p.x).toBeCloseTo(250, 5);
      expect(p.y).toBeCloseTo(0, 5);
    });

    it('scales a direction vector by the same per-axis factors as points (no offset)', () => {
      const dir = mapDirectionToCanvas({ dx: 100, dy: 200 }, fit);
      expect(dir.dx).toBeCloseTo(30, 5); // 100 * (300/1000)
      expect(dir.dy).toBeCloseTo(60, 5); // 200 * (600/2000)
    });
  });

  describe('AnimatedScene component smoke test', () => {
    it('server-renders without throwing given a real scene and empty/short paths', () => {
      const image: UploadedImage = {
        id: 'img-1',
        file: new File([''], 'test.png', { type: 'image/png' }),
        objectUrl: 'blob:http://localhost/1',
        name: 'test.png',
        width: 400,
        height: 400,
      };
      const scene: Scene = {
        id: 'scene-1',
        image,
        order: 0,
        durationMs: 4800,
        holdMs: 1900,
      };

      expect(() =>
        renderToString(React.createElement(AnimatedScene, { scene, paths: [] })),
      ).not.toThrow();
    });
  });
});
