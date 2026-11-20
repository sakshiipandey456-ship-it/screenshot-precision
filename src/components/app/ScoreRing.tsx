import { useId } from "react";

export function ScoreRing({ value, size = "size-48", label = "out of 100" }: { value: number | null; size?: string; label?: string }) {
  const gid = useId();
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  return (
    <div className={`relative mx-auto ${size}`} role="img" aria-label={value === null ? "No score yet" : `Score ${value} out of 100`}>
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--cyan)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-semibold tabular">{value ?? "—"}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
