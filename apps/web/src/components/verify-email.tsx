"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

/** Reminder shown until the address is confirmed, with a resend button. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("verify");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const resend = async () => {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/app" });
    setState(error ? "error" : "sent");
  };
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-miel-soft p-4 text-sm" role="status">
      <MailCheck className="size-5 shrink-0 text-encre" aria-hidden />
      <p className="min-w-0 flex-1">{t("text", { email })}</p>
      {state === "sent" ? (
        <span className="font-semibold text-basilic">{t("sent")}</span>
      ) : (
        <button type="button" onClick={resend} disabled={state === "sending"} className="font-semibold text-basilic underline underline-offset-2">
          {t("resend")}
        </button>
      )}
      {state === "error" && <span className="w-full font-semibold text-danger">{t("error")}</span>}
    </div>
  );
}
