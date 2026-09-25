import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n';
import { Button } from '../../shared/Button';
import { validateAudioFile, readAudioDurationMs } from './AudioValidator';
import type { UploadedAudio } from './types';
import './voiceover.css';

export interface VoiceoverStepProps {
  initialAudio?: UploadedAudio | null;
  onAudioChange?: (audio: UploadedAudio | null) => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const VoiceoverStep: React.FC<VoiceoverStepProps> = ({
  initialAudio = null,
  onAudioChange,
}) => {
  const { t } = useTranslation();
  const [audio, setAudio] = useState<UploadedAudio | null>(initialAudio);
  const [rejection, setRejection] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElRef = useRef<HTMLAudioElement>(null);
  const audioRef = useRef<UploadedAudio | null>(audio);
  audioRef.current = audio;

  useEffect(() => {
    onAudioChange?.(audio);
  }, [audio, onAudioChange]);

  // Revoke the object URL on unmount or on replacement — never leak it.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          URL.revokeObjectURL(audioRef.current.objectUrl);
        } catch {
          // Already revoked; ignore.
        }
      }
    };
  }, []);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setRejection(null);

      const result = validateAudioFile(file);
      if (!result.valid) {
        setRejection(t(result.messageKey));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      try {
        const durationMs = await readAudioDurationMs(file, objectUrl);

        // Replacing an existing track: revoke its old objectUrl first.
        if (audioRef.current) {
          URL.revokeObjectURL(audioRef.current.objectUrl);
        }

        setAudio({
          id: `audio-${Date.now()}`,
          file,
          objectUrl,
          name: file.name,
          durationMs,
        });
        setIsPlaying(false);
      } catch {
        URL.revokeObjectURL(objectUrl);
        setRejection(t('voiceover.error.decodeFailed'));
      }
    },
    [t],
  );

  const handleRemove = useCallback(() => {
    if (audioRef.current) {
      URL.revokeObjectURL(audioRef.current.objectUrl);
    }
    setAudio(null);
    setIsPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const togglePlayback = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      void el.play();
    }
  }, [isPlaying]);

  return (
    <section className="voiceover-step" aria-label={t('voiceover.title')}>
      <h2 className="voiceover-heading">{t('voiceover.title')}</h2>
      <p className="voiceover-description">{t('voiceover.description')}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
        aria-label={t('voiceover.fileInputAria')}
      />

      {!audio && (
        <button
          type="button"
          className="voiceover-picker-button"
          onClick={openFilePicker}
        >
          {t('voiceover.chooseFile')}
        </button>
      )}

      {rejection && (
        <p className="voiceover-error" role="alert">
          {rejection}
        </p>
      )}

      {audio && (
        <div className="voiceover-track-card">
          <audio
            ref={audioElRef}
            src={audio.objectUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={togglePlayback}
            aria-label={isPlaying ? t('voiceover.pause') : t('voiceover.play')}
          >
            {isPlaying ? t('voiceover.pause') : t('voiceover.play')}
          </Button>
          <div className="voiceover-track-meta">
            <span className="voiceover-track-name" title={audio.name}>
              {audio.name}
            </span>
            <span className="voiceover-track-duration">
              {formatDuration(audio.durationMs)}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRemove}
            aria-label={t('voiceover.remove')}
          >
            ×
          </Button>
        </div>
      )}
    </section>
  );
};
