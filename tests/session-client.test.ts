import { describe, expect, it } from "vitest";
import { interpretMessageResponse } from "@/lib/session-client";

/**
 * JOB-3405 quality-pass finding: components/SessionClient.tsx used to only
 * check `body.reply` from POST /api/session/message, so a failed send (e.g.
 * "session already ended", reachable if "End session" and "Send" land close
 * together) silently dropped the customer's message with no error shown at
 * all. Fixed by routing every response through this pure function, which the
 * component now checks.
 */
describe("interpretMessageResponse (JOB-3405)", () => {
  it("surfaces a plain-word error instead of silently dropping the turn", () => {
    const result = interpretMessageResponse({ error: "session already ended" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("session already ended");
  });

  it("passes through the reply and coverage on success", () => {
    const result = interpretMessageResponse({ reply: "Got it.", coveragePercent: 30 });
    expect(result.ok).toBe(true);
    expect(result.reply).toBe("Got it.");
    expect(result.coveragePercent).toBe(30);
  });
});
