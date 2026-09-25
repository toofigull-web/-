import { describe, it, expect, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  toScenes,
  computeContainFit,
  DEFAULT_SCENE_DURATION_MS,
  DEFAULT_SCENE_HOLD_MS,
} from './types';
import { SceneCanvas } from './SceneCanvas';
import { SceneListStep } from './SceneListStep';
import { LanguageProvider } from '../../i18n';
import type { UploadedImage } from '../upload/types';
import type { Scene } from './types';

describe('Phase 3 Scenes Feature Tests', () => {
  beforeEach(() => {
    const happyWindow = new Window();
    (globalThis as unknown as Record<string, unknown>).document = happyWindow.document;
    (globalThis as unknown as Record<string, unknown>).window = happyWindow;
  });

  describe('toScenes pure converter', () => {
    it('creates an ordered scene list with index-based order and sensible defaults', () => {
      const mockImages: UploadedImage[] = [
        {
          id: 'img-1',
          file: new File([''], 'img1.png', { type: 'image/png' }),
          objectUrl: 'blob:http://localhost/1',
          name: 'img1.png',
          width: 1920,
          height: 1080,
        },
        {
          id: 'img-2',
          file: new File([''], 'img2.jpg', { type: 'image/jpeg' }),
          objectUrl: 'blob:http://localhost/2',
          name: 'img2.jpg',
          width: 800,
          height: 1200,
        },
      ];

      const scenes = toScenes(mockImages);

      expect(scenes.length).toBe(2);
      const scene0 = scenes[0];
      const scene1 = scenes[1];
      expect(scene0).toBeDefined();
      expect(scene1).toBeDefined();

      if (scene0 && scene1) {
        expect(scene0.order).toBe(0);
        expect(scene0.durationMs).toBe(DEFAULT_SCENE_DURATION_MS);
        expect(scene0.holdMs).toBe(DEFAULT_SCENE_HOLD_MS);
        expect(scene0.image.name).toBe('img1.png');

        expect(scene1.order).toBe(1);
        expect(scene1.durationMs).toBe(DEFAULT_SCENE_DURATION_MS);
        expect(scene1.holdMs).toBe(DEFAULT_SCENE_HOLD_MS);
        expect(scene1.image.name).toBe('img2.jpg');
      }
    });

    it('returns empty array when given empty images', () => {
      expect(toScenes([])).toEqual([]);
    });
  });

  describe('computeContainFit aspect ratio letterboxing math', () => {
    it('correctly letterboxes wide image (16:9) into a vertical (9:16) canvas frame', () => {
      // Canvas is 360 x 640 (aspect 9/16 = 0.5625)
      // Image is 1920 x 1080 (aspect 16/9 = 1.777)
      // Since imageAspect > canvasAspect, fits to canvas width (360) and letterboxes top/bottom
      const fit = computeContainFit(1920, 1080, 360, 640);

      expect(fit.destWidth).toBe(360);
      // destHeight = 360 / (16/9) = 360 * 9 / 16 = 202.5
      expect(fit.destHeight).toBeCloseTo(202.5, 1);
      expect(fit.destX).toBe(0);
      // destY = (640 - 202.5) / 2 = 218.75 (centered)
      expect(fit.destY).toBeCloseTo(218.75, 1);
    });

    it('correctly pillarboxes tall image (9:20) into a vertical (9:16) canvas frame', () => {
      // Canvas is 360 x 640 (aspect 0.5625)
      // Image is 900 x 2000 (aspect 9/20 = 0.45)
      // Since imageAspect <= canvasAspect, fits to canvas height (640) and pillarboxes left/right
      const fit = computeContainFit(900, 2000, 360, 640);

      expect(fit.destHeight).toBe(640);
      // destWidth = 640 * (9/20) = 288
      expect(fit.destWidth).toBeCloseTo(288, 1);
      expect(fit.destY).toBe(0);
      // destX = (360 - 288) / 2 = 36 (centered)
      expect(fit.destX).toBeCloseTo(36, 1);
    });

    it('handles exact aspect ratio match with zero letterbox/pillarbox', () => {
      // Image is 1080 x 1920 (exact 9:16)
      const fit = computeContainFit(1080, 1920, 360, 640);

      expect(fit.destWidth).toBe(360);
      expect(fit.destHeight).toBe(640);
      expect(fit.destX).toBe(0);
      expect(fit.destY).toBe(0);
    });

    it('handles square image (1:1) into 9:16 canvas frame', () => {
      const fit = computeContainFit(1000, 1000, 360, 640);

      expect(fit.destWidth).toBe(360);
      expect(fit.destHeight).toBe(360);
      expect(fit.destX).toBe(0);
      expect(fit.destY).toBe((640 - 360) / 2); // 140
    });
  });

  describe('SceneCanvas & SceneListStep Rendering', () => {
    it('renders SceneCanvas element without throwing', () => {
      const mockScene: Scene = {
        id: 'scene-0',
        order: 0,
        durationMs: 4800,
        holdMs: 1900,
        image: {
          id: 'img-1',
          file: new File([''], 'test.png', { type: 'image/png' }),
          objectUrl: 'blob:http://localhost/test',
          name: 'test.png',
          width: 1920,
          height: 1080,
        },
      };

      const html = renderToString(React.createElement(SceneCanvas, { scene: mockScene }));
      expect(html).toContain('scene-canvas-container');
      expect(html).toContain('scene-canvas-element');
    });

    it('renders SceneListStep with scene cards and timings', () => {
      const mockScenes: Scene[] = [
        {
          id: 'scene-1',
          order: 0,
          durationMs: 4800,
          holdMs: 1900,
          image: {
            id: 'img-1',
            file: new File([''], 'first.png', { type: 'image/png' }),
            objectUrl: 'blob:http://localhost/first',
            name: 'first.png',
            width: 1920,
            height: 1080,
          },
        },
      ];

      const html = renderToString(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(SceneListStep, { scenes: mockScenes }),
        ),
      );

      expect(html).toContain('معاينة مشاهد الفيديو');
      expect(html).toContain('مشهد 1');
      expect(html).toContain('first.png');
      expect(html).toContain('4.8');
      expect(html).toContain('1.9');
      expect(html).toContain('9:16');
    });
  });
});
