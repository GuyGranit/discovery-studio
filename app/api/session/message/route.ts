import { NextRequest, NextResponse } from "next/server";
import { recordMessage } from "@/lib/pass";

/**
 * One turn of the discovery conversation. The real discovery agent is a
 * separate piece of work; this stand-in reply exists so a session's token
 * usage (and therefore its cost and budget debit) can be exercised
 * end-to-end.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!sessionId || !text) {
    return NextResponse.json({ error: "sessionId and text are required" }, { status: 400 });
  }

  try {
    const { reply, tokensUsedSoFar } = await recordMessage(sessionId, text);
    return NextResponse.json({ reply, tokensUsedSoFar });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
