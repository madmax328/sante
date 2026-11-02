import { getTranslations } from "next-intl/server";

const RULES = ["rule1", "rule2", "rule3", "rule4", "rule5", "rule6", "rule7"] as const;

/** The programme rules (programme page, sign-up form and affiliate space). */
export async function AffiliateRules({ className }: { className?: string }) {
  const t = await getTranslations("affiliate");
  return (
    <ul className={`grid list-disc gap-1.5 pl-5 text-sm text-muted ${className ?? ""}`}>
      {RULES.map((k) => (
        <li key={k}>{t(k)}</li>
      ))}
    </ul>
  );
}
