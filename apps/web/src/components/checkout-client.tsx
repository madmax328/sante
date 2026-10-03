"use client";

import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Lock, Loader2 } from "lucide-react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "@/i18n/navigation";
import { confirmSubscriptionAction } from "@/app/[locale]/app/account/actions";
import { Button } from "./ui";

/** Stripe's card form, dressed in the Weeko brand (colors, font, radius). */
function weekoAppearance(dark: boolean): Appearance {
  const c = dark
    ? { primary: "#4fbf95", bg: "#18201d", text: "#eaf0ec", muted: "#9aaaa2", line: "#2a3531", danger: "#f07a72" }
    : { primary: "#1e6b52", bg: "#ffffff", text: "#17201c", muted: "#5c6b64", line: "#dce3de", danger: "#c2413a" };
  return {
    theme: dark ? "night" : "stripe",
    variables: {
      colorPrimary: c.primary,
      colorBackground: c.bg,
      colorText: c.text,
      colorTextSecondary: c.muted,
      colorDanger: c.danger,
      fontFamily: "Figtree, 'Segoe UI', system-ui, sans-serif",
      fontSizeBase: "15px",
      borderRadius: "12px",
      spacingUnit: "4px",
      focusBoxShadow: `0 0 0 3px ${c.primary}33`,
    },
    rules: {
      ".Input": { border: `1px solid ${c.line}`, boxShadow: "none", padding: "12px" },
      ".Input:focus": { borderColor: c.primary },
      ".Label": { fontWeight: "600", color: c.text },
      ".Tab": { border: `1px solid ${c.line}`, boxShadow: "none" },
      ".Tab--selected": { borderColor: c.primary, color: c.primary },
    },
  };
}

interface Props {
  publishableKey: string;
  clientSecret: string;
  intent: "payment" | "setup";
  subscriptionId: string;
  amount: number;
  currency: string;
  trialDays: number;
  returnUrl: string;
}

export function SubscribeForm(props: Props) {
  const stripePromise = useMemo(() => loadStripe(props.publishableKey), [props.publishableKey]);
  const locale = useLocale();
  const [dark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: weekoAppearance(dark),
        locale: locale === "en" ? "en" : "fr",
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&display=swap" }],
      }}
    >
      <PayForm {...props} />
    </Elements>
  );
}

function PayForm({ intent, subscriptionId, amount, currency, trialDays, returnUrl }: Props) {
  const t = useTranslations("checkout");
  const format = useFormatter();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setError(undefined);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setPending(false);
      return;
    }
    const params = { elements, confirmParams: { return_url: returnUrl }, redirect: "if_required" as const };
    const result = intent === "payment" ? await stripe.confirmPayment(params) : await stripe.confirmSetup(params);
    if (result.error) {
      setError(result.error.type === "card_error" || result.error.type === "validation_error" ? result.error.message : t("genericError"));
      setPending(false);
      return;
    }
    await confirmSubscriptionAction(subscriptionId);
    router.push("/app/account?checkout=success");
    router.refresh();
  }

  const price = format.number(amount, { style: "currency", currency });
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs", business: { name: "Weeko" } }} />
      {!ready && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />{t("loading")}</p>}
      {error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="accent" size="lg" disabled={!stripe || !ready || pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {pending ? t("processing") : trialDays > 0 ? t("startTrial", { days: trialDays }) : t("pay", { price })}
      </Button>
      <p className="text-center text-xs text-muted">{t("secure")}</p>
    </form>
  );
}
