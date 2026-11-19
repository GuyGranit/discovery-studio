# discovery-studio phone UAT manual (JOB-3359) -- the UAT sheet, walked at 390x844

The first-use path from `docs/UAT_SHEET.md` §4, walked at phone size
(390x844) as the operator and as a customer, by `tools/uat/phone_walk.py`
through `o-uat-run`.

discovery-studio has no AI1-Admin username/password: `/center` and
`/api/admin/*` sit behind a Cloudflare Access application restricted to
`guy@granitcorp.com` in production (not provisioned yet, see
`docs/UAT_SHEET.md` §1-2), with a bearer-token check as the
belt-and-suspenders layer behind it (`lib/admin.ts`). The walk
authenticates the same way, via `ADMIN_API_TOKEN` -- no password is read,
printed, or stored anywhere in this flow.

## 1. Guy issues a pass
1. Open `/center` -- empty console on first use.
2. Fill in "Payment received -- activate pass" with the customer's name
   and submit.

**You should see:** the form and its button fit the 390px width with every
tap target at least 44px tall, the page returns to `/center` with no
error, and the new customer is listed in the table with no horizontal
scroll -- even when the customer's name is one long, unbroken word (e.g. a
compound company name) with no spaces for the table to wrap on.

## 2. The customer opens the one-time link
1. Open `/session/<token>`.

**You should see:** the page fits 390px with no horizontal scroll, no
error, and every tap target (the message box, Send, End session) at least
44px tall.

## 3. A short interview
1. Type a requirement and send it; read the agent's reply.
2. Send a second message.

**You should see:** each turn appends to the conversation list within the
390px width, with no cut-off text and the spec-coverage percentage visible
without scrolling sideways.

## 4. End session
1. Click "End session".

**You should see:** a summary (tokens used, cost, pass state) renders with
no error and no horizontal scroll.

## Known, pre-existing gap (not a phone-size issue, not fixed here)

`/center`'s own UI has no way to copy a pass's one-time `/session/<token>`
link after issuing it -- `app/center/actions.ts`'s `activatePass` server
action never returns it to the page, only the separate
`POST /api/admin/passes` API response does. `docs/UAT_SHEET.md` step 3
("Copy the pass's one-time link... and send it to the customer") can't
actually be done from the shipped `/center` screen today. The walk reads
the token from `GET /api/admin/customers` instead, purely to keep testing
the customer-facing screens below -- adding a link/copy affordance to
`/center` would be a new feature, out of this job's "no new features"
scope.
