import { weightTrend, type WeightEntry } from "@weeko/engine";

/**
 * Weight over time: daily weigh-ins as small dots, the smoothed trend as the
 * line (day-to-day water swings matter less than the trend), optional goal as
 * a dashed reference line. One y-axis, recessive grid, hover titles.
 */
export function WeightChart({ entries, goal, labels, locale = "fr-FR" }: { entries: WeightEntry[]; goal?: number; labels: { trend: string; goal: string; weighIn: string }; locale?: string }) {
  const W = 720;
  const H = 260;
  const pad = { l: 44, r: 64, t: 16, b: 28 };
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const trend = weightTrend(sorted);
  const t0 = new Date(sorted[0]!.date).getTime();
  const t1 = Math.max(t0 + 86400000, new Date(sorted[sorted.length - 1]!.date).getTime());
  const values = [...sorted.map((e) => e.kg), ...(goal ? [goal] : [])];
  let lo = Math.floor(Math.min(...values) - 1);
  let hi = Math.ceil(Math.max(...values) + 1);
  if (hi - lo < 4) {
    lo -= 2;
    hi += 2;
  }
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const step = Math.max(1, Math.round((hi - lo) / 4));
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const path = trend.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const last = trend[trend.length - 1]!;
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[520px]" role="img" aria-label={labels.trend}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="num">{v}</text>
          </g>
        ))}
        <text x={pad.l} y={H - 8} fontSize={11} fill="var(--muted)">{fmt(sorted[0]!.date)}</text>
        <text x={W - pad.r} y={H - 8} fontSize={11} fill="var(--muted)" textAnchor="end">{fmt(sorted[sorted.length - 1]!.date)}</text>
        {goal && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--abricot)" strokeWidth={1.5} strokeDasharray="5 5" />
            <text x={W - pad.r + 6} y={y(goal) + 4} fontSize={11} fill="var(--muted)">{labels.goal} {goal.toLocaleString(locale)}</text>
          </g>
        )}
        {sorted.map((e) => (
          <circle key={e.date} cx={x(e.date)} cy={y(e.kg)} r={4} fill="var(--basilic-soft)" stroke="var(--basilic)" strokeWidth={1}>
            <title>{`${labels.weighIn} ${fmt(e.date)} : ${e.kg.toLocaleString(locale)} kg`}</title>
          </circle>
        ))}
        <path d={path} fill="none" stroke="var(--basilic)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.date)} cy={y(last.kg)} r={5} fill="var(--basilic)" stroke="var(--surface)" strokeWidth={2} />
        <text x={x(last.date) + 8} y={y(last.kg) - 8} fontSize={12} fontWeight={700} fill="var(--encre)" className="num">{last.kg.toLocaleString(locale, { maximumFractionDigits: 1 })} kg</text>
      </svg>
    </div>
  );
}
