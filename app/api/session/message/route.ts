import { NextRequest, NextResponse } from "next/server";
import { recordMessage } from "@/lib/pass";

/** One turn of the discovery conversation, run through the interviewer
 * agent (lib/interviewer.ts) and recorded against the session's token
 * usage so its cost and budget debit happen at session end as usual. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!sessionId || !text) {
    return NextResponse.json({ error: "sessionId and text are required" }, { status: 400 });
  }

  try {
    const { reply, tokensUsedSoFar, coveragePercent } = await recordMessage(sessionId, text);
    return NextResponse.json({ reply, tokensUsedSoFar, coveragePercent });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
