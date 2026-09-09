import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { participants, sessions, attempts, hintUsages, puzzles } from "../../src/db/schema";
import { requireAdmin } from "./_auth";

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

async function handler(req: Request) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const [participant] = await db.select().from(participants).where(eq(participants.id, id));
  if (!participant) {
    return Response.json({ error: "Participant not found" }, { status: 404 });
  }

  const theirSessions = await db.select().from(sessions).where(eq(sessions.participantId, id));
  const sessionIds = theirSessions.map((s) => s.id);

  const [attemptRows, hintRows, puzzleRows] = await Promise.all([
    sessionIds.length ? db.select().from(attempts).where(inArray(attempts.sessionId, sessionIds)) : [],
    sessionIds.length ? db.select().from(hintUsages).where(inArray(hintUsages.sessionId, sessionIds)) : [],
    db.select().from(puzzles),
  ]);

  const puzzleNameById = new Map(
    puzzleRows.map((p) => [p.id, (p.stateData as { name?: string } | null)?.name ?? p.id])
  );
  const attemptsBySession = groupBy(attemptRows, (a) => a.sessionId);
  const hintsBySession = groupBy(hintRows, (h) => h.sessionId);

  const sessionsOut = theirSessions
    .map((s) => {
      const timeline = [
        ...(attemptsBySession.get(s.id) ?? []).map((a) => ({
          type: "attempt" as const,
          timestamp: a.timestamp,
          attemptNumber: a.attemptNumber,
          isCorrect: a.isCorrect,
          diagnoses: a.diagnoses,
        })),
        ...(hintsBySession.get(s.id) ?? []).map((h) => ({
          type: "hint" as const,
          timestamp: h.timestamp,
          attemptNumber: h.attemptNumber,
          aiResponse: h.aiResponse,
        })),
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        id: s.id,
        puzzleId: s.puzzleId,
        puzzleName: puzzleNameById.get(s.puzzleId) ?? s.puzzleId,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        totalTimeSeconds: s.totalTimeSeconds,
        isSolved: s.isSolved,
        timeline,
      };
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return Response.json({
    id: participant.id,
    name: participant.name,
    accessCode: participant.accessCode,
    sessions: sessionsOut,
  });
}

export default { fetch: handler };
