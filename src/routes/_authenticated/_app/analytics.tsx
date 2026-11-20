import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Crown, FileDown, Minus, PieChart, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState, LoadingState } from "@/components/app/LoadingState";
import { CategoryDonut, SpendLine, TrendArea } from "@/components/app/charts";
import { useToday } from "@/hooks/use-today";
import { useBudgets, useTransactions } from "@/lib/data";
import { computeAnalytics, PERIOD_LABELS, type AnalyticsPeriod } from "@/lib/analytics";
import { downloadFile, transactionsCSV } from "@/lib/download";
import { inRange } from "@/lib/finance";
import { formatDate, formatINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/analytics")({
  head: () => pageHead("Spending Analytics", "Weekly, monthly and yearly reports on your spending."),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const today = useToday();
  const tx = useTransactions();
  const budgets = useBudgets();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const txns = tx.data ?? [];
  const a = useMemo(
    () => computeAnalytics(txns, budgets.data ?? [], period, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx.data, budgets.data, period, today.toDateString()],
  );
  const L = PERIOD_LABELS[period];
  const hasExpenses = txns.some((t) => t.kind === "expense");
  const err = tx.error ?? budgets.error;

  const change = a.changePct;
  const ChangeIcon = change === null || Math.abs(change) < 0.5 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const changeText = change === null ? `No spending ${L.previous} to compare with` : `${Math.abs(change).toFixed(1)}% ${change > 0 ? "higher" : change < 0 ? "lower" : "the same"} than the same days of ${L.previous}`;

  function exportCSV() {
    const rows = txns.filter((t) => t.kind === "expense" && inRange(t, a.range));
    downloadFile(`cashcompass-expenses-${a.range.from}_to_${a.range.to}.csv`, transactionsCSV(rows));
  }

  return (
    <>
      <PageHeader
        title="Spending Analytics"
        description="Charts and summaries built from your recorded expenses. They update the moment you add, edit or delete one."
        actions={
          <Button variant="glass" onClick={exportCSV} disabled={!a.expenseCount}>
            <FileDown /> Export CSV
          </Button>
        }
      />
      <Tabs value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
        <TabsList>
          <TabsTrigger value="week">Weekly</TabsTrigger>
          <TabsTrigger value="month">Monthly</TabsTrigger>
          <TabsTrigger value="year">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="-mt-2 text-xs text-muted-foreground">
        {formatDate(a.range.from)} – {formatDate(a.range.to)}
      </p>

      {err && <ErrorState message={(err as Error).message} onRetry={() => { tx.refetch(); budgets.refetch(); }} />}
      {tx.isLoading ? (
        <LoadingState label="Loading your spending…" />
      ) : !hasExpenses ? (
        <Panel>
          <EmptyState icon={BarChart3} title="No expenses to analyse yet" description="Record your first expense and charts, category splits and comparisons will appear here automatically." action={<Button variant="hero" size="sm" asChild><Link to="/expenses">Add an expense</Link></Button>} />
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={`Total expenses · ${L.current.toLowerCase()}`} value={formatINR(a.total)} hint={`${a.expenseCount} expense${a.expenseCount === 1 ? "" : "s"} recorded`} icon={Wallet} tone="danger" />
            <StatCard label="Highest category" value={a.topCategory ? a.topCategory.category : "—"} hint={a.topCategory ? `${formatINR(a.topCategory.amount)} · ${Math.round(a.topCategory.share * 100)}% of spending` : `No expenses ${L.current.toLowerCase()}`} icon={Crown} />
            <StatCard label="Average daily spending" value={formatINR(a.avgDaily)} hint={`Over ${a.elapsedDays} day${a.elapsedDays === 1 ? "" : "s"} so far`} icon={CalendarDays} tone="cyan" />
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">vs {L.previous}</p>
                <span className={cn("flex size-9 items-center justify-center rounded-xl", change === null || Math.abs(change) < 0.5 ? "bg-muted text-muted-foreground" : change > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
                  <ChangeIcon className="size-4" />
                </span>
              </div>
              <p className="mt-4 font-display text-3xl font-semibold tabular">{change === null ? "—" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change).toFixed(1)}%`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{changeText}</p>
              <p className="mt-1 text-xs text-muted-foreground">Full {L.previous}: {formatINR(a.previousTotal)}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Spending by category" subtitle={L.current}>
              {a.byCategory.length ? <CategoryDonut data={a.byCategory} /> : <EmptyState icon={PieChart} title={`No expenses ${L.current.toLowerCase()}`} description="Pick another period or add an expense." className="py-6" />}
            </Panel>
            <Panel title={`Spending through the ${L.noun}`} subtitle={period === "week" ? "Per day" : period === "month" ? "Per day" : "Per month"}>
              {a.total > 0 ? <SpendLine data={a.series} /> : <EmptyState icon={TrendingUp} title="Nothing to chart" description={`No expenses ${L.current.toLowerCase()}.`} className="py-6" />}
            </Panel>
            <Panel title="Monthly spending trend" subtitle="Last 6 months">
              {a.monthlyTrend.filter((m) => m.expense > 0).length >= 2 ? (
                <TrendArea data={a.monthlyTrend} series={[{ key: "expense", label: "Expenses", color: "var(--chart-2)" }]} />
              ) : (
                <EmptyState icon={TrendingUp} title="Not enough history" description="The trend appears once you have expenses in at least two months." className="py-6" />
              )}
            </Panel>
            <Panel title="Budget vs actual" subtitle={period === "year" ? "Budgeted months this year" : "This month's budgets"} action={<Button variant="ghost" size="sm" asChild><Link to="/budgets">Budgets</Link></Button>}>
              {a.budgetRows.length ? (
                <ul className="space-y-4">
                  {a.budgetRows.map((r) => (
                    <li key={r.category}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{r.category}</span>
                        <span className={cn("tabular text-xs", r.level === "exceeded" ? "text-destructive" : r.level === "warning" ? "text-warning" : "text-muted-foreground")}>
                          {formatINR(r.actual)} of {formatINR(r.budgeted)} · {Math.round(r.pct)}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, r.pct)} className="mt-1.5 h-2" />
                      {r.level === "exceeded" && <p className="mt-1 text-xs text-destructive">Over by {formatINR(r.actual - r.budgeted)}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Receipt} title="No budgets to compare" description="Set a budget in the Smart Budget Planner to see planned vs actual spending." className="py-6" action={<Button variant="glass" size="sm" asChild><Link to="/budgets">Set a budget</Link></Button>} />
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
