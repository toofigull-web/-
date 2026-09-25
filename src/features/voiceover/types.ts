export interface UploadedAudio {
  id: string;
  file: File;
  objectUrl: string;
  name: string;
  /** Real decoded duration in milliseconds — never faked. */
  durationMs: number;
}

export type AudioValidationErrorType = 'INVALID_TYPE' | 'EXCEEDS_SIZE';

export interface AudioValidationSuccess {
  valid: true;
}

export interface AudioValidationFailure {
  valid: false;
  error: AudioValidationErrorType;
  fileName: string;
  fileSize: number;
  fileType: string;
  messageKey: 'voiceover.error.invalidType' | 'voiceover.error.fileTooLarge';
}

export type AudioValidationResult = AudioValidationSuccess | AudioValidationFailure;
