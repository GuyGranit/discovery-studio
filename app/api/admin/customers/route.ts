import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { customerOverviews } from "@/lib/pass";

/**
 * Feeds Guy's Center console: every customer with pass state, remaining
 * sessions/days/budget, and cost to date.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req.headers)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const overviews = await customerOverviews();
  return NextResponse.json({ customers: overviews });
}
