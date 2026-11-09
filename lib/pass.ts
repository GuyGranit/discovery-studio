import { randomBytes, randomUUID } from "node:crypto";
import { PASS_VALIDITY_DAYS, SESSIONS_PER_PASS, costPerTokenUsd, tokenBudgetPerPass } from "./pricing";
import {
  Customer,
  Pass,
  PassState,
  SessionRecord,
  findCustomerByEmail,
  findPassByToken,
  getCustomer,
  getPass,
  getSession,
  listCustomers,
  listPassesForCustomer,
  putCustomer,
  putPass,
  putSession,
  updatePass,
  updateSession,
} from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Finds the customer this card refers to (by email if given, else by name)
 * or creates one. Guy only ever supplies a name on the "payment received"
 * card, so repeat top-up passes for the same person should land on the
 * same customer record rather than creating duplicates.
 */
async function findOrCreateCustomer(name: string, email?: string): Promise<Customer> {
  if (email) {
    const existing = await findCustomerByEmail(email);
    if (existing) return existing;
  } else {
    const bySlug = (await listCustomers()).find((c) => slugify(c.name) === slugify(name));
    if (bySlug) return bySlug;
  }
  const customer: Customer = {
    customerId: `${slugify(name)}-${randomBytes(4).toString("hex")}`,
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  await putCustomer(customer);
  return customer;
}

/**
 * Issues one 3-session, 30-day pass to a customer. This is the only way a
 * pass gets created — triggered by Guy clicking "activate pass" on the
 * payment-received card in the Center, never self-serve.
 */
export async function issuePass(name: string, email?: string): Promise<{ customer: Customer; pass: Pass }> {
  const customer = await findOrCreateCustomer(name, email);
  const now = new Date();
  const budget = tokenBudgetPerPass();
  const pass: Pass = {
    passId: randomUUID(),
    customerId: customer.customerId,
    token: randomBytes(24).toString("base64url"),
    state: "issued",
    sessionsTotal: SESSIONS_PER_PASS,
    sessionsRemaining: SESSIONS_PER_PASS,
    tokenBudget: budget,
    tokenBudgetRemaining: budget,
    costToDateUsd: 0,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PASS_VALIDITY_DAYS * DAY_MS).toISOString(),
    updatedAt: now.toISOString(),
  };
  await putPass(pass);
  return { customer, pass };
}

/**
 * The pass's state, recomputed from its current numbers rather than trusted
 * from the last-persisted value, so a pass that quietly aged past its
 * expiry date (or had its last session consumed) is caught in the same
 * instant the session-start control reads it.
 *
 * "completed" (ran out of sessions) and "expired" (ran out of days) are
 * both dead ends for the customer, but shown differently to Guy and to the
 * customer, so they stay distinct states rather than one.
 */
export function effectiveState(pass: Pick<Pass, "sessionsRemaining" | "expiresAt" | "activatedAt">, now = new Date()): PassState {
  if (pass.sessionsRemaining <= 0) return "completed";
  if (now.getTime() >= new Date(pass.expiresAt).getTime()) return "expired";
  return pass.activatedAt ? "active" : "issued";
}

