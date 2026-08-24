# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The repo root has passthrough scripts to the actual app in `gymtracker/`. Run these from the repo root or from `gymtracker/` directly:

```bash
npm run dev       # start Vite dev server
npm run build     # production build (outputs to gymtracker/dist)
npm run preview   # preview the production build
```

Lint (must be run from `gymtracker/`, not defined at the root):

```bash
npm --prefix gymtracker run lint
```

There is no test suite and no `typecheck` script configured.

## Architecture

GymTracker is a single-page, client-only workout tracker (Italian-language UI) built with React 19 + Vite. There is no backend — all data lives in `localStorage`.

**No TypeScript compiler is installed.** Source files use `.ts`/`.tsx` extensions and TS syntax (interfaces, type annotations) purely for editor/authoring ergonomics — Vite's esbuild strips types at build time without type-checking. There is no `tsconfig.json`, and ESLint (`eslint.config.js`) only lints `.js`/`.jsx`, so type errors will not be caught by `lint` or `build`.

### State architecture

All app state flows through one context, composed from three independent hooks:

- `src/context/WorkoutContext.tsx` — `WorkoutProvider` wraps the app (wired in `main.tsx`) and composes `useWorkoutSession`, `useWorkoutHistory`, and `useDashboardStats` into a single context value. It also owns `saveSession`, the bridge that finalizes the active session (via `sessionAPI.finalizeSession()`) and pushes it into history (via `historyAPI.addToHistory()`). Consumers use the exported hooks (`useSession`, `useHistory`, `useStats`, `useSaveSession`) rather than the raw context.
- `src/hooks/useWorkoutSession.ts` — the *active, in-progress* workout: starting/canceling a session, adding/removing exercises and sets, and `finalizeSession()` (validates there's at least one exercise with a valid set, cleans empty sets/names, stamps `completedAt`, and clears the active session). Persists to `localStorage` under `gym_tracker_active_session`.
- `src/hooks/useWorkoutHistory.ts` — completed workout history: add/delete, search/filter (`filteredHistory`), and selection state for viewing a past workout. Persists to `localStorage` under `gym_tracker_history`.
- `src/hooks/useDashboardStats.ts` — pure `useMemo` derivation (no side effects) over history: total workout count, last workout date, most popular muscle group.

`App.tsx` is a two-state router with no routing library: it renders `WorkoutSessionView` if `session` (from `useSession()`) is active, otherwise `DashboardView`.

### Component layout

- `components/dashboard/` — dashboard/home screen: stats panel, history list, "start session" setup modal.
- `components/session/` — the active workout-in-progress screen: header/footer chrome, exercise cards, set rows.
- `components/shared/` — modals used from either screen (discard confirmation, past-workout detail view).
- `components/ui/` — generic presentational primitives (`Button`, `Card`, `Input`, `IconButton`) with variant/size class maps; not workout-domain-specific.

### Types & utils

- `src/types/index.ts` — the whole domain model: `WorkoutSet` (weight/reps, `""` when empty), `Exercise`, `WorkoutSession` (has `completedAt?` — undefined means it's the active/in-progress session, present means it's history).
- `src/lib/utils.ts` — `generateId()` (random short ID, used for all entity IDs), `getTodayISO()`, `formatDateItalian()` (has `"short"`/`"long"` formats used in different UI contexts — dashboard cards vs. session header/modal).

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js` — v4 is CSS-first, configured through `index.css`). UI primitives use a dark theme (`slate`/`blue` palette) with variant maps (e.g. `primary`/`secondary`/`danger`/`ghost`/`dashed` in `Button.tsx`).
