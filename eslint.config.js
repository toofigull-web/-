export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
  {
    files: ['*.js', '*.mjs', '*.cjs'],
    rules: {
      'no-unused-vars': 'warn',
      'no-debugger': 'error',
      'no-console': 'off',
    },
  },
];
