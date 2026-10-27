"use client";

import { Check, Copy, Loader2, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { referralCodeAction } from "@/app/[locale]/app/affiliate/actions";
import { applyAction, forgotAction, loginAction, logoutAction, requestPayoutAction, savePayoutAction, setPasswordAction } from "@/app/[locale]/(site)/affiliates/actions";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, Input, Select, Textarea } from "./ui";

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "x", "twitch", "pinterest", "snapchat", "blog", "other"] as const;
type Platform = (typeof PLATFORMS)[number];
interface Row {
  platform: Platform;
  url: string;
  followers: string;
}

const Label = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="grid gap-1 text-sm font-semibold">
    {label}
    {children}
  </label>
);
const Alert = ({ children }: { children: React.ReactNode }) => <p role="alert" className="text-sm text-danger">{children}</p>;

/** Application from the public page: who they are, their social networks (looked at before approval). */
export function ApplicationForm() {
  const t = useTranslations("affiliate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<Row[]>([{ platform: "instagram", url: "", followers: "" }]);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [accept, setAccept] = useState(false);
  const [state, setState] = useState<"idle" | "sent" | "error" | "already" | "rate">("idle");
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  if (state === "sent") {
    return (
      <div role="status" className="grid gap-1 rounded-2xl bg-basilic-soft p-4">
        <p className="font-bold">{t("sentTitle")}</p>
        <p className="text-sm">{t("sentText")}</p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const socials = rows
      .filter((r) => r.url.trim())
      .map((r) => {
        const n = Number(r.followers.replace(/[\s.,]/g, ""));
        return { platform: r.platform, url: r.url.trim(), ...(r.followers.trim() && Number.isFinite(n) ? { followers: Math.round(n) } : {}) };
      });
    if (!socials.length || !accept || !name.trim() || !email.trim()) return setState("error");
    start(async () => {
      const res = await applyAction({ name, email, socials, message: message.trim() || undefined, accept: true, website });
      setState(res.ok ? "sent" : res.error === "already" ? "already" : res.error === "rate" ? "rate" : "error");
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label={t("name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" required />
        </Label>
        <Label label={t("email")}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" required />
        </Label>
      </div>
      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[10rem_1fr_9rem_auto] sm:items-end">
            <Label label={t("platform")}>
              <Select value={r.platform} onChange={(e) => set(i, { platform: e.target.value as Platform })}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{t(`platform_${p}`)}</option>
                ))}
              </Select>
            </Label>
            <Label label={t("url")}>
              <Input value={r.url} onChange={(e) => set(i, { url: e.target.value })} maxLength={300} placeholder="https://… / @…" required={i === 0} />
            </Label>
            <Label label={t("followers")}>
              <Input value={r.followers} onChange={(e) => set(i, { followers: e.target.value })} inputMode="numeric" placeholder="12000" />
            </Label>
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
      <Label label={t("message")}>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
      </Label>
      {/* Left empty by people, filled in by bots. */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-[var(--basilic)]" />
        <span>{t("accept")}</span>
      </label>
      {state === "error" && <Alert>{t("error")}</Alert>}
      {state === "rate" && <Alert>{t("errorRate")}</Alert>}
      {state === "already" && (
        <Alert>
          {t("errorAlready")} <Link href="/affiliates/login" className="font-semibold underline">{t("login")}</Link>
        </Alert>
      )}
      <Button type="submit" variant="accent" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="size-4 animate-spin" />} {t("send")}
      </Button>
    </form>
  );
}

export function LoginForm() {
  const t = useTranslations("affiliate");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await loginAction({ email, password });
      if (res.ok) router.push("/affiliates/dashboard");
      else setError(res.error === "rate" ? t("errorRate") : t("loginError"));
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-3">
      <Label label={t("email")}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Label>
      <Label label={t("password")}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Label>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t("login")}
      </Button>
      <Link href="/affiliates/forgot" className="text-sm font-semibold text-basilic">{t("forgotLink")}</Link>
    </form>
  );
}

export function ForgotForm() {
  const t = useTranslations("affiliate");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "rate">("idle");
  const [pending, start] = useTransition();
  if (state === "sent") return <p role="status" className="rounded-2xl bg-basilic-soft p-4 text-sm">{t("forgotSent")}</p>;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await forgotAction({ email });
      setState(res.ok ? "sent" : "rate");
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-3">
      <Label label={t("email")}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </Label>
      {state === "rate" && <Alert>{t("errorRate")}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t("forgotSend")}
      </Button>
    </form>
  );
}

export function PasswordForm({ id, token, min }: { id: string; token: string; min: number }) {
  const t = useTranslations("affiliate");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < min) return setError(t("passwordShort", { min }));
    if (password !== confirm) return setError(t("passwordMismatch"));
    start(async () => {
      const res = await setPasswordAction({ id, token, password });
      if (res.ok) router.push("/affiliates/dashboard");
      else setError(res.error === "short" ? t("passwordShort", { min }) : t("passwordExpired"));
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-3">
      <Label label={t("password")}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={min} required />
      </Label>
      <Label label={t("passwordConfirm")}>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={min} required />
      </Label>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t("passwordSave")}
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const t = useTranslations("affiliate");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logoutAction();
          router.push("/affiliates/login");
        })
      }
    >
      {t("logout")}
    </Button>
  );
}

/** Countries where a bank account can be (those with an IBAN). */
const COUNTRIES = ["FR", "BE", "LU", "CH", "MC", "DE", "AT", "NL", "IE", "GB", "ES", "PT", "IT", "AD", "BG", "CY", "CZ", "DK", "EE", "FI", "GR", "HR", "HU", "IS", "LI", "LT", "LV", "MT", "NO", "PL", "RO", "SE", "SI", "SK", "SM"];

