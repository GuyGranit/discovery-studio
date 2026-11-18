/**
 * Discovery Pass terms and pricing.
 *
 * The session/day caps are fixed by the product definition. The token
 * budget and per-token cost are read from env so Guy can tune them from
 * ops without a redeploy — the defaults below are placeholders pending the
 * real numbers from the Discovery Pass pricing sheet (must stay well under
 * the pass price).
 */

export const SESSIONS_PER_PASS = 3;
export const PASS_VALIDITY_DAYS = 30;

const DEFAULT_TOKEN_BUDGET = 500_000;
const DEFAULT_COST_PER_TOKEN_USD = 0.00002;

export function tokenBudgetPerPass(): number {
  const raw = Number(process.env.PASS_TOKEN_BUDGET);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TOKEN_BUDGET;
}

export function costPerTokenUsd(): number {
  const raw = Number(process.env.PASS_COST_PER_TOKEN_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COST_PER_TOKEN_USD;
}
