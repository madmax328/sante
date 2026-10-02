import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { loadUserContext, type UserContext } from "./planning";
import { db } from "./db";
import { ensureProfile, getProfile } from "./repo";
import { getSession } from "./session";
import type { Profile } from "./types";

export interface AppUser {
  userId: string;
  name: string;
  email: string;
  profile: Profile;
}

/** Signed-in user for app pages; redirects to the login page otherwise. */
export async function requireAppUser(): Promise<AppUser> {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/login", locale });
  let profile = await getProfile(session.user.id);
  if (!profile) {
    // A cached session can outlive a deleted account: only create profiles for real users.
    const { ObjectId } = await import("mongodb");
    const id = session.user.id;
    const exists = await db.collection("user").countDocuments({ _id: (ObjectId.isValid(id) ? new ObjectId(id) : id) as never }, { limit: 1 });
    if (!exists) return redirect({ href: "/login", locale });
    profile = await ensureProfile(id, locale === "en" ? "en" : "fr");
  }
  return { userId: session.user.id, name: session.user.name, email: session.user.email, profile };
}

/** Like requireAppUser, and sends users who have not finished onboarding to it. */
export async function requireContext(): Promise<AppUser & { uc: UserContext }> {
  const user = await requireAppUser();
  const locale = await getLocale();
  if (!user.profile.onboarded) return redirect({ href: "/app/welcome", locale });
  const uc = await loadUserContext(user.userId);
  if (!uc) return redirect({ href: "/app/welcome", locale });
  return { ...user, uc };
}
