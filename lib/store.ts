import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SpecDoc } from "./spec";

export type PassState = "issued" | "active" | "expired" | "completed";

export interface Customer {
  customerId: string;
  name: string;
  email?: string;
  createdAt: string;
}

export interface SessionTurn {
  role: "customer" | "agent";
  text: string;
  tokens: number;
  at: string;
}

export interface Pass {
  passId: string;
  customerId: string;
  token: string;
  state: PassState;
  sessionsTotal: number;
  sessionsRemaining: number;
  tokenBudget: number;
  tokenBudgetRemaining: number;
  costToDateUsd: number;
  issuedAt: string;
  expiresAt: string;
  activatedAt?: string;
  updatedAt: string;
}

export interface SessionRecord {
  sessionId: string;
  passId: string;
  customerId: string;
  startedAt: string;
  endedAt?: string;
  turns: SessionTurn[];
  tokensUsedSoFar: number;
  costUsd?: number;
}

interface Db {
  customers: Record<string, Customer>;
  passes: Record<string, Pass>;
  sessions: Record<string, SessionRecord>;
  specs: Record<string, SpecDoc>;
}

function dataRoot(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), "data");
}

function dbPath(): string {
  return path.join(dataRoot(), "passes.json");
}

function emptyDb(): Db {
  return { customers: {}, passes: {}, sessions: {}, specs: {} };
}

async function readDb(): Promise<Db> {
  try {
    const raw = await readFile(dbPath(), "utf8");
    // Spread over emptyDb() so a data file written before a new top-level
    // collection existed (e.g. `specs`) doesn't crash lookups against it.
    return { ...emptyDb(), ...(JSON.parse(raw) as Partial<Db>) };
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(dbPath(), JSON.stringify(db, null, 2));
}

/** Runs fn against the current db and persists whatever it returns. Not safe
 * for concurrent writers (fine at this scale — a single Node process). */
async function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const db = await readDb();
  const result = fn(db);
  await writeDb(db);
  return result;
}

export async function putCustomer(customer: Customer): Promise<void> {
  await mutate((db) => {
    db.customers[customer.customerId] = customer;
  });
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const db = await readDb();
  return db.customers[customerId] ?? null;
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const db = await readDb();
  const normalized = email.trim().toLowerCase();
  return (
    Object.values(db.customers).find((c) => c.email?.toLowerCase() === normalized) ?? null
  );
}

export async function listCustomers(): Promise<Customer[]> {
  const db = await readDb();
  return Object.values(db.customers);
}

export async function putPass(pass: Pass): Promise<void> {
  await mutate((db) => {
    db.passes[pass.passId] = pass;
  });
}

export async function getPass(passId: string): Promise<Pass | null> {
  const db = await readDb();
  return db.passes[passId] ?? null;
}

export async function findPassByToken(token: string): Promise<Pass | null> {
  const db = await readDb();
  return Object.values(db.passes).find((p) => p.token === token) ?? null;
}

export async function listPassesForCustomer(customerId: string): Promise<Pass[]> {
  const db = await readDb();
  return Object.values(db.passes).filter((p) => p.customerId === customerId);
}

export async function listPasses(): Promise<Pass[]> {
  const db = await readDb();
  return Object.values(db.passes);
}

export async function putSession(session: SessionRecord): Promise<void> {
  await mutate((db) => {
    db.sessions[session.sessionId] = session;
  });
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  const db = await readDb();
  return db.sessions[sessionId] ?? null;
}

/** Atomically reads a pass, lets fn mutate it in place, and persists the result. */
export async function updatePass<T>(
  passId: string,
  fn: (pass: Pass) => T,
): Promise<{ pass: Pass; result: T }> {
  return mutate((db) => {
    const pass = db.passes[passId];
    if (!pass) throw new Error(`unknown pass ${passId}`);
    const result = fn(pass);
    pass.updatedAt = new Date().toISOString();
    return { pass, result };
  });
}

/** Atomically reads a session, lets fn mutate it in place, and persists the result. */
export async function updateSession<T>(
  sessionId: string,
  fn: (session: SessionRecord) => T,
): Promise<{ session: SessionRecord; result: T }> {
  return mutate((db) => {
    const session = db.sessions[sessionId];
    if (!session) throw new Error(`unknown session ${sessionId}`);
    const result = fn(session);
    return { session, result };
  });
}

/**
 * The discovery spec is keyed by customer, not by pass or session, so it
 * resumes across a customer's whole relationship: a second session on the
 * same pass, or a session on a brand-new top-up pass, continues the same
 * document instead of starting the interview over.
 */
export async function getSpec(customerId: string): Promise<SpecDoc | null> {
  const db = await readDb();
  return db.specs[customerId] ?? null;
}

export async function putSpec(spec: SpecDoc): Promise<void> {
  await mutate((db) => {
    db.specs[spec.customerId] = spec;
  });
}

/** Atomically reads (or creates) a customer's spec, lets fn mutate it in
 * place, and persists the result. */
export async function updateSpec<T>(
  customerId: string,
  makeInitial: () => SpecDoc,
  fn: (spec: SpecDoc) => T,
): Promise<{ spec: SpecDoc; result: T }> {
  return mutate((db) => {
    const spec = db.specs[customerId] ?? makeInitial();
    const result = fn(spec);
    db.specs[customerId] = spec;
    return { spec, result };
  });
}
