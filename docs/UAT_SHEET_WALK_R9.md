# JOB-3629: final phone-size (390x844) re-walk before Guy's return -- 2026-11-22

This job's premise: this branch is based on `origin/main` at `86b1ae2`
(JOB-3609, `2026-11-22T18:00:56+02:00`), the tip of main at the time this
job started. `86b1ae2` is itself JOB-3609's own confirmation re-walk
commit -- no code changes, same as the no-op re-walks before it going back
to JOB-3368 -- so this is a fresh re-walk against unchanged code, the last
one before Guy looks at this himself.

## Premise checks against `~/ai1-context/uat-sheets/discovery-studio.md`

| Check | Result |
|---|---|
| Does `https://discover.granitcorp.com/` answer? | **No** -- `getent hosts discover.granitcorp.com` fails with "not found" (exit 2). Matches the sheet's own text ("does NOT answer yet: it has no DNS record") and every prior re-walk since JOB-3466. Not a regression; DNS creation is explicitly out of this builder lane (sheet's own "decision" section: "O does it through the API," gated on Guy saying "discover dns yes"). Not actioned here. |
| "Try it on your phone" step 1, "Nothing to open yet" | **True** -- confirmed above, no DNS record, nothing reachable at the public address. |
| AI1-Admin sign-in ("e-mail ... and the AI1-Admin password ... checked: AI1-Admin sign-in works") | **Still doesn't apply to this product** -- re-confirmed in `lib/admin.ts`: `/center` and `/api/admin/*` take a bearer token (`Authorization: Bearer $ADMIN_API_TOKEN`), there is no in-app AI1-Admin username/password anywhere in the code. This was already flagged for the sheet owner in `docs/UAT_SHEET_WALK.md` (JOB-3405) and remains unchanged on the sheet as of this walk; not re-actioned here since it's outside this repo and already on record. |

Because the public address doesn't exist, this walk ran the way every
re-walk since JOB-3525 has: built with `npm run build`, then served via
`node .next/standalone/server.js` (the actual artifact `Dockerfile`'s `CMD`
runs; `next.config.mjs` sets `output: "standalone"`), with `.next/static`
copied in to match the two `COPY` steps `Dockerfile` does between build and
`CMD`. Ran on loopback (`127.0.0.1:3481`) with a fresh `DATA_DIR` under this
job's scratch dir (so `02-center-empty.png` shows a genuinely empty
customers table) and a throwaway local `ADMIN_API_TOKEN` (never the
AI1-Admin password, which this app doesn't use).

## Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 86b1ae2
```

Failed the same way every walk since JOB-3466 has documented:

```
the runner wrote no results.json (exit 3): no admin token given
(ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password,
/api/admin/* takes a bearer token instead (lib/admin.ts)
```

No real DEV address to point it at (DNS still missing) and no admin token
provisioned in this shell for `o-uat-run`'s own flow, which expects an
AI1-Admin password this product doesn't have.

## "What is new" claims, re-checked

| Claim | Result |
|---|---|
| A deployable DEV build exists | **Pass** -- `npm run build` succeeds (Next.js 16.4.5, Turbopack, unchanged route list: `/`, `/_not-found`, `/api/admin/customers`, `/api/admin/passes`, `/api/health`, `/api/session/end`, `/api/session/message`, `/api/session/start`, `/center`, `/session/[token]`); `Dockerfile` and `docker-compose.yml` match `docs/DEPLOY-DEV.md`. |
| The pass terms no longer name an address that does not exist | **Pass** -- `docs/legal/discovery-pass-terms-en.md` / `-he.md` consistently reference `discover.granitcorp.com` (the real intended customer address); no placeholder/example addresses (the `[placeholder]` markers that do exist are for retention/contact policy text, not an address). |
| A UAT sheet and a self-walk were done | **Pass** -- `docs/UAT_SHEET.md` and ten prior phone-walk docs/commits (JOB-3359 through JOB-3609) all exist and are current. |

## The phone walk: 42/42 checks passed, 0 failures

Run via `tools/uat/phone_walk.py` against the loopback build -- Guy issues
a pass from `/center`, the customer opens the one-time `/session/<token>`
link, has a short interview, ends the session; every page checked for the
four phone failure kinds (error shown, horizontal scroll, text cut off,
tap targets under 44px).

| Step | Result |
|---|---|
| 0. Landing page opens at 390px | Pass |
| 1. `/center` opens empty, first use | Pass |
| 2. "Payment received -- activate pass" issues a pass, customer listed, no horizontal scroll from a long unbroken company name | Pass |
| 3. Customer opens `/session/<token>` | Pass |
| 4. Interview turns (two), spec coverage climbs | Pass |
| 5. "End session" shows tokens/cost/pass summary | Pass |

Raw results and screenshots:
`docs/uat/phone-walk-2026-11-22-JOB-3629/results.json` and the `.png`s
beside it. Also reviewed by eye: the landing page and empty `/center`
render cleanly; the customers table wraps the long company name
(`GranitCorpIndustrialAutomationSolutionsLtd`) inside its own column with
no page-level horizontal scroll at 390px; every input/button renders at a
comfortable tap height; the interview turns read cleanly with no cut-off
text and the spec coverage percentage visible without scrolling; the
session-ended summary (tokens used, cost, pass state) reads cleanly with
nothing cut off.

## No code fix made this job

Nothing blocked a step and no claim was untrue -- the code on this branch
is byte-identical to JOB-3609's end state (no commits landed between
`86b1ae2` and this job starting), and this walk confirms the app still
holds at 390x844 with zero regressions, same as every confirmation
re-walk since JOB-3368's.

## Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3609's
  end state.
- `npm run build`: succeeds, unchanged route list.
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-22-JOB-3629/results.json` and screenshots.

WALK: pass
