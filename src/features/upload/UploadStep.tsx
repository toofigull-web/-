import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n';
import { Button } from '../../shared/Button';
import { validateFile, readImageDimensions } from './FileValidator';
import type { UploadedImage, UploadRejectNotice } from './types';
import './upload.css';

export interface UploadStepProps {
  initialImages?: UploadedImage[];
  onImagesChange?: (images: UploadedImage[]) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ initialImages = [], onImagesChange }) => {
  const { t, language } = useTranslation();
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [rejections, setRejections] = useState<UploadRejectNotice[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const imagesRef = useRef<UploadedImage[]>(images);
  imagesRef.current = images;

  // Sync back to callback if provided
  useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  // Cleanup object URLs on unmount to prevent any memory leaks
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        try {
          URL.revokeObjectURL(img.objectUrl);
        } catch {
          // Ignore if already revoked
        }
      });
    };
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const newRejections: UploadRejectNotice[] = [];
      const newImages: UploadedImage[] = [];

      for (const file of files) {
        const validation = validateFile(file);

        if (!validation.valid) {
          const reasonMessage =
            validation.error === 'INVALID_TYPE'
              ? t('upload.error.invalidType').replace('{name}', file.name)
              : t('upload.error.fileTooLarge').replace('{name}', file.name);

          newRejections.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            fileName: file.name,
            reason: reasonMessage,
          });
          continue;
        }

        const objectUrl = URL.createObjectURL(file);

        try {
          const dimensions = await readImageDimensions(file, objectUrl);
          newImages.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            objectUrl,
            name: file.name,
            width: dimensions.width,
            height: dimensions.height,
          });
        } catch {
          URL.revokeObjectURL(objectUrl);
          newRejections.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            fileName: file.name,
            reason: t('upload.error.decodeFailed').replace('{name}', file.name),
          });
        }
      }

      if (newRejections.length > 0) {
        setRejections((prev) => [...prev, ...newRejections]);
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
      }
    },
    [t],
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
    // Reset input value so re-selecting same file triggers change
    event.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleKeyDownDropzone = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  };

  const removeImage = (idToRemove: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === idToRemove);
      if (target) {
        // Immediate revocation: do not leak object URLs
        URL.revokeObjectURL(target.objectUrl);
      }
      return prev.filter((img) => img.id !== idToRemove);
    });
  };

  const clearAllImages = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.objectUrl);
    });
    setImages([]);
  };

  const dismissRejection = (id: string) => {
    setRejections((prev) => prev.filter((item) => item.id !== id));
  };

  const dismissAllRejections = () => {
    setRejections([]);
  };

  // Pluralized counter text
  const getCounterText = (count: number) => {
    if (language === 'ar') {
      if (count === 0) return t('upload.counter.zero');
      if (count === 1) return t('upload.counter.one');
      if (count === 2) return t('upload.counter.two');
      if (count >= 3 && count <= 10)
        return t('upload.counter.few').replace('{count}', String(count));
      return t('upload.counter.many').replace('{count}', String(count));
    }
    if (count === 0) return t('upload.counter.zero');
    if (count === 1) return t('upload.counter.one');
    return t('upload.counter.few').replace('{count}', String(count));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-feature">
      {/* Screen Heading */}
      <div className="upload-header">
        <h1 className="upload-title">{t('upload.title')}</h1>
        <p className="upload-subtitle">{t('upload.description')}</p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Drag and Drop Zone */}
      <div
        className={`upload-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onClick={openFilePicker}
        onKeyDown={handleKeyDownDropzone}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={t('upload.dropzoneAria')}
      >
        <div className="dropzone-icon-box" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p className="dropzone-prompt-main">
          {isDragging ? t('upload.dropActive') : t('upload.clickToAdd')}
        </p>
        <p className="dropzone-prompt-sub">{t('upload.dropPrompt')}</p>
        <span className="dropzone-hint-badge">{t('upload.maxSizeNote')}</span>
      </div>

      {/* Inline Errors List */}
      {rejections.length > 0 && (
        <div className="upload-errors-container" role="alert" aria-live="polite">
          <div className="upload-errors-header">
            <span className="upload-errors-title">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {t('upload.error.title')} ({rejections.length})
            </span>
            <button
              type="button"
              className="upload-errors-dismiss-all"
              onClick={dismissAllRejections}
            >
              {t('upload.error.dismissAll')}
            </button>
          </div>

          <ul className="upload-error-list">
            {rejections.map((reject) => (
              <li key={reject.id} className="upload-error-item">
                <span className="upload-error-item-text">{reject.reason}</span>
                <button
                  type="button"
                  className="upload-error-dismiss-btn"
                  onClick={() => dismissRejection(reject.id)}
                  aria-label={`${t('upload.error.dismiss')}: ${reject.fileName}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selection Status Bar and Thumbnails Grid */}
      {images.length > 0 && (
        <>
          <div className="upload-status-bar">
            <div className="upload-counter">
              <span className="upload-counter-dot" aria-hidden="true" />
              <span>{getCounterText(images.length)}</span>
            </div>

            <div className="upload-actions">
              <Button variant="secondary" size="sm" onClick={openFilePicker}>
                {t('upload.addMore')}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllImages}>
                {t('upload.clearAll')}
              </Button>
            </div>
          </div>

          <div className="upload-grid" role="list">
            {images.map((image, index) => (
              <div key={image.id} className="scene-thumbnail-card" role="listitem">
                <div className="scene-card-preview-wrapper">
                  <img
                    src={image.objectUrl}
                    alt={image.name}
                    className="scene-card-img"
                    loading="lazy"
                  />
                  <span className="scene-card-badge">
                    {t('upload.sceneLabel').replace('{index}', String(index + 1))}
                  </span>
                  <button
                    type="button"
                    className="scene-card-remove-btn"
                    onClick={() => removeImage(image.id)}
                    aria-label={t('upload.removeImage').replace('{name}', image.name)}
                  >
                    &times;
                  </button>
                </div>

                <div className="scene-card-info">
                  <h3 className="scene-card-name" title={image.name}>
                    {image.name}
                  </h3>
                  <div className="scene-card-meta">
                    <span>
                      {image.width} &times; {image.height}
                    </span>
                    <span>{formatFileSize(image.file.size)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottom bar with static placeholder Next button */}
      <div className="upload-bottom-bar">
        <Button
          variant="primary"
          size="lg"
          disabled={images.length === 0}
          title={images.length === 0 ? t('upload.nextTooltip') : undefined}
          aria-disabled={images.length === 0}
        >
          {t('upload.next')}
        </Button>
      </div>
    </div>
  );
};

export default UploadStep;
