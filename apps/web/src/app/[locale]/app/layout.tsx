import { getTranslations } from "next-intl/server";
import { BottomNav, MobileMoreLinks, SideNav } from "@/components/app-nav";
import { Badge, Logo } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { requireAppUser } from "@/lib/app-user";
import { dayIndex, todayIn } from "@/lib/dates";
import { isPremium } from "@/lib/premium";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();
  const t = await getTranslations("nav");
  const today = dayIndex(todayIn(user.profile.timeZone));
  const premium = isPremium(user.profile);
  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line px-4 py-6 lg:flex">
        <Link href="/app" aria-label="Weeko">
          <Logo today={today} />
        </Link>
        <SideNav />
        <div className="mt-auto grid gap-2 rounded-2xl bg-surface p-3 text-sm">
          <p className="truncate font-semibold">{user.name}</p>
          {premium ? (
            <Badge tone="basilic" className="justify-self-start">Premium</Badge>
          ) : (
            <Link href="/app/account" className="font-semibold text-abricot-strong">{t("upgrade")}</Link>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <Link href="/app" aria-label="Weeko">
            <Logo today={today} />
          </Link>
          {!premium && (
            <Link href="/app/account" className="text-sm font-semibold text-abricot-strong">{t("upgrade")}</Link>
          )}
        </div>
        <div className="mb-5 lg:hidden">
          <MobileMoreLinks />
        </div>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
