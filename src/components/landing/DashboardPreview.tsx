import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Sparkles, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";

// Illustrative sample numbers for the marketing preview only. Never stored as user data.
const sample = [
  { m: "Jun", income: 12000, expense: 9800 },
  { m: "Jul", income: 12000, expense: 10400 },
  { m: "Aug", income: 13500, expense: 9100 },
  { m: "Sep", income: 12000, expense: 8700 },
  { m: "Oct", income: 14000, expense: 9600 },
  { m: "Nov", income: 14000, expense: 8200 },
];

const stats = [
  { label: "Balance", value: 18400, icon: Wallet, tone: "text-primary-glow" },
  { label: "Income", value: 14000, icon: ArrowDownCircle, tone: "text-success" },
  { label: "Expenses", value: 8200, icon: ArrowUpCircle, tone: "text-destructive" },
  { label: "Saved", value: 5800, icon: PiggyBank, tone: "text-cyan" },
];

export function DashboardPreview() {
  return (
    <div className="relative rounded-3xl border border-border bg-card/80 p-4 shadow-glow sm:p-6">
      <Badge variant="outline" className="absolute right-4 top-4 text-[10px] text-muted-foreground">
        Sample data
      </Badge>
      <div className="mb-5 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-destructive/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-3 text-xs text-muted-foreground">cashcompass.ai/dashboard</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface-raised/60 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {s.label}
              <s.icon className={`size-4 ${s.tone}`} />
            </div>
            <p className="mt-2 font-display text-xl font-semibold tabular">{formatINR(s.value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="h-56 rounded-2xl border border-border bg-surface-raised/40 p-3 lg:col-span-2">
          <p className="px-1 text-xs text-muted-foreground">Income vs expenses</p>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={sample} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="pv-inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pv-exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatINR(v)}
              />
              <Area type="monotone" dataKey="income" stroke="var(--cyan)" strokeWidth={2} fill="url(#pv-inc)" />
              <Area type="monotone" dataKey="expense" stroke="var(--primary)" strokeWidth={2} fill="url(#pv-exp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-accent/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary-glow" /> Compass AI
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You spent <span className="font-medium text-foreground">{formatINR(2500)}</span> on food this month, more than
            last month. A weekly food budget of <span className="font-medium text-foreground">{formatINR(550)}</span> could help.
          </p>
          <div className="mt-auto rounded-xl bg-background/50 p-3 text-xs text-muted-foreground">
            Food budget · 80% used
            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div className="h-full w-4/5 rounded-full bg-warning" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
