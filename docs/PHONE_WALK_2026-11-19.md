# JOB-3359: phone-size (390x844) walk of the discovery-studio UAT sheet

The first-use path `docs/UAT_SHEET.md` §4 names -- Guy issues a pass from
`/center`, the customer opens the one-time `/session/<token>` link, has a
short interview, ends the session -- driven in a real Chromium at 390x844
(mobile emulation: touch, `is_mobile`) by the new runner at
`tools/uat/phone_walk.py`, checking every screen for the four failure
kinds this job names: text cut off, horizontal scroll, a button out of
reach, an error shown.

## Why this did not run through `o-uat-run` against a real DEV address

This job's premise was 11 changes merged since the last walk
(`last walk: 2000-01-01` -- there has never been a recorded phone walk for
this product). **There is still no live DEV address for discovery-studio
to walk** -- confirmed unchanged from `docs/UAT_SHEET.md` §1 (written for
JOB-3331, 18 Nov) and `docs/ACCEPTANCE-CARD-JOB-3051.md`: no DNS, no
Cloudflare Access, nothing deployed on kvm99, and no infra follow-up
branch exists past `o/JOB-3072-auto` (`git branch -a`, re-checked for this
job). `APP_HOSTNAME` is blank in `.env.example` and no real `.env` exists
in this workspace.

So, same as JOB-3331's self-walk, this walk ran against the exact artifact
`Dockerfile`'s `CMD` runs (`next build` + `next start`) on loopback. That
rules out `o-uat-run` itself: it always routes Playwright traffic through
the shared egress proxy (`UAT_PROXY`, `o-egress-proxy` on `127.0.0.1:3129`
-- intended to reach a real DEV host from the sandboxed `o` user). Pointed
at a loopback target, that proxy forwards Chromium's absolute-form request
line (`GET http://127.0.0.1:<port>/ ...`) to the Next.js server verbatim;
Next.js's own handling of that request-shape sends back a redirect to the
same URL, which Chromium then loops on forever
(`net::ERR_TOO_MANY_REDIRECTS`) -- confirmed by hand with `o-uat-run`
itself and reproduced directly by launching Chromium with the same proxy
config. This is a pre-existing interaction between shared tooling
(`~/workspaces/ai1-tools/bin/o-egress-proxy`) and this app's dev/prod
server, outside this repo and this job's lane to fix (and the sibling
itcost phone-walk jobs hit the same shape of gap: JOB-3290's own
before/after local-sandbox comparison was run directly, not through
`o-uat-run`, for the same reason -- only its real-DEV run went through the
wrapper).

`tools/uat/phone_walk.py` is still the exact runner `o-uat-run` would use
(same `--base-url`/`--out-dir` contract) -- it was simply invoked directly
against each loopback build with a Playwright-Chromium interpreter,
exactly as `docs/UAT_SHEET.md`'s own walk and JOB-3290's local comparison
did. Results land in this doc and under `docs/uat/phone-walk-2026-11-19/`
in this repo rather than `~/ledger/uat/` because writing to `~/ledger/` is
outside a builder's write lane (only `o-uat-run` itself can write there,
and it's the part that doesn't work here).

## What the walk found

**Before (this branch's code before this job's fix): 35/42 checks
passed, 7 failed.** Raw results: `docs/uat/phone-walk-2026-11-19/before/results.json`; screenshots alongside it.

| # | Finding | Screens affected |
|---|---|---|
| 1 | **Horizontal scroll** -- the page's layout viewport blows out past 390px (to 481px on the empty `/center` form, to 770px once a customer with a long, space-free name is issued a pass) | `/center` (both with and without data) |
| 2 | **Buttons/inputs out of reach** -- every `<input>`, `<button>`, `<textarea>` in the app renders at the browser default height (21-36px), under the ~44px a thumb can reliably hit | `/center` (name/email inputs, submit button), `/session/<token>` (message box, Send, End session) |

