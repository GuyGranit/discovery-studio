export interface MessageTurnResult {
  ok: boolean;
  reply?: string;
  coveragePercent?: number;
  error?: string;
}

/**
 * What components/SessionClient.tsx should do with a POST /api/session/message
 * response. Before JOB-3405's quality pass, the component only ever checked
 * `body.reply` -- a failed send (e.g. "session already ended", reachable if
 * the customer taps "End session" and "Send" close together on a slow
 * connection) left the customer's typed message on screen with no agent
 * reply and no error shown at all, not even an unclear one.
 */
export function interpretMessageResponse(body: {
  reply?: string;
  error?: string;
  coveragePercent?: number;
}): MessageTurnResult {
  if (body.error) {
    return { ok: false, error: body.error };
  }
  return { ok: true, reply: body.reply, coveragePercent: body.coveragePercent };
}
