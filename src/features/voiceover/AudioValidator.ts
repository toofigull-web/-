import type { AudioValidationResult } from './types';

export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB — generous for a several-minute voiceover track.

export const ACCEPTED_AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'] as const;

/**
 * Validates a single voiceover File against accepted formats (MP3/WAV/M4A,
 * matching the product brief) and a size sanity limit. Pure function: does
 * not throw, returns a typed result the UI can render as a message.
 */
export function validateAudioFile(file: File): AudioValidationResult {
  const normalizedType = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase();

  const isAcceptedMime =
    (ACCEPTED_AUDIO_MIME_TYPES as readonly string[]).includes(normalizedType) ||
    (normalizedType === '' &&
      (fileNameLower.endsWith('.mp3') ||
        fileNameLower.endsWith('.wav') ||
        fileNameLower.endsWith('.m4a')));

  if (!isAcceptedMime) {
    return {
      valid: false,
      error: 'INVALID_TYPE',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'unknown',
      messageKey: 'voiceover.error.invalidType',
    };
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return {
      valid: false,
      error: 'EXCEEDS_SIZE',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      messageKey: 'voiceover.error.fileTooLarge',
    };
  }

  return { valid: true };
}

/**
 * Reads the REAL decoded duration of an audio file in milliseconds, via an
 * <audio> element's loadedmetadata event. Never fakes/estimates a duration
 * — this is what later phases (Audio-Scene Auto Sync) will build on, and a
 * wrong number there would silently desync the whole video.
 */
export function readAudioDurationMs(file: File, objectUrl?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (typeof Audio === 'undefined') {
      // Non-DOM test runner: no sensible fake duration to return here,
      // since (unlike image dimensions) a wrong duration would silently
      // corrupt sync math in a later phase. Reject instead of guessing.
      reject(new Error('Audio element unavailable in this environment.'));
      return;
    }

    const url = objectUrl || URL.createObjectURL(file);
    const audio = new Audio();

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (!objectUrl) {
        URL.revokeObjectURL(url);
      }
    };

    audio.addEventListener('loadedmetadata', () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      cleanup();
      resolve(durationMs);
    });

    audio.addEventListener('error', () => {
      cleanup();
      reject(new Error(`Failed to decode audio duration for ${file.name}`));
    });

    audio.src = url;
  });
}
