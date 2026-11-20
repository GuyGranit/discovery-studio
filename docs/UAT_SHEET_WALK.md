# UAT sheet walk — JOB-3405 (2026-11-20)

Walked `~/ai1-context/uat-sheets/discovery-studio.md` as instructed: premise
checks first (address answers, AI1-Admin sign-in works), then its one
numbered step, then every "What is new" claim, then a quality pass on
everything that exists. DEV only, no new features.

## 0. Premise checks

| Check | Result |
|---|---|
| Does `https://discover.granitcorp.com/` answer? | **No DNS record** — `getent hosts discover.granitcorp.com` and `socket.gethostbyname()` both fail with "name or service not known". This is **not a regression**: it's exactly what the sheet itself already says ("does NOT answer yet: it has no DNS record") and matches every one of the four prior re-walks (JOB-3359/3368/3378/3395). DNS creation is explicitly out of this builder lane — the sheet's own "decision" section says "O does it through the API," gated on Guy saying "discover dns yes." Not actioned here. |
| Does AI1-Admin sign-in (e-mail + password) work? | **Doesn't apply to this product, and the sheet's sign-in line is wrong for it — see §4, correction for the sheet owner.** This app has no in-app AI1-Admin username/password anywhere in the code (confirmed by reading `lib/admin.ts`, `app/center/page.tsx`, `app/center/actions.ts`): `/center` is meant to sit behind a Cloudflare Access application restricted to Guy's e-mail (not provisioned yet, same DNS/infra gap as above), with a bearer token (`Authorization: Bearer $ADMIN_API_TOKEN`) as the only check that actually exists today. Already documented in `docs/UAT_SHEET.md` §2, re-confirmed this job. |

Because the public address doesn't exist, this walk ran the same way the
last four re-walks did: against the exact artifact `Dockerfile`'s `CMD`
runs (`next build` + `next start`) on loopback (`127.0.0.1:3458`), with a
scratch `DATA_DIR` and `ADMIN_API_TOKEN`. Tried `o-uat-run` first, as
instructed — it fails the same way all four prior re-walks documented (the
shared egress proxy forwards Chromium's absolute-form request line to the
loopback server, which redirects back to itself until Chromium gives up:
`net::ERR_TOO_MANY_REDIRECTS`). Fell back to the same documented
workaround: `tools/uat/phone_walk.py` invoked directly against the loopback
build, same `--base-url`/`--out-dir` contract `o-uat-run` would use, real
Chromium at 390×844 via the shared Playwright venv.

## 1. The sheet's one numbered step

> **Try it on your phone** — 1. Nothing to open yet: the public address has
> no DNS record.

| Step | Result |
|---|---|
| 1. Nothing to open yet | **Pass** — true. Confirmed above: no DNS record, nothing reachable. |

## 2. "What is new" claims

