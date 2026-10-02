"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Send, Trash2 } from "lucide-react";
import type { PlanAction } from "@weeko/engine";
import { useRouter } from "@/i18n/navigation";
import { planActionAction } from "@/app/[locale]/app/actions";
import { clearCoachHistory, sendCoachMessage } from "@/app/[locale]/app/coach/actions";
import { Button, cx } from "./ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  labels?: string[];
  actions?: PlanAction[];
  applied?: boolean;
}

export function CoachChat({ initial }: { initial: Msg[] }) {
  const t = useTranslations("coach");
  const te = useTranslations("errors");
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const send = (value: string) => {
    if (!value.trim()) return;
    setError(undefined);
    setMessages((m) => [...m, { role: "user", content: value }]);
    setText("");
    start(async () => {
      const res = await sendCoachMessage({ text: value });
      if (!res.ok) {
        setError(te(res.error === "profile" ? "server" : res.error));
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: res.proposal.reply, labels: res.proposal.labels, actions: res.proposal.actions }]);
    });
  };

  const apply = (i: number) =>
    start(async () => {
      const msg = messages[i];
      if (!msg?.actions?.length) return;
      const res = await planActionAction({ actions: msg.actions });
      if (!res.ok) return setError(te(res.error));
      setMessages((m) => m.map((x, j) => (j === i ? { ...x, applied: true } : x)));
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      <div className="grid min-h-80 content-start gap-3 rounded-3xl border border-line bg-surface p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="grid gap-3">
            <p className="text-muted">{t("intro")}</p>
            <div className="flex flex-wrap gap-2">
              {(["q1", "q2", "q3", "q4"] as const).map((k) => (
                <button key={k} type="button" onClick={() => send(t(`examples.${k}`))} className="rounded-full border border-line px-3 py-1 text-sm hover:border-basilic">{t(`examples.${k}`)}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx("max-w-[85%] rounded-2xl px-4 py-3", m.role === "user" ? "justify-self-end bg-basilic text-surface" : "justify-self-start bg-riz")}>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.labels && m.labels.length > 0 && (
              <div className="mt-3 grid gap-2 border-t border-line pt-3">
                <ul className="grid gap-1 text-sm">
                  {m.labels.map((l, k) => <li key={k} className="flex gap-2"><Check className="mt-0.5 size-4 text-basilic" aria-hidden />{l}</li>)}
                </ul>
                {m.applied ? (
                  <p className="text-sm font-semibold text-basilic">{t("applied")}</p>
                ) : (
                  <Button size="sm" className="justify-self-start" onClick={() => apply(i)} disabled={pending}>{t("apply")}</Button>
                )}
              </div>
            )}
          </div>
        ))}
        {pending && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" />{t("thinking")}</p>}
        <div ref={end} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label htmlFor="coach-input" className="sr-only">{t("placeholder")}</label>
        <input id="coach-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("placeholder")} className="h-12 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 focus:border-basilic focus:outline-none" />
        <Button type="submit" size="lg" disabled={pending || !text.trim()} aria-label={t("send")}><Send className="size-4" /></Button>
      </form>
      {messages.length > 0 && (
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => start(async () => { await clearCoachHistory(); setMessages([]); })}>
          <Trash2 className="size-4" /> {t("clear")}
        </Button>
      )}
    </div>
  );
}
