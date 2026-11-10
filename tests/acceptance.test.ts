import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { withTempDataDir } from "./test-utils";

beforeAll(() => {
  process.env.ADMIN_API_TOKEN = "test-admin-token";
});

function adminRequest(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", "Bearer test-admin-token");
  headers.set("content-type", "application/json");
  return new NextRequest(new Request(url, { ...init, headers }));
}

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/**
 * Walks the full acceptance test from the goal spec, end to end, through
 * the real route handlers (not the lib functions directly):
 *   1. create a test customer
 *   2. activate a pass via the Center card's API
 *   3. get the customer's one-time link from the activated pass
 *   4. start a session with that link
 *   5. run a conversation until the session ends
 *   6. verify cost recorded, budget decremented, pass still active
 *   7. run a second session for the same customer, verify cost accumulates
 */
describe("acceptance: pass model and controls", () => {
  it("issues a pass, runs two sessions through it, and tracks cost/budget/state correctly", async () => {
    await withTempDataDir(async () => {
      const passesRoute = await import("@/app/api/admin/passes/route");
      const customersRoute = await import("@/app/api/admin/customers/route");
      const startRoute = await import("@/app/api/session/start/route");
      const messageRoute = await import("@/app/api/session/message/route");
      const endRoute = await import("@/app/api/session/end/route");

      // 1 & 2: Guy's "payment received — activate pass" card issues the pass.
      const issueRes = await passesRoute.POST(
        adminRequest("http://localhost/api/admin/passes", {
          method: "POST",
          body: JSON.stringify({ name: "Acceptance Test Co", email: "payer@acceptance.test" }),
        }),
      );
      expect(issueRes.status).toBe(200);
      const issueBody = await issueRes.json();
      expect(issueBody.pass.state).toBe("issued");
      expect(issueBody.pass.sessionsRemaining).toBe(3);

      // 3: the customer's one-time link.
      const link: string = issueBody.link;
      expect(link).toMatch(/\/session\//);
      const token = link.split("/session/")[1];

      // 4: start a session with that link.
      const startRes1 = await startRoute.POST(jsonRequest("http://localhost/api/session/start", { token }));
      expect(startRes1.status).toBe(200);
      const startBody1 = await startRes1.json();
      expect(startBody1.ok).toBe(true);
      const sessionId1: string = startBody1.sessionId;

      // 5: run a conversation until the session ends.
      await messageRoute.POST(
        jsonRequest("http://localhost/api/session/message", {
          sessionId: sessionId1,
          text: "We're scoping a new customer portal and need help defining requirements.",
        }),
      );
      await messageRoute.POST(
        jsonRequest("http://localhost/api/session/message", {
          sessionId: sessionId1,
          text: "It should integrate with our existing billing system.",
        }),
      );
      const endRes1 = await endRoute.POST(jsonRequest("http://localhost/api/session/end", { sessionId: sessionId1 }));
      expect(endRes1.status).toBe(200);
      const endBody1 = await endRes1.json();

      // 6: cost recorded, token budget decremented, pass state still active.
      expect(endBody1.tokensUsed).toBeGreaterThan(0);
      expect(endBody1.costUsd).toBeGreaterThan(0);
      expect(endBody1.pass.tokenBudgetRemaining).toBeLessThan(endBody1.pass.tokenBudget);
      expect(endBody1.pass.sessionsRemaining).toBe(2);
      expect(endBody1.pass.state).toBe("active");

      // 7: a second session for the same customer works, and cost accumulates.
      const startRes2 = await startRoute.POST(jsonRequest("http://localhost/api/session/start", { token }));
      expect(startRes2.status).toBe(200);
      const startBody2 = await startRes2.json();
      expect(startBody2.ok).toBe(true);
      const sessionId2: string = startBody2.sessionId;
      expect(sessionId2).not.toBe(sessionId1);

      await messageRoute.POST(
        jsonRequest("http://localhost/api/session/message", {
          sessionId: sessionId2,
          text: "One more thing — we also need single sign-on support.",
        }),
      );
      const endRes2 = await endRoute.POST(jsonRequest("http://localhost/api/session/end", { sessionId: sessionId2 }));
      const endBody2 = await endRes2.json();

      expect(endBody2.pass.sessionsRemaining).toBe(1);
      expect(endBody2.pass.state).toBe("active");
      expect(endBody2.pass.costToDateUsd).toBeGreaterThan(endBody1.pass.costToDateUsd);
      expect(endBody2.pass.tokenBudgetRemaining).toBeLessThan(endBody1.pass.tokenBudgetRemaining);

      // Guy's console reflects the same numbers.
      const consoleRes = await customersRoute.GET(adminRequest("http://localhost/api/admin/customers"));
      const consoleBody = await consoleRes.json();
      const overview = consoleBody.customers.find(
        (c: { customer: { email?: string } }) => c.customer.email === "payer@acceptance.test",
      );
      expect(overview.passes[0].sessionsRemaining).toBe(1);
      expect(overview.passes[0].state).toBe("active");
      expect(overview.costToDateUsd).toBeCloseTo(endBody2.pass.costToDateUsd, 10);
    });
  });

  it("stops a session start and tells the customer when there is no active pass", async () => {
    await withTempDataDir(async () => {
      const startRoute = await import("@/app/api/session/start/route");
      const res = await startRoute.POST(jsonRequest("http://localhost/api/session/start", { token: "no-such-token" }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.reason).toBe("no_pass");
      expect(body.message).toMatch(/pass/i);
    });
  });

  it("rejects issuing a pass without the admin token", async () => {
    await withTempDataDir(async () => {
      const passesRoute = await import("@/app/api/admin/passes/route");
      const res = await passesRoute.POST(
        new NextRequest(
          new Request("http://localhost/api/admin/passes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Sneaky Co" }),
          }),
        ),
      );
      expect(res.status).toBe(401);
    });
  });
});
