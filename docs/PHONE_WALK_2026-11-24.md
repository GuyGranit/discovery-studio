# JOB-3798: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-24

This job's premise was 1 change merged since the last recorded walk
(`2026-11-22T21:31`). Checked before doing anything else: `git log
--pretty='%H %aI %s' -3` shows `HEAD` at `78d64e9` (JOB-3629,
`2026-11-22T20:34:00+02:00` = `18:34:00Z`), with `86b1ae2` (JOB-3609,
`2026-11-22T18:00:56+02:00` = `16:00:56Z`) just before it; `git fetch
origin` confirms `origin/main` matches `HEAD` exactly, with no commits
landed past `78d64e9`. So "1 change" is JOB-3629's own confirmation
re-walk commit (PR #23, merged shortly after its own `18:34:00Z` commit
timestamp -- its own doc, `docs/UAT_SHEET_WALK_R9.md`, records it as a
no-op, no code touched). This job is a fresh re-walk against that merged
state, not a hunt for a new regression -- the thirteenth confirmation
re-walk in this chain since JOB-3368's.

## Still no live DEV address

Re-read the UAT sheet this job was told to walk
(`~/ai1-context/uat-sheets/discovery-studio.md`): it still opens with
"does NOT answer yet: it has no DNS record" and its "Try it on your
phone" section still reads "Nothing to open yet: the public address has
no DNS record." Confirmed again: `getent hosts discover.granitcorp.com`
fails with "not found" (exit 2). Matches every prior walk since JOB-3466.
Not a regression; DNS creation is explicitly out of this builder lane
(the sheet's own "decision" section is gated on Guy saying "discover dns
yes"). Not actioned here.

This workspace had no `node_modules` yet (a fresh checkout); ran `npm
install` to restore it -- no dependency versions changed
(`package-lock.json` untouched).

## Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 78d64e9
```

Failed the same way every prior walk since JOB-3466 has documented: no
real DEV address to point it at, and no admin token in this shell (this
app has no AI1-Admin password; `/api/admin/*` takes a bearer token
instead, `lib/admin.ts`):

```
the runner wrote no results.json (exit 3): no admin token given
(ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password,
/api/admin/* takes a bearer token instead (lib/admin.ts)
```

## Served the app the way recent walks have settled on

Built with `npm run build`, then ran `node .next/standalone/server.js`
against the standalone output -- the actual artifact `Dockerfile`'s `CMD`
runs (`next.config.mjs` sets `output: "standalone"`; plain `next start`
does not match the shipped image). This repo has no `public/` directory
(the `Dockerfile`'s builder stage runs `mkdir -p public` before `npm run
build` for exactly this reason); copied `.next/static` into
`.next/standalone/.next/static`, matching the `COPY` step `Dockerfile`
does between build and `CMD`.

Ran on loopback, `127.0.0.1:3799`, with a fresh `DATA_DIR` under this
job's scratch dir (so `02-center-empty.png` shows a genuinely empty
customers table) and a throwaway local `ADMIN_API_TOKEN` kept only in an
in-memory shell variable for this job (never written to disk, never the
AI1-Admin password, which this app doesn't use), using the shared
Playwright venv (`/home/o/tools/pw-venv`).

## Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this branch's
actual `HEAD` (`78d64e9`, identical code to JOB-3629's end state). Raw
results and screenshots:
`docs/uat/phone-walk-2026-11-24-JOB-3798/results.json` (and the `.png`s
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
JOB-3629's own confirmation commit (a no-op re-walk, no code touched),
and this walk confirms the app still holds at 390x844 with zero
regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in, per `docs/UAT_SHEET_WALK_R9.md`) and **after** (this job's own
re-run) are identical: 42/42 both, same reason every confirmation
re-walk since JOB-3368's has been.

## Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3629's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/_not-found`,
  `/center`, `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-24-JOB-3798/results.json` and screenshots.

WALK: pass
