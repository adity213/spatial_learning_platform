import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { attempts, hintUsages, puzzles, sessions } from "../../src/db/schema.js";
import { requireAdmin } from "./_auth.js";
import { validatePuzzle, validateColourRules } from "../../src/core/puzzle.js";
import type { Puzzle } from "../../src/core/types.js";

/** Runs the same two validators the puzzle set is held to: placement legality
 *  (nothing floating, overlapping or out of bounds) and colour fairness
 *  (colour-blind safe, tray honest, no undeducible sealed colours).
 *
 *  Enforced here rather than only in the builder UI because this is the last
 *  point before a puzzle reaches a child — a saved puzzle that can't be solved
 *  would only be discovered mid-session. */
function geometryError(puzzle: Puzzle): string | null {
  try {
    validatePuzzle(puzzle);
    validateColourRules(puzzle);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Puzzle failed validation";
  }
}

function isValidBoard(board: unknown): board is Puzzle["board"] {
  if (typeof board !== "object" || board === null) return false;
  const { width, depth, height } = board as Record<string, unknown>;
  return [width, depth, height].every((v) => Number.isInteger(v) && (v as number) > 0 && (v as number) <= 12);
}

function isValidSolution(solution: unknown): solution is Puzzle["solution"] {
  return (
    Array.isArray(solution) &&
    solution.length > 0 &&
    solution.every(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        typeof p.instanceId === "string" &&
        typeof p.typeId === "string" &&
        [0, 90, 180, 270].includes(p.rotation) &&
        typeof p.origin === "object" &&
        p.origin !== null &&
        ["x", "y", "z"].every((axis) => Number.isInteger(p.origin[axis]))
    )
  );
}

interface PuzzleStatsRow {
  id: string;
  stateData: Puzzle;
  timeLimitSeconds: number | null;
  isActive: boolean;
  sortOrder: number;
  timesPlayed: number;
  distinctParticipants: number;
  timesSolved: number;
  totalAttempts: number;
  medianAttemptsToSolve: number | null;
  medianSolveSeconds: number | null;
}

/** One row per puzzle, aggregated by Postgres.
 *
 *  Medians rather than means, because one child who wanders off mid-puzzle
 *  would drag an average badly at class size. percentile_cont interpolates
 *  between the two middle values, matching what the previous JS median did.
 *
 *  The inner CTE collapses attempts to a count per session first; aggregating
 *  puzzles directly against attempts would fan out and count each session
 *  once per attempt. Only solved sessions feed the medians — an abandoned
 *  puzzle says nothing about how many tries solving it takes. */
async function listWithStats() {
  const result = await db.execute(sql`
    with session_attempts as (
      select
        s.id,
        s.puzzle_id,
        s.participant_id,
        s.is_solved,
        s.total_time_seconds,
        count(a.id) as attempt_count
      from sessions s
      left join attempts a on a.session_id = s.id
      group by s.id
    )
    select
      p.id,
      p.state_data                                     as "stateData",
      p.time_limit_seconds                             as "timeLimitSeconds",
      p.is_active                                      as "isActive",
      p.sort_order                                     as "sortOrder",
      count(sa.id)::int                                as "timesPlayed",
      count(distinct sa.participant_id)::int           as "distinctParticipants",
      (count(*) filter (where sa.is_solved))::int      as "timesSolved",
      coalesce(sum(sa.attempt_count), 0)::int          as "totalAttempts",
      round(
        percentile_cont(0.5) within group (order by sa.attempt_count)
          filter (where sa.is_solved)
      )::int                                           as "medianAttemptsToSolve",
      round(
        percentile_cont(0.5) within group (order by sa.total_time_seconds)
          filter (where sa.is_solved and sa.total_time_seconds is not null)
      )::int                                           as "medianSolveSeconds"
    from puzzles p
    left join session_attempts sa on sa.puzzle_id = p.id
    group by p.id, p.state_data, p.time_limit_seconds, p.is_active, p.sort_order
    order by p.sort_order asc
  `);

  const rows = (result.rows ?? []) as unknown as PuzzleStatsRow[];

  return rows.map((row) => {
    const state = row.stateData;
    return {
      id: row.id,
      name: state.name ?? row.id,
      hint: state.hint ?? "",
      monochrome: state.monochrome === true,
      bricks: state.solution?.length ?? 0,
      // Geometry is sent so the builder can open an existing puzzle without a
      // second round trip; it's small (a few dozen placements at most).
      board: state.board,
      solution: state.solution ?? [],
      timeLimitSeconds: row.timeLimitSeconds,
      isActive: row.isActive,
      sortOrder: row.sortOrder,

      timesPlayed: row.timesPlayed,
      distinctParticipants: row.distinctParticipants,
      timesSolved: row.timesSolved,
      totalAttempts: row.totalAttempts,
      medianAttemptsToSolve: row.medianAttemptsToSolve,
      medianSolveSeconds: row.medianSolveSeconds,
    };
  });
}

