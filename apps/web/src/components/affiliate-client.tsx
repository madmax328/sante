"use client";

import { Check, Copy, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { applyAffiliateAction, referralCodeAction } from "@/app/[locale]/app/affiliate/actions";
import { useRouter } from "@/i18n/navigation";
import { Button, Input, Select, Textarea } from "./ui";

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "x", "twitch", "pinterest", "snapchat", "blog", "other"] as const;
type Platform = (typeof PLATFORMS)[number];
interface Row {
  platform: Platform;
  url: string;
  followers: string;
}

/** Application to the programme: social networks (looked at before approval) and a few words. */
export function AffiliateForm({ initial, update }: { initial?: { socials: { platform: string; url: string; followers?: number }[]; message?: string }; update: boolean }) {
  const t = useTranslations("affiliate");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    initial?.socials.length
      ? initial.socials.map((s) => ({ platform: (PLATFORMS as readonly string[]).includes(s.platform) ? (s.platform as Platform) : "other", url: s.url, followers: s.followers !== undefined ? String(s.followers) : "" }))
      : [{ platform: "instagram", url: "", followers: "" }],
  );
  const [message, setMessage] = useState(initial?.message ?? "");
  const [accept, setAccept] = useState(update);
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const socials = rows
      .filter((r) => r.url.trim())
      .map((r) => {
        const n = Number(r.followers.replace(/[\s.,]/g, ""));
        return { platform: r.platform, url: r.url.trim(), ...(r.followers.trim() && Number.isFinite(n) ? { followers: Math.round(n) } : {}) };
      });
    if (!socials.length || !accept) return setState("error");
    start(async () => {
      const res = await applyAffiliateAction({ socials, message: message.trim() || undefined, accept: true });
      setState(res.ok ? "sent" : "error");
      if (res.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[10rem_1fr_9rem_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              {t("platform")}
              <Select value={r.platform} onChange={(e) => set(i, { platform: e.target.value as Platform })}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{t(`platform_${p}`)}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {t("url")}
              <Input value={r.url} onChange={(e) => set(i, { url: e.target.value })} maxLength={300} placeholder="https://… / @…" required={i === 0} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {t("followers")}
              <Input value={r.followers} onChange={(e) => set(i, { followers: e.target.value })} inputMode="numeric" placeholder="12000" />
            </label>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t("remove")}>
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
        {rows.length < 8 && (
          <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => setRows([...rows, { platform: "tiktok", url: "", followers: "" }])}>
            <Plus className="size-4" /> {t("addSocial")}
          </Button>
        )}
      </div>
      <label className="grid gap-1 text-sm font-semibold">
        {t("message")}
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
      </label>
      {!update && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-[var(--basilic)]" />
          <span>{t("accept")}</span>
        </label>
      )}
      {state === "error" && <p role="alert" className="text-sm text-danger">{t("error")}</p>}
      {state === "sent" && <p role="status" className="text-sm text-basilic">{t("sent")}</p>}
      <Button type="submit" variant="accent" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="size-4 animate-spin" />} {update ? t("update") : t("send")}
      </Button>
    </form>
  );
}

/** The affiliate's link or code, with a copy button. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("affiliate");
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // Clipboard refused: the text stays selectable.
    }
  };
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-riz px-3 py-2 text-sm">{value}</code>
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? t("copied") : t("copy")}
        </Button>
      </div>
    </div>
  );
}

/** "A creator told me about Sorloo": a code typed after sign-up. */
export function ReferralCodeForm() {
  const t = useTranslations("affiliate");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    start(async () => {
      const res = await referralCodeAction({ code });
      if (res.ok) router.refresh();
      else setError(t(`ref_${res.error === "already" || res.error === "self" || res.error === "too_late" ? res.error : "invalid"}`));
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t("refPlaceholder")} maxLength={20} className="max-w-xs" aria-label={t("refPlaceholder")} />
        <Button type="submit" variant="secondary" disabled={pending || !code.trim()}>
          {pending && <Loader2 className="size-4 animate-spin" />} {t("refSend")}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
