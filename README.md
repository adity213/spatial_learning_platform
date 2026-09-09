# Spatial Learning Platform

A kid rebuilds a 3D shape from three flat views (front, right, top) using bricks from a tray, then checks their work. Built for ages 6-10, desktop only, no scoring or accounts, just the puzzle.

The app lives in [`brick-views/`](./brick-views). Everything else here is planning and reference material:

| File | What it is |
|---|---|
| [`brick-views/`](./brick-views) | The app. Vite + React + TypeScript + react-three-fiber + zustand. |
| [`00-SHARED-SPEC.md`](./00-SHARED-SPEC.md) | The spec. Binding: this is what the app is built against. |
| [`03-COLOR-AND-HINTS-PLAN.md`](./03-COLOR-AND-HINTS-PLAN.md) | Colour-aware grading, orthographic view renders, and a graded hint ladder. Phases 0 through 4 landed; Phase 5 (The AI Layer) is next. |
| [`04-HINT-LOGIC.md`](./04-HINT-LOGIC.md) | The hint ladder's rules — what shows at each attempt count. |
| [`implementation_plan.md`](./implementation_plan.md) | The Postgres-backed admin/analytics build: participant sessions, attempts, hint usage, and (later) an admin dashboard and puzzle builder. |
| [`TODO.md`](./TODO.md) | Loose ends raised mid-conversation, not yet scoped into a plan doc. |
| [`brick-views-v2.html`](./brick-views-v2.html) | An early single-file prototype, kept for reference only. Not part of the running app. |

This started as a two-agent build, one on the rules, one on the scene and UI, split by file ownership. That split is retired; `brick-views/` is maintained as one codebase (see `OWNERSHIP.md` and `HANDOFF.md` inside `brick-views/` for the current state and decision log).

## Run it

```
cd brick-views
npm install
npm run dev
```

## Test it

```
cd brick-views
npm test
```

Runs the Vitest suite, then replays every puzzle's solution through the placement rules to make sure the puzzle data is actually solvable (`scripts/validate-puzzles.ts`).

## Build it

```
cd brick-views
npm run build
```
