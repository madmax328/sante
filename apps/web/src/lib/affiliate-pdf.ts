import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Payout } from "./affiliates";
import { env } from "./env";
import { formatIban } from "./iban";
import { unseal } from "./crypto";

/**
 * The document of a payout, in French (Sorloo's accounts are French):
 * - professional: an invoice issued by Sorloo in the affiliate's name
 *   (autofacturation, under the mandate they accepted);
 * - individual: a statement of commissions (not an invoice).
 */
const SOURCES: Record<string, string> = { stripe: "Site", app_store: "App Store", play_store: "Google Play" };
const COUNTRIES: Record<string, string> = {
  FR: "France", BE: "Belgique", LU: "Luxembourg", CH: "Suisse", DE: "Allemagne", AT: "Autriche", NL: "Pays-Bas", IE: "Irlande", GB: "Royaume-Uni", ES: "Espagne", IT: "Italie", PT: "Portugal", MC: "Monaco",
};
const date = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(d);
const short = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" }).format(d);

export async function payoutPdf(p: Payout): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const money = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: p.currency }).format(n).replace(/ | /g, " ");
  // The standard fonts only know Western European letters: others lose their accent or become "?".
  const safe = (f: PDFFont, text: string) =>
    [...text]
      .map((ch) => {
        try {
          f.encodeText(ch);
          return ch;
        } catch {
          const plain = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
          try {
            f.encodeText(plain);
            return plain;
          } catch {
            return "?";
          }
        }
      })
      .join("");

  const W = 595.28;
  const H = 841.89;
  const M = 50;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.1, 0.12, 0.11);
  const muted = rgb(0.42, 0.45, 0.43);
  const text = (s: string, x: number, opts: { size?: number; f?: PDFFont; color?: typeof ink; right?: boolean } = {}) => {
    const f = opts.f ?? font;
    const size = opts.size ?? 10;
    const v = safe(f, s);
    const px = opts.right ? x - f.widthOfTextAtSize(v, size) : x;
    page.drawText(v, { x: px, y, size, font: f, color: opts.color ?? ink });
  };
  const line = (gap = 14) => {
    y -= gap;
    if (y < M + 40) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };
  /** Wraps a paragraph to the page width. */
  const para = (s: string, opts: { size?: number; f?: PDFFont; color?: typeof ink } = {}) => {
    const f = opts.f ?? font;
    const size = opts.size ?? 9;
    let current = "";
    for (const word of safe(f, s).split(" ")) {
      const next = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > W - 2 * M && current) {
        text(current, M, opts);
        line(size + 3);
        current = word;
      } else current = next;
    }
    if (current) {
      text(current, M, opts);
      line(size + 5);
    }
  };

  const invoice = p.kind === "invoice";
  const payee = p.payee;
  const company = env.company;
  const companyLines = [
    company.name ?? "[Raison sociale de Sorloo]",
    ...(company.address ?? "[Adresse]").split("|").map((l) => l.trim()),
    `SIREN : ${company.siren ?? "[SIREN]"}`,
    ...(company.vatNumber ? [`TVA intracommunautaire : ${company.vatNumber}`] : []),
  ];
  const payeeLines = [
    payee.legalName,
    payee.address.line1,
    ...(payee.address.line2 ? [payee.address.line2] : []),
    `${payee.address.postalCode} ${payee.address.city}`,
    COUNTRIES[payee.address.country] ?? payee.address.country,
    ...(payee.siret ? [`SIRET : ${payee.siret}`] : []),
    ...(payee.vatNumber ? [`TVA intracommunautaire : ${payee.vatNumber}`] : []),
  ];

  // Title
  text(invoice ? `Facture n° ${p.number}` : `Relevé de commissions n° ${p.number}`, M, { size: 18, f: bold });
  line(18);
  text(invoice ? "Autofacturation" : "Programme affiliés Sorloo", M, { size: 11, f: bold, color: muted });
  line(14);
  text(`Date : ${date(p.requestedAt)}`, M, { color: muted });
  line(28);

  // Parties: for a self-billed invoice the affiliate is the seller, Sorloo the customer.
  const top = y;
  text(invoice ? "Prestataire (émetteur)" : "Bénéficiaire", M, { f: bold, size: 9, color: muted });
  line(13);
  for (const l of payeeLines) {
    text(l, M);
    line(13);
  }
  const leftEnd = y;
  y = top;
  text(invoice ? "Client" : "Versé par", W / 2 + 10, { f: bold, size: 9, color: muted });
  y -= 13;
  for (const l of companyLines) {
    text(l, W / 2 + 10);
    y -= 13;
  }
  y = Math.min(leftEnd, y) - 16;

  para(
    invoice
      ? `Facture établie par ${company.name ?? "Sorloo"} au nom et pour le compte de ${payee.legalName}, en vertu du mandat d'autofacturation accepté le ${payee.mandateAt ? date(new Date(payee.mandateAt)) : "—"}.`
      : "Commissions dues au bénéficiaire au titre du programme affiliés Sorloo. Ce document n'est pas une facture.",
    { color: muted },
  );
  line(6);
  text(`Commissions d'affiliation : abonnés Sorloo apportés, du ${short(p.period.from)} au ${short(p.period.to)}`, M, { f: bold });
  line(20);

  // Detail of the commissions
  const cols = { date: M, source: M + 90, net: W - M - 120, amount: W - M };
  text("Date du paiement", cols.date, { f: bold, size: 9, color: muted });
  text("Achat", cols.source, { f: bold, size: 9, color: muted });
  text("Encaissé par Sorloo (HT)", cols.net, { f: bold, size: 9, color: muted, right: true });
  text("Commission (25 %)", cols.amount, { f: bold, size: 9, color: muted, right: true });
  line(6);
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: muted });
  line(12);
  for (const l of p.lines) {
    text(short(new Date(l.at)), cols.date, { size: 9 });
    text(SOURCES[l.source] ?? l.source, cols.source, { size: 9 });
    text(money(l.net), cols.net, { size: 9, right: true });
    text(money(l.amount), cols.amount, { size: 9, right: true });
    line(13);
  }
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.5, color: muted });
  line(8);

  // Totals
  const total = (label: string, value: string, strong = false) => {
    text(label, cols.net, { right: true, f: strong ? bold : font });
    text(value, cols.amount, { right: true, f: strong ? bold : font });
    line(15);
  };
  if (invoice) {
    total("Total HT", money(p.amount));
    if (payee.vat === "fr_vat") total("TVA 20 %", money(p.vat));
    else total("TVA", money(0));
    total("Total TTC", money(p.total), true);
    line(4);
    if (payee.vat === "franchise") para("TVA non applicable, art. 293 B du CGI.");
    if (payee.vat === "eu_reverse") para("Autoliquidation : TVA due par le preneur (art. 283-2 du CGI, art. 196 de la directive 2006/112/CE).");
    para("Paiement par virement bancaire. Pénalités de retard : trois fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €.", { color: muted });
  } else {
    total("Total versé", money(p.total), true);
    line(4);
    para("Sommes versées à un particulier : à déclarer par le bénéficiaire dans ses revenus (revenus non commerciaux).", { color: muted });
  }

  // Payment
  line(6);
  text("Règlement", M, { f: bold, size: 9, color: muted });
  line(13);
  let iban = payee.ibanMasked;
  try {
    iban = formatIban(unseal<string>(payee.iban));
  } catch {
    // Keeps the masked number if the key changed.
  }
  text(`Virement au nom de ${payee.holder}, IBAN ${iban}`, M, { size: 9 });
  line(13);
  if (p.paidAt) text(`Payé le ${date(new Date(p.paidAt))}`, M, { size: 9 });

  return doc.save();
}
