import { describe, it, expect, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { validateAudioFile, readAudioDurationMs, MAX_AUDIO_SIZE_BYTES } from './AudioValidator';
import { VoiceoverStep } from './VoiceoverStep';
import { LanguageProvider } from '../../i18n';

describe('Phase 8 Voiceover Upload Feature', () => {
  beforeEach(() => {
    const happyWindow = new Window();
    (globalThis as unknown as Record<string, unknown>).document = happyWindow.document;
    (globalThis as unknown as Record<string, unknown>).window = happyWindow;
    (globalThis as unknown as Record<string, unknown>).URL = happyWindow.URL;
  });

  describe('validateAudioFile', () => {
    it('accepts a valid MP3 file under the size limit', () => {
      const file = new File(['x'.repeat(1000)], 'voice.mp3', { type: 'audio/mpeg' });
      expect(validateAudioFile(file)).toEqual({ valid: true });
    });

    it('accepts a valid WAV file', () => {
      const file = new File(['x'.repeat(1000)], 'voice.wav', { type: 'audio/wav' });
      expect(validateAudioFile(file)).toEqual({ valid: true });
    });

    it('accepts a valid M4A file', () => {
      const file = new File(['x'.repeat(1000)], 'voice.m4a', { type: 'audio/x-m4a' });
      expect(validateAudioFile(file)).toEqual({ valid: true });
    });

    it('rejects an unsupported format with a typed INVALID_TYPE error', () => {
      const file = new File(['x'], 'voice.ogg', { type: 'audio/ogg' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('INVALID_TYPE');
        expect(result.messageKey).toBe('voiceover.error.invalidType');
      }
    });

    it('rejects a file exceeding the 50MB size limit with a typed EXCEEDS_SIZE error', () => {
      const file = new File(['x'], 'voice.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(file, 'size', { value: MAX_AUDIO_SIZE_BYTES + 1 });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('EXCEEDS_SIZE');
        expect(result.messageKey).toBe('voiceover.error.fileTooLarge');
      }
    });

    it('accepts a file exactly at the size limit', () => {
      const file = new File(['x'], 'voice.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(file, 'size', { value: MAX_AUDIO_SIZE_BYTES });
      expect(validateAudioFile(file)).toEqual({ valid: true });
    });
  });

  describe('readAudioDurationMs (mocked Audio element)', () => {
    it('resolves the real duration in milliseconds via loadedmetadata', async () => {
      class FakeAudio {
        duration = 15.9;
        private listeners: Record<string, (() => void)[]> = {};
        addEventListener(event: string, cb: () => void) {
          (this.listeners[event] ??= []).push(cb);
        }
        set src(_value: string) {
          // Simulate async metadata load completing on next tick.
          queueMicrotask(() => this.listeners['loadedmetadata']?.forEach((cb) => cb()));
        }
      }
      (globalThis as unknown as Record<string, unknown>).Audio = FakeAudio;

      const file = new File(['x'], 'voice.mp3', { type: 'audio/mpeg' });
      const durationMs = await readAudioDurationMs(file, 'blob:fake-url');
      expect(durationMs).toBeCloseTo(15900, 0);
    });

    it('rejects when the audio element fires an error event', async () => {
      class FakeAudio {
        private listeners: Record<string, (() => void)[]> = {};
        addEventListener(event: string, cb: () => void) {
          (this.listeners[event] ??= []).push(cb);
        }
        set src(_value: string) {
          queueMicrotask(() => this.listeners['error']?.forEach((cb) => cb()));
        }
      }
      (globalThis as unknown as Record<string, unknown>).Audio = FakeAudio;

      const file = new File(['x'], 'broken.mp3', { type: 'audio/mpeg' });
      await expect(readAudioDurationMs(file, 'blob:fake-url')).rejects.toThrow();
    });
  });

  describe('VoiceoverStep component smoke test', () => {
    it('server-renders without throwing with no audio selected', () => {
      expect(() =>
        renderToString(
          React.createElement(LanguageProvider, null, React.createElement(VoiceoverStep, {})),
        ),
      ).not.toThrow();
    });

    it('server-renders without throwing given an existing selected audio track', () => {
      const file = new File(['x'], 'voice.mp3', { type: 'audio/mpeg' });
      expect(() =>
        renderToString(
          React.createElement(
            LanguageProvider,
            null,
            React.createElement(VoiceoverStep, {
              initialAudio: {
                id: 'a1',
                file,
                objectUrl: 'blob:http://localhost/1',
                name: 'voice.mp3',
                durationMs: 15900,
              },
            }),
          ),
        ),
      ).not.toThrow();
    });
  });
});
