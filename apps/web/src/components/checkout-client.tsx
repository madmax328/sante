"use client";

import { useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Lock, Loader2 } from "lucide-react";
import { loadStripe, type Appearance } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "@/i18n/navigation";
import { completeCheckoutAction, prepareCheckoutAction } from "@/app/[locale]/app/account/actions";
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
  plan: "monthly" | "yearly";
  /** Minor units (699 for 6,99 €) */
  amountMinor: number;
  currency: string;
  trialDays: number;
  /** Where Stripe sends the user back after a bank check (3-D Secure) */
  completeUrl: string;
}

/**
 * The card form is shown before anything exists in Stripe ("deferred intent"):
 * the subscription, or the card setup for a trial, is only created when the
 * user submits valid card details. Viewing or switching plans creates nothing.
 */
export function SubscribeForm(props: Props) {
  const stripePromise = useMemo(() => loadStripe(props.publishableKey), [props.publishableKey]);
  const locale = useLocale();
  const [dark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const currency = props.currency.toLowerCase();
  return (
    <Elements
      stripe={stripePromise}
      options={{
        ...(props.trialDays > 0
          ? { mode: "setup" as const, currency }
          : { mode: "subscription" as const, amount: props.amountMinor, currency }),
        // Must match the server side exactly (card, incl. Apple Pay / Google Pay).
        allowedPaymentMethodTypes: ["card"],
        appearance: weekoAppearance(dark),
        locale: locale === "en" ? "en" : "fr",
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&display=swap" }],
      }}
    >
      <PayForm {...props} />
    </Elements>
  );
}

function PayForm({ plan, amountMinor, currency, trialDays, completeUrl }: Props) {
  const t = useTranslations("checkout");
  const format = useFormatter();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [ref, setRef] = useState<string>();

  function fail(message?: string, ref?: string) {
    setError(message ?? t("genericError"));
    setRef(ref);
    setPending(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setError(undefined);
    // 1. Card details are checked first: nothing is created if they are incomplete.
    const { error: submitError } = await elements.submit();
    if (submitError) return fail(submitError.message);
    // 2. Only now does the server create the subscription (or the trial card setup).
    const prepared = await prepareCheckoutAction(plan);
    if (prepared.error === "already") {
      router.push("/app/account");
      return;
    }
    if (!prepared.data) return fail(undefined, prepared.error);
    const data = prepared.data;
    // 3. Stripe charges or verifies the card (with 3-D Secure if the bank asks for it).
    const done = data.kind === "payment" ? { subscriptionId: data.subscriptionId } : { setupIntentId: data.setupIntentId };
    const returnUrl = data.kind === "payment" ? `${completeUrl}?sub=${data.subscriptionId}` : completeUrl;
    const params = { elements, clientSecret: data.clientSecret, confirmParams: { return_url: returnUrl }, redirect: "if_required" as const };
    const result = data.kind === "payment" ? await stripe.confirmPayment(params) : await stripe.confirmSetup(params);
    if (result.error) {
      const userFacing = result.error.type === "card_error" || result.error.type === "validation_error";
      return fail(userFacing ? result.error.message : undefined, userFacing ? undefined : result.error.code ?? result.error.type);
    }
    // 4. Premium is granted by the server, which re-reads the result from Stripe.
    // The card was accepted at this point: if activation lags, the webhook finishes it.
    const completed = await completeCheckoutAction(done);
    router.push(completed.active ? "/app/account?checkout=success" : "/app/account?checkout=pending");
    router.refresh();
  }

  const price = format.number(amountMinor / 100, { style: "currency", currency: currency.toUpperCase() });
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs", business: { name: "Weeko" } }} />
      {!ready && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />{t("loading")}</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
          {ref && <span className="mt-1 block text-xs opacity-80">{t("errorRef", { ref })}</span>}
        </p>
      )}
      <Button type="submit" variant="accent" size="lg" disabled={!stripe || !ready || pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {pending ? t("processing") : trialDays > 0 ? t("startTrial", { days: trialDays }) : t("pay", { price })}
      </Button>
      <p className="text-center text-xs text-muted">{t("secure")}</p>
    </form>
  );
}
