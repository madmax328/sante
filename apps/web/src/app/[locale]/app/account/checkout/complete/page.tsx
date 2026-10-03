import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAppUser } from "@/lib/app-user";
import { isPremium } from "@/lib/premium";
import { refreshSubscription, startTrial } from "@/lib/stripe";

/**
 * Stripe sends the user back here after a bank check (3-D Secure, bank redirect).
 * Premium is only granted if Stripe confirms the payment or the saved card.
 */
export default async function CheckoutCompletePage({ searchParams }: PageProps<"/[locale]/app/account/checkout/complete">) {
  const user = await requireAppUser();
  const locale = await getLocale();
  const sp = await searchParams;
  let active = isPremium(user.profile);
  if (!active) {
    try {
      if (typeof sp.sub === "string" && /^sub_[A-Za-z0-9]+$/.test(sp.sub)) active = await refreshSubscription(user.userId, sp.sub);
      else if (typeof sp.setup_intent === "string" && /^seti_[A-Za-z0-9]+$/.test(sp.setup_intent)) active = await startTrial(user.userId, sp.setup_intent);
    } catch (e) {
      console.error(e);
    }
  }
  const status = active ? "success" : sp.redirect_status === "succeeded" ? "pending" : "cancel";
  redirect({ href: `/app/account?checkout=${status}`, locale });
}
