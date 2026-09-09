import { eq, sql } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { attempts, sessions } from "../src/db/schema.js";

async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { sessionId, boardState, isCorrect, attemptNumber, diagnoses } = await req.json();

    // Public endpoint — validate shape, not just presence, before it hits the DB.
    if (
      typeof sessionId !== "string" ||
      !Array.isArray(boardState) ||
      typeof isCorrect !== "boolean" ||
      !Number.isInteger(attemptNumber) ||
      attemptNumber < 0
    ) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    await db.insert(attempts).values({
      sessionId,
      boardState,
      isCorrect,
      attemptNumber,
      diagnoses: diagnoses ?? null,
    });

    if (isCorrect) {
      await db
        .update(sessions)
        .set({
          isSolved: true,
          completedAt: new Date(),
          totalTimeSeconds: sql`EXTRACT(EPOCH FROM (now() - ${sessions.startedAt}))::int`,
        })
        .where(eq(sessions.id, sessionId));
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Attempt Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export default { fetch: handler };
