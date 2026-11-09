import { customerOverviews } from "@/lib/pass";
import { activatePass } from "./actions";

// Guy's customer/pass list changes every time a pass is issued or a
// session runs — never prerender this page at build time.
export const dynamic = "force-dynamic";

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export default async function CenterPage() {
  const overviews = await customerOverviews();

  return (
    <main>
      <h1>Center</h1>

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
      </section>
    </main>
  );
}
