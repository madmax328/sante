"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminSignIn, adminSignOut, isAdmin } from "@/lib/admin-auth";
import { deleteUsers } from "@/lib/admin-users";

const MESSAGES = {
  invalid: "E-mail ou mot de passe incorrect.",
  rate: "Trop d'essais. Réessaie dans 15 minutes.",
  unconfigured: "L'accès administrateur n'est pas configuré : ajoute ADMIN_EMAIL et ADMIN_PASSWORD sur Vercel, puis redéploie.",
} as const;

export async function adminLoginAction(_prev: string | undefined, form: FormData): Promise<string | undefined> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "unknown";
  const res = await adminSignIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""), ip);
  if (res !== "ok") return MESSAGES[res];
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await adminSignOut();
  redirect("/admin/login");
}


/** Deletes the selected accounts (never subscribers). */
export async function deleteUsersAction(ids: string[]): Promise<{ deleted: number; skipped: number }> {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) return { deleted: 0, skipped: 0 };
  const result = await deleteUsers(ids);
  revalidatePath("/admin", "layout");
  return result;
}
