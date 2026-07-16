'use strict';

// Basic ESLint setup for Mojo File Organizer.
// Two separate contexts get two separate global sets:
//   - main.js / preload.js run in Node (Electron main process)
//   - renderer.js / translations.js run in the browser, loaded via <script>
//     tags (no bundler), so they share one global scope and reference
//     each other's top-level functions/consts directly.

const nodeGlobals = {
  require: 'readonly',
  module: 'readonly',
  exports: 'writable',
  __dirname: 'readonly',
  __filename: 'readonly',
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  setImmediate: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  location: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  // Present so translations.js's `typeof module !== 'undefined'` guard
  // (dual Node/browser export) doesn't trip no-undef in the browser context
  module: 'readonly',
  // Third-party script loaded in index.html
  lucide: 'readonly',
  // Shared globals between renderer.js and translations.js (both loaded
  // as plain <script> tags, not modules)
  TRANSLATIONS: 'writable',
};

const commonRules = {
  'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
  'no-undef': 'error',
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-var': 'warn',
  eqeqeq: ['warn', 'smart'],
  'no-console': 'off',
};

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  {
    files: ['main.js', 'preload.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: commonRules,
  },
  {
    files: ['renderer.js', 'translations.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      ...commonRules,
      // Most top-level functions in renderer.js are called from onclick=
      // attributes in index.html, which ESLint has no visibility into, so
      // this rule would otherwise flag ~90 legitimate functions as unused.
      'no-unused-vars': 'off',
    },
  },
];
