import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import { participants } from "../../src/db/schema";
import { requireAdmin } from "./_auth";

// Excludes visually ambiguous characters (0/O, 1/I/L) so a code is easy to
// read off a screen and type back in.
const ACCESS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateAccessCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ACCESS_CODE_ALPHABET[b % ACCESS_CODE_ALPHABET.length]).join("");
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

interface ParticipantStatsRow {
  id: string;
  name: string;
  accessCode: string;
  createdAt: string;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  totalTimeSeconds: number;
  hintsUsed: number;
  lastActiveAt: string | null;
}

/** One row per participant, aggregated by Postgres.
 *
 *  Deliberately NOT `select().from(sessions)` with grouping in JavaScript:
 *  that ships every session row ever recorded across the network on each
 *  dashboard load, which is invisible at a handful of rows and unusable after
 *  a few cohorts. Here the response size tracks the number of participants,
 *  not the amount of history behind them.
 *
 *  The two aggregates are separate subqueries rather than one join because
 *  joining sessions to hint_usages fans out — a session with three hints
 *  would be counted three times in puzzlesAttempted. */
async function listWithStats(): Promise<ParticipantStatsRow[]> {
  const result = await db.execute(sql`
    select
      p.id,
      p.name,
      p.access_code                              as "accessCode",
      p.created_at                               as "createdAt",
      coalesce(s.attempted, 0)::int              as "puzzlesAttempted",
      coalesce(s.solved, 0)::int                 as "puzzlesSolved",
      coalesce(s.total_time, 0)::int             as "totalTimeSeconds",
      coalesce(h.hints, 0)::int                  as "hintsUsed",
      s.last_active_at                           as "lastActiveAt"
    from participants p
    left join (
      select
        participant_id,
        count(*)                                          as attempted,
        count(*) filter (where is_solved)                  as solved,
        sum(total_time_seconds) filter (where is_solved)   as total_time,
        max(started_at)                                    as last_active_at
      from sessions
      group by participant_id
    ) s on s.participant_id = p.id
    left join (
      select ss.participant_id, count(*) as hints
      from hint_usages hu
      join sessions ss on ss.id = hu.session_id
      group by ss.participant_id
    ) h on h.participant_id = p.id
    order by p.created_at desc
  `);

  return (result.rows ?? []) as unknown as ParticipantStatsRow[];
}

async function handler(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  if (req.method === "GET") {
    return Response.json({ participants: await listWithStats() });
  }

  if (req.method === "POST") {
    const { name } = await req.json();
    if (typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const accessCode = generateAccessCode();
      try {
        const [created] = await db
          .insert(participants)
          .values({ name: name.trim(), accessCode })
          .returning();
        return Response.json(created);
      } catch (err) {
        if (isUniqueViolation(err)) continue; // access code collision — try another
        throw err;
      }
    }
    return Response.json({ error: "Could not generate a unique access code, try again" }, { status: 500 });
  }

  return new Response("Method not allowed", { status: 405 });
}

export default { fetch: handler };
