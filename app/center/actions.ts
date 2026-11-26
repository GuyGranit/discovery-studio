"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { issuePass } from "@/lib/pass";
import {
  ADMIN_SESSION_COOKIE,
  ai1AdminSessionToken,
  isAi1AdminSession,
  verifyAi1AdminLogin,
} from "@/lib/admin";

/**
 * AI1-Admin sign-in behind /center's login form (JOB-3950, decision 141):
 * ai1-admin@granitcorp.com plus the one shared password from
 * AI1_ADMIN_PASSWORD, never a password created for this product alone.
 * On success, sets the session cookie /center itself checks; on failure,
 * sends Guy back to the sign-in form with an error flag.
 */
export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const token = verifyAi1AdminLogin(email, password) ? ai1AdminSessionToken() : null;
  if (!token) {
    redirect("/center?error=1");
  }

  // No `secure` flag: TLS is always terminated upstream (Traefik/Cloudflare,
  // docs/DEPLOY-DEV.md) -- the app itself is only ever reached over plain
  // HTTP, same as how ADMIN_API_TOKEN's bearer header gets no extra
  // transport enforcement at this layer. Marking the cookie Secure would
  // make browsers silently refuse to store it on that plain-HTTP hop.
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/center");
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  redirect("/center");
}

/**
 * Server action behind the "activate pass" button on the payment-received
 * card. Treated like a public-facing endpoint per Next's own guidance —
 * checks the same AI1-Admin session /center itself requires, since a
 * Server Action is callable independently of which UI branch rendered it.
 */
export async function activatePass(formData: FormData) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAi1AdminSession(session)) return;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name) return;

  await issuePass(name, email || undefined);
  revalidatePath("/center");
}
