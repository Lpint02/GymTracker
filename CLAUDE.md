# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working conventions

The UI, all user-facing copy, and the commit-facing discussion are **Italian**. Code, comments, and commit messages are English. Keep that split.

For anything beyond a small change, **plan first and get the plan reviewed** before writing code, then land the work in **separate, independently verifiable phases** rather than one large change. Each phase should leave the app working and be checked against the real thing — the browser, the real Supabase project — not just against a passing build. `plan mode` + the plan file is the normal route.

**Verify, don't assume.** A green build says nothing about whether a feature works, and `Success. No rows returned` in the Supabase SQL editor says nothing about what the client can actually do. Probe the real endpoint, drive the real UI, and check the failure paths (offline, expired token, rejected write), not only the happy one. Several real bugs in this codebase were found exactly this way and would have shipped otherwise.

If something was claimed and turns out to be wrong, say so plainly and correct the record.

## Commands

The repo root has passthrough scripts to the actual app in `gymtracker/`. Run these from the repo root or from `gymtracker/` directly:

```bash
npm run dev       # start Vite dev server
npm run dev:host  # serve on the LAN, for testing on a phone
npm run build     # production build (outputs to gymtracker/dist)
npm run preview   # preview the production build
```

Defined in `gymtracker/` only:

```bash
npm --prefix gymtracker run lint       # ESLint, covers .js/.jsx AND .ts/.tsx
npm --prefix gymtracker run typecheck  # tsc --noEmit
npm --prefix gymtracker run icons      # regenerate PWA PNGs from the SVG sources
```

There is no test suite. Lint and typecheck are both expected to be **clean** — keep them that way rather than adding rule downgrades.

## Environment

`gymtracker/.env` (gitignored, see `.env.example`) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Both are public by design and ship in the client bundle: the anon key authenticates a request as the `anon` Postgres role and nothing more, and with RLS enabled everywhere it can read zero rows on its own. The **`service_role` key must never** appear in the client or in any `VITE_*` variable — Vite statically inlines those into the built JavaScript, so it would be a published secret.

`VITE_SUPABASE_URL` is the **base** project URL, without a `/rest/v1/` suffix; `src/lib/supabase.ts` throws with an explanation if given the REST endpoint by mistake.

## Architecture

GymTracker is a single-page, offline-first workout tracker (Italian UI) built with React 19 + Vite, backed by Supabase, installable as a PWA.

**Vite never type-checks.** esbuild strips types at build time, so `build` will happily emit code with type errors. `tsconfig.json` is `noEmit`-only and exists purely to back `npm run typecheck`; run it yourself. It starts deliberately permissive (`strict: false`) because the codebase predates any checker — tighten incrementally.

### Storage: two mechanisms, on purpose

- **IndexedDB** (`src/lib/db.ts`, via `idb`) holds everything durable and syncable: completed sessions, favorites, routines, the sync outbox, and sync metadata. Chosen for **transactions** above all — see the sync section.
- **localStorage** holds exactly two things: the **active, in-progress session** (`useWorkoutSession`) and the Supabase auth session. The active workout is device-local, never synced, and rewritten on every keystroke, where a synchronous write that cannot be lost to a tab kill is a feature. The planned rest timer belongs on this same path.

Do not "unify" these. The split is deliberate: ephemeral hot-path state vs. durable synced data.

### State architecture

All app state flows through one context, composed from independent hooks. The context's API types are declared as `ReturnType<typeof useX>` — **the return shape of each hook *is* the public contract**, so changing one silently changes what every consumer destructures. Adding a field is safe; renaming or removing one is not.

- `src/context/AuthContext.tsx` — Supabase session. Sits **outside** the workout tree, because hydration needs a user id before it reads anything and the sync engine needs the token.
- `src/context/WorkoutContext.tsx` — `WorkoutProvider`, composed in `main.tsx` as `AuthProvider > AuthGate > ScopedWorkoutProvider > App`. Consumers use the exported hooks (`useSession`, `useHistory`, `useStats`, `useRoutinesList`, `useExerciseFavorites`, `useProgress`, `useStreak`, `usePRs`, `useSaveSession`).
- `ScopedWorkoutProvider` keys `WorkoutProvider` by user id. Changing the key remounts the subtree, so every hook re-initializes — that is the whole account-switch reset, with no teardown code.

Stateful hooks: `useWorkoutSession` (active workout, localStorage), `useWorkoutHistory` (completed workouts, IndexedDB), `useFavoritesList` (exercise names), `useRoutines` (workout name + ordered exercise names).

**Pure `useMemo` derivations over `history`**, with no side effects and no storage of their own: `useDashboardStats`, `useExerciseProgress`, `useWeeklyStreak`, `useExercisePRs`. Supabase stores only raw data; every derived value — PRs, streaks, progress, leaderboards — is computed here, on the client. Keep it that way.

These depend on `history` being **newest-first by date** (`src/lib/store/order.ts`), not by insertion order.

**Known issue, documented in place:** the context value object is not memoized, so any change re-renders every consumer. Wrapping it in `useMemo` would be decoration — the stateful hooks return fresh object literals each render, so the memo could never hit. Fixing it properly means memoizing each hook's return object first. This is also why **sync status must not go in the context**; `useSyncStatus` uses `useSyncExternalStore` instead.

