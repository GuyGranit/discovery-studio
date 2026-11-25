# JOB-3814: `continue` missing from gate-decision STEP 2 vocabulary

## Bug

The `gate-decision` webhook route's prompt lives in `~/.hermes/config.yaml`
(`telegram.webhook.extra.routes.gate-decision.prompt`). Its STEP 2 only
recognizes `approved` / `denied` / `merged`, then falls through to a
`test, or any value not listed above` catch-all described as "the
deterministic, documented behavior for an unrecognized decision word
(Prompt 32 Part B2)".

`o-continue <job>` fires this same webhook with `decision=continue`.
`continue` is never in the recognized list, so a real `o-continue` wake
(e.g. the one that woke JOB-3812 this turn) is misrouted into the
log-only "unrecognized decision word" / regression-probe path instead of
acting on the job.

The `ai1-ledger` skill doc (`~/.hermes/skills/ai1/ai1-ledger/SKILL.md`,
"Two webhook routes, strictly separate" section) already documents
`continue` as one of `gate-decision`'s real decision values — "a prior
turn on this job ended with loop steps remaining ... verify with
`oledger show <job_id>` ... and continue that job per its governing
skill ... from wherever the evidence says it left off." The STEP 2 list
in the live prompt is stale relative to that doc.

## Fix

`JOB-3814-gate-decision-continue.patch` in this directory adds a
`- continue:` bullet to STEP 2, between the `merged` and `test` bullets,
mapping `continue` to the same action as `approved`: verify via STEP 1's
`oledger show {job_id}`, then continue exactly where the job's own
governing skill left off — matching the ai1-ledger skill doc's
documented behavior.

Verified: both the current live text and the patched text were
extracted from the real `~/.hermes/config.yaml`, round-tripped through
`yaml.safe_load`, and confirmed to still parse as valid YAML after the
change, with the `approved`/`denied`/`merged`/`test` bullets intact.

## Why this isn't installed live

`~/.hermes` is on the builder lane's hard NEVER-write list (same as
`~/bin`), independent of the per-job `permission_system` approval granted
during this run — that approval covers commands the hook can't
auto-classify, not this fixed blocklist. AGENTS.md's own policy for
`tool:` jobs is explicit: *"A `tool:` job never lands its own fix into
`~/bin` by any means ... its last step is always a real review PASS,
then `blocked (tooling)`; only Claude Code tooling's own `o-tool-install`
lands it."* The same applies here. This job's deliverable is the
reviewed, verified patch — the actual install into `~/.hermes/config.yaml`
is for the Claude Code tooling lane to apply.
