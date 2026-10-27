"use server";

import { revalidatePath } from "next/cache";
import { attachReferral } from "@/lib/affiliates";
import { getSession } from "@/lib/session";

/** "A creator told me about Sorloo": the code typed after sign-up. */
export async function referralCodeAction(input: { code: string }): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await attachReferral(session.user.id, String(input?.code ?? ""), { late: true, email: session.user.email });
  if (res !== "ok") return { ok: false, error: res };
  revalidatePath("/app/account", "page");
  return { ok: true };
}
