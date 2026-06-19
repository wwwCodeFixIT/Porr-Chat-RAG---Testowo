import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The app intentionally syncs local UI state from IndexedDB/localStorage and
      // restores editable fields after message changes. These patterns are safe here.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      // The confirm module exports provider + hooks by design.
      'react-refresh/only-export-components': 'off',
    },
  },
])
