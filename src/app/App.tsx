import React, { useState, useMemo } from 'react';
import { useTranslation, LanguageProvider } from '../i18n';
import { Button } from '../shared';
import { UploadStep } from '../features/upload';
import type { UploadedImage } from '../features/upload';
import { SceneListStep, toScenes } from '../features/scenes';

function ShellContent() {
  const { t, language, dir, toggleLanguage } = useTranslation();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // Seed scenes from Phase 2 uploaded images using pure toScenes function
  const scenes = useMemo(() => toScenes(uploadedImages), [uploadedImages]);

  return (
    <div className="app-shell" dir={dir}>
      {/* Header bar */}
      <header className="app-header">
        <div className="header-container">
          {/* Logo placeholder text "app" */}
          <div className="header-brand">
            <span className="header-logo">{t('app.name')}</span>
            <span className="header-version">v0.3.0</span>
          </div>

          {/* Language Switcher */}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleLanguage}
              aria-label={t('app.switchLanguage')}
            >
              <span>{t('app.languageSwitchLabel')}</span>
              <span className="lang-badge">{language === 'ar' ? 'EN' : 'عربي'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content area: UploadStep feeds into SceneListStep via onImagesChange */}
      <main className="app-main" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Step 1: Upload */}
        <UploadStep onImagesChange={setUploadedImages} />

        {/* Step 2 (Phase 3): Scene Canvas List */}
        {scenes.length > 0 && <SceneListStep scenes={scenes} />}
      </main>

      {/* Footer bar with placeholder non-functional links */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <strong>{t('app.name')}</strong> — {t('footer.copyright')}
          </div>

          <nav aria-label="Footer links" className="footer-links">
            <span className="footer-link">{t('footer.privacy')}</span>
            <span className="footer-link">{t('footer.terms')}</span>
            <span className="footer-link">{t('footer.documentation')}</span>
            <span className="footer-link">{t('footer.support')}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <ShellContent />
    </LanguageProvider>
  );
}

export default App;
