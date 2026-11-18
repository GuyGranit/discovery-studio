import { describe, expect, it } from "vitest";
import { withTempDataDir } from "./test-utils";

describe("pass model and controls", () => {
  it("issues a 3-session, 30-day pass with the configured token budget", async () => {
    await withTempDataDir(async () => {
      const { issuePass } = await import("@/lib/pass");
      const { customer, pass } = await issuePass("Acme Co", "buyer@acme.test");
      expect(customer.name).toBe("Acme Co");
      expect(pass.sessionsTotal).toBe(3);
      expect(pass.sessionsRemaining).toBe(3);
      expect(pass.tokenBudget).toBeGreaterThan(0);
      expect(pass.tokenBudgetRemaining).toBe(pass.tokenBudget);
      expect(pass.state).toBe("issued");

      const issuedAt = new Date(pass.issuedAt).getTime();
      const expiresAt = new Date(pass.expiresAt).getTime();
      expect(Math.round((expiresAt - issuedAt) / (24 * 60 * 60 * 1000))).toBe(30);
    });
  });

  it("blocks a session when there is no pass for the token", async () => {
    await withTempDataDir(async () => {
      const { checkPassForToken } = await import("@/lib/pass");
      const check = await checkPassForToken("not-a-real-token");
      expect(check.ok).toBe(false);
      expect(check.reason).toBe("no_pass");
    });
  });

  it("blocks a session once the pass's date validity has passed", async () => {
    await withTempDataDir(async () => {
      const { issuePass, checkPassForToken, effectiveState } = await import("@/lib/pass");
      const { pass } = await issuePass("Expired Co");
      const future = new Date(new Date(pass.expiresAt).getTime() + 1000);

      expect(effectiveState(pass, future)).toBe("expired");
      const check = await checkPassForToken(pass.token, future);
      expect(check.ok).toBe(false);
      expect(check.reason).toBe("expired");
    });
  });

  it("blocks a session once all 3 sessions are used, and marks the pass completed", async () => {
    await withTempDataDir(async () => {
      const { issuePass, startSession, recordMessage, endSession, checkPassForToken } = await import("@/lib/pass");
      const { pass } = await issuePass("Three Sessions Co");

      for (let i = 0; i < 3; i++) {
        const started = await startSession(pass.token);
        if (!started.ok) throw new Error("expected session to start");
        await recordMessage(started.session.sessionId, "we need a new CRM");
        await endSession(started.session.sessionId);
      }

      const check = await checkPassForToken(pass.token);
      expect(check.ok).toBe(false);
      expect(check.reason).toBe("completed");
      expect(check.pass?.sessionsRemaining).toBe(0);
    });
  });

  it("blocks a session once the token budget is exhausted", async () => {
    await withTempDataDir(async () => {
      process.env.PASS_TOKEN_BUDGET = "1";
      try {
        const { issuePass, startSession, recordMessage, endSession, checkPassForToken } = await import("@/lib/pass");
        const { pass } = await issuePass("Tiny Budget Co");

        const started = await startSession(pass.token);
        if (!started.ok) throw new Error("expected session to start");
        await recordMessage(started.session.sessionId, "a message long enough to use up the whole tiny budget");
        await endSession(started.session.sessionId);

        const check = await checkPassForToken(pass.token);
        expect(check.ok).toBe(false);
        expect(check.reason).toBe("budget_exhausted");
      } finally {
        delete process.env.PASS_TOKEN_BUDGET;
      }
    });
  });

  it("tracks cost and decrements budget at session end, and accumulates across sessions", async () => {
    await withTempDataDir(async () => {
      const { issuePass, startSession, recordMessage, endSession } = await import("@/lib/pass");
      const { pass: issued } = await issuePass("Accumulate Co");

      const first = await startSession(issued.token);
      if (!first.ok) throw new Error("expected session to start");
      await recordMessage(first.session.sessionId, "we need help scoping a new internal tool");
      const { session: endedFirst, pass: afterFirst } = await endSession(first.session.sessionId);

      expect(endedFirst.tokensUsedSoFar).toBeGreaterThan(0);
      expect(afterFirst.costToDateUsd).toBeGreaterThan(0);
      expect(afterFirst.tokenBudgetRemaining).toBeLessThan(afterFirst.tokenBudget);
      expect(afterFirst.sessionsRemaining).toBe(2);
      expect(afterFirst.state).toBe("active");

      const second = await startSession(issued.token);
      if (!second.ok) throw new Error("expected second session to start");
      await recordMessage(second.session.sessionId, "and also an integration with our billing system");
      const { pass: afterSecond } = await endSession(second.session.sessionId);

      expect(afterSecond.costToDateUsd).toBeGreaterThan(afterFirst.costToDateUsd);
      expect(afterSecond.tokenBudgetRemaining).toBeLessThan(afterFirst.tokenBudgetRemaining);
      expect(afterSecond.sessionsRemaining).toBe(1);
      expect(afterSecond.state).toBe("active");
    });
  });
});
