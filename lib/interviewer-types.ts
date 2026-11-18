import { SpecSection } from "./spec";

/** What one interview turn produces, regardless of which engine (offline
 * rules or the real LLM) produced it — the merge into the persisted spec
 * (lib/interviewer.ts) only ever deals with this shape. */
export interface TurnResult {
  reply: string;
  accepted: Array<{ section: SpecSection; text: string }>;
  assumptions: string[];
  refused: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ConversationTurn {
  role: "customer" | "agent";
  text: string;
}
