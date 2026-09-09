# Brick Views

A child rebuilds a solid from three flat views — front, right, top — using bricks from a tray on a 3D baseplate, then checks their work.

The spec is binding: [`../00-SHARED-SPEC.md`](../00-SHARED-SPEC.md). This was originally split across two agents by file ownership; that split is retired and Claude Code owns the whole codebase now (see [`OWNERSHIP.md`](./OWNERSHIP.md)). [`HANDOFF.md`](./HANDOFF.md) is a running log of decisions and deferred work.

Participant sessions, attempts, and hint usage are logged to Postgres — see [`../implementation_plan.md`](../implementation_plan.md) for the schema and rollout phases. The game itself lives at `/`; a teacher-facing dashboard (add participants, see completion/attempt/hint stats, drill into one participant's timeline) lives at `/admin`, behind HTTP Basic Auth (`ADMIN_PASSWORD` in `.env.local`).

## Run

```
npm install
npm run dev
```

This runs the Vite dev server only — the game's UI, but every `/api/*` call (login, attempts, hints, admin) will 404, since Vite doesn't know the `api/` folder exists. Use it for pure frontend/scene/rules work.

To exercise anything that touches the backend, run the Vercel dev server instead — it serves the same Vite frontend plus the `api/` functions on one port:

```
npm run dev:vercel
```

First run will prompt to log in and link the project to Vercel (one-time; needs the Vercel account this project's Neon database is already connected to). It reads env vars from `.env.local`.

## Test

```
npm test
```

Runs the Vitest suite, then validates every puzzle under `src/data/puzzles/` by replaying its solution through the placement rules (`scripts/validate-puzzles.ts`). A red test blocks `main`.

## Build

```
npm run build
```
