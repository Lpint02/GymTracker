# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The repo root has passthrough scripts to the actual app in `gymtracker/`. Run these from the repo root or from `gymtracker/` directly:

```bash
npm run dev       # start Vite dev server
npm run build     # production build (outputs to gymtracker/dist)
npm run preview   # preview the production build
```

Lint and type-check (defined in `gymtracker/`, not at the root):

```bash
npm --prefix gymtracker run lint
npm --prefix gymtracker run typecheck
```

There is no test suite.

## Architecture

GymTracker is a single-page, client-only workout tracker (Italian-language UI) built with React 19 + Vite. There is no backend — all data lives in `localStorage`.

**Vite never type-checks.** esbuild strips types at build time, so `build` will happily emit code with type errors. Type checking is a separate, opt-in step: `tsconfig.json` is `noEmit`-only and exists purely to back `npm run typecheck`. Run it yourself — nothing runs it for you.

`tsconfig.json` starts deliberately permissive (`strict: false`) because the codebase predates any checker; tighten it incrementally rather than all at once. ESLint covers `.js/.jsx` **and** `.ts/.tsx` (via `typescript-eslint`), so `react-hooks` rules apply to the real source.

### State architecture

All app state flows through one context, composed from seven independent hooks. Note that the context's API types are declared as `ReturnType<typeof useX>` — **the return shape of each hook *is* the public contract**, so changing one silently changes what every consumer destructures.

The three core hooks:

- `src/context/WorkoutContext.tsx` — `WorkoutProvider` wraps the app (wired in `main.tsx`) and composes `useWorkoutSession`, `useWorkoutHistory`, and `useDashboardStats` into a single context value. It also owns `saveSession`, the bridge that finalizes the active session (via `sessionAPI.finalizeSession()`) and pushes it into history (via `historyAPI.addToHistory()`). Consumers use the exported hooks (`useSession`, `useHistory`, `useStats`, `useSaveSession`) rather than the raw context.
- `src/hooks/useWorkoutSession.ts` — the *active, in-progress* workout: starting/canceling a session, adding/removing exercises and sets, and `finalizeSession()` (validates there's at least one exercise with a valid set, cleans empty sets/names, stamps `completedAt`, and clears the active session). Persists to `localStorage` under `gym_tracker_active_session`.
- `src/hooks/useWorkoutHistory.ts` — completed workout history: add/delete, search/filter (`filteredHistory`), and selection state for viewing a past workout. Persists to `localStorage` under `gym_tracker_history`.
- `src/hooks/useDashboardStats.ts` — pure `useMemo` derivation (no side effects) over history: total workout count, last workout date, most popular muscle group.

Plus four **pure `useMemo` derivations** over `history` (no side effects, no storage of their own) — `useExerciseProgress`, `useWeeklyStreak`, `useExercisePRs`, and `useDashboardStats` — and `useFavoritesList`, a generic label-list hook instantiated twice (workout names, exercise names).

The derived hooks depend on `history` being **newest-first**, and on the shared name-key convention: entities are grouped by `name.trim().toLowerCase()` while the *displayed* label is the original casing. That convention is currently duplicated inline in several files rather than centralized in `utils.ts`.

`App.tsx` is a two-state router with no routing library: it renders `WorkoutSessionView` if `session` (from `useSession()`) is active, otherwise `AppShell` — which itself tab-routes between `HomeView` / `StoricoView` / `StatisticheView` with local state.

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
