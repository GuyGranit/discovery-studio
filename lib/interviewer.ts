import { addAssumption, addPoint, coverageOf, Coverage, emptySpec, nextFocus } from "./spec";
import { ConversationTurn, TurnResult } from "./interviewer-types";
import { offlineTurn } from "./interviewer-offline";
import { llmTurn, resolveWorkerEngineKey } from "./interviewer-llm";
import { getSpec, updateSpec } from "./store";

export interface InterviewTurnOutcome {
  reply: string;
  coverage: Coverage;
  assumptionsRecorded: string[];
  refused: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Runs one interview turn for a customer and persists whatever it produced
 * into their (resumable, cross-session) spec. Uses the real worker-engine
 * model when configured; otherwise, or if that call fails for any reason,
 * falls back to the deterministic offline engine so a provider hiccup
 * never drops the customer mid-session — see lib/interviewer-llm.ts for
 * why the real engine is gated on its own dedicated key.
 */
export async function conductInterviewTurn(
  customerId: string,
  history: ConversationTurn[],
  customerText: string,
): Promise<InterviewTurnOutcome> {
  const spec = (await getSpec(customerId)) ?? emptySpec(customerId);

  let result: TurnResult;
  if (resolveWorkerEngineKey()) {
    try {
      result = await llmTurn(spec, history, customerText);
    } catch {
      result = offlineTurn(spec, customerText);
    }
  } else {
    result = offlineTurn(spec, customerText);
  }

  const { spec: updated } = await updateSpec(customerId, () => emptySpec(customerId), (s) => {
    for (const point of result.accepted) addPoint(s, point.section, point.text);
    for (const assumption of result.assumptions) addAssumption(s, assumption, nextFocus(s));
  });

  return {
    reply: result.reply,
    coverage: coverageOf(updated),
    assumptionsRecorded: result.assumptions,
    refused: result.refused,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
