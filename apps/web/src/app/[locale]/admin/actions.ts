"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminSignIn, adminSignOut } from "@/lib/admin-auth";

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
