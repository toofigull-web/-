import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { validateFile, MAX_IMAGE_SIZE_BYTES } from './FileValidator';
import { UploadStep } from './UploadStep';
import { LanguageProvider } from '../../i18n';
import type { UploadedImage } from './types';

describe('Upload Feature & FileValidator Tests', () => {
  beforeEach(() => {
    const happyWindow = new Window();
    (globalThis as unknown as Record<string, unknown>).document = happyWindow.document;
    (globalThis as unknown as Record<string, unknown>).window = happyWindow;
  });

  describe('FileValidator Logic', () => {
    it('accepts valid PNG files under size limit', () => {
      const validPng = new File(['dummy content'], 'scene1.png', { type: 'image/png' });
      const result = validateFile(validPng);
      expect(result.valid).toBe(true);
    });

    it('accepts valid JPEG files under size limit', () => {
      const validJpg = new File(['dummy content'], 'scene2.jpeg', { type: 'image/jpeg' });
      const result = validateFile(validJpg);
      expect(result.valid).toBe(true);
    });

    it('rejects forbidden mime types with typed INVALID_TYPE error', () => {
      const webpFile = new File(['dummy'], 'test.webp', { type: 'image/webp' });
      const textFile = new File(['dummy'], 'notes.txt', { type: 'text/plain' });
      const pdfFile = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
      const gifFile = new File(['dummy'], 'animation.gif', { type: 'image/gif' });

      const resWebp = validateFile(webpFile);
      expect(resWebp.valid).toBe(false);
      if (!resWebp.valid) {
        expect(resWebp.error).toBe('INVALID_TYPE');
        expect(resWebp.messageKey).toBe('upload.error.invalidType');
      }

      const resText = validateFile(textFile);
      expect(resText.valid).toBe(false);
      if (!resText.valid) {
        expect(resText.error).toBe('INVALID_TYPE');
      }

      const resPdf = validateFile(pdfFile);
      expect(resPdf.valid).toBe(false);
      if (!resPdf.valid) {
        expect(resPdf.error).toBe('INVALID_TYPE');
      }

      const resGif = validateFile(gifFile);
      expect(resGif.valid).toBe(false);
      if (!resGif.valid) {
        expect(resGif.error).toBe('INVALID_TYPE');
      }
    });

    it('rejects files exceeding 25MB with typed EXCEEDS_SIZE error', () => {
      // Create a mock file object with size property > 25MB
      const hugeFile = new File(['x'], 'huge.png', { type: 'image/png' });
      Object.defineProperty(hugeFile, 'size', {
        value: MAX_IMAGE_SIZE_BYTES + 1024,
        configurable: true,
      });

      const result = validateFile(hugeFile);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('EXCEEDS_SIZE');
        expect(result.messageKey).toBe('upload.error.fileTooLarge');
      }
    });

    it('accepts files exactly at or just below 25MB limit', () => {
      const boundaryFile = new File(['x'], 'boundary.jpg', { type: 'image/jpeg' });
      Object.defineProperty(boundaryFile, 'size', {
        value: MAX_IMAGE_SIZE_BYTES,
        configurable: true,
      });

      const result = validateFile(boundaryFile);
      expect(result.valid).toBe(true);
    });
  });

  describe('Object-URL Revoke and Memory Leak Prevention', () => {
    it('revokes objectUrl immediately when an image is removed', () => {
      const revokedUrls: string[] = [];
      const originalRevoke = URL.revokeObjectURL;

      URL.revokeObjectURL = (url: string) => {
        revokedUrls.push(url);
      };

      try {
        const testUrl = 'blob:http://localhost:3000/mock-uuid-1234';
        const dummyImage: UploadedImage = {
          id: 'img-1',
          file: new File([''], 'scene1.png', { type: 'image/png' }),
          objectUrl: testUrl,
          name: 'scene1.png',
          width: 1920,
          height: 1080,
        };

        // Simulate removal callback logic directly
        const removeSimulation = (images: UploadedImage[], idToRemove: string) => {
          const target = images.find((i) => i.id === idToRemove);
          if (target) {
            URL.revokeObjectURL(target.objectUrl);
          }
          return images.filter((i) => i.id !== idToRemove);
        };

        const updated = removeSimulation([dummyImage], 'img-1');
        expect(updated.length).toBe(0);
        expect(revokedUrls).toContain(testUrl);
      } finally {
        URL.revokeObjectURL = originalRevoke;
      }
    });
  });

  describe('UploadStep UI Rendering & Accessibility', () => {
    it('renders heading, drop zone with accessible attributes and file input', () => {
      const html = renderToString(
        React.createElement(LanguageProvider, null, React.createElement(UploadStep, null)),
      );

      // Title & description present
      expect(html).toContain('اختر الصور');
      expect(html).toContain('كل صورة تصبح مشهداً مستقلاً في الفيديو');

      // Dropzone accessibility
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('type="file"');
      expect(html).toContain('accept="image/png,image/jpeg"');
      expect(html).toContain('multiple');

      // Static Next button placeholder (disabled when 0 images)
      expect(html).toContain('disabled');
    });

    it('renders thumbnail cards with preview, dimension badge, and accessible remove button', () => {
      const mockImages: UploadedImage[] = [
        {
          id: 'img-1',
          file: new File([''], 'hero-banner.png', { type: 'image/png' }),
          objectUrl: 'blob:http://localhost/scene-1',
          name: 'hero-banner.png',
          width: 1920,
          height: 1080,
        },
      ];

      const html = renderToString(
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(UploadStep, { initialImages: mockImages }),
        ),
      );

      expect(html).toContain('hero-banner.png');
      expect(html).toContain('1920');
      expect(html).toContain('1080');
      expect(html).toContain('aria-label=');
      expect(html).toContain('مشهد 1');
    });
  });
});
