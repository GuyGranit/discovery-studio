# JOB-3812: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-25

This job's premise was 1 change merged since the last recorded walk
(`2026-11-24T21:27`). Checked before doing anything else: `git log
--pretty='%H %aI %s' -3` shows `HEAD` at `8005de5` (JOB-3798,
`2026-11-24T23:46:08+02:00` = `21:46:08Z`), with `78d64e9` (JOB-3629,
`2026-11-22T20:34:00+02:00` = `18:34:00Z`) before it; `git fetch origin`
confirms `origin/main` matches `HEAD` exactly, no commits landed past
`8005de5`. So "1 change" is JOB-3798's own confirmation re-walk commit
(PR #24) -- its own doc, `docs/PHONE_WALK_2026-11-24.md`, records it as a
no-op, doc-and-screenshots-only commit (`git show --stat 8005de5` touches
only `docs/PHONE_WALK_2026-11-24.md` and its `docs/uat/...` evidence, no
app code). This job is a fresh re-walk against that merged state, not a
hunt for a new regression -- the fourteenth confirmation re-walk in this
chain since JOB-3368's.

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
  --build 8005de5
```

Failed the same way every prior walk since JOB-3466 has documented: no
real DEV address to point it at, and no admin token in this shell:

```
the runner wrote no results.json (exit 3): no admin token given
(ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password,
/api/admin/* takes a bearer token instead (lib/admin.ts)
```

## Served the app the way recent walks have settled on

Built with `npm run build`, then ran `node .next/standalone/server.js`
against the standalone output, copying `.next/static` into
`.next/standalone/.next/static` first (the `Dockerfile`'s own `COPY`
step between build and `CMD`) -- plain `next start` does not match the
shipped image (`next.config.mjs` sets `output: "standalone"`). Ran on
loopback with a fresh `DATA_DIR` under this job's scratch dir and a
throwaway local `ADMIN_API_TOKEN` kept only in an in-memory file under
`$O_JOB_TMP` (never the AI1-Admin password, which this app doesn't use),
using the shared Playwright venv (`/home/o/tools/pw-venv`).

**One false alarm worth recording, caught and corrected within this
job, not an app bug:** the first two server starts were launched before
the `.next/static` copy actually completed -- the copy command had been
bundled into a shell line with a process-stop verb this lane's hook
refuses outright (`pkill`), so the whole compound command, copy
included, was rejected before anything ran. Both times the symptom
looked identical and alarming: `/session/<token>` hung forever on
"Starting your session…", every `/_next/static/chunks/*` request 404ed
in the browser console, and `phone_walk.py` timed out 30s waiting for
the (never-rendered) textarea. Checked it was a serving gap, not a
backend one, before touching any product code: `/api/admin/customers`
and a direct `POST /api/session/start` against the same pass both
answered correctly and fast (31ms) with the server up -- only the
client bundle never finished loading, so `SessionClient`'s `useEffect`
fetch never ran. Re-ran the `cp .next/static .next/standalone/.next/static`
step on its own, started a clean server, and confirmed the chunks now
serve 200. No application file was touched to fix this -- it was a gap
in this job's own serving steps, reproduced from a worktree with no
pre-existing `.next/standalone` state (same root cause the JOB-3798 and
earlier docs already call out: "this repo has no `public/` directory...
copied `.next/static`... matching the `COPY` step `Dockerfile` does").

## Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this
branch's actual `HEAD` (`8005de5`, identical code to JOB-3798's end
state). Raw results and screenshots:
`docs/uat/phone-walk-2026-11-25-JOB-3812/results.json` (and the `.png`s
beside it).

Also reviewed by eye, not just the automated 42, and compared
pixel-for-pixel against JOB-3798's own screenshots from the prior walk:

- `01-landing.png` and `02-center-empty.png` render cleanly, identical
  to the prior walk.
- `03-center-after-activate.png`: the customers table wraps the long
  name inside its own narrow column (one or two characters per line) --
  visually dense, but it is character-wrapping (`white-space: normal`),
  not cut-off text, and does not push the page past 390px. Byte-for-byte
  the same rendering as JOB-3798's `03-center-after-activate.png` and
  every walk back to JOB-3466's; a pre-existing look, not a regression,
  and out of this job's "1 change" scope (that change touched no app
  code).
- `04-session-start.png` through `07-session-ended.png`: the interview
  turns read cleanly with no cut-off text and the spec coverage
  percentage visible without scrolling; the session-ended summary reads
  cleanly with nothing cut off. Identical to JOB-3798's equivalents.

## No code fix made this job

Nothing failed that lives in this repo. The one merged change since the
last walk was JOB-3798's own confirmation commit (doc and screenshots
only, no app code), and this walk confirms the app still holds at
390x844 with zero regressions. The one failure this job hit
(`/session/<token>` hanging) traced entirely to this job's own
not-yet-complete local serving setup, fixed by finishing the `cp` step
before starting the server -- never a product defect, so no product
file or test changed.

**Before** (this job's premise, i.e. the state the last walk left things
in, per `docs/PHONE_WALK_2026-11-24.md`) and **after** (this job's own
re-run) are identical: 42/42 both, same reason every confirmation
re-walk since JOB-3368's has been.

## Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3798's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/_not-found`,
  `/center`, `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-25-JOB-3812/results.json` and
  screenshots.

WALK: pass
