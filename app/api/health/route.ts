import { NextResponse } from "next/server";
import packageJson from "../../../package.json";

/** Container healthcheck target (Dockerfile, docker-compose.yml). No auth,
 * no store access — just confirms the Next.js server is up and responding. */
export async function GET() {
  return NextResponse.json({ status: "ok", version: packageJson.version });
}
