# JOB-3426: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-20

This job's premise was 2 changes merged since the last recorded walk
(`2026-11-20T01:52`). Checked before doing anything else: `git log --oneline
-3` shows `HEAD` at `3055d69` (JOB-3405), with `e71ae2f` (JOB-3395) just
before it. Both commits' timestamps (`2026-11-20T02:15:28Z` and
`2026-11-20T05:15:30Z`) land after `01:52Z`, and nothing else does -- so
"2 changes" is exactly JOB-3395's confirmation re-walk and JOB-3405's own
walk-plus-fix (the silent send-error swallow, fixed in
`components/SessionClient.tsx` / `lib/session-client.ts`, already covered by
`tests/session-client.test.ts`). This job is a fresh confirmation re-walk
against that merged state, not a hunt for a new regression.

## Still no live DEV address

Re-checked for this job: `socket.gethostbyname("discover.granitcorp.com")`
still fails with "Name or service not known" -- unchanged from all five
prior walks (JOB-3359/3368/3378/3395/3405). `docs/UAT_SHEET.md` §1 and
`docs/DEPLOY-DEV.md` are unchanged, `.env.example`'s `APP_HOSTNAME` is still
blank, no real `.env` exists in this workspace. Same as every prior walk,
this ran against the exact artifact `Dockerfile`'s `CMD` runs (`next build`
+ `next start`) on loopback (`127.0.0.1:3459`).

## Tried `o-uat-run` first, as instructed

It fails exactly the same way all five prior re-walks documented -- the
shared egress proxy (`UAT_PROXY=http://127.0.0.1:3129`) forwards Chromium's
absolute-form request line to the loopback Next.js server, which redirects
back to itself, and Chromium loops until Playwright gives up:

```
the runner wrote no results.json (exit 1): ...
playwright._impl._errors.Error: Page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3460/
```

This reproduces on this branch's unmodified `HEAD` with no app code
involved -- the same pre-existing proxy/loopback interaction JOB-3359 filed
as outside this repo's and this job's lane, confirmed still true. Fell back
to the same documented workaround: `tools/uat/phone_walk.py` invoked
directly (same `--base-url`/`--out-dir` contract `o-uat-run` would use)
against the loopback build, using the shared Playwright venv
(`/home/o/tools/pw-venv`).

