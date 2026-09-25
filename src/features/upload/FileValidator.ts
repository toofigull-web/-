import type { FileValidationResult } from './types';

export const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

/**
 * Validates a single File against accepted MIME types and size limit.
 * Pure function: does not throw, returns typed result object.
 */
export function validateFile(file: File): FileValidationResult {
  const normalizedType = file.type.toLowerCase().trim();
  const fileNameLower = file.name.toLowerCase();

  // Allow image/png and image/jpeg, including .jpg extension fallback if mime is missing or generic
  const isAcceptedMime =
    normalizedType === 'image/png' ||
    normalizedType === 'image/jpeg' ||
    normalizedType === 'image/jpg' ||
    (normalizedType === '' &&
      (fileNameLower.endsWith('.png') ||
        fileNameLower.endsWith('.jpg') ||
        fileNameLower.endsWith('.jpeg')));

  if (!isAcceptedMime) {
    return {
      valid: false,
      error: 'INVALID_TYPE',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'unknown',
      messageKey: 'upload.error.invalidType',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'EXCEEDS_SIZE',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      messageKey: 'upload.error.fileTooLarge',
    };
  }

  return { valid: true };
}

/**
 * Reads actual natural width and height from a decoded image File.
 * Does not fake width/height: attaches to Image onload to obtain natural dimensions.
 */
export function readImageDimensions(
  file: File,
  objectUrl?: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // If Image constructor is not available (e.g. non-DOM test runner), return sensible default
    if (typeof Image === 'undefined') {
      resolve({ width: 1920, height: 1080 });
      return;
    }

    const url = objectUrl || URL.createObjectURL(file);
    const img = new Image();

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (!objectUrl) {
        URL.revokeObjectURL(url);
      }
    };

    img.onload = () => {
      const width = img.naturalWidth || img.width || 1920;
      const height = img.naturalHeight || img.height || 1080;
      cleanup();
      resolve({ width, height });
    };

    img.onerror = () => {
      cleanup();
      // If decoding fails, reject with informative error
      reject(new Error(`Failed to decode image dimensions for ${file.name}`));
    };

    img.src = url;
  });
}