| Claim | Result |
|---|---|
| A deployable DEV build exists | **Pass** — `npm run build` succeeds (Next.js 16.4.5, Turbopack); `Dockerfile` and `docker-compose.yml` are present and match `docs/DEPLOY-DEV.md`. |
| The pass terms no longer name an address that does not exist | **Pass** — `docs/legal/discovery-pass-terms-en.md` / `-he.md` and `lib/interviewer-llm.ts`'s system prompt all consistently reference `discover.granitcorp.com` (the real intended customer address per `docs/UAT_SHEET.md` §1), no placeholder/example addresses found (`grep` for `example.com`/`TBD`/etc. across `docs/legal/` and the system prompt: no hits). |
| A UAT sheet and a self-walk were done | **Pass** — `docs/UAT_SHEET.md` (address, sign-in, steps, self-walk) and four prior phone-walk docs (`docs/PHONE_WALK_2026-11-19.md`, `docs/PHONE_WALK_2026-11-20.md`, plus JOB-3368/3378's) all exist and are current. |

## 3. Full product walk (first-use path, `docs/UAT_SHEET.md` §4)

Run via `tools/uat/phone_walk.py` against the loopback build — Guy issues a
pass from `/center`, the customer opens the one-time `/session/<token>`
link, has a short interview, ends the session; every page checked for the
four phone failure kinds (error shown, horizontal scroll, text cut off, tap
targets under 44px).

| Step | Result |
|---|---|
| 0. Landing page opens at 390px | Pass |
| 1. `/center` opens empty, first use | Pass |
| 2. "Payment received — activate pass" issues a pass, customer listed, no horizontal scroll from a long unbroken company name | Pass |
| 3. Customer opens `/session/<token>` | Pass |
| 4. Interview turns (two), spec coverage climbs | Pass |
| 5. "End session" shows tokens/cost/pass summary | Pass |

**42/42 automated checks passed, 0 failures.** Raw results and screenshots:
`docs/uat/phone-walk-2026-11-20-JOB-3405/results.json` and the `.png`s
beside it. Also reviewed by eye: the long customer name wraps inside its
own table column with no page-level horizontal scroll, every
input/button/textarea renders at a comfortable tap height, and the
session-ended summary reads cleanly with nothing cut off.

`npm test` (`vitest run`): **28/28 passing** (up from 26/26 — two new tests,
§5). `npm run build`: succeeds.

## 4. Correction for the sheet owner

`~/ai1-context/uat-sheets/discovery-studio.md`'s **Sign in** line reads:

> AI1-Admin: e-mail ai1-admin@granitcorp.com and the AI1-Admin password you
> already use (Integrations; never shown here)

This doesn't match discovery-studio: there is no in-app username/password
anywhere in this product. Guy's operator console (`/center`) is designed
to sit behind a **Cloudflare Access** application restricted to his e-mail
(not provisioned yet — same pending DNS/infra job as the address itself),
with a **bearer token** (`Authorization: Bearer $ADMIN_API_TOKEN`) as the
only check that actually exists in the code today — confirmed again this
job (`lib/admin.ts`). This was already written up in this repo's own
`docs/UAT_SHEET.md` §2 back in JOB-3331 (18 Nov); flagging it here too
since the generic sheet's sign-in line still doesn't carry that caveat.
Suggest either dropping the AI1-Admin line for this product or replacing it
with "no in-app sign-in; bearer token for scripts, Cloudflare Access
pending" once the sheet format allows a per-product override.

## 5. Quality pass (existing product, no new features)

- **Hebrew / RTL:** No Hebrew text is rendered anywhere in the running app
  (`grep` across `app/`, `lib/`, `components/` for Hebrew Unicode / `dir=`
  / `lang="he"`: no hits). `app/layout.tsx` sets `lang="en"` consistently.
  The draft Hebrew legal terms (`docs/legal/discovery-pass-terms-he.md`)
  exist in the repo but are not served or linked from the running app at
  all — a pre-existing, already-documented gap (`docs/UAT_SHEET.md` §7),
  not a regression and not something to build here. Nothing to fix: there
  is no Hebrew-visible screen to check RTL correctness on yet.
- **Phone size (390×844):** No cut text, no horizontal scroll, tap targets
  ≥44px — confirmed by the 42/42 automated checks (§3) plus eye review of
  all 8 screenshots, and by `tests/phone-ui.test.ts`'s CSS-invariant checks
  (all passing).
- **Real data vs. its source:** Not applicable yet — there is no live DEV
  address and no external data feed; every number on screen (pass
  budget/cost/sessions) is generated by this walk itself against a scratch
  data directory, so there's no external "source of truth" to compare
  against at this stage.
- **Page load time:** `/`, `/center`, `/api/health` all respond in well
  under 100ms on loopback (measured: 55ms / 22ms / 6ms) — comfortably under
  "a few seconds."
- **Error messages in plain words — finding and fix:**
  `components/SessionClient.tsx`'s `sendMessage()` only ever checked
  `body.reply` from `POST /api/session/message`. Confirmed directly against
  the running server that a failed send (e.g. `{"error": "session already
  ended"}`, reachable if "End session" and "Send" land close together on a
  slow connection — a realistic mobile scenario) was **silently dropped**:
  the customer's typed message stayed on screen, no agent reply ever
  appeared, and nothing told them anything had gone wrong. That's worse
  than an unclear error message — it's no message at all.

  **Fix:** added `lib/session-client.ts`'s `interpretMessageResponse()`
  (a pure function the component now routes every response through) and a
  `sendError` state in `SessionClient` that renders the server's own
  plain-English message (e.g. "session already ended") as `<p
  role="alert">`. Verified end-to-end in a real 390×844 Chromium session by
  mocking the failing response: the message now renders with no horizontal
  overflow (screenshot: `docs/uat/phone-walk-2026-11-20-JOB-3405/08-send-error-shown.png`).
  Covered by `tests/session-client.test.ts` (2 new tests): the error path
  surfaces the server's message instead of being dropped, and the success
  path still passes through `reply`/`coveragePercent` unchanged.

## 6. Evidence

- `npm test` (`vitest run`): **28/28 passing**, up from 26/26 — two new
  tests in §5.
- `npm run build`: succeeds, unchanged route list.
- Phone walk: 42/42, `docs/uat/phone-walk-2026-11-20-JOB-3405/results.json`
  and screenshots (including `08-send-error-shown.png`, the fix
  verification).
- `o-uat-run` was tried first per instructions; documented its known
  proxy/loopback failure (§0) before falling back, same as the four prior
  walks.

WALK: pass
