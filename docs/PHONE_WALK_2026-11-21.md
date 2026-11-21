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

## JOB-3513: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-21

This job's premise was 1 change merged since the last recorded walk
(`2026-11-21T02:11`). Checked before doing anything else: `git log
--pretty='%H %cI %s' -5` shows `HEAD` at `3971f8e` (JOB-3500,
`2026-11-21T07:36:28+02:00` = `05:36:28Z`), with `81f5503` (JOB-3482,
`2026-11-20T21:04:35Z`) just before it. Only JOB-3500's own commit
timestamp lands after `02:11Z` -- so "1 change" is exactly JOB-3500's own
confirmation re-walk commit (which made no code changes, per the section
above). This job is a fresh re-walk against that merged state, not a hunt
for a new regression.

### `~/ai1-context/uat-sheets/discovery-studio.md` still names no live DEV address

Re-read the UAT sheet this job was told to walk: it still opens with
"does NOT answer yet: it has no DNS record" and its "Try it on your
phone" section still reads "Nothing to open yet: the public address has
no DNS record." This matches `docs/UAT_SHEET.md` §1, unchanged since all
nine prior walks -- `discover.granitcorp.com` still has no DNS record,
`docs/DEPLOY-DEV.md`'s Traefik/`APP_HOSTNAME` setup is still pending, and
no real `.env` exists in this workspace (a secret-looking path this lane
cannot read, consistent with every prior walk's finding). This workspace
also had no `node_modules` yet (a fresh checkout); ran `npm install` to
restore it -- no dependency versions changed (`package-lock.json`
untouched). Same as every prior walk, this ran against the exact artifact
`Dockerfile`'s `CMD` runs (`next build` + `next start`) on loopback
(`127.0.0.1:3464`).

### Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 3971f8e
```

Failed the same way the last three walks (JOB-3466, JOB-3482, JOB-3500)
documented: no real DEV address to point it at, and no admin token in
this shell:

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

### Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this branch's
actual `HEAD` (`3971f8e`, identical code to JOB-3500's end state). Raw
results and screenshots:
`docs/uat/phone-walk-2026-11-21-JOB-3513/results.json` (and the `.png`s
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

### No code fix made this job

There was nothing to fix -- the one merged change since the last walk was
JOB-3500's own confirmation commit (a no-op re-walk, no code touched), and
this walk confirms the app still holds at 390x844 with zero regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason every confirmation re-walk since JOB-3368's has been.

### Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3500's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/center`,
  `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-21-JOB-3513/results.json` and screenshots.

## JOB-3525: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-21

This job's premise was 1 change merged since the last recorded walk
(`2026-11-21T08:26`). Checked before doing anything else: `git log
--pretty='%H %cI %s' -5` shows `HEAD` at `8bb018c` (JOB-3513,
`2026-11-21T10:47:10+02:00` = `08:47:10Z`), with `3971f8e` (JOB-3500,
`05:36:28Z`) just before it. Only JOB-3513's own commit timestamp lands
after `08:26Z` -- so "1 change" is exactly JOB-3513's own confirmation
re-walk commit (which made no code changes, per the section above). This
job is a fresh re-walk against that merged state, not a hunt for a new
regression.

### Still no live DEV address

Re-read the UAT sheet this job was told to walk
(`~/ai1-context/uat-sheets/discovery-studio.md`): it still opens with
"does NOT answer yet: it has no DNS record" and its "Try it on your
phone" section still reads "Nothing to open yet: the public address has
no DNS record." This matches `docs/UAT_SHEET.md` §1, unchanged since all
ten prior walks -- `discover.granitcorp.com` still has no DNS record, and
no real `.env` exists in this workspace. This workspace also had no
`node_modules` yet (a fresh checkout); ran `npm install` to restore it --
no dependency versions changed (`package-lock.json` untouched).

### Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 8bb018c
```

Failed the same way every prior walk since JOB-3466 documented: no real
DEV address to point it at, and no admin token in this shell (this app
has no AI1-Admin password; `/api/admin/*` takes a bearer token instead,
`lib/admin.ts`).

### This job served the app differently from recent walks -- and caught a gap in that precedent

Recent walks (JOB-3466 through JOB-3513) served the app with `next start`
on loopback and called that "the exact artifact Dockerfile's CMD runs."
That is no longer accurate: `next.config.mjs` sets `output: "standalone"`
and the `Dockerfile`'s actual `CMD` is `node server.js` against the
standalone build (`COPY --from=builder .../.next/standalone`), which has
been true since the DEV-deploy commit (`1d3769a`, PR #3) -- `next start`
even prints "does not work with output: standalone configuration" when
run this way, though it happens to still serve pages.

This job built with `npm run build` and ran `node .next/standalone/server.js`
on loopback instead, to match what the real Docker image runs. First
attempt surfaced what looked like a serious failure: `/session/<token>`
hung forever on "Starting your session…", and `tools/uat/phone_walk.py`
timed out waiting for the interview `textarea` to appear. Chasing it with
a manual Playwright probe (console/network logging) showed every
`/_next/static/*` chunk and stylesheet 404'ing, so the client bundle
never loaded, React never hydrated, and the `useEffect` that calls
`/api/session/start` (`components/SessionClient.tsx`) never ran. A direct
`POST /api/session/start` against the same server returned a correct
`200 {"ok":true,...}` the whole time, confirming the server-side logic was
fine.

Root cause: Next's standalone output deliberately excludes `.next/static`
and `public/` from `.next/standalone/` -- `Dockerfile` copies both in
explicitly as separate `COPY` steps before `node server.js` ever runs.
This test harness had launched `node .next/standalone/server.js` straight
after `npm run build` without replicating those two `COPY` steps, so the
server was missing its own static assets -- an artifact of this walk's
setup, not an app bug. Copying `.next/static` and `public/` into
`.next/standalone/` before starting the server (exactly what `Dockerfile`
does) fixed it immediately; a fresh server process picked up the static
files with no further changes. No application code was touched.
Recording this here so the next walk that switches server-start methods
doesn't lose time rediscovering it.

### Result: 42/42 checks passed, 0 failures

Ran `tools/uat/phone_walk.py` against `node .next/standalone/server.js`
(the actual Docker artifact) on loopback, `127.0.0.1:3468`, with a fresh
`DATA_DIR` (so `02-center-empty.png` shows a genuinely empty customers
table, not state left over from this job's own debugging), a throwaway
local `ADMIN_API_TOKEN` (never the AI1-Admin password), and the shared
Playwright venv (`/home/o/tools/pw-venv`). Same steps, same long-name
customer (`GranitCorpIndustrialAutomationSolutionsLtd`), run against this
branch's actual `HEAD` (`8bb018c`, identical code to JOB-3513's end
state). Raw results and screenshots:
`docs/uat/phone-walk-2026-11-21-JOB-3525/results.json` (and the `.png`s
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

### No code fix made this job

There was nothing in the app to fix -- the one merged change since the
last walk was JOB-3513's own confirmation commit (a no-op re-walk, no
code touched), and the one failure this job hit (the stuck session page)
traced back to this job's own test-harness setup, not the app, as
detailed above. The app still holds at 390x844 with zero regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason every confirmation re-walk since JOB-3368's has been.

### Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3513's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/center`,
  `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-21-JOB-3525/results.json` and screenshots.

## JOB-3536: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-21

This job's premise was 1 change merged since the last recorded walk
(`2026-11-21T14:26`). Checked before doing anything else: `git log
--pretty='%H %cI %s' -5` shows `HEAD` at `41711ca` (JOB-3525,
`2026-11-21T16:46:33+02:00` = `14:46:33Z`), with `8bb018c` (JOB-3513,
`08:47:10Z`) just before it. Only JOB-3525's own commit timestamp lands
after `14:26Z` -- so "1 change" is exactly JOB-3525's own confirmation
re-walk commit (which made no code changes, per the section above). This
job is a fresh re-walk against that merged state, not a hunt for a new
regression.

### `~/ai1-context/uat-sheets/discovery-studio.md` still names no live DEV address

Re-read the UAT sheet this job was told to walk: it still opens with
"does NOT answer yet: it has no DNS record" and its "Try it on your
phone" section still reads "Nothing to open yet: the public address has
no DNS record." This matches `docs/UAT_SHEET.md` §1, unchanged since all
eleven prior walks -- `discover.granitcorp.com` still has no DNS record,
and no real `.env` exists in this workspace. This workspace also had no
`node_modules` yet (a fresh checkout); ran `npm install` to restore it --
no dependency versions changed (`package-lock.json` untouched).

### Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 41711ca
```

Failed the same way every prior walk since JOB-3466 documented: no real
DEV address to point it at, and no admin token in this shell (this app
has no AI1-Admin password; `/api/admin/*` takes a bearer token instead,
`lib/admin.ts`).

### Served the app the same way JOB-3525 settled on -- and re-hit JOB-3525's own documented gotcha, from this job's own harness setup

Built with `npm run build`, then ran `node .next/standalone/server.js`
against the standalone output -- the actual artifact `Dockerfile`'s `CMD`
runs, per JOB-3525's finding that plain `next start` does not match the
shipped image. This job's first attempt skipped copying `.next/static`
and `public/` into `.next/standalone/` before starting the server (the
two `COPY` steps `Dockerfile` does between build and `CMD`) -- a
copy-paste slip by this job, not a new finding, but it reproduced exactly
the symptom JOB-3525 already wrote up: `/session/<token>` stuck forever on
"Starting your session…" (`tools/uat/phone_walk.py` timed out on
`page.fill(textarea)` after 30s waiting for the interview box that never
appears, because the client bundle 404s on every `/_next/static/*` chunk
and React never hydrates). Copying `.next/static` and `public/` into
`.next/standalone/` before starting a fresh server process fixed it
immediately, exactly as JOB-3525 recorded. No application code was
touched; this is this job's own setup mistake, re-confirming JOB-3525's
note rather than finding anything new.

### Result: 42/42 checks passed, 0 failures

Ran `tools/uat/phone_walk.py` against `node .next/standalone/server.js`
(with `.next/static` and `public/` copied in, matching what `Dockerfile`
does) on loopback, `127.0.0.1:3471`, with a fresh `DATA_DIR` (so
`02-center-empty.png` shows a genuinely empty customers table), a
throwaway local `ADMIN_API_TOKEN` (never the AI1-Admin password), and the
shared Playwright venv (`/home/o/tools/pw-venv`). Same steps, same
long-name customer (`GranitCorpIndustrialAutomationSolutionsLtd`), run
against this branch's actual `HEAD` (`41711ca`, identical code to
JOB-3525's end state). Raw results and screenshots:
`docs/uat/phone-walk-2026-11-21-JOB-3536/results.json` (and the `.png`s
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

### No code fix made this job

There was nothing in the app to fix -- the one merged change since the
last walk was JOB-3525's own confirmation commit (a no-op re-walk, no
code touched), and the one failure this job hit (the stuck session page)
traced back to this job's own test-harness setup (forgetting the static-
asset copy step), not the app, as detailed above. The app still holds at
390x844 with zero regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason every confirmation re-walk since JOB-3368's has been.

### Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3525's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/center`,
  `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-21-JOB-3536/results.json` and screenshots.