### Sync

Local-first. Writes land in IndexedDB immediately; the network happens afterwards.

**The invariant everything rests on:** an outbox operation is written in the *same IndexedDB transaction* as the data it describes (`src/lib/store/sessionsStore.ts`, `favoritesStore.ts`, `routinesStore.ts`). They commit together or not at all, so there is never an unsynced workout with no operation, nor an operation for missing data, and nothing is ever awaiting enqueue when the tab dies. Delivery is at-least-once across crashes; the queue replays on boot.

Payloads are **full snapshots, never deltas**. Combined with upsert-by-primary-key, replaying converges on the same row — at-least-once becomes effectively-once with no server-side dedupe. This is why ids are client-generated UUIDs (`generateId`).

- `src/lib/sync/engine.ts` — the drainer. Triggers: end of workout, boot, `visibilitychange` (the primary mobile signal), `online`. `isFlushing` and the auth-refresh guard are module-scoped and **not optional** (StrictMode double-invokes; a call-scoped refresh guard loops forever).
- `src/lib/sync/errors.ts` — classification is what keeps the queue healthy: transient (backoff), auth (refresh once, no attempt burned), converged (server already agrees), permanent (park, never retry, **never drop**).
- `src/lib/sync/mappers.ts` — **the single place** `"" ↔ NULL` is translated, plus `assertValidSession`, which rejects malformed data before enqueue rather than after the network. Do not inline `=== ""` checks elsewhere.
- Pull (`hydrate.ts`) happens on fresh install, account switch, or explicit restore. **No polling loop** — with one device the server cannot diverge on its own.

### Supabase

Schema lives in `supabase/migrations/`, applied by hand through the SQL editor. Files are idempotent and safe to re-run.

Non-negotiables:
- **RLS enabled on every table**, verified with a query, not assumed — `enable` is a separate statement from writing policies, and a table with policies but no `enable` is world-readable with the public anon key.
- **Table-level GRANTs are separate from RLS** and checked first; `authenticated` gets exactly select/insert/update/delete, and `anon` gets nothing.
- `user_id` is `default auth.uid()` and pinned by policy. **The client never sends it.**
- Child tables verify the parent belongs to the caller: a foreign key proves existence, not ownership.
- RPCs are `SECURITY INVOKER` so RLS still applies.
- A workout and a routine are each pushed through **one transactional RPC**, never several PostgREST calls — a tab killed between calls would leave half a workout on the server.

### Names are free text

There is no enum of exercises. Names are grouped by `normalizeKey()` (trim + lowercase) and displayed via `displayLabel()` (trim, original casing), both in `src/lib/utils.ts`. The database enforces the same rule independently through generated `label_key`/`name_key` columns.

Group by the **key**, display the **label** — mixing them up is how a PR badge silently disappears. Use `findByName()` to look into a label-keyed map when you only have arbitrary casing.

Typos are prevented by **autocomplete, never autocorrection** (`ExerciseNameInput`): the user's own spelling is theirs to keep, and nothing is rewritten after the fact. Suggestions need no new data source — `useExerciseProgress` already derives the set of exercises actually performed.

### Component layout

- `components/auth/` — gate, login/signup, account menu, account-scoped provider.
- `components/shell/` — header, bottom nav, loading skeleton, sync badge, update prompt.
- `components/dashboard/` — home, history, stats tabs and their pieces.
- `components/session/` — the active workout screen.
- `components/shared/` — modals reachable from more than one screen.
- `components/ui/` — generic presentational primitives. **Note: currently unused** — screens use raw elements with inline Tailwind.

### PWA

`vite-plugin-pwa` with `registerType: 'prompt'` — updates are offered, never applied silently, because reloading someone mid-set is a bad trade. Supabase is deliberately **absent from `runtimeCaching`**: IndexedDB is the offline cache, and a stale PostgREST response could resurrect deleted workouts. `devOptions` is off; test the worker with `build` + `preview`.

Fonts are self-hosted via `@fontsource` — never reintroduce the Google Fonts `@import`, which made "offline-first" a lie and leaked the user's IP on every cold load.

Icons are generated from `public/icon.svg` / `public/icon-maskable.svg` by `npm run icons`; edit the SVG, not the PNGs.

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js` — v4 is CSS-first, configured through `index.css`). Dark theme with an orange/slate palette defined as `@theme` tokens.

## Known sharp edges

- **iOS**: an installed standalone PWA launching Google OAuth punts to the system browser, and the redirect back is unreliable. Email/password is the dependable path there.
- **Safari** can evict IndexedDB after ~a week of non-use on non-installed sites, which would lose unsynced workouts, not just a cache. Hence `navigator.storage.persist()` at boot, and hence shipping the manifest early.
- **`alert()` in `finalizeSession`** blocks the thread and is unusable in an installed PWA. Route new messaging through the UI instead; this one is still outstanding.
- Three transitive **dev-only** npm advisories (`postcss`, `nanoid`, `brace-expansion`) are pre-existing and build-time only.
