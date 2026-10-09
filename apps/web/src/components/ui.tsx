import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-basilic text-surface hover:bg-basilic-strong",
  accent: "bg-abricot text-on-abricot hover:bg-abricot-strong",
  secondary: "bg-surface text-encre border border-line hover:border-basilic",
  ghost: "text-encre hover:bg-basilic-soft",
  danger: "bg-danger text-surface hover:opacity-90",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[0.95rem]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-surface p-5", className)} {...props} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cx("text-sm font-semibold", className)} {...props} />;
}

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-encre placeholder:text-muted/70 focus:border-basilic focus:outline-none";

/** Base input classes, without w-full when the caller sets its own width (w-28…): both would conflict. */
function fieldClass(className?: string, ...extra: string[]) {
  const ownWidth = !!className && /(^|\s)w-/.test(className);
  return cx(ownWidth ? inputClass.replace("w-full ", "") : inputClass, ...extra, className);
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={fieldClass(className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={fieldClass(className, "pr-8")} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx("w-full rounded-xl border border-line bg-surface p-3 focus:border-basilic focus:outline-none", className)}
      {...props}
    />
  );
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

type Tone = "basilic" | "abricot" | "miel" | "eau" | "neutral" | "danger";
const tones: Record<Tone, string> = {
  basilic: "bg-basilic-soft text-basilic",
  abricot: "bg-abricot-soft text-abricot-strong",
  miel: "bg-miel-soft text-encre",
  eau: "bg-eau-soft text-eau",
  neutral: "bg-riz text-muted border border-line",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

const barColors: Record<Exclude<Tone, "neutral" | "danger">, string> = {
  basilic: "bg-basilic",
  abricot: "bg-abricot",
  miel: "bg-miel",
  eau: "bg-eau",
};

export function Progress({ value, max, tone = "basilic", label }: { value: number; max: number; tone?: keyof typeof barColors; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)} aria-label={label}>
      <div className={cx("h-full rounded-full", barColors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Notice({ tone = "basilic", title, children }: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  return (
    <div className={cx("rounded-2xl p-4 text-sm", tones[tone])}>
      {title && <p className="mb-1 font-bold">{title}</p>}
      <div className="text-encre/90">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-10 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="max-w-md text-muted">{children}</div>}
      {action}
    </div>
  );
}

/** The Sorloo mark: a plate cut in 7 parts, today's part highlighted. */
export function LogoMark({ size = 28, today = 0, className }: { size?: number; today?: number; className?: string }) {
  const r = 50;
  const inner = 18;
  const gap = 0.07;
  const paths = Array.from({ length: 7 }, (_, i) => {
    const a0 = (i / 7) * Math.PI * 2 - Math.PI / 2 + gap / 2;
    const a1 = ((i + 1) / 7) * Math.PI * 2 - Math.PI / 2 - gap / 2;
    const p = (rad: number, a: number) => `${50 + rad * Math.cos(a)},${50 + rad * Math.sin(a)}`;
    return `M${p(inner, a0)} L${p(r, a0)} A${r},${r} 0 0 1 ${p(r, a1)} L${p(inner, a1)} A${inner},${inner} 0 0 0 ${p(inner, a0)} Z`;
  });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} fill={i === today ? "var(--abricot)" : "var(--basilic)"} />
      ))}
    </svg>
  );
}

export function Logo({ today = 0 }: { today?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark today={today} />
      <span className="font-display text-xl font-extrabold tracking-tight">Sorloo</span>
    </span>
  );
}

/** Circular progress (e.g. calories of the day). */
export function Ring({ value, max, size = 120, stroke = 12, children, tone = "basilic" }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode; tone?: "basilic" | "abricot" | "eau" | "miel" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`var(--${tone})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
