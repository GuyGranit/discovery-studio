import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  ai1AdminSessionToken,
  AI1_ADMIN_EMAIL,
  isAdmin,
  isAi1AdminSession,
  verifyAi1AdminLogin,
} from "@/lib/admin";

describe("lib/admin: AI1-Admin sign-in (decision 141)", () => {
  const prevSecret = process.env.AI1_ADMIN_PASSWORD;

  afterEach(() => {
    process.env.AI1_ADMIN_PASSWORD = prevSecret;
  });

  it("rejects any login when AI1_ADMIN_PASSWORD is unset — no accidental open door", () => {
    delete process.env.AI1_ADMIN_PASSWORD;
    expect(verifyAi1AdminLogin(AI1_ADMIN_EMAIL, "anything")).toBe(false);
    expect(ai1AdminSessionToken()).toBeNull();
    expect(isAi1AdminSession("anything")).toBe(false);
  });

  it("accepts ai1-admin@granitcorp.com with the shared password, rejects everything else", () => {
    process.env.AI1_ADMIN_PASSWORD = "the-shared-secret";
    expect(verifyAi1AdminLogin(AI1_ADMIN_EMAIL, "the-shared-secret")).toBe(true);
    // case/whitespace-insensitive on the e-mail, exact on the password
    expect(verifyAi1AdminLogin(" AI1-Admin@granitcorp.com ", "the-shared-secret")).toBe(true);
    expect(verifyAi1AdminLogin(AI1_ADMIN_EMAIL, "wrong")).toBe(false);
    expect(verifyAi1AdminLogin("guy@granitcorp.com", "the-shared-secret")).toBe(false);
  });

  it("issues a stable session token from the shared secret and validates it back", () => {
    process.env.AI1_ADMIN_PASSWORD = "the-shared-secret";
    const token = ai1AdminSessionToken();
    expect(token).toBeTruthy();
    expect(ai1AdminSessionToken()).toBe(token);
    expect(isAi1AdminSession(token ?? undefined)).toBe(true);
    expect(isAi1AdminSession("forged-value")).toBe(false);
    expect(isAi1AdminSession(undefined)).toBe(false);
  });

  it("a session token minted under one secret stops validating once the secret changes", () => {
    process.env.AI1_ADMIN_PASSWORD = "secret-a";
    const token = ai1AdminSessionToken();
    process.env.AI1_ADMIN_PASSWORD = "secret-b";
    expect(isAi1AdminSession(token ?? undefined)).toBe(false);
  });
});

describe("lib/admin: bearer-token gate for /api/admin/* (unchanged by JOB-3950)", () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "test-admin-token";
  });

  it("rejects missing/wrong tokens and accepts the right one", () => {
    const noAuth = new NextRequest(new Request("http://localhost/api/admin/customers"));
    expect(isAdmin(noAuth.headers)).toBe(false);

    const wrongAuth = new NextRequest(
      new Request("http://localhost/api/admin/customers", { headers: { authorization: "Bearer nope" } }),
    );
    expect(isAdmin(wrongAuth.headers)).toBe(false);

    const rightAuth = new NextRequest(
      new Request("http://localhost/api/admin/customers", {
        headers: { authorization: "Bearer test-admin-token" },
      }),
    );
    expect(isAdmin(rightAuth.headers)).toBe(true);
  });
});
