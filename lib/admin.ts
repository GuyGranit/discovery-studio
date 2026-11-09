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
