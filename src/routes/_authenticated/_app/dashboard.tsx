import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, BarChart3, LineChart, PieChart, PiggyBank, Plus, ReceiptText, Target, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { StatCard } from "@/components/app/StatCard";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState, LoadingState } from "@/components/app/LoadingState";
import { TransactionDialog, type TxnDraft } from "@/components/app/TransactionDialog";
import { TransactionList } from "@/components/app/TransactionList";
import { CategoryDonut, IncomeExpenseBars, SpendLine, TrendArea } from "@/components/app/charts";
import { useToday } from "@/hooks/use-today";
import { useAuth } from "@/lib/auth-context";
import { useGoals, useProfile, useTransactions } from "@/lib/data";
import { categoryBreakdown, dailySeries, goalProgress, inRange, monthlySeries, periodRange, totals, type Period } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => pageHead("Dashboard", "Your balance, income, expenses and savings at a glance."),
  component: Dashboard,
});

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

function Dashboard() {
  const today = useToday();
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const txQ = useTransactions();
  const goalsQ = useGoals();
  const [period, setPeriod] = useState<Period>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [dialog, setDialog] = useState<{ open: boolean; initial: TxnDraft | null }>({ open: false, initial: null });

  const txns = txQ.data ?? [];
  const range = periodRange(period, today, custom);
  const view = useMemo(() => {
    const inPeriod = txns.filter((t) => inRange(t, range));
    return {
      all: totals(txns),
      period: totals(inPeriod),
      byCategory: categoryBreakdown(inPeriod),
      monthly: monthlySeries(txns, today, 6),
      daily: dailySeries(txns, today, 7),
      recent: inPeriod.slice(0, 8),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txns, range.from, range.to, today.toDateString()]);

  const firstName = (profile.data?.full_name || "").split(" ")[0];
  const periodHint = period === "today" ? "Today" : period === "week" ? "This week" : period === "month" ? "This month" : "Selected dates";
  const hasTx = txns.length > 0;
  const goals = goalsQ.data ?? [];

  return (
    <>
      <PageHeader
        title={firstName ? `Hi ${firstName} 👋` : "Welcome 👋"}
        description={hasTx ? "Here's where your money stands. Everything updates as you add, edit or delete transactions." : "Add your first income or expense to bring this dashboard to life."}
        actions={
          <Button variant="hero" onClick={() => setDialog({ open: true, initial: null })}>
            <Plus /> Add transaction
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as Period)} variant="outline" className="justify-start" aria-label="Time period">
          {periods.map((p) => (
            <ToggleGroupItem key={p.value} value={p.value} className="px-4 text-xs">
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-9 w-40" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" aria-label="To date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-9 w-40" />
          </div>
        )}
      </div>

      {txQ.isError && <ErrorState message={(txQ.error as Error).message} onRetry={() => txQ.refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance" value={formatINR(view.all.savings)} hint="All income minus all expenses" icon={Wallet} />
        <StatCard label="Income" value={formatINR(view.period.income)} hint={periodHint} icon={ArrowDownCircle} tone="success" />
        <StatCard label="Expenses" value={formatINR(view.period.expense)} hint={periodHint} icon={ArrowUpCircle} tone="danger" />
        <StatCard label="Savings" value={formatINR(view.period.savings)} hint={`Income minus expenses · ${periodHint.toLowerCase()}`} icon={PiggyBank} tone="cyan" />
      </div>

      {txQ.isLoading ? (
        <LoadingState label="Loading your money…" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Income vs expenses" subtitle="Last 6 months" className="lg:col-span-2">
              {hasTx ? <IncomeExpenseBars data={view.monthly} /> : <EmptyState icon={BarChart3} title="No transactions yet" description="Once you record income and expenses, a monthly comparison appears here." />}
            </Panel>
            <Panel title="Where it goes" subtitle={`Spending by category · ${periodHint.toLowerCase()}`}>
              {view.byCategory.length ? <CategoryDonut data={view.byCategory} /> : <EmptyState icon={PieChart} title="Nothing to split yet" description="No expenses in this period." />}
            </Panel>
            <Panel title="This week" subtitle="Daily spending, last 7 days">
              {view.daily.some((d) => d.expense > 0) ? <SpendLine data={view.daily} /> : <EmptyState icon={LineChart} title="No spending this week" description="A day-by-day line of what you spent." />}
            </Panel>
            <Panel title="Spending trend" subtitle="Monthly expenses, last 6 months">
              {view.monthly.filter((m) => m.expense > 0).length >= 2 ? (
                <TrendArea data={view.monthly} series={[{ key: "expense", label: "Expenses", color: "var(--chart-2)" }]} />
              ) : (
                <EmptyState icon={TrendingUp} title="Not enough history" description="Trends appear once you have expenses in at least two months." />
              )}
            </Panel>
            <Panel title="Savings progress" subtitle="Across your goals" action={goals.length ? <Button variant="ghost" size="sm" asChild><Link to="/goals">View all</Link></Button> : undefined}>
              {goals.length ? (
                <ul className="space-y-4">
                  {goals.slice(0, 4).map((g) => (
                    <li key={g.id}>
                      <div className="flex justify-between text-sm">
                        <span className="truncate font-medium">{g.name}</span>
                        <span className="tabular text-muted-foreground">{Math.round(goalProgress(g))}%</span>
                      </div>
                      <Progress value={goalProgress(g)} className="mt-1.5 h-2" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatINR(g.saved_amount)} of {formatINR(g.target_amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Target} title="No goals yet" description="Create a savings goal to track progress here." action={<Button variant="glass" size="sm" asChild><Link to="/goals">Go to Savings Goals</Link></Button>} />
              )}
            </Panel>
          </div>

          <Panel title="Recent transactions" subtitle={periodHint} action={hasTx ? <Button variant="ghost" size="sm" asChild><Link to="/expenses">See all</Link></Button> : undefined}>
            {view.recent.length ? (
              <TransactionList txns={view.recent} onEdit={(t) => setDialog({ open: true, initial: t })} />
            ) : (
              <EmptyState
                icon={ReceiptText}
                title={hasTx ? "Nothing in this period" : "Your history starts here"}
                description={hasTx ? "Try a different time period above." : "Add an allowance, salary or your first expense."}
                action={<Button variant="glass" size="sm" onClick={() => setDialog({ open: true, initial: null })}><Plus /> Add transaction</Button>}
              />
            )}
          </Panel>
        </>
      )}

      <TransactionDialog open={dialog.open} initial={dialog.initial} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </>
  );
}