One wrinkle specific to this job, worth recording since it cost real time:
an initial attempt ran the walk against `node .next/standalone/server.js`
(the literal binary the Dockerfile's `CMD` invokes) started directly from
the repo root rather than from a Docker image layout. That failed every
`/_next/static/*` asset with `404` (the Dockerfile's own `COPY --from=builder
.next/static ./.next/static` and `COPY --from=builder public ./public`
steps are what put those files next to `server.js` inside the image; running
the standalone server straight from the repo root skips them), so the
client bundle never loaded, React never hydrated, and the page stuck on its
server-rendered "Starting your session…" placeholder forever -- not a
product bug, a setup artifact of this job's own first attempt. Switched to
`next start` against the plain build output (same as all five prior walks)
and the walk completed cleanly; recording this here so a future job doesn't
re-waste time on the same dead end.

## Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this branch's
actual `HEAD` (`3055d69`, identical code to JOB-3405's end state). Raw
results and screenshots:
`docs/uat/phone-walk-2026-11-20-JOB-3426/results.json` (and the `.png`s
beside it).

Also reviewed by eye, not just the automated 42: the customers table
(`03-center-after-activate.png`) wraps the long name inside its own column
with no page-level horizontal scroll at 390px, every input/button/textarea
renders at a comfortable tap height, the interview turns
(`06-session-turn-2.png`) read cleanly with no cut-off text and the
coverage percentage visible without scrolling, and the session-ended
summary (`07-session-ended.png`) reads cleanly with nothing cut off.

## No code fix made this job

There was nothing to fix -- the two merged changes since the last walk were
JOB-3395's own confirmation commit (a no-op re-walk) and JOB-3405's walk
plus its own fix (already shipped, already tested), and this walk confirms
the app still holds at 390x844 with zero regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason JOB-3368's, JOB-3378's, and JOB-3395's were.

## Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3405's
  end state.
- `npm run build`: succeeds, unchanged route list.
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-20-JOB-3426/results.json` and screenshots.

## JOB-3466: phone-size (390x844) re-walk of the discovery-studio UAT sheet -- 2026-11-20

This job's premise was 1 change merged since the last recorded walk
(`2026-11-20T07:58`). Checked before doing anything else: `git log
--pretty='%H %cI %s' -3` shows `HEAD` at `236a0aa` (JOB-3426,
`2026-11-20T10:16:31+02:00` = `08:16:31Z`), with `3055d69` (JOB-3405,
`07:15:30Z`) just before it. Only JOB-3426's own commit timestamp lands
after `07:58Z` -- so "1 change" is exactly JOB-3426's own confirmation
re-walk commit (which made no code changes, see that section above). This
job is a fresh re-walk against that merged state, not a hunt for a new
regression.

### Still no live DEV address

Re-checked for this job: `socket.gethostbyname("discover.granitcorp.com")`
still fails with "Name or service not known" -- unchanged from all six
prior walks. `docs/UAT_SHEET.md` §1 and `docs/DEPLOY-DEV.md` are
unchanged, `.env.example`'s `APP_HOSTNAME` is still blank, no real `.env`
exists in this workspace. Same as every prior walk, this ran against the
exact artifact `Dockerfile`'s `CMD` runs (`next build` + `next start`) on
loopback.

### Tried `o-uat-run` first, as instructed

```
o-uat-run discovery-studio --runner tools/uat/phone_walk.py \
  --manual docs/UAT_MANUAL.md --base-url https://discover.granitcorp.com \
  --build 236a0aa
```

It failed, but with a different symptom than the proxy/redirect loop all
six prior walks hit: pointed at the (non-existent) real DEV hostname with
no admin token set, `tools/uat/phone_walk.py` exits before even reaching
the network, because `ADMIN_API_TOKEN` is empty in this shell and the app
has no AI1-Admin password to fall back on (`lib/admin.ts`, documented in
the runner's own `--help`):

```
the runner wrote no results.json (exit 3): no admin token given
(ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password,
/api/admin/* takes a bearer token instead (lib/admin.ts)
```

This is the same underlying gap the five `o-uat-run` proxy-loop failures
already filed as outside this repo's and this job's lane (no real DEV
address, no egress-proxy path to it) -- there simply isn't a real
`--base-url` to hand `o-uat-run` yet, token or no token. Fell back to the
same documented workaround: `tools/uat/phone_walk.py` invoked directly
(same `--base-url`/`--out-dir` contract `o-uat-run` would use) against a
freshly built `next start` on loopback (`127.0.0.1:3461`), with a
throwaway local `ADMIN_API_TOKEN` (never the AI1-Admin password, which
this app doesn't use), using the shared Playwright venv
(`/home/o/tools/pw-venv`).

### Result: 42/42 checks passed, 0 failures

Same steps, same long-name customer
(`GranitCorpIndustrialAutomationSolutionsLtd`), run against this branch's
actual `HEAD` (`236a0aa`, identical code to JOB-3426's end state). Raw
results and screenshots:
`docs/uat/phone-walk-2026-11-20-JOB-3466/results.json` (and the `.png`s
beside it).

Also reviewed by eye, not just the automated 42: the landing page
(`01-landing.png`) and empty `/center` (`02-center-empty.png`) render
cleanly; the customers table (`03-center-after-activate.png`) wraps the
long name inside its own column with no page-level horizontal scroll at
390px and every input/button renders at a comfortable tap height; the
interview turns (`05-session-turn-1.png`, `06-session-turn-2.png`) read
cleanly with no cut-off text and the coverage percentage visible without
scrolling; and the session-ended summary (`07-session-ended.png`) reads
cleanly with nothing cut off.

### No code fix made this job

There was nothing to fix -- the one merged change since the last walk was
JOB-3426's own confirmation commit (a no-op re-walk, no code touched),
and this walk confirms the app still holds at 390x844 with zero
regressions.

**Before** (this job's premise, i.e. the state the last walk left things
in) and **after** (this job's own re-run) are identical: 42/42 both, same
reason every confirmation re-walk since JOB-3368's has been.

### Evidence

- `npm test` (`vitest run`): **28/28 passing**, unchanged from JOB-3426's
  end state.
- `npm run build`: succeeds, unchanged route list (`/`, `/center`,
  `/session/[token]`, `/api/health`, `/api/admin/customers`,
  `/api/admin/passes`, `/api/session/start`, `/api/session/message`,
  `/api/session/end`).
- The phone walk: 42/42,
  `docs/uat/phone-walk-2026-11-20-JOB-3466/results.json` and screenshots.