export interface PayoutProfileView {
  kind: "individual" | "business";
  legalName: string;
  address: { line1: string; line2?: string; postalCode: string; city: string; country: string };
  siret?: string;
  vat?: "franchise" | "fr_vat" | "eu_reverse";
  vatNumber?: string;
  mandateAccepted: boolean;
  holder: string;
  ibanMasked: string;
}

/** How the affiliate is paid: individual or professional, address, and the bank account. */
export function PayoutProfileForm({ initial, defaultName }: { initial: PayoutProfileView | null; defaultName: string }) {
  const t = useTranslations("affiliate");
  const locale = useLocale();
  const router = useRouter();
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);
  const [kind, setKind] = useState(initial?.kind ?? "individual");
  const [legalName, setLegalName] = useState(initial?.legalName ?? defaultName);
  const [address, setAddress] = useState(initial?.address ?? { line1: "", line2: "", postalCode: "", city: "", country: "FR" });
  const [siret, setSiret] = useState(initial?.siret ?? "");
  const [vat, setVat] = useState(initial?.vat ?? "franchise");
  const [vatNumber, setVatNumber] = useState(initial?.vatNumber ?? "");
  const [mandate, setMandate] = useState(initial?.mandateAccepted ?? false);
  const [holder, setHolder] = useState(initial?.holder ?? defaultName);
  const [iban, setIban] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "saved" | "error"; error?: string }>({ kind: "idle" });
  const [pending, start] = useTransition();
  const business = kind === "business";
  const needsVatNumber = business && (vat !== "franchise" || address.country !== "FR");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await savePayoutAction({
        kind,
        legalName,
        address,
        ...(business ? { siret, vat, vatNumber, acceptMandate: mandate } : {}),
        holder,
        iban: iban.trim() || undefined,
      });
      if (res.ok) {
        setIban("");
        setState({ kind: "saved" });
        router.refresh();
      } else setState({ kind: "error", error: t(`err_${["iban", "siret", "vat_number", "mandate"].includes(res.error ?? "") ? res.error : "invalid"}`) });
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {(["individual", "business"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${kind === k ? "border-basilic bg-basilic-soft" : "border-line"}`}>
            {k === "individual" ? t("kindIndividual") : t("kindBusiness")}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{business ? t("kindBusinessHint") : t("kindIndividualHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label={business ? t("legalNameBusiness") : t("legalNameIndividual")}>
          <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120} required />
        </Label>
        <Label label={t("country")}>
          <Select value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{names?.of(c) ?? c}</option>
            ))}
          </Select>
        </Label>
        <Label label={t("line1")}>
          <Input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} maxLength={150} autoComplete="address-line1" required />
        </Label>
        <Label label={t("line2")}>
          <Input value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} maxLength={150} autoComplete="address-line2" />
        </Label>
        <Label label={t("postalCode")}>
          <Input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} maxLength={12} autoComplete="postal-code" required />
        </Label>
        <Label label={t("city")}>
          <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} maxLength={80} autoComplete="address-level2" required />
        </Label>
      </div>
      {business && (
        <div className="grid gap-3 rounded-xl border border-line p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {address.country === "FR" && (
              <Label label={t("siret")}>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} inputMode="numeric" maxLength={20} required />
              </Label>
            )}
            <Label label={t("vat")}>
              <Select value={vat} onChange={(e) => setVat(e.target.value as typeof vat)}>
                {(["franchise", "fr_vat", "eu_reverse"] as const).map((v) => (
                  <option key={v} value={v}>{t(`vat_${v}`)}</option>
                ))}
              </Select>
            </Label>
            {needsVatNumber && (
              <Label label={t("vatNumber")}>
                <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value.toUpperCase())} maxLength={20} placeholder="FR12345678901" required />
              </Label>
            )}
          </div>
          {!initial?.mandateAccepted && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={mandate} onChange={(e) => setMandate(e.target.checked)} className="mt-0.5 size-4 accent-[var(--basilic)]" />
              <span>{t("mandate")}</span>
            </label>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label={t("holder")}>
          <Input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} required />
        </Label>
        <Label label={t("iban")}>
          <Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} maxLength={50} autoComplete="off" placeholder={initial?.ibanMasked ?? "FR76 …"} required={!initial} />
        </Label>
      </div>
      {initial && <p className="text-xs text-muted">{t("ibanSaved", { iban: initial.ibanMasked })}</p>}
      {state.kind === "error" && <Alert>{state.error}</Alert>}
      {state.kind === "saved" && <p role="status" className="text-sm text-basilic">{t("payoutSaved")}</p>}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="size-4 animate-spin" />} {t("savePayout")}
      </Button>
    </form>
  );
}

/** "Ask for my payout": unlocked from the minimum available, with the details of payment saved. */
export function PayoutRequestButton({ currency, enabled, label }: { currency: string; enabled: boolean; label: string }) {
  const t = useTranslations("affiliate");
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, start] = useTransition();
  const click = () =>
    start(async () => {
      const res = await requestPayoutAction({ currency });
      if (res.ok) {
        setMessage({ ok: true, text: t("requestDone") });
        router.refresh();
      } else setMessage({ ok: false, text: res.error === "profile" ? t("requestNeedsProfile") : t("requestMinimum") });
    });
  return (
    <div className="grid gap-2">
      <Button variant="accent" onClick={click} disabled={!enabled || pending} className="justify-self-start">
        {pending && <Loader2 className="size-4 animate-spin" />} {label}
      </Button>
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-basilic" : "text-danger"}`}>{message.text}</p>}
    </div>
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
