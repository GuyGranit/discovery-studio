# JOB-3565: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-22

This job's premise: this branch is based on `origin/main` at `afbc9ac`
(JOB-3550, `2026-11-22T05:15:54+02:00`), the tip of main at the time this
job started. `afbc9ac` is itself JOB-3550's own confirmation re-walk
commit -- no code changes, same as the no-op re-walks before it -- so this
is a fresh re-walk against unchanged code, not a hunt for a new
regression.

## `~/ai1-context/uat-sheets/discovery-studio.md` still names no live DEV address

Re-read the UAT sheet this job was told to walk: it still opens with
"does NOT answer yet: it has no DNS record" and its "Try it on your
phone" section still reads "Nothing to open yet: the public address has
no DNS record." `discover.granitcorp.com` still has no DNS record, matching
every prior walk since JOB-3466. This workspace had no `node_modules` yet
(a fresh checkout); ran `npm install` to restore it -- no dependency
versions changed (`package-lock.json` untouched).

## Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build afbc9ac
```

Failed the same way every prior walk since JOB-3466 has documented: no real
DEV address to point it at, and no admin token in this shell (this app has
no AI1-Admin password; `/api/admin/*` takes a bearer token instead,
`lib/admin.ts`):

```
the runner wrote no results.json (exit 3): no admin token given
(ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password,
/api/admin/* takes a bearer token instead (lib/admin.ts)
```

## Served the app the way JOB-3525/JOB-3536/JOB-3550 settled on

Built with `npm run build`, then ran `node .next/standalone/server.js`
against the standalone output -- the actual artifact `Dockerfile`'s `CMD`
runs (`next.config.mjs` sets `output: "standalone"`; plain `next start`
does not match the shipped image). Copied `.next/static` and `public/`
into `.next/standalone/` before starting the server, replicating the two
`COPY` steps `Dockerfile` does between build and `CMD`.

Ran on loopback, `127.0.0.1:3472`, with a fresh `DATA_DIR` under this job's
scratch dir (so `02-center-empty.png` shows a genuinely empty customers
table) and a throwaway local `ADMIN_API_TOKEN` (never the AI1-Admin
password, which this app doesn't use), using the shared Playwright venv
(`/home/o/tools/pw-venv`).

## Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this branch's
actual `HEAD` (`afbc9ac`, identical code to JOB-3550's end state). Raw
results and screenshots:
`docs/uat/phone-walk-2026-11-22-JOB-3565/results.json` (and the `.png`s
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

There was nothing to fix -- the code on this branch is byte-identical to
JOB-3550's end state (no commits landed between `afbc9ac` and this job
starting), and this walk confirms the app still holds at 390x844 with
zero regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason every confirmation re-walk since JOB-3368's has been.

## Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3550's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/center`,
  `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-22-JOB-3565/results.json` and screenshots.
