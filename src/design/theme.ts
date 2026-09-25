/**
 * Design tokens mapping to CSS custom properties
 * Defined in tokens.css on :root
 */
export const tokens = {
  brand: 'var(--brand)',
  brand2: 'var(--brand2)',
  soft: 'var(--soft)',
  ink: 'var(--ink)',
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface2)',
  text: 'var(--text)',
  dim: 'var(--dim)',
  line: 'var(--line)',
  danger: 'var(--danger)',
  radius: 'var(--radius)',
  shadow: 'var(--shadow)',
} as const;

export type ThemeTokens = typeof tokens;
