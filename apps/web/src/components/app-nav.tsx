"use client";

import { BookOpen, CalendarDays, Dumbbell, House, LineChart, MessageCircle, NotebookPen, ShoppingBasket, UserRound, Warehouse } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "./ui";

const ITEMS = [
  { href: "/app", key: "today", icon: House, mobile: true },
  { href: "/app/week", key: "week", icon: CalendarDays, mobile: true },
  { href: "/app/groceries", key: "groceries", icon: ShoppingBasket, mobile: true },
  { href: "/app/recipes", key: "recipes", icon: BookOpen, mobile: false },
  { href: "/app/pantry", key: "pantry", icon: Warehouse, mobile: false },
  { href: "/app/journal", key: "journal", icon: NotebookPen, mobile: false },
  { href: "/app/sport", key: "sport", icon: Dumbbell, mobile: true },
  { href: "/app/progress", key: "progress", icon: LineChart, mobile: false },
  { href: "/app/coach", key: "coach", icon: MessageCircle, mobile: true },
  { href: "/app/account", key: "account", icon: UserRound, mobile: false },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function SideNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav className="grid gap-1" aria-label={t("label")}>
      {ITEMS.map(({ href, key, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cx(
            "flex items-center gap-3 rounded-xl px-3 py-2 font-semibold transition-colors",
            isActive(pathname, href) ? "bg-basilic-soft text-basilic" : "text-muted hover:bg-surface-2 hover:text-encre",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
      aria-label={t("label")}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.filter((i) => i.mobile).map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cx(
              "grid justify-items-center gap-0.5 py-2 text-[0.7rem] font-semibold",
              isActive(pathname, href) ? "text-basilic" : "text-muted",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {t(key)}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function MobileMoreLinks() {
  const t = useTranslations("nav");
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      {ITEMS.filter((i) => !i.mobile).map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted">
          <Icon className="size-4" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </div>
  );
}
