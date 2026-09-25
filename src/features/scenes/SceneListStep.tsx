import React from 'react';
import { useTranslation } from '../../i18n';
import type { Scene } from './types';
import { SceneCanvas } from './SceneCanvas';
import './scenes.css';

export interface SceneListStepProps {
  scenes: Scene[];
}

export const SceneListStep: React.FC<SceneListStepProps> = ({ scenes }) => {
  const { t } = useTranslation();

  const totalDurationSec = (scenes.reduce((acc, s) => acc + s.durationMs, 0) / 1000).toFixed(1);

  return (
    <section className="scene-list-feature" aria-labelledby="scene-list-heading">
      {/* Header */}
      <div className="scene-list-header">
        <h2 id="scene-list-heading" className="scene-list-title">
          {t('scenes.title')}
        </h2>
        <p className="scene-list-subtitle">{t('scenes.description')}</p>
      </div>

      {/* Summary status bar */}
      <div className="scene-list-summary-bar">
        <div className="scene-summary-counts">
          <span>{t('scenes.totalCount').replace('{count}', String(scenes.length))}</span>
          <span>•</span>
          <span>{t('scenes.totalDuration').replace('{duration}', `${totalDurationSec}s`)}</span>
        </div>
        <div className="scene-summary-aspect-tag">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <span>{t('scenes.aspectRatio')}: 9:16</span>
        </div>
      </div>

      {/* Grid of Scene Canvases */}
      {scenes.length === 0 ? (
        <div className="scene-list-empty">
          <p>{t('scenes.emptyNotice')}</p>
        </div>
      ) : (
        <div className="scene-grid" role="list">
          {scenes.map((scene) => {
            const durationSec = (scene.durationMs / 1000).toFixed(1);
            const holdSec = (scene.holdMs / 1000).toFixed(1);

            return (
              <div key={scene.id} className="scene-preview-card" role="listitem">
                {/* 9:16 Canvas Preview Box */}
                <div className="scene-preview-card-canvas-box">
                  <SceneCanvas scene={scene} targetAspectRatio={9 / 16} />
                </div>

                {/* Card Details */}
                <div className="scene-preview-card-body">
                  <div className="scene-preview-card-title-row">
                    <h3 className="scene-preview-card-name">
                      {t('scenes.sceneNumber').replace('{number}', String(scene.order + 1))}
                    </h3>
                    <span className="scene-preview-card-order-badge">#{scene.order + 1}</span>
                  </div>

                  <p className="scene-preview-card-filename" title={scene.image.name}>
                    {scene.image.name}
                  </p>

                  <div className="scene-preview-card-timings">
                    <div className="scene-timing-item">
                      <span className="scene-timing-label">{t('scenes.durationLabel')}:</span>
                      <span className="scene-timing-val">{durationSec}s</span>
                    </div>
                    <div className="scene-timing-item">
                      <span className="scene-timing-label">{t('scenes.holdLabel')}:</span>
                      <span className="scene-timing-val">{holdSec}s</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SceneListStep;
