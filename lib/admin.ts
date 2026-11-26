import { createHmac, timingSafeEqual } from "crypto";

/**
 * Gates /api/admin/* and /center. In production these also sit behind
 * their own Cloudflare Access application restricted to Guy's email; this
 * bearer-token check is what makes them exercisable from scripts/tests.
 */
export function isAdmin(headers: Headers): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const auth = headers.get("authorization");
  return auth === `Bearer ${token}`;
}

/**
 * Decision 141 (org-wide, 2026-10-22): every app with a login accepts
 * ai1-admin@granitcorp.com as its one master admin, checked against a
 * single shared secret delivered into AI1_ADMIN_PASSWORD by Integrations
 * (other:ai1-admin, field api_key) via o-secret-push -- not a password
 * invented for this product alone. This is the human sign-in for
 * /center; the bearer token above stays the separate, scriptable path
 * for /api/admin/*.
 */
export const AI1_ADMIN_EMAIL = "ai1-admin@granitcorp.com";
export const ADMIN_SESSION_COOKIE = "discovery_studio_admin";

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Checks AI1-Admin's e-mail and the one shared password from AI1_ADMIN_PASSWORD. */
export function verifyAi1AdminLogin(email: string, password: string): boolean {
  const secret = process.env.AI1_ADMIN_PASSWORD;
  if (!secret) return false;
  if (email.trim().toLowerCase() !== AI1_ADMIN_EMAIL) return false;
  return constantTimeEqual(password, secret);
}

/**
 * The only value a valid /center session cookie may carry -- derived from
 * the shared secret itself, so a signed-in session needs no server-side
 * session store. Returns null (never a guessable constant) when the
 * secret isn't configured, so a session can't be forged by sending an
 * empty/absent cookie value.
 */
export function ai1AdminSessionToken(): string | null {
  const secret = process.env.AI1_ADMIN_PASSWORD;
  if (!secret) return null;
  return createHmac("sha256", secret).update(AI1_ADMIN_EMAIL).digest("hex");
}

export function isAi1AdminSession(cookieValue: string | undefined): boolean {
  const expected = ai1AdminSessionToken();
  if (!expected || !cookieValue) return false;
  return constantTimeEqual(cookieValue, expected);
}
