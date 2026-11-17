// Operator + customer walkthrough of the first-use path, driven against a
// locally running production build (node .next/standalone/server.js), since
// no DEV address exists yet (see JOB-3048/JOB-3072: nothing deployed on
// kvm99, no DNS). Times each HTTP call to approximate "page times".
const base = "http://127.0.0.1:3418";
const adminToken = "walkthrough-admin-token";

const log = [];
async function timed(label, fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = Math.round((performance.now() - t0) * 10) / 10;
  log.push({ label, ms });
  console.log(`[${ms}ms] ${label}`);
  return result;
}

function adminHeaders() {
  return { authorization: `Bearer ${adminToken}`, "content-type": "application/json" };
}

async function run() {
  // 0. health
  await timed("GET /api/health", async () => {
    const r = await fetch(`${base}/api/health`);
    console.log("  health body:", await r.text(), "status:", r.status);
  });

  // 1. operator: landing page and /center (operator console)
  await timed("GET / (landing page)", async () => {
    const r = await fetch(`${base}/`);
    console.log("  status:", r.status);
  });
  await timed("GET /center (operator console, before any customer)", async () => {
    const r = await fetch(`${base}/center`);
    console.log("  status:", r.status);
  });

  // 2. operator: create customer + activate pass ("payment received")
  const issue = await timed("POST /api/admin/passes (create customer + activate pass)", async () => {
    const r = await fetch(`${base}/api/admin/passes`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ name: "O Walkthrough Customer", email: "o-walkthrough@example.test" }),
    });
    const body = await r.json();
    console.log("  status:", r.status, "pass.state:", body.pass?.state, "link:", body.link);
    return body;
  });
  const link = issue.link;
  const token = link.split("/session/")[1];

  await timed("GET /center (operator console, after activation)", async () => {
    const r = await fetch(`${base}/center`);
    console.log("  status:", r.status);
  });

  // 3. customer: open the one-time link (the page a customer actually lands on)
  await timed("GET /session/:token (customer landing)", async () => {
    const r = await fetch(`${base}/session/${token}`);
    console.log("  status:", r.status);
  });

  // 4. customer: start session (what SessionClient does on mount)
  const start = await timed("POST /api/session/start", async () => {
    const r = await fetch(`${base}/api/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await r.json();
    console.log("  status:", r.status, "ok:", body.ok, "sessionId:", body.sessionId);
    return body;
  });
  const sessionId = start.sessionId;

  // 5. customer: short interview IN ENGLISH
  const englishTurns = [
    "Our goal is to let customers book a repair appointment online instead of calling.",
    "The users are our front-desk staff and walk-in customers, about 10 staff and hundreds of customers a month.",
    "The customer picks a service, picks a time slot, and gets a confirmation SMS.",
  ];
  console.log("\n-- English interview --");
  for (const text of englishTurns) {
    await timed(`POST /api/session/message (en): "${text.slice(0, 30)}..."`, async () => {
      const r = await fetch(`${base}/api/session/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, text }),
      });
      const body = await r.json();
      console.log("  status:", r.status, "coverage:", body.coveragePercent, "reply:", body.reply?.slice(0, 80));
    });
  }

  await timed("POST /api/session/end (english session)", async () => {
    const r = await fetch(`${base}/api/session/end`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const body = await r.json();
    console.log("  status:", r.status, "tokensUsed:", body.tokensUsed, "costUsd:", body.costUsd, "pass.sessionsRemaining:", body.pass?.sessionsRemaining);
  });

  // 6. SECOND short interview IN HEBREW, same pass/customer (sessions remaining = 2)
  const start2 = await timed("POST /api/session/start (2nd session, same token)", async () => {
    const r = await fetch(`${base}/api/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await r.json();
    console.log("  status:", r.status, "ok:", body.ok, "sessionId:", body.sessionId);
    return body;
  });
  const sessionId2 = start2.sessionId;

  const hebrewTurns = [
    "המטרה שלנו היא לאפשר ללקוחות לקבוע תור לתיקון דרך האינטרנט במקום להתקשר.",
    "המשתמשים הם אנשי הקבלה שלנו והלקוחות שמגיעים, בערך עשרה אנשי צוות ומאות לקוחות בחודש.",
  ];
  console.log("\n-- Hebrew interview --");
  for (const text of hebrewTurns) {
    await timed(`POST /api/session/message (he): "${text.slice(0, 20)}..."`, async () => {
      const r = await fetch(`${base}/api/session/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId2, text }),
      });
      const body = await r.json();
      console.log("  status:", r.status, "coverage:", body.coveragePercent, "reply:", body.reply);
    });
  }

  await timed("POST /api/session/end (hebrew session)", async () => {
    const r = await fetch(`${base}/api/session/end`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId2 }),
    });
    const body = await r.json();
    console.log("  status:", r.status, "pass.sessionsRemaining:", body.pass?.sessionsRemaining);
  });

  // 7. look for customer summary / spec pack / internal card endpoints
  console.log("\n-- Looking for customer summary / spec pack / internal card --");
  for (const path of [
    "/api/admin/specs",
    "/api/admin/spec-pack",
    "/api/admin/internal-card",
    "/api/admin/customer-summary",
    "/api/spec",
    "/api/spec-pack",
    "/api/internal-card",
  ]) {
    await timed(`GET ${path} (probe)`, async () => {
      const r = await fetch(`${base}${path}`, { headers: adminHeaders() });
      console.log("  status:", r.status);
    });
  }

  // 8. final /center read (Guy's own view of what happened)
  const overview = await timed("GET /api/admin/customers (operator overview)", async () => {
    const r = await fetch(`${base}/api/admin/customers`, { headers: adminHeaders() });
    return await r.json();
  });
  console.log("\nFinal overview:", JSON.stringify(overview, null, 2));

  console.log("\n-- Timing summary --");
  for (const { label, ms } of log) console.log(`${ms}ms\t${label}`);
}

run().catch((err) => {
  console.error("WALKTHROUGH FAILED:", err);
  process.exit(1);
});
