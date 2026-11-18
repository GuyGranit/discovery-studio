"use client";

import { useEffect, useState } from "react";

interface Turn {
  role: "customer" | "agent";
  text: string;
}

interface PassSummary {
  state: string;
  sessionsRemaining: number;
  tokenBudgetRemaining: number;
}

export function SessionClient({ token }: { token: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [ended, setEnded] = useState<{ tokensUsed: number; costUsd: number } | null>(null);
  const [pass, setPass] = useState<PassSummary | null>(null);
  const [coveragePercent, setCoveragePercent] = useState(0);

  useEffect(() => {
    fetch("/api/session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((body) => {
        if (!body.ok) {
          setBlocked(body.message ?? "This session can't start right now.");
          return;
        }
        setSessionId(body.sessionId);
        setPass(body.pass);
      });
  }, [token]);

  async function sendMessage() {
    if (!sessionId || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    setTurns((t) => [...t, { role: "customer", text }]);
    const res = await fetch("/api/session/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, text }),
    });
    const body = await res.json();
    if (body.reply) {
      setTurns((t) => [...t, { role: "agent", text: body.reply }]);
    }
    if (typeof body.coveragePercent === "number") {
      setCoveragePercent(body.coveragePercent);
    }
  }

  async function endSession() {
    if (!sessionId) return;
    const res = await fetch("/api/session/end", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const body = await res.json();
    setEnded({ tokensUsed: body.tokensUsed, costUsd: body.costUsd });
    setPass(body.pass);
  }

  if (blocked) {
    return <p>{blocked}</p>;
  }

  if (ended) {
    return (
      <div>
        <p>Session ended. Tokens used: {ended.tokensUsed}. Cost: ${ended.costUsd.toFixed(4)}.</p>
        <p>
          Pass state: {pass?.state}. Sessions remaining: {pass?.sessionsRemaining}. Token budget remaining:{" "}
          {pass?.tokenBudgetRemaining}.
        </p>
      </div>
    );
  }

  if (!sessionId) {
    return <p>Starting your session…</p>;
  }

  return (
    <div>
      <p>Spec coverage: {coveragePercent}%</p>
      <ul>
        {turns.map((turn, i) => (
          <li key={i}>
            <strong>{turn.role}:</strong> {turn.text}
          </li>
        ))}
      </ul>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button type="button" onClick={sendMessage}>
        Send
      </button>
      <button type="button" onClick={endSession}>
        End session
      </button>
    </div>
  );
}