Root cause of both: the app shipped with **no stylesheet at all**
(`app/layout.tsx` had no CSS import, `app/globals.css` did not exist).
Finding 1's specific trigger: the customers `<table>` had no
`word-break`/layout constraint, so a single unbroken long name (a
realistic case -- a compound company name with no spaces) forces the
table, and with it the whole mobile layout viewport, wider than the
screen. Screenshot: `docs/uat/phone-walk-2026-11-19/before/03-center-after-activate.png`.

No text-cut-off or error-shown failures were found -- the browser's
default table-cell wrapping already prevented literal text clipping; the
failures are specifically the two kinds above.

**After (this job's fix): 42/42 checks passed.** Raw results:
`docs/uat/phone-walk-2026-11-19/after/results.json`; screenshots
alongside it (same steps, same long-name customer).

## Fix, with a test

`app/globals.css` (new, imported by `app/layout.tsx`):
- `min-height: 44px` + `font-size: 16px` + padding on every
  `input`/`button`/`textarea`/`select` -- clears finding 2 everywhere at
  once (also keeps iOS Safari from auto-zooming a focused 16px+ input).
- `table-layout: fixed` plus `overflow-wrap`/`word-break: break-word` on
  `td`/`th` -- a long unbroken name now wraps inside its own column
  instead of forcing the table wide.
- `app/center/page.tsx`'s table is additionally wrapped in a
  `.table-scroll` container (`overflow-x: auto`) as defense-in-depth, so
  if a column's content ever can't fit even after wrapping, it scrolls
  locally instead of blowing out the page's layout viewport again.
- `label { display: block; ... }` -- the "Customer name"/"Email" labels no
  longer run directly into their inputs with no separation (a readability
  issue bundled into the same stylesheet, not separately flagged by the
  automated checks above).

Tests:
- `tests/phone-ui.test.ts` (new, in the existing `vitest` suite): a static
  regression guard on `app/globals.css`/`app/layout.tsx`/`app/center/page.tsx`
  asserting the stylesheet is actually imported and the three rules above
  (44px tap targets, word-break, the table-scroll wrapper) are present --
  the same "guard the one rule that matters" approach `tests/deploy.test.ts`
  already uses for `docker-compose.yml`, since `jsdom` (what `vitest`'s
  default environment uses) doesn't run real CSS layout and so can't
  observe `scrollWidth`/tap-target sizes itself.
- `tools/uat/phone_walk.py` (new): the real-Chromium walk itself is the
  behavioral test -- it is what actually produced the before/after numbers
  above, and is meant to be re-run (through `o-uat-run`, once a real DEV
  address and a working egress-proxy path for it exist) on every future
  phone-size re-walk, the same way `itcost-JOB-3357` re-ran `itcost`'s.

## Known, pre-existing gap noticed along the way (not fixed, not a phone-size issue)

`/center`'s "Payment received -- activate pass" form has no way to surface
the new pass's one-time `/session/<token>` link back to Guy --
`app/center/actions.ts`'s `activatePass` server action never returns it to
the page; only the separate `POST /api/admin/passes` API response does.
`docs/UAT_SHEET.md` step 3 ("Copy the pass's one-time link... and send it
to the customer") can't actually be carried out from the shipped `/center`
screen. The walk reads the token from `GET /api/admin/customers` instead,
purely to keep testing the customer-facing screens. Documented in
`docs/UAT_MANUAL.md`; not fixed here -- adding a link/copy affordance is a
new feature, out of this job's "no new features" scope.

## Evidence

- `npm test` (`vitest run`): **26/26 passing** on this branch, up from
  22/22 -- the 4 new tests in `tests/phone-ui.test.ts`.
- `npm run build`: succeeds.
- The phone walk itself: 35/42 before this job's fix, 42/42 after --
  `docs/uat/phone-walk-2026-11-19/{before,after}/results.json` and
  screenshots.
