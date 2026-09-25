export interface UploadedImage {
  id: string;
  file: File;
  objectUrl: string;
  name: string;
  width: number;
  height: number;
}

export type FileValidationErrorType = 'INVALID_TYPE' | 'EXCEEDS_SIZE';

export interface FileValidationSuccess {
  valid: true;
}

export interface FileValidationFailure {
  valid: false;
  error: FileValidationErrorType;
  fileName: string;
  fileSize: number;
  fileType: string;
  messageKey: 'upload.error.invalidType' | 'upload.error.fileTooLarge';
}

export type FileValidationResult = FileValidationSuccess | FileValidationFailure;

export interface UploadRejectNotice {
  id: string;
  fileName: string;
  reason: string;
}
