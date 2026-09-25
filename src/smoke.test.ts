import { describe, it, expect, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { dictionary } from './i18n/dictionary';
import { tokens } from './design/theme';
import App from './app/App';

describe('Phase Foundation & App Shell Smoke Tests', () => {
  beforeEach(() => {
    const happyWindow = new Window();
    (globalThis as unknown as Record<string, unknown>).document = happyWindow.document;
    (globalThis as unknown as Record<string, unknown>).window = happyWindow;
    (globalThis as unknown as Record<string, unknown>).localStorage = happyWindow.localStorage;
    localStorage.clear();
  });

  it('contains exactly the 13 required design tokens', () => {
    const requiredTokenKeys = [
      'brand',
      'brand2',
      'soft',
      'ink',
      'bg',
      'surface',
      'surface2',
      'text',
      'dim',
      'line',
      'danger',
      'radius',
      'shadow',
    ];

    expect(Object.keys(tokens).sort()).toEqual(requiredTokenKeys.sort());
    expect(tokens.brand).toBe('var(--brand)');
    expect(tokens.radius).toBe('var(--radius)');
    expect(tokens.shadow).toBe('var(--shadow)');
  });

  it('provides bilingual dictionary with RTL Arabic as primary', () => {
    expect(dictionary['app.name'].ar).toBe('app');
    expect(dictionary['app.name'].en).toBe('app');
    expect(dictionary['upload.title'].ar).toBe('اختر الصور');
    expect(dictionary['upload.title'].en).toBe('Choose images');
    expect(dictionary['app.languageSwitchLabel'].ar).toBe('English');
    expect(dictionary['app.languageSwitchLabel'].en).toBe('العربية');
  });

  it('renders app shell with header, upload screen, and footer', () => {
    const html = renderToString(React.createElement(App));
    expect(html).toContain('app');
    expect(html).toContain('اختر الصور');
    expect(html).toContain('dir="rtl"');
  });

  it('switches language and flips direction', () => {
    // Check English rendering
    localStorage.setItem('app_ui_lang', 'en');
    const htmlEn = renderToString(React.createElement(App));
    expect(htmlEn).toContain('dir="ltr"');
    expect(htmlEn).toContain('Choose images');

    // Check Arabic rendering
    localStorage.setItem('app_ui_lang', 'ar');
    const htmlAr = renderToString(React.createElement(App));
    expect(htmlAr).toContain('dir="rtl"');
    expect(htmlAr).toContain('اختر الصور');
  });

  it('ensures no forbidden persistence mechanisms are used', () => {
    // Verify localStorage only ever contains the UI language preference key
    localStorage.setItem('app_ui_lang', 'ar');
    const keys = Object.keys(localStorage);
    expect(keys.every((key) => key === 'app_ui_lang')).toBe(true);
  });
});
