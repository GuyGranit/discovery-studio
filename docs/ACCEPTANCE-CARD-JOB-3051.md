# Discovery Studio — acceptance card for Guy (JOB-3051)

Intake INT-0062, goal 4: one acceptance card with the DEV address, how to
sign in, and the steps inside the card.

## Status: not actionable yet — there is no DEV address today

This card cannot hand Guy a URL to open, because none exists:

- `APP_HOSTNAME` (the DEV hostname `docker-compose.yml` would route to) is
  blank in `.env.example` and has never been set — see `.env.example` and
  `docs/DEPLOY-DEV.md`.
- JOB-3048 (15 Nov) found nothing deployed on KVM99 and no DNS record for
  `discover.granitcorp.com`.
- JOB-3072 (merged into `main` today, 17 Nov) added the `Dockerfile` /
  `docker-compose.yml` / `/api/health` the app needs to be deployed, but
  its scope stopped there by design: "the kvm99 container, the DEV
  hostname and Cloudflare Access are O's lane steps AFTER the merge, in a
  class C job to be filed with the merge card."
- That follow-up job has not been filed (checked the ledger around and
  after JOB-3072 — the analogous step for o-school was JOB-3071, done;
  there is no discovery-studio equivalent yet).
- JOB-3049 (17 Nov) hit the same wall walking the first-use path and
  recorded it in `docs/WALKTHROUGH-JOB-3049.md`.

**What's needed to finish this card:** file and run the kvm99
container / DEV hostname / Cloudflare Access job JOB-3072 deferred, then
fill in the real address below and re-check the sign-in steps against it
(not against loopback).

## The DEV address (to fill in once it exists)

```
https://<DEV hostname — set by the pending kvm99/DNS/Cloudflare Access job>
```

Do not substitute `discover.granitcorp.com` here — that is the *intended
customer* address and a separate, later decision (INT-0062 goal 5,
`JOB-3052`'s bring-up card); it is explicitly not to change before "discovery
uat passed."

## How to sign in (once the address exists)

There are two different doors — Guy never uses the customer one, and a
customer never uses Guy's:

### Guy, as operator — `/center`

- `/center` and `/api/admin/*` sit behind a Cloudflare Access application
  restricted to `guy@granitcorp.com` (`lib/admin.ts`). Guy signs in the
  way Cloudflare Access is configured to challenge him (that choice is
  part of the same deferred infra job) — there is no app-level
  username/password.
- Scripts and tests use the `ADMIN_API_TOKEN` bearer token instead
  (`Authorization: Bearer <token>`); that is the belt-and-suspenders check
  behind Cloudflare Access, not something Guy types in a browser.

### A customer — `/session/<token>`

- There is no account, password, or PIN entry anywhere in the built UI.
  Guy creates the customer's pass from `/center` ("Payment received —
  activate pass"), which returns a one-time link
  (`/session/<the pass's token>`); sending that link to the customer *is*
  the entire sign-in step. Opening it starts their session immediately.
- **Discrepancy to resolve before this goes to a real prospect:** the
  draft pass terms Guy is being asked to read (NEED-0030) describe
  customer access as "a one-time PIN issued by GranitCorp (Cloudflare
  Access)." The code does not implement a PIN step or put `/session/*`
  behind Cloudflare Access — it is a bare secret link. Either the terms
  text or the implementation needs to change so the two agree.

## Steps inside the card (the first-use path, walked and timed in JOB-3049)

As operator:

1. Open `/center` — empty console on first use.
2. Fill in "Payment received — activate pass" with the customer's name
   (email optional) and submit. This creates the customer and issues a
   3-session, 30-day pass, and the page now shows it as `issued`.
3. Copy the pass's one-time link (`/session/<token>`) and send it to the
   customer.

As the customer (opening that link):

4. The page starts a session automatically — no further action to "log
   in." First session flips the pass from `issued` to `active`.
5. Type requirements in the text box and send; the agent replies in turn,
   and the "spec coverage" percentage climbs with each substantive answer.
   Text/chat only today — no Hebrew UI, language picker, or RTL layout
   exists yet, despite earlier reports (see "known gaps" below).
6. Click "End session" when done. This is the only way a session ends —
   nothing times it out automatically. Tokens used, cost, and the pass's
   remaining sessions/budget are shown back to the customer and recorded.

Back to Guy:

7. `/center` (or `GET /api/admin/customers`) now shows the updated pass
   state, sessions remaining, token budget remaining, and cost to date
   for that customer.
8. The same pass's link can be reused for up to 2 more sessions (3 total)
   until it is exhausted or the 30-day window expires.

## Known gaps — do not expect these to be there

Confirmed missing from `main` by JOB-3049's walk (not "broken," just never
actually merged, despite being reported done):

| Reported in | Claimed | Actual state |
|---|---|---|
| JOB-2719 | Hebrew/English language choice, RTL rendering | Nothing in `app/`, `lib/`, or `components/` — no language concept at all |
| JOB-2721 | Spec pack + internal card | All plausible routes 404 |
| JOB-2722 | Customer summary from transcript | Route 404 |

Pass/session/interview-turn mechanics themselves (the steps above) do
work end to end — that part needed no fix.

## What has to land before this card is really "done"

1. File and run the kvm99 container / DEV hostname / Cloudflare Access job
   that JOB-3072 deferred — the one missing piece for the address section
   above.
2. Re-dispatch (or re-verify against the repo) the work reported done in
   JOB-2719, JOB-2721, JOB-2722 — none of those commits exist in this
   remote (`JOB-3048`/`JOB-3049` both confirmed this independently).
3. Guy's read of NEED-0030 (pass terms + AI-use disclosure) — his last
   snooze on it was to Monday 16 Nov, which has passed, so it is due
   again — and a decision on the PIN-vs-bare-link discrepancy above.
4. Once 1–3 land, redo this walk against the real address with real
   screenshots (`o-seen`), not loopback, and fill in the address section.

## Evidence

- `npm test` — 21/21 passing on this branch (`o/JOB-3051-auto`, rebased
  onto `main` at `7b9ee6c`, which includes JOB-3072's Dockerfile/compose
  and JOB-3049's walkthrough).
- Cross-checked against `lib/admin.ts`, `lib/pass.ts`,
  `app/center/actions.ts`, `components/SessionClient.tsx`,
  `.env.example`, `docs/DEPLOY-DEV.md`, `docs/WALKTHROUGH-JOB-3049.md`,
  NEED-0030, and the ledger state of JOB-3048/3049/3050/3052/3072.
