'use strict';

// ESLint setup for Mojo File Organizer.
// main.js / preload.js run in Node (Electron main process).
// src/renderer/** is the React + Vite renderer, running in a browser context.

const reactHooks = require('eslint-plugin-react-hooks');

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
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  Image: 'readonly',
  MutationObserver: 'readonly',
  ResizeObserver: 'readonly',
  history: 'readonly',
  location: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  structuredClone: 'readonly',
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
    ignores: ['node_modules/**', 'dist/**', 'release/**'],
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
    files: ['src/renderer/**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    rules: {
      ...commonRules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
