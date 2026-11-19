import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");

/**
 * Guards the phone-size fixes from the JOB-3359 UAT walk: tap targets must
 * stay at least 44px tall, and the /center customers table must not be able
 * to blow out a 390px viewport. These are layout/CSS facts a jsdom-based
 * render can't observe (jsdom doesn't run real layout), so this checks the
 * stylesheet's source instead -- same approach as tests/deploy.test.ts for
 * docker-compose.yml. The actual visual/behavioral check is
 * tools/uat/phone_walk.py, a real-Chromium walk at 390x844.
 */
describe("phone-size CSS invariants (JOB-3359)", () => {
  const css = readFileSync(path.join(repoRoot, "app/globals.css"), "utf8");

  it("app/layout.tsx imports the global stylesheet", () => {
    const layout = readFileSync(path.join(repoRoot, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/import\s+["']\.\/globals\.css["']/);
  });

  it("gives every input/button/textarea a >=44px tap target", () => {
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("breaks long words in table cells instead of letting them force the table wide", () => {
    expect(css).toMatch(/word-break:\s*break-word/);
  });

  it("wraps the customers table in a locally-scrollable container", () => {
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/);
    const centerPage = readFileSync(path.join(repoRoot, "app/center/page.tsx"), "utf8");
    expect(centerPage).toMatch(/className="table-scroll"/);
  });
});
