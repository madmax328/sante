"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Input } from "./ui";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function LoginForm({ google }: { google: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.status === 401 ? t("errors.invalid") : t("errors.generic"));
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="text-2xl font-extrabold">{t("loginTitle")}</h1>
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <ErrorText message={error} />
      <Button type="submit" disabled={pending}>{pending ? t("pending") : t("loginCta")}</Button>
      {google && <GoogleButton label={t("google")} />}
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-encre">{t("forgot")}</Link>
        <Link href="/signup" className="font-semibold text-basilic">{t("noAccount")}</Link>
      </div>
    </form>
  );
}

export function SignupForm({ google }: { google: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!fd.get("terms")) {
      setError(t("errors.terms"));
      return;
    }
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signUp.email({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.code === "USER_ALREADY_EXISTS" || error.status === 422 ? t("errors.exists") : error.code === "PASSWORD_TOO_SHORT" ? t("errors.short") : t("errors.generic"));
      return;
    }
    router.push("/app/welcome");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="text-2xl font-extrabold">{t("signupTitle")}</h1>
      <p className="text-sm text-muted">{t("signupSubtitle")}</p>
      <Field label={t("name")} htmlFor="name">
        <Input id="name" name="name" autoComplete="given-name" required maxLength={60} />
      </Field>
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1 size-4 accent-[var(--basilic)]" />
        <span>
          {t.rich("acceptTerms", {
            terms: (c) => <Link href="/legal/terms" className="underline" target="_blank">{c}</Link>,
            privacy: (c) => <Link href="/legal/privacy" className="underline" target="_blank">{c}</Link>,
          })}
        </span>
      </label>
      <ErrorText message={error} />
      <Button type="submit" variant="accent" disabled={pending}>{pending ? t("pending") : t("signupCta")}</Button>
      {google && <GoogleButton label={t("google")} />}
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-basilic">{t("haveAccount")}</Link>
      </p>
    </form>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/app" })}
    >
      {label}
    </Button>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    await authClient.requestPasswordReset({ email: String(fd.get("email")), redirectTo: "/reset-password" });
    setPending(false);
    setSent(true);
  }
  if (sent) return <p>{t("resetSent")}</p>;
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="text-2xl font-extrabold">{t("forgotTitle")}</h1>
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </Field>
      <Button type="submit" disabled={pending}>{t("sendLink")}</Button>
      <Link href="/login" className="text-center text-sm text-muted">{t("backToLogin")}</Link>
    </form>
  );
}

export function ResetForm({ token }: { token?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string>();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await authClient.resetPassword({ newPassword: String(fd.get("password")), token });
    if (error) return setError(t("errors.resetInvalid"));
    router.push("/login");
  }
  if (!token) return <ErrorText message={t("errors.resetInvalid")} />;
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="text-2xl font-extrabold">{t("resetTitle")}</h1>
      <Field label={t("newPassword")} htmlFor="password" hint={t("passwordHint")}>
        <Input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
      </Field>
      <ErrorText message={error} />
      <Button type="submit">{t("resetCta")}</Button>
    </form>
  );
}
