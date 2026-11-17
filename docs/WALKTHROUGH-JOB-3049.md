# O walks Discovery Studio itself — JOB-3049 (Intake INT-0062, goal 2)

Goal: create a customer and a Discovery Pass, activate it, run a short
interview in Hebrew and one in English, get the customer summary, the spec
pack and the internal card; record page times; fix what fails — on DEV, as
operator and as customer.

## Why this was walked locally, not on a DEV address

There is still no DEV address to open in a browser:

- JOB-3048 (15 Nov) found nothing deployed on kvm99 and no DNS record for
  `discover.granitcorp.com`.
- JOB-3072 (merged into `main` today, commit `1d3769a`) added the
  `Dockerfile` / `docker-compose.yml` / `/api/health` this app needs to be
  deployed, but its own scope explicitly stopped there: "the kvm99
  container, the DEV hostname and Cloudflare Access are O's lane steps
  AFTER the merge, in a class C job to be filed with the merge card."
  No such follow-up job has been filed yet (checked the jobs filed around
  and after JOB-3072 in the ledger; o-school's analogous step was
  JOB-3071, done — there is no discovery-studio equivalent yet).
- As the sandboxed builder for this job there is no SSH/infra access to do
  that deployment here either, and no browser tool is available in this
  lane to click through a live site even if there were an address.

So this walk ran against the exact artifact the Dockerfile builds and
runs — `node .next/standalone/server.js` (the container's own `CMD`),
built from `main` including JOB-3072 — on loopback, driven by
`.walkthrough-logs/walk.mjs` (Node's built-in `fetch`, run via `node`, not
`curl`). Raw output: `.walkthrough-logs/walk-output.txt`.

## What was walked, and worked

Operator (Guy's `/center`) and customer (`/session/:token`) first-use path,
end to end, twice (one pass, two of its three sessions):

1. `GET /center` — operator console, empty.
2. `POST /api/admin/passes` (the "payment received — activate pass" card) —
   creates the customer and issues a 3-session/30-day pass, returns the
   customer's one-time link.
3. `GET /center` — new pass visible, state `issued`.
4. `GET /session/:token` — customer's landing page, 200.
5. `POST /api/session/start` — session created; pass flips `issued` →
   `active` on this first session.
6. **English interview**, 3 turns (goal → users → flow) via
   `POST /api/session/message` — coverage climbed 10% → 30%, each reply
   stayed on the spec template's next section in order.
7. `POST /api/session/end` — 157 tokens, $0.0031 recorded;
   `sessionsRemaining` 3 → 2.
8. Second session on the **same pass** (a top-up/continuation, not a new
   customer) — `POST /api/session/start` again.
9. **Hebrew interview**, 2 turns — accepted and recorded into the spec
   (coverage 30% → 50%); `POST /api/session/end` — `sessionsRemaining`
   2 → 1.
10. `GET /api/admin/customers` — operator overview correctly reflects
    final state (`active`, 1 session left, $0.00528 cost to date).

`npm run build` succeeds; the existing automated suite is 21/21
(`npm test`). Nothing in the pass/session/interview-turn mechanics failed
during the walk — **no code fix was needed in that path.**

## Page/response times (local loopback, offline interview engine, idle box)

| Step | Time |
|---|---|
| `GET /api/health` | 51–99 ms (first hit, cold) |
| `GET /` | 8–29 ms |
| `GET /center` | 13–68 ms (cold) / ~20 ms (warm) |
| `POST /api/admin/passes` | 9–19 ms |
| `GET /session/:token` | 8–16 ms |
| `POST /api/session/start` | 4–11 ms |
| `POST /api/session/message` | 7–14 ms per turn |
| `POST /api/session/end` | 5–10 ms |

These are loopback numbers with the deterministic offline interview engine
(no model call latency, no TLS, no Cloudflare Access, no network) — they
are a floor, not what a real DEV address would show.

## What could not be walked, and why — "fix what fails"

Three things the goal asks O to retrieve do not exist in `main` at all, so
there was nothing broken to fix — there is nothing built yet to run:

1. **No Hebrew/English language selection or RTL rendering.** Grepped the
   whole `app/`, `lib/`, `components/` tree for "language", "locale",
   "he", "rtl": nothing, in the UI, the offline engine
   (`lib/interviewer-offline.ts`), or the real engine's system prompt
   (`lib/interviewer-llm.ts`, English-only, no mention of Hebrew). The
   Hebrew turns above were accepted only because the offline engine has no
   language awareness at all — any non-vague text ≥15 chars that doesn't
   match an English-only regex is accepted as a spec point. There is no
   language picker, no Hebrew prompts, no RTL CSS anywhere. This
   contradicts JOB-2719's reported result ("Hebrew/English chosen at
   start... RTL rendering confirmed on phone viewports... 6/6 e2e passed").
2. **No customer summary, spec pack, or internal card.** Probed every
   plausible route — `/api/spec`, `/api/spec-pack`, `/api/internal-card`,
   `/api/admin/specs`, `/api/admin/spec-pack`, `/api/admin/internal-card`,
   `/api/admin/customer-summary` — all `404`. This is JOB-2721's reported
   scope (commit `e9f8d9e`, "39/39 tests pass") and JOB-2722's (commit
   `961fdb3`, "10/10 tests pass, English and Hebrew"); neither commit
   exists anywhere in the remote (`git cat-file -t` on both: "Not a valid
   object name" after `git fetch --prune`) — not unmerged, just gone.
   This is the same class of loss JOB-3048/`EXISTS_P258.md` already found
   for the spec pack specifically; this walk confirms it also took the
   language feature, and that between them they block two of the three
   customer-facing deliverables this goal asks O to retrieve (customer
   summary and spec pack; the internal card depends on the spec pack).
3. **No live DEV address** (see above) — so none of this could be shown to
   Guy on `discover.granitcorp.com` or any other hostname even for the
   parts that do work.

## Recommendation (not actioned here — out of this job's scope)

- Re-dispatch (or re-verify against the repo, the way JOB-3048 did) the
  work reported done in JOB-2719 (Hebrew/English + RTL), JOB-2721 (spec
  pack + internal card) and JOB-2722 (transcript → spec extraction) — none
  of their commits are reachable, or exist, anywhere in this remote.
- File the kvm99-container/DNS/Cloudflare-Access job that JOB-3072
  deferred to O's lane, the same way JOB-3071 did for o-school, so there
  is finally a DEV address to open.
- Only once both land is there a live DEV address and a product able to
  produce the customer summary / spec pack / internal card this goal asks
  O to retrieve — at which point this walk should be redone against the
  real address and real screenshots taken (per `o-seen`), not against
  loopback.
