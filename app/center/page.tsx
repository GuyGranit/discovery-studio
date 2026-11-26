import { cookies } from "next/headers";
import { customerOverviews } from "@/lib/pass";
import { ADMIN_SESSION_COOKIE, AI1_ADMIN_EMAIL, isAi1AdminSession } from "@/lib/admin";
import { activatePass, adminLogin, adminLogout } from "./actions";

// Guy's customer/pass list changes every time a pass is issued or a
// session runs — never prerender this page at build time.
export const dynamic = "force-dynamic";

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export default async function CenterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!isAi1AdminSession(session)) {
    const { error } = await searchParams;
    return (
      <main>
        <h1>Center</h1>
        <section>
          <h2>AI1-Admin sign-in</h2>
          <form action={adminLogin}>
            <label>
              Email
              <input type="email" name="email" defaultValue={AI1_ADMIN_EMAIL} required />
            </label>
            <label>
              Password
              <input type="password" name="password" required />
            </label>
            <button type="submit">Sign in</button>
          </form>
          {error && <p role="alert">Wrong e-mail or password.</p>}
        </section>
      </main>
    );
  }

  const overviews = await customerOverviews();

  return (
    <main>
      <h1>Center</h1>

      <form action={adminLogout}>
        <button type="submit">Sign out</button>
      </form>

      <section>
        <h2>Payment received — activate pass</h2>
        <form action={activatePass}>
          <label>
            Customer name
            <input type="text" name="name" required />
          </label>
          <label>
            Email (optional)
            <input type="email" name="email" />
          </label>
          <button type="submit">Payment received — activate pass</button>
        </form>
      </section>

      <section>
        <h2>Customers</h2>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Pass state</th>
              <th>Sessions remaining</th>
              <th>Days remaining</th>
              <th>Token budget remaining</th>
              <th>Cost to date</th>
            </tr>
          </thead>
          <tbody>
            {overviews.map(({ customer, passes, costToDateUsd }) =>
              passes.length === 0 ? (
                <tr key={customer.customerId}>
                  <td>{customer.name}</td>
                  <td colSpan={5}>no pass issued</td>
                </tr>
              ) : (
                passes.map((pass) => (
                  <tr key={pass.passId}>
                    <td>{customer.name}</td>
                    <td>{pass.state}</td>
                    <td>
                      {pass.sessionsRemaining} / {pass.sessionsTotal}
                    </td>
                    <td>{pass.remainingDays}</td>
                    <td>
                      {pass.tokenBudgetRemaining} / {pass.tokenBudget}
                    </td>
                    <td>{formatUsd(costToDateUsd)}</td>
                  </tr>
                ))
              ),
            )}
          </tbody>
        </table>
        </div>
      </section>
    </main>
  );
}
