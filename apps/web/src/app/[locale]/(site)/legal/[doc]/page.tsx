import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LEGAL_DOCS, legalDoc, type LegalDoc } from "@/content/legal";

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale, doc } = await params;
  if (!LEGAL_DOCS.includes(doc as LegalDoc)) return {};
  return { title: legalDoc(locale, doc as LegalDoc).title };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[doc]">) {
  const { locale, doc } = await params;
  if (!LEGAL_DOCS.includes(doc as LegalDoc)) notFound();
  setRequestLocale(locale);
  const d = legalDoc(locale, doc as LegalDoc);
  return (
    <article className="mx-auto grid max-w-3xl gap-6 px-4 py-14">
      <header>
        <h1 className="text-3xl font-extrabold">{d.title}</h1>
        <p className="mt-1 text-sm text-muted">{d.updated}</p>
      </header>
      {d.intro && <p className="text-lg">{d.intro}</p>}
      {d.sections.map((s) => (
        <section key={s.h} className="grid gap-2">
          <h2 className="text-xl font-bold">{s.h}</h2>
          {s.p.map((p, i) => (
            <p key={i} className="max-w-[70ch] text-encre/90">{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
