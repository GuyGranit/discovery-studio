#!/usr/bin/env python3
"""JOB-3359: a real-Chromium phone-size (390x844) walk of the discovery-studio
UAT sheet (~/ai1-context/uat-sheets/discovery-studio.md) -- the first-use
path docs/UAT_SHEET.md §4 names: Guy (the operator) issues a pass from
/center, the customer opens the one-time /session/<token> link, has a short
interview, and ends the session. This app has no AI1-Admin username/
password: /center and /api/admin/* sit behind Cloudflare Access in
production (not provisioned yet) with a bearer-token check as the
belt-and-suspenders layer behind it (lib/admin.ts); the walk authenticates
to /api/admin/* the same way, via --admin-token / ADMIN_API_TOKEN, never
printed, and also checks that a request with no token or the wrong token
is rejected -- so "opens ... as AI1-Admin" is something this walk actually
exercises, not merely assumed.

JOB-3949: --base-url must be the real public DEV address. Every walk since
JOB-3466 ran against a loopback substitute instead (no live DEV address
existed) and the "pass" that produced was carried, unqualified, into the
ready card's "READY: walked ... and passed" headline -- on days the public
address plainly did not open. A loopback/private --base-url is now
refused unless --local-fallback is passed, and even then the overall
result is forced to fail: a loopback run proves phone-size layout only,
never that the public DEV address opens.

Besides pass/fail per step, every page visited is checked for the four
phone failure kinds JOB-3359 names: text cut off (an element's content
overflows its own box), horizontal scroll (the page is wider than the
viewport), a button out of reach (its tap target falls outside the
viewport width, or is smaller than 44px and so unreliable to tap), and an
error shown (a blocked-session message, an "Unknown host" routing error,
or a stack trace left visible).

Writes results.json and one screenshot per step to --out-dir, the shape
o-uat-run already expects.
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
import socket
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PHONE_VIEWPORT = {"width": 390, "height": 844}

# JOB-3949: every walk since JOB-3466 has run against a loopback
# substitute (no live DEV address existed), and the resulting "pass" was
# then carried, unqualified, into docs/PHONE_WALK_*.md's "WALK: pass"
# marker and from there into the ready card's "READY: walked ... and
# passed" headline -- even on days the sheet's own "Address (DEV)" line
# said the public address did not answer. A walk of a substitute proves
# nothing about whether the public address opens, so it must never be
# allowed to produce the same unqualified "pass" signal.
def _is_loopback_host(host: str) -> bool:
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        pass
    try:
        return all(
            ipaddress.ip_address(addr[4][0]).is_loopback
            for addr in socket.getaddrinfo(host, None)
        )
    except socket.gaierror:
        return False

# A long, unbroken (no spaces) but realistic-looking company name. The
# /center customers table has no word-break by default, so one customer
# like this is enough to force the whole table -- and with it, the mobile
# layout viewport -- past 390px. A short "Jane Doe" name would never catch
# this; a name a sales rep might actually type (a compound company name)
# will.
LONG_NAME = "GranitCorpIndustrialAutomationSolutionsLtd"


class PhoneWalk:
    def __init__(self, page, out: Path, results: list):
        self.page = page
        self.out = out
        self.results = results
        self.step_no = 0

    def add(self, feature: str, ok: bool, note: str = "", shot: str = "") -> None:
        self.results.append({"feature": feature, "result": "pass" if ok else "fail", "note": str(note)[:300], "screenshot": shot})

    def shot(self, name: str) -> str:
        self.step_no += 1
        fname = f"{self.step_no:02d}-{name}.png"
        self.page.screenshot(path=str(self.out / fname), full_page=True)
        return fname

    def check_phone_page(self, label: str) -> None:
        """The four JOB-3359 failure kinds, on whatever page is currently open."""
        page = self.page
        html = page.content()
        self.add(
            f"{label}: no error shown",
            "Traceback" not in html and "Application error" not in html
            and "Unknown host" not in html,
            "",
        )

        overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        inner_width = page.evaluate("window.innerWidth")
        self.add(
            f"{label}: no horizontal scroll at 390px",
            overflow <= 1 and inner_width <= PHONE_VIEWPORT["width"] + 1,
            f"scrollWidth exceeds viewport by {overflow}px, window.innerWidth={inner_width}",
        )

        cut_off = page.evaluate(
            """() => {
                const bad = [];
                document.querySelectorAll('button, h1, h2, p, label, td, th, li').forEach(el => {
                    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).whiteSpace !== 'normal') {
                        bad.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40));
                    }
                });
                return bad.slice(0, 10);
            }"""
        )
        self.add(f"{label}: no text cut off inside a control", len(cut_off) == 0, cut_off)

        out_of_reach = page.evaluate(
            """(vw) => {
                const bad = [];
                document.querySelectorAll('button').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 && r.height === 0) return;
                    if (r.right > vw + 1 || r.left < -1) bad.push(el.tagName + ':' + (el.textContent || '').trim().slice(0, 20));
                });
                return bad.slice(0, 10);
            }""",
            PHONE_VIEWPORT["width"],
        )
        self.add(f"{label}: every button stays within the 390px width", len(out_of_reach) == 0, out_of_reach)

        small_targets = page.evaluate(
            """() => {
                const bad = [];
                document.querySelectorAll('button, input, textarea').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 && r.height === 0) return;
                    if (r.height > 0 && r.height < 44 - 1) bad.push(el.tagName + ':' + (el.textContent || el.name || el.type || '').trim().slice(0, 20) + ' h=' + r.height.toFixed(0));
                });
                return bad.slice(0, 10);
            }"""
        )
        self.add(f"{label}: tap targets are at least 44px tall", len(small_targets) == 0, small_targets)


def run(base_url: str, out_dir: str, admin_token: str, public_address_confirmed: bool) -> list[dict]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    base = base_url.rstrip("/")

    # JOB-3949: this is the premise the rest of the walk's "pass" rides on.
    # A loopback/local run (--local-fallback) always reports this as a
    # failure, on purpose: whatever else below passes, the overall walk
    # must not come out "0 failures" when it never touched the public DEV
    # address, because that's exactly the gap that let a ready card claim
    # "walked ... and passed" on a day the public address did not open.
    results.append({
        "feature": "Premise: base-url is the public DEV address, not a loopback/local substitute",
        "result": "pass" if public_address_confirmed else "fail",
        "note": "" if public_address_confirmed else (
            f"ran with --local-fallback against {base!r} -- this walk only "
            "exercises phone-size layout, it is NOT evidence the public DEV "
            "address opens and must not be reported as an unqualified pass"
        ),
        "screenshot": "",
    })

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            ctx = browser.new_context(viewport=PHONE_VIEWPORT, is_mobile=True, has_touch=True)
            page = ctx.new_page()
            walk = PhoneWalk(page, out, results)

            # ---- Admin surface really requires AI1-Admin, not just a hit ----
            unauth = page.request.get(base + "/api/admin/customers")
            walk.add(
                "Admin check: /api/admin/customers rejects a request with no admin token",
                unauth.status == 401,
                f"status {unauth.status}",
            )
            wrong = page.request.get(
                base + "/api/admin/customers",
                headers={"authorization": "Bearer wrong-token"},
            )
            walk.add(
                "Admin check: /api/admin/customers rejects the wrong admin token",
                wrong.status == 401,
                f"status {wrong.status}",
            )

            # ---- Step 0: landing page ----
            r = page.goto(base + "/")
            walk.add("Step 0: landing page opens at 390px", r.status == 200, f"status {r.status}")
            walk.shot("landing")
            walk.check_phone_page("Step 0 (landing page)")

            # ---- Step 1: Guy opens /center (empty console, first use) ----
            r = page.goto(base + "/center")
            walk.add("Step 1: /center opens at 390px", r.status == 200, f"status {r.status}")
            walk.shot("center-empty")
            walk.check_phone_page("Step 1 (/center, empty)")

            # ---- Step 2: "Payment received -- activate pass" ----
            page.fill('input[name="name"]', LONG_NAME)
            page.fill('input[name="email"]', "uat-walk@example.test")
            with page.expect_navigation():
                page.click('button[type="submit"]')
            walk.add("Step 2: activating a pass returns to /center with no error", "/center" in page.url, page.url)
            walk.shot("center-after-activate")
            walk.check_phone_page("Step 2 (/center, pass issued)")

            body = page.content()
            walk.add("Step 2: the new customer is listed", LONG_NAME in body, LONG_NAME)

            # /center's own UI has no way to copy the one-time session link
            # (a pre-existing gap, not a phone-size issue -- see the
            # UAT_MANUAL and PHONE_WALK doc); fetch it from the admin API
            # the same way a real backend script would, purely to continue
            # the walk onto the customer-facing screens below.
            customers_resp = page.request.get(
                base + "/api/admin/customers",
                headers={"authorization": f"Bearer {admin_token}"},
            ).json()
            overview = next((o for o in customers_resp["customers"] if o["customer"]["name"] == LONG_NAME), None)
            token = overview["passes"][0]["token"] if overview else None
            walk.add("Step 2: the issued pass's one-time token is resolvable via the admin API", token is not None, "")

            # ---- Step 3: the customer opens the one-time link ----
            if token:
                r = page.goto(f"{base}/session/{token}")
                walk.add("Step 3: /session/<token> opens at 390px", r.status == 200, f"status {r.status}")
                page.wait_for_timeout(300)
                walk.shot("session-start")
                walk.check_phone_page("Step 3 (session start)")

                # ---- Step 4: a short interview ----
                page.fill(
                    "textarea",
                    "Our goal is to let customers book a repair appointment online "
                    "instead of calling, so front-desk staff spend less time on the phone.",
                )
                page.click('button:has-text("Send")')
                page.wait_for_timeout(500)
                walk.shot("session-turn-1")
                walk.check_phone_page("Step 4 (after first interview turn)")

                page.fill(
                    "textarea",
                    "The users are our front-desk staff and walk-in customers, "
                    "about 10 staff and a few hundred customers a month.",
                )
                page.click('button:has-text("Send")')
                page.wait_for_timeout(500)
                walk.shot("session-turn-2")
                walk.check_phone_page("Step 4 (after second interview turn)")

                # ---- Step 5: "End session" ----
                with page.expect_response(lambda resp: "/api/session/end" in resp.url):
                    page.click('button:has-text("End session")')
                page.wait_for_timeout(300)
                walk.shot("session-ended")
                walk.check_phone_page("Step 5 (session ended)")
                ended_body = page.content()
                walk.add("Step 5: the ended-session summary shows a token/cost readout", "Session ended" in ended_body, "")
        finally:
            browser.close()

    (out / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=1))
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--admin-token", default=os.environ.get("ADMIN_API_TOKEN", ""))
    ap.add_argument(
        "--local-fallback",
        action="store_true",
        help=(
            "Acknowledge --base-url is a loopback/local substitute, not the "
            "public DEV address (used when the public address isn't live "
            "yet). The walk still runs, but its overall result is forced to "
            "fail -- it only proves phone-size layout, never that the "
            "public DEV address opens."
        ),
    )
    a = ap.parse_args()
    if not a.admin_token:
        print("no admin token given (ADMIN_API_TOKEN is empty) -- discovery-studio has no AI1-Admin password, "
              "/api/admin/* takes a bearer token instead (lib/admin.ts)")
        return 3

    host = urlparse(a.base_url).hostname or ""
    loopback = _is_loopback_host(host)
    if loopback and not a.local_fallback:
        print(
            f"--base-url {a.base_url!r} resolves to a loopback address -- "
            "this cannot certify that the public DEV address opens. Pass "
            "--local-fallback to run a phone-layout-only check against it "
            "(its result will be reported as a failure, on purpose: it is "
            "not a public-address pass)."
        )
        return 4
    public_address_confirmed = not loopback

    results = run(a.base_url, a.out_dir, a.admin_token, public_address_confirmed)
    n_fail = sum(1 for r in results if r["result"] == "fail")
    print(f"phone walk: {len(results) - n_fail} pass, {n_fail} fail of {len(results)}")
    return 0 if not n_fail else 1


if __name__ == "__main__":
    raise SystemExit(main())
