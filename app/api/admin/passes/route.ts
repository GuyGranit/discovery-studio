import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { issuePass } from "@/lib/pass";

/**
 * Backs the "activate pass" button on Guy's payment-received card: issues
 * one 3-session, 30-day pass to the named customer and hands back the
 * one-time link they'll use to start sessions.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : undefined;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { customer, pass } = await issuePass(name, email);
  const origin = req.nextUrl.origin;
  return NextResponse.json({
    customer,
    pass,
    link: `${origin}/session/${pass.token}`,
  });
}
