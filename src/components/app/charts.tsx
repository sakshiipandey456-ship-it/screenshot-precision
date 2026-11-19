import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatINR } from "@/lib/format";

const short = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `₹${v}`);
const money = (v: unknown) => formatINR(Number(v));
export const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary-glow)", "var(--muted-foreground)"];

export function IncomeExpenseBars({ data, className = "h-64" }: { data: { label: string; income: number; expense: number }[]; className?: string }) {
  const config = { income: { label: "Income", color: "var(--success)" }, expense: { label: "Expenses", color: "var(--destructive)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className={`${className} w-full`}>
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={short} tickLine={false} axisLine={false} width={52} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => `${config[n as keyof typeof config]?.label ?? n}: ${money(v)}`} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function CategoryDonut({ data, className = "h-56" }: { data: { category: string; amount: number }[]; className?: string }) {
  const top = data.slice(0, 6);
  const rest = data.slice(6).reduce((a, c) => a + c.amount, 0);
  const rows = rest > 0 ? [...top, { category: "Others", amount: rest }] : top;
  const config = Object.fromEntries(rows.map((r, i) => [r.category, { label: r.category, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] ?? "var(--chart-1)" }])) as ChartConfig;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ChartContainer config={config} className={`${className} aspect-square max-w-[220px]`}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel formatter={(v, n) => `${n}: ${money(v)}`} />} />
          <Pie data={rows} dataKey="amount" nameKey="category" innerRadius="58%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
            {rows.map((r, i) => (
              <Cell key={r.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="w-full space-y-1.5 text-sm">
        {rows.map((r, i) => (
          <li key={r.category} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
            <span className="flex-1 truncate">{r.category}</span>
            <span className="tabular text-muted-foreground">{formatINR(r.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpendLine({ data, dataKey = "expense", label = "Spent", className = "h-56" }: { data: Record<string, unknown>[]; dataKey?: string; label?: string; className?: string }) {
  const config = { [dataKey]: { label, color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className={`${className} w-full`}>
      <LineChart data={data} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={short} tickLine={false} axisLine={false} width={52} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${label}: ${money(v)}`} />} />
        <Line dataKey={dataKey} type="monotone" stroke={`var(--color-${dataKey})`} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}

export function TrendArea({ data, series, className = "h-56" }: { data: Record<string, unknown>[]; series: { key: string; label: string; color: string; dashed?: boolean }[]; className?: string }) {
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) as ChartConfig;
  return (
    <ChartContainer config={config} className={`${className} w-full`}>
      <AreaChart data={data} margin={{ left: 4, right: 8 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={short} tickLine={false} axisLine={false} width={52} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => `${String(config[String(n)]?.label ?? n)}: ${money(v)}`} />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s) => (
          <Area key={s.key} dataKey={s.key} type="monotone" stroke={s.color} fill={`url(#fill-${s.key})`} strokeWidth={2.5} strokeDasharray={s.dashed ? "6 4" : undefined} connectNulls />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

export function HorizontalBars({ data, className = "h-56" }: { data: { label: string; value: number }[]; className?: string }) {
  const config = { value: { label: "Saved", color: "var(--cyan)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className={`${className} w-full`}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={96} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${Math.round(Number(v))}% saved`} />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
