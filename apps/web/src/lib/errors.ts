import "server-only";
import { createHash } from "node:crypto";
import { CONTACT } from "./contact";
import { db, ensureIndexes } from "./db";
import { sendEmail } from "./email";
import { env, features } from "./env";

export interface ErrorEntry {
  key: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  source: string;
  digest?: string;
  at: Date;
}

const log = () => db.collection<ErrorEntry>("error_log");
const ALERT_EVERY_MS = 60 * 60_000;

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Records a server error (kept 30 days, listed on /admin) and emails an alert,
 * at most once an hour for the same error. Never throws.
 */
export async function reportError(error: unknown, ctx: { source: string; path?: string; method?: string; digest?: string }): Promise<void> {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const message = e.message.slice(0, 500);
    // Same message from the same place = same error, whatever the ids inside.
    const key = createHash("sha1").update(`${ctx.source}|${ctx.path?.replace(/[0-9a-f]{12,}|\d+/gi, "#") ?? ""}|${message.replace(/[0-9a-f]{12,}|\d+/gi, "#")}`).digest("hex").slice(0, 16);
    await ensureIndexes();
    const previous = await log().findOne({ key }, { sort: { at: -1 } });
    await log().insertOne({ key, message, stack: e.stack?.slice(0, 4000), path: ctx.path?.slice(0, 300), method: ctx.method, source: ctx.source, digest: ctx.digest, at: new Date() });
    if (!features.email() || (previous && Date.now() - previous.at.getTime() < ALERT_EVERY_MS)) return;
    await sendEmail(
      env.alertEmail ?? CONTACT.support,
      `[Sorloo] Erreur : ${message.slice(0, 80)}`,
      `<p><strong>${escape(message)}</strong></p><p>${escape(ctx.source)} · ${escape(ctx.method ?? "")} ${escape(ctx.path ?? "")}</p>` +
        `<pre style="white-space:pre-wrap;font-size:12px">${escape(e.stack?.slice(0, 3000) ?? "")}</pre>` +
        `<p>Les prochaines occurrences de cette erreur dans l'heure ne déclenchent pas d'e-mail. Liste complète : ${escape(env.appUrl)}/admin</p>`,
    );
  } catch (e) {
    console.error("[errors] report failed", e);
  }
}

export async function recentErrors(limit = 30): Promise<(ErrorEntry & { count: number })[]> {
  await ensureIndexes();
  const since = new Date(Date.now() - 7 * 86400_000);
  return log()
    .aggregate<ErrorEntry & { count: number }>([
      { $match: { at: { $gte: since } } },
      { $sort: { at: -1 } },
      { $group: { _id: "$key", doc: { $first: "$$ROOT" }, count: { $sum: 1 } } },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$doc", { count: "$count" }] } } },
      { $sort: { at: -1 } },
      { $limit: limit },
    ])
    .toArray();
}