async function handler(req: Request) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  if (req.method === "GET") {
    return Response.json({ puzzles: await listWithStats() });
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    const { id, name, hint, monochrome, timeLimitSeconds, isActive, sortOrder, solution, board } = body;

    if (typeof id !== "string" || !id) {
      return Response.json({ error: "Missing puzzle id" }, { status: 400 });
    }
    if (timeLimitSeconds != null && (!Number.isInteger(timeLimitSeconds) || timeLimitSeconds <= 0)) {
      return Response.json({ error: "timeLimitSeconds must be a positive whole number" }, { status: 400 });
    }
    if (name != null && (typeof name !== "string" || !name.trim())) {
      return Response.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const [existing] = await db.select().from(puzzles).where(eq(puzzles.id, id));
    if (!existing) {
      return Response.json({ error: "Puzzle not found" }, { status: 404 });
    }

    if (solution !== undefined && !isValidSolution(solution)) {
      return Response.json({ error: "Solution must be a non-empty list of valid placements" }, { status: 400 });
    }
    if (board !== undefined && !isValidBoard(board)) {
      return Response.json({ error: "Board dimensions must be whole numbers from 1 to 12" }, { status: 400 });
    }

    // name/hint/monochrome live inside the stateData blob the game reads, so
    // they're merged into it rather than written as columns.
    const state = existing.stateData as Puzzle;
    const nextState: Puzzle = {
      ...state,
      ...(name != null ? { name: name.trim() } : {}),
      ...(hint != null ? { hint: String(hint) } : {}),
      ...(monochrome != null ? { monochrome: monochrome === true } : {}),
      ...(solution !== undefined ? { solution } : {}),
      ...(board !== undefined ? { board } : {}),
    };

    // Re-validated whenever geometry OR colour mode changes: the colour rules
    // depend on both, so flipping monochrome off can invalidate a layout that
    // was fine while it was grey.
    if (solution !== undefined || board !== undefined || monochrome != null) {
      const problem = geometryError(nextState);
      if (problem) return Response.json({ error: problem }, { status: 400 });
    }

    await db
      .update(puzzles)
      .set({
        stateData: nextState,
        ...(timeLimitSeconds !== undefined ? { timeLimitSeconds } : {}),
        ...(isActive != null ? { isActive: isActive === true } : {}),
        ...(Number.isInteger(sortOrder) ? { sortOrder } : {}),
      })
      .where(eq(puzzles.id, id));

    return Response.json({ success: true });
  }

  if (req.method === "POST") {
    const { id, name, hint, board, solution, monochrome, timeLimitSeconds } = await req.json();

    // The id is the primary key AND what sessions.puzzle_id references, so it
    // has to be URL/id-safe and stable — not derived from a display name that
    // someone will later rename.
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) {
      return Response.json(
        { error: "Id must be lowercase letters, numbers and hyphens (e.g. easy-05)" },
        { status: 400 }
      );
    }
    if (typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isValidBoard(board)) {
      return Response.json({ error: "Board dimensions must be whole numbers from 1 to 12" }, { status: 400 });
    }
    if (!isValidSolution(solution)) {
      return Response.json({ error: "Place at least one brick before saving" }, { status: 400 });
    }

    const puzzle: Puzzle = {
      id,
      name: name.trim(),
      hint: typeof hint === "string" ? hint : "",
      board,
      solution,
      ...(monochrome === true ? { monochrome: true } : {}),
    };

    const problem = geometryError(puzzle);
    if (problem) return Response.json({ error: problem }, { status: 400 });

    const [existing] = await db.select({ id: puzzles.id }).from(puzzles).where(eq(puzzles.id, id));
    if (existing) {
      return Response.json({ error: `A puzzle with id "${id}" already exists` }, { status: 409 });
    }

    // New puzzles go to the end of the progression rather than silently
    // landing first with the default sortOrder of 0.
    const [last] = await db
      .select({ max: sql<number>`coalesce(max(${puzzles.sortOrder}), 0)` })
      .from(puzzles);

    await db.insert(puzzles).values({
      id,
      stateData: puzzle,
      timeLimitSeconds: Number.isInteger(timeLimitSeconds) && timeLimitSeconds > 0 ? timeLimitSeconds : null,
      isActive: true,
      sortOrder: (last?.max ?? 0) + 1,
    });

    return Response.json({ success: true, id });
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    // No ON DELETE CASCADE in the schema, and the neon-http driver doesn't
    // support multi-statement transactions — delete children first, in FK
    // order, so a puzzle with play history doesn't hit a foreign key error.
    const theirSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.puzzleId, id));
    const sessionIds = theirSessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      await db.delete(hintUsages).where(inArray(hintUsages.sessionId, sessionIds));
      await db.delete(attempts).where(inArray(attempts.sessionId, sessionIds));
      await db.delete(sessions).where(inArray(sessions.id, sessionIds));
    }

    const [deleted] = await db.delete(puzzles).where(eq(puzzles.id, id)).returning({ id: puzzles.id });
    if (!deleted) {
      return Response.json({ error: "Puzzle not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  }

  return new Response("Method not allowed", { status: 405 });
}

export default { fetch: handler };
