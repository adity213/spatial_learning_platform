import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "../src/db";
import { hintUsages } from "../src/db/schema";

const SYSTEM_PROMPT = `You are providing hints for a spatial learning puzzle game for 7-year-olds.
You will receive a JSON payload describing what the child got wrong.
Turn this into one short sentence following these rules exactly.

RULES:
- Short sentences. Aim at a seven-year-old reading alone.
- Say what happened and what to do. "The top view doesn't match yet." not "Oops! Not quite — keep trying!"
- No praise words: great, awesome, nice work, well done, perfect, amazing. Solving it is the reward; the app doesn't applaud.
- No exclamation marks. No emoji in instructions, labels, or feedback.
- One job per string. Hints under 12 words.
- Errors don't apologise and are never vague.

Examples:
Payload: {"outcome":"views-mismatch","viewsFailing":["top"],"diagnoses":[{"code":"region-mismatch","view":"top","region":"right side"}]}
Response: Check the right side of the top view.

Payload: {"outcome":"views-mismatch","viewsFailing":["front","right"],"diagnoses":[{"code":"height-wrong"}]}
Response: Your build is one layer too tall.

Payload: {"outcome":"views-mismatch","viewsFailing":["front"],"diagnoses":[{"code":"shape-right-colour-wrong"}]}
Response: The shape is right, but the colours aren't.`;

async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // sessionId/attemptNumber are for our own logging only — kept out of
    // the LLM prompt below.
    const { sessionId, attemptNumber, ...hintPayload } = await req.json();

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(hintPayload),
      maxOutputTokens: 50,
      temperature: 0.1,
    });

    const sentence = text.trim();

    // Validation
    const words = sentence.split(/\s+/).length;
    const hasExclamation = sentence.includes("!");
    const lowerSentence = sentence.toLowerCase();
    const praiseWords = ["great", "awesome", "nice work", "well done", "perfect", "amazing"];
    const hasPraise = praiseWords.some((w) => lowerSentence.includes(w));

    if (words > 12 || hasExclamation || hasPraise) {
      throw new Error("Validation failed");
    }

    if (typeof sessionId === "string" && Number.isInteger(attemptNumber)) {
      try {
        await db.insert(hintUsages).values({ sessionId, attemptNumber, aiResponse: sentence });
      } catch (logError) {
        // The child already has their hint — a logging failure must not
        // turn into a hint failure.
        console.error("Hint Usage Log Error:", logError);
      }
    }

    return Response.json({ sentence });
  } catch (error) {
    console.error("AI Hint Error:", error);
    return Response.json({ error: "Failed to generate hint" }, { status: 500 });
  }
}

export default { fetch: handler };
