import { asc, eq } from "drizzle-orm";
import { db } from "../src/db";
import { puzzles } from "../src/db/schema";
import type { Puzzle } from "../src/core/types";

/** Public catalogue for the participant app. Active puzzles only, in
 *  progression order.
 *
 *  Cached at Vercel's edge rather than fetched per player: the catalogue
 *  changes only when a teacher edits it, but every child loads it. s-maxage
 *  keeps it warm at the edge node nearest the child (so no trip to the
 *  database's us-east-1 region), and stale-while-revalidate means an expiry
 *  never makes a child wait — they get the cached copy while it refreshes
 *  behind them. */
async function handler(req: Request) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rows = await db
      .select()
      .from(puzzles)
      .where(eq(puzzles.isActive, true))
      .orderBy(asc(puzzles.sortOrder));

    // timeLimitSeconds lives in its own column (it's edited from admin), the
    // rest of the puzzle lives in the stateData blob — merge them back into
    // the single Puzzle shape the game already understands.
    const catalogue: Puzzle[] = rows.map((row) => ({
      ...(row.stateData as Puzzle),
      // The row's primary key wins over any id inside the blob: it's what
      // sessions.puzzle_id references, so a divergence here would make every
      // session insert fail its foreign key.
      id: row.id,
      timeLimitSeconds: row.timeLimitSeconds ?? undefined,
    }));

    const cacheControl =
      process.env.NODE_ENV === "development"
        ? "no-cache"
        : "public, s-maxage=300, stale-while-revalidate=86400";

    return Response.json(
      { puzzles: catalogue },
      { headers: { "Cache-Control": cacheControl } }
    );
  } catch (error) {
    console.error("Puzzles Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export default { fetch: handler };
