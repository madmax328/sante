"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { sendContactAction, type ContactTopic } from "@/app/actions/contact";
import { Button, Field, Input, Select, Textarea } from "./ui";

const TOPICS: ContactTopic[] = ["question", "subscription", "technical", "privacy", "idea"];

/** Contact form: the message lands in the Weeko mailbox, replies go straight to the sender. */
export function ContactForm({ defaultName = "", defaultEmail = "", defaultTopic = "question" }: { defaultName?: string; defaultEmail?: string; defaultTopic?: ContactTopic }) {
  const t = useTranslations("contact");
  const [form, setForm] = useState({ name: defaultName, email: defaultEmail, topic: defaultTopic, message: "", website: "" });
  const [state, setState] = useState<"idle" | "sent" | "invalid" | "rate" | "server">("idle");
  const [pending, start] = useTransition();

  if (state === "sent") {
    return (
      <div className="grid justify-items-start gap-3" role="status">
        <p className="flex items-center gap-2 font-semibold text-basilic"><CheckCircle2 className="size-5" aria-hidden />{t("sentTitle")}</p>
        <p className="text-sm text-muted">{t("sentText", { email: form.email })}</p>
        <Button variant="secondary" size="sm" onClick={() => { setForm({ ...form, message: "" }); setState("idle"); }}>{t("another")}</Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          const res = await sendContactAction(form);
          setState(res.ok ? "sent" : res.error ?? "server");
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="c-name"><Input id="c-name" required maxLength={80} autoComplete="name" value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} /></Field>
        <Field label={t("email")} htmlFor="c-email"><Input id="c-email" type="email" required maxLength={160} autoComplete="email" value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} /></Field>
      </div>
      <Field label={t("topic")} htmlFor="c-topic">
        <Select id="c-topic" value={form.topic} onChange={(ev) => setForm({ ...form, topic: ev.target.value as ContactTopic })}>
          {TOPICS.map((k) => <option key={k} value={k}>{t(`topics.${k}`)}</option>)}
        </Select>
      </Field>
      <Field label={t("message")} htmlFor="c-message" hint={t("messageHint")}>
        <Textarea id="c-message" required minLength={10} maxLength={4000} rows={6} value={form.message} onChange={(ev) => setForm({ ...form, message: ev.target.value })} />
      </Field>
      {/* Honeypot, invisible to people */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.website} onChange={(ev) => setForm({ ...form, website: ev.target.value })} />
      {state !== "idle" && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{t(`errors.${state}`)}</p>}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {t("send")}
      </Button>
    </form>
  );
}
