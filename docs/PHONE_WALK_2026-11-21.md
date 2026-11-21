# JOB-3500: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-21

This job's premise was 1 change merged since the last recorded walk
(`2026-11-20T20:07`). Checked before doing anything else: `git log
--pretty='%H %cI %s' -3` shows `HEAD` at `81f5503` (JOB-3482,
`2026-11-20T23:04:35+02:00` = `21:04:35Z`), with `4a8ea79` (JOB-3466,
`14:30:46Z`) just before it. Only JOB-3482's own commit timestamp lands
after `20:07Z` -- so "1 change" is exactly JOB-3482's own confirmation
re-walk commit (which made no code changes, per that section in
`docs/PHONE_WALK_2026-11-20.md`). This job is a fresh re-walk against that
merged state, not a hunt for a new regression.

## Still no live DEV address

Re-checked for this job: `discover.granitcorp.com` still has no DNS
record (per `docs/UAT_SHEET.md` §1), unchanged from all eight prior walks.
`docs/DEPLOY-DEV.md` and `.env.example`'s `APP_HOSTNAME` are unchanged, no
real `.env` exists in this workspace. This workspace also had no
`node_modules` yet (a fresh checkout); ran `npm install` to restore it --
no dependency versions changed (`package-lock.json` untouched). Same as
every prior walk, this ran against the exact artifact `Dockerfile`'s `CMD`
runs (`next build` + `next start`) on loopback (`127.0.0.1:3463`).

## Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 81f5503
```

Failed the same way the last two walks (JOB-3466, JOB-3482) documented:
no real DEV address to point it at, and no admin token in this shell:

```
the runner wrote no results.json (exit 3): no admin token given
(ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password,
/api/admin/* takes a bearer token instead (lib/admin.ts)
```

Fell back to the same documented workaround: `tools/uat/phone_walk.py`
invoked directly (same `--base-url`/`--out-dir` contract `o-uat-run` would
use) against a freshly built `next start` on loopback, with a throwaway
local `ADMIN_API_TOKEN` (never the AI1-Admin password, which this app
doesn't use), using the shared Playwright venv (`/home/o/tools/pw-venv`).

## Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this branch's
actual `HEAD` (`81f5503`, identical code to JOB-3482's end state). Raw
results and screenshots:
`docs/uat/phone-walk-2026-11-21-JOB-3500/results.json` (and the `.png`s
beside it).

Also reviewed by eye, not just the automated 42: the landing page
(`01-landing.png`) and empty `/center` (`02-center-empty.png`) render
cleanly; the customers table (`03-center-after-activate.png`) wraps the
long name inside its own column with no page-level horizontal scroll at
390px and every input/button renders at a comfortable tap height; the
interview turns (`05-session-turn-1.png`, `06-session-turn-2.png`) read
cleanly with no cut-off text and the spec coverage percentage visible
without scrolling; and the session-ended summary (`07-session-ended.png`)
reads cleanly with nothing cut off.

## No code fix made this job

There was nothing to fix -- the one merged change since the last walk was
JOB-3482's own confirmation commit (a no-op re-walk, no code touched), and
this walk confirms the app still holds at 390x844 with zero regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason every confirmation re-walk since JOB-3368's has been.

## Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3482's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/center`,
  `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-21-JOB-3500/results.json` and screenshots.
