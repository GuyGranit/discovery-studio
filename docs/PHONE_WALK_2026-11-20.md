# JOB-3395: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-20

This job's premise was 1 change merged since the last recorded walk
(`2026-11-19T19:52`). Checked before doing anything else: `git log
--oneline -3` shows `HEAD` at `5859f75` -- JOB-3378's own confirmation
commit, merged `2026-11-19T22:16:07+02:00` (`20:16:07` UTC), which is
after `19:52` UTC and is the only commit after that point. So the premise
matches this repo's actual history exactly: the "1 change" is JOB-3378's
own re-walk commit, already recorded as 42/42 in
`docs/PHONE_WALK_2026-11-19.md`. This job is a fresh confirmation re-walk
against that merged state, not a hunt for a new regression.

## Still no live DEV address

Re-checked for this job: `git branch -a` shows nothing past the branches
already listed in the prior walks' docs, `docs/UAT_SHEET.md` §1 and
`docs/DEPLOY-DEV.md` are unchanged, `.env.example`'s `APP_HOSTNAME` is
still blank, and no real `.env` exists in this workspace. Same as all
four prior walks, this ran against the exact artifact `Dockerfile`'s
`CMD` runs (`next build` + `next start`) on loopback (`127.0.0.1:3457`).

## Tried `o-uat-run` first, as instructed

It fails exactly the same way all three prior re-walks documented -- the
shared egress proxy (`UAT_PROXY=http://127.0.0.1:3129`) forwards
Chromium's absolute-form request line to the loopback Next.js server,
which redirects back to itself, and Chromium loops until Playwright gives
up:

```
the runner wrote no results.json (exit 1): ...
playwright._impl._errors.Error: Page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3457/
```

This reproduces on this branch's unmodified `HEAD` with no app code
involved -- the same pre-existing proxy/loopback interaction JOB-3359
filed as outside this repo's and this job's lane, confirmed still true.
Fell back to the same documented workaround: `tools/uat/phone_walk.py`
invoked directly (same `--base-url`/`--out-dir` contract `o-uat-run`
would use) against the loopback build, using the shared Playwright venv
(`/home/o/tools/pw-venv`).

## Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer (`GranitCorpIndustrialAutomationSolutionsLtd`),
run against this branch's actual `HEAD` (`5859f75`, identical code to
JOB-3378's end state). Raw results and screenshots:
`docs/uat/phone-walk-2026-11-20-JOB-3395/results.json` (and the `.png`s
beside it).

Also reviewed by eye, not just the automated 42: the customers table
(`03-center-after-activate.png`) wraps the long name inside its own
column with no page-level horizontal scroll at 390px, every
input/button/textarea renders at a comfortable tap height, and the
session-ended summary (`07-session-ended.png`) reads cleanly with nothing
cut off.

## No code fix made this job

There was nothing to fix -- the one merged change since the last walk was
JOB-3378's own confirmation commit (itself a no-op re-walk), and this
walk confirms the app still holds at 390x844 with zero regressions.
"Before" and "after" are identical here (42/42 both), the same reason
JOB-3368's and JOB-3378's were.

## Evidence

- `npm test` (`vitest run`): **26/26 passing**, unchanged from
  JOB-3378's end state.
- `npm run build`: succeeds.
- The phone walk: 42/42, `docs/uat/phone-walk-2026-11-20-JOB-3395/results.json`
  and screenshots.