export function remainingDays(pass: Pick<Pass, "expiresAt">, now = new Date()): number {
  const ms = new Date(pass.expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

export type SessionBlockReason = "no_pass" | "expired" | "completed" | "budget_exhausted";

export interface SessionCheck {
  ok: boolean;
  reason?: SessionBlockReason;
  message?: string;
  customer?: Customer;
  pass?: Pass;
}

const BLOCK_MESSAGES: Record<SessionBlockReason, string> = {
  no_pass: "You don't have an active Discovery Pass yet. Please contact us to get one before starting a session.",
  expired: "Your Discovery Pass has expired. Please contact us if you'd like a new pass.",
  completed: "You've used all the sessions on this Discovery Pass. Please contact us if you'd like a new pass.",
  budget_exhausted: "Your Discovery Pass has run out of budget for this conversation. Please request a top-up.",
};

/** The gate every session start must pass through. */
export async function checkPassForToken(token: string, now = new Date()): Promise<SessionCheck> {
  const pass = await findPassByToken(token);
  if (!pass) {
    return { ok: false, reason: "no_pass", message: BLOCK_MESSAGES.no_pass };
  }
  const customer = await getCustomer(pass.customerId);
  const state = effectiveState(pass, now);
  if (state === "expired" || state === "completed") {
    return { ok: false, reason: state, message: BLOCK_MESSAGES[state], customer: customer ?? undefined, pass };
  }
  if (pass.tokenBudgetRemaining <= 0) {
    return { ok: false, reason: "budget_exhausted", message: BLOCK_MESSAGES.budget_exhausted, customer: customer ?? undefined, pass };
  }
  return { ok: true, customer: customer ?? undefined, pass };
}

/** Starts a new session against a pass, enforcing the gate above. */
export async function startSession(token: string): Promise<
  { ok: true; session: SessionRecord; customer: Customer; pass: Pass } | (SessionCheck & { ok: false })
> {
  const check = await checkPassForToken(token);
  if (!check.ok) return check as SessionCheck & { ok: false };

  const pass = check.pass!;
  const session: SessionRecord = {
    sessionId: randomUUID(),
    passId: pass.passId,
    customerId: pass.customerId,
    startedAt: new Date().toISOString(),
    turns: [],
    tokensUsedSoFar: 0,
  };
  await putSession(session);

  if (!pass.activatedAt) {
    await updatePass(pass.passId, (p) => {
      p.activatedAt = session.startedAt;
      p.state = effectiveState(p);
    });
  }

  return { ok: true, session, customer: check.customer!, pass };
}

/** Rough token estimate for the conversation stand-in (the real discovery
 * agent, and its real token accounting, is a separate piece of work). */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Appends one customer turn (plus a stand-in agent reply) to a session and
 * accumulates the running token count. The agent's actual reply generation
 * is out of scope here — this only needs to produce *some* token usage to
 * exercise the pass controls end-to-end.
 */
export async function recordMessage(sessionId: string, customerText: string): Promise<{ reply: string; tokensUsedSoFar: number }> {
  const reply = `Thanks — tell me more about "${customerText.slice(0, 60)}".`;
  const now = new Date().toISOString();
  const { session } = await updateSession(sessionId, (s) => {
    if (s.endedAt) throw new Error("session already ended");
    const customerTokens = estimateTokens(customerText);
    const agentTokens = estimateTokens(reply);
    s.turns.push({ role: "customer", text: customerText, tokens: customerTokens, at: now });
    s.turns.push({ role: "agent", text: reply, tokens: agentTokens, at: now });
    s.tokensUsedSoFar += customerTokens + agentTokens;
  });
  return { reply, tokensUsedSoFar: session.tokensUsedSoFar };
}

/**
 * Ends a session: the tokens it used become cost, debited against the
 * pass's token budget, and the pass's session count ticks down. This is
 * the only place a pass's budget and session count ever move.
 */
export async function endSession(sessionId: string): Promise<{ session: SessionRecord; pass: Pass }> {
  const existing = await getSession(sessionId);
  if (!existing) throw new Error(`unknown session ${sessionId}`);
  if (existing.endedAt) {
    const pass = await getPass(existing.passId);
    return { session: existing, pass: pass! };
  }

  const endedAt = new Date().toISOString();
  const tokensUsed = existing.tokensUsedSoFar;
  const costUsd = tokensUsed * costPerTokenUsd();

  const { session } = await updateSession(sessionId, (s) => {
    s.endedAt = endedAt;
    s.costUsd = costUsd;
  });

  const { pass } = await updatePass(session.passId, (p) => {
    p.tokenBudgetRemaining = Math.max(0, p.tokenBudgetRemaining - tokensUsed);
    p.costToDateUsd += costUsd;
    p.sessionsRemaining = Math.max(0, p.sessionsRemaining - 1);
    p.state = effectiveState(p);
  });

  return { session, pass };
}

export interface CustomerOverview {
  customer: Customer;
  passes: Array<Pass & { state: PassState; remainingDays: number }>;
  costToDateUsd: number;
}

/** Feeds Guy's Center console: every customer with their pass state,
 * remaining sessions/days/budget, and cost to date across all their passes. */
export async function customerOverviews(): Promise<CustomerOverview[]> {
  const customers = await listCustomers();
  const overviews: CustomerOverview[] = [];
  for (const customer of customers) {
    const passes = await listPassesForCustomer(customer.customerId);
    const withState = passes.map((p) => ({ ...p, state: effectiveState(p), remainingDays: remainingDays(p) }));
    overviews.push({
      customer,
      passes: withState,
      costToDateUsd: passes.reduce((sum, p) => sum + p.costToDateUsd, 0),
    });
  }
  return overviews;
}
