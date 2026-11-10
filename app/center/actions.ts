"use server";

import { revalidatePath } from "next/cache";
import { issuePass } from "@/lib/pass";

/**
 * Server action behind the "activate pass" button on the payment-received
 * card. /center sits behind its own Cloudflare Access application
 * restricted to Guy's email in production, so no further auth check runs
 * here — this is Guy's console, not a public surface.
 */
export async function activatePass(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name) return;

  await issuePass(name, email || undefined);
  revalidatePath("/center");
}
