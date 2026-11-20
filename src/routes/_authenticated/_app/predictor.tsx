import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, Info, Radar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState, LoadingState } from "@/components/app/LoadingState";
import { SpendLine } from "@/components/app/charts";
import { useToday } from "@/hooks/use-today";
import { useBudgets, useSubscriptions, useTransactions } from "@/lib/data";
import { detectAnomalies, monthLabel } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { FULL_CONFIDENCE_DAYS, predictNextMonth } from "@/lib/predictor";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/predictor")({
  head: () => pageHead("Future Expense Predictor", "Estimate next month's spending from your own history."),
  component: PredictorPage,
});

function PredictorPage() {
  const today = useToday();
  const tx = useTransactions();
  const budgets = useBudgets();
  const subs = useSubscriptions();
  const p = useMemo(
    () => (tx.data && budgets.data ? predictNextMonth({ txns: tx.data, budgets: budgets.data, today }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx.data, budgets.data, today.toDateString()],
  );
  const anomalies = useMemo(() => (tx.data ? detectAnomalies(tx.data, today, subs.data ?? []) : []), [tx.data, subs.data, today]);
  const err = tx.error ?? budgets.error;

  return (
    <>
      <PageHeader title="Future Expense Predictor" description="An estimate of next month's spending, built only from your recorded expenses. Nothing is guessed when there isn't enough history." />
      {err && <ErrorState message={(err as Error).message} onRetry={() => { tx.refetch(); budgets.refetch(); }} />}
      {!p ? (
        err ? null : <LoadingState label="Analysing your history…" />
      ) : p.status === "insufficient" ? (
        <Panel>
          <EmptyState
            icon={TrendingUp}
            title="More expense history needed"
            description={
              p.reason === "none"
                ? `Predictions need at least ${p.neededDays} days of recorded expenses. Add your expenses as you go and an estimate will appear here.`
                : p.reason === "days"
                  ? `You have ${p.days} day${p.days === 1 ? "" : "s"} of expense history. We need at least ${p.neededDays} days before showing an estimate — only ${p.neededDays - p.days} more to go.`
                  : `You have ${p.expenseCount} expense${p.expenseCount === 1 ? "" : "s"} recorded. We need at least ${p.neededExpenses} so the estimate reflects real habits.`
            }
            action={<Button variant="hero" size="sm" asChild><Link to="/expenses">Add an expense</Link></Button>}
          />
          <HistoryMeter days={p.days} />
        </Panel>
      ) : (
        <>
          {p.tier === "basic" && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Low confidence: this is a basic estimate from only {p.days} days of history. Treat it as a rough guide.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title={`Estimated spending · ${monthLabel(p.month, true)}`} subtitle={p.label} className="lg:col-span-2">
              <p className="font-display text-4xl font-semibold tabular">{formatINR(p.estimate)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Likely range {formatINR(p.low)} – {formatINR(p.high)}</p>
              {p.budget ? (
                <div className={cn("mt-4 rounded-xl border p-4 text-sm", p.budget.level === "over" ? "border-destructive/40 bg-destructive/10" : p.budget.level === "near" ? "border-warning/40 bg-warning/10" : "border-success/40 bg-success/10")}>
                  <p className="font-medium">
                    {p.budget.level === "over" ? `About ${formatINR(p.budget.diff)} over your current monthly budget` : p.budget.level === "near" ? "Close to your current monthly budget" : `About ${formatINR(-p.budget.diff)} under your current monthly budget`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Budget {formatINR(p.budget.amount)} ({p.budget.source === "overall" ? "overall" : "sum of category budgets"}) · predicted {Math.round(p.budget.pct)}% of it
                  </p>
                  <Progress value={Math.min(100, p.budget.pct)} className="mt-2 h-2" />
                </div>
              ) : (
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-3.5" /> Set a budget for this month in the <Link to="/budgets" className="underline">Budget Planner</Link> to compare it with this estimate.
                </p>
              )}
            </Panel>
            <Panel title="Prediction confidence">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{p.confidenceLevel}</Badge>
                <span className="text-xs text-muted-foreground">{p.days} days of history</span>
              </div>
              <HistoryMeter days={p.days} />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.note}</p>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Predicted by category" subtitle={monthLabel(p.month, true)}>
              <ul className="space-y-4">
                {p.categories.map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{c.category}</span>
                      <span className="tabular">{formatINR(c.estimate)}</span>
                    </div>
                    <Progress value={c.share * 100} className="mt-1.5 h-1.5" />
                    {c.budget !== null && (
                      <p className={cn("mt-1 text-xs", (c.overBy ?? 0) > 0 ? "text-destructive" : "text-muted-foreground")}>
                        Budget {formatINR(c.budget)} — {(c.overBy ?? 0) > 0 ? `likely over by ${formatINR(c.overBy ?? 0)}` : "likely within budget"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Recent weekly spending" subtitle="What the estimate is based on">
              <SpendLine data={p.weekly} dataKey="expense" label="Spent" />
            </Panel>
          </div>
        </>
      )}

      <Panel title="Unusual spending" subtitle="Compared with your own normal pattern">
        {anomalies.length ? (
          <ul className="space-y-3">
            {anomalies.map((a) => (
              <li key={a.key} className="rounded-xl border border-border bg-surface-raised/50 p-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Radar} title="Nothing unusual" description="Spikes compared with your normal pattern will be flagged here, gently and with an explanation." className="py-6" />
        )}
      </Panel>
    </>
  );
}

function HistoryMeter({ days }: { days: number }) {
  const steps = [7, 30, 60, 90];
  return (
    <div className="mt-4">
      <Progress value={Math.min(100, (days / FULL_CONFIDENCE_DAYS) * 100)} className="h-2" />
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        {steps.map((s) => <span key={s} className={days >= s ? "text-foreground" : ""}>{s}d</span>)}
      </div>
    </div>
  );
}
