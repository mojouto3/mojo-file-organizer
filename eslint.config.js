'use strict';

// Basic ESLint setup for Mojo File Organizer.
// main.js / preload.js run in Node (Electron main process). The renderer
// (src/renderer/**) is a React + Vite app and isn't linted by this config
// yet.

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
];
