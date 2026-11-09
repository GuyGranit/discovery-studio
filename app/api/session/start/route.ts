import { NextRequest, NextResponse } from "next/server";
import { startSession } from "@/lib/pass";

/**
 * Session-start control: the one place that checks a customer's pass
 * before a discovery session is allowed to begin (no pass / expired /
 * out of sessions / out of budget all stop here with a customer-facing
 * reason instead of starting a session).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const result = await startSession(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason, message: result.message }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: result.session.sessionId,
    pass: result.pass,
  });
}
