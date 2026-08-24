import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // The app source is entirely .ts/.tsx and was previously unlinted — the block
  // above only matched .js/.jsx. react-hooks/exhaustive-deps in particular needs
  // to run here: the sync engine is built out of effects whose dependency arrays
  // and listener teardown actually matter.
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
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // WorkoutContext deliberately exports one provider component alongside its
  // nine consumer hooks — that co-location IS the architecture here, and
  // AuthContext will follow the same shape. The rule it trips is purely about
  // Vite fast-refresh granularity, not correctness, so scope it off rather than
  // splitting a context into two files to satisfy a DX heuristic.
  {
    files: ['src/context/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
