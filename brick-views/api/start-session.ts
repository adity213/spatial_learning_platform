import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { participants, sessions } from "../src/db/schema";

// NOTE: this is a Web-standard handler (Request in, Response out), which is
// what `export default { fetch }` opts into on Vercel's Node runtime. Do not
// "fix" it into a Node-style (req, res) handler — there is no `res` here.
async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { accessCode, puzzleId } = await req.json();

    // Public endpoint — validate shape, not just presence, before it hits the DB.
    if (typeof accessCode !== "string" || typeof puzzleId !== "string" || !accessCode || !puzzleId) {
      return Response.json({ error: "Missing accessCode or puzzleId" }, { status: 400 });
    }

    const [participant] = await db
      .select()
      .from(participants)
      .where(eq(participants.accessCode, accessCode));

    if (!participant) {
      return Response.json({ error: "Invalid access code" }, { status: 401 });
    }

    const [session] = await db
      .insert(sessions)
      .values({ participantId: participant.id, puzzleId })
      .returning({ id: sessions.id });

    if (!session) {
      return Response.json({ error: "Could not start session" }, { status: 500 });
    }

    return Response.json({ sessionId: session.id, participantName: participant.name });
  } catch (error) {
    console.error("Session Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export default { fetch: handler };
