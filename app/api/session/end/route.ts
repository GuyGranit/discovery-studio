import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/pass";

/**
 * Session-end control: the tokens used in this session become cost,
 * debited against the pass's token budget, and the pass's remaining
 * session count ticks down.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const { session, pass } = await endSession(sessionId);
    return NextResponse.json({
      sessionId: session.sessionId,
      tokensUsed: session.tokensUsedSoFar,
      costUsd: session.costUsd,
      pass,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
