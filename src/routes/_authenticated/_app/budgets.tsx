import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { LoadingState } from "@/components/app/LoadingState";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { FormField } from "@/components/app/FormField";
import { expenseCategories } from "@/lib/categories";
import { useBudgets, useDeleteBudget, useSaveBudget, useTransactions } from "@/lib/data";
import { addMonths, monthBudgets, monthKey, monthLabel, parseDate, type Budget, type BudgetLevel } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { budgetSchema, issuesToErrors, type FieldErrors } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";

import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/budgets")({
  head: () => pageHead("Smart Budget Planner", "Set monthly and category budgets and track what's left."),
  component: BudgetsPage,
});

const levelStyle: Record<BudgetLevel, string> = {
  ok: "[&>div]:bg-success",
  warning: "[&>div]:bg-warning",
  exceeded: "[&>div]:bg-destructive",
};

function suggestion(category: string | null, level: BudgetLevel, remaining: number, daysLeft: number) {
  const name = category ?? "overall";
  if (level === "exceeded") return `You're ${formatINR(-remaining)} over your ${name} budget. Pausing non-essential ${category ?? ""} spending for the rest of the month will help.`.replace("  ", " ");
  if (level === "warning") return `Only ${formatINR(remaining)} left — about ${formatINR(remaining / Math.max(1, daysLeft))} a day for the next ${daysLeft} days.`;
  return `${formatINR(remaining)} left. You're on track.`;
}

function BudgetsPage() {
  const today = useToday();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const budgetsQ = useBudgets();
  const txQ = useTransactions();
  const save = useSaveBudget();
  const del = useDeleteBudget();
  const [dialog, setDialog] = useState<{ open: boolean; budget: Budget | null; overall: boolean }>({ open: false, budget: null, overall: false });

  const rows = useMemo(() => monthBudgets(budgetsQ.data ?? [], txQ.data ?? [], month), [budgetsQ.data, txQ.data, month]);
  const overall = rows.find((r) => r.budget.category === null);
  const cats = rows.filter((r) => r.budget.category !== null);
  const isCurrent = month === monthKey(today);
  const monthDate = parseDate(`${month}-01`);
  const daysLeft = isCurrent ? new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1 : 0;
  const prevKey = monthKey(addMonths(monthDate, -1));
  const prevBudgets = (budgetsQ.data ?? []).filter((b) => b.month.slice(0, 7) === prevKey);

  async function copyPrevious() {
    const existing = new Set(rows.map((r) => r.budget.category ?? "__all"));
    for (const b of prevBudgets) {
      if (existing.has(b.category ?? "__all")) continue;
      await save.mutateAsync({ month: `${month}-01`, category: b.category, amount: b.amount }).catch(() => undefined);
    }
  }

  const loading = budgetsQ.isLoading || txQ.isLoading;
  return (
    <>
      <PageHeader
        title="Smart Budget Planner"
        description="Plan your month. You'll get a heads-up at 80% of a budget and a warning once it's used up."
        actions={
          <>
            <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Budget month" className="h-9 w-44" />
            <Button variant="hero" onClick={() => setDialog({ open: true, budget: null, overall: false })}>
              <Plus /> Add budget
            </Button>
          </>
        }
      />
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title={`Overall budget · ${monthLabel(month, true)}`}
              action={
                overall ? (
                  <RowActions onEdit={() => setDialog({ open: true, budget: overall.budget, overall: true })} onDelete={() => del.mutate(overall.budget.id)} label="overall budget" />
                ) : undefined
              }
            >
              {overall ? (
                <>
                  <p className="font-display text-3xl font-semibold tabular">{formatINR(overall.limit)}</p>
                  <Progress value={Math.min(100, overall.pct)} className={cn("mt-4 h-2.5", levelStyle[overall.level])} aria-label={`${Math.round(overall.pct)}% used`} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Used {formatINR(overall.spent)} ({Math.round(overall.pct)}%)</span>
                    <span>{overall.remaining >= 0 ? `Left ${formatINR(overall.remaining)}` : `Over by ${formatINR(-overall.remaining)}`}</span>
                  </div>
                  <LevelNote level={overall.level} text={suggestion(null, overall.level, overall.remaining, daysLeft || 1)} />
                </>
              ) : (
                <EmptyState icon={Wallet} title="No overall budget" description="Set one limit for everything you spend this month." className="py-4" action={<Button size="sm" variant="glass" onClick={() => setDialog({ open: true, budget: null, overall: true })}>Set overall budget</Button>} />
              )}
            </Panel>

            <Panel
              title="Category budgets"
              subtitle={`${cats.length} set for ${monthLabel(month, true)}`}
              className="lg:col-span-2"
              action={
                prevBudgets.length > 0 && rows.length < prevBudgets.length ? (
                  <Button size="sm" variant="ghost" onClick={copyPrevious} disabled={save.isPending}>
                    {save.isPending ? <Loader2 className="animate-spin" /> : <Copy />} Copy {monthLabel(prevKey)}'s budgets
                  </Button>
                ) : undefined
              }
            >
              {cats.length ? (
                <ul className="space-y-5">
                  {cats.map((r) => (
                    <li key={r.budget.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{r.budget.category}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs tabular text-muted-foreground">
                            {formatINR(r.spent)} / {formatINR(r.limit)}
                          </span>
                          <RowActions onEdit={() => setDialog({ open: true, budget: r.budget, overall: false })} onDelete={() => del.mutate(r.budget.id)} label={`${r.budget.category} budget`} />
                        </div>
                      </div>
                      <Progress value={Math.min(100, r.pct)} className={cn("mt-1.5 h-2", levelStyle[r.level])} aria-label={`${Math.round(r.pct)}% used`} />
                      <LevelNote level={r.level} text={suggestion(r.budget.category, r.level, r.remaining, daysLeft || 1)} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Wallet} title="No category budgets" description="Give Food, Travel or any category its own limit, e.g. Food ₹3,000." action={<Button size="sm" variant="glass" onClick={() => setDialog({ open: true, budget: null, overall: false })}><Plus /> Add category budget</Button>} />
              )}
            </Panel>
          </div>

          {cats.length > 0 && (
            <Panel title="Planned vs actual" subtitle={monthLabel(month, true)}>
              <ChartContainer config={{ planned: { label: "Planned", color: "var(--chart-1)" }, actual: { label: "Actual", color: "var(--chart-2)" } }} className="h-64 w-full">
                <BarChart data={cats.map((r) => ({ label: r.budget.category, planned: r.limit, actual: r.spent }))}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} tickLine={false} axisLine={false} width={48} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => `${n === "planned" ? "Planned" : "Actual"}: ${formatINR(Number(v))}`} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="planned" fill="var(--color-planned)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual" fill="var(--color-actual)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Panel>
          )}
        </>
      )}
      <BudgetDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        budget={dialog.budget}
        overall={dialog.overall}
        month={month}
        taken={new Set(rows.map((r) => r.budget.category ?? "__overall__"))}
      />
    </>
  );
}

function LevelNote({ level, text, compact }: { level: BudgetLevel; text: string; compact?: boolean }) {
  const Icon = level === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs", compact ? "mt-1.5" : "mt-3", level === "ok" ? "text-muted-foreground" : level === "warning" ? "text-warning" : "text-destructive")}>
      <Icon className="mt-px size-3.5 shrink-0" /> {text}
    </p>
  );
}

function RowActions({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) {
  return (
    <div className="flex">
      <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit ${label}`} onClick={onEdit}>
        <Pencil className="size-3.5" />
      </Button>
      <ConfirmDialog
        title={`Delete the ${label}?`}
        description="Your transactions stay untouched; only this limit is removed."
        onConfirm={onDelete}
        trigger={
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label={`Delete ${label}`}>
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
    </div>
  );
}

function BudgetDialog({ open, onOpenChange, budget, overall, month, taken }: { open: boolean; onOpenChange: (o: boolean) => void; budget: Budget | null; overall: boolean; month: string; taken: Set<string> }) {
  const save = useSaveBudget();
  const [category, setCategory] = useState<string>("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const effectiveCategory = budget ? budget.category ?? "__overall__" : overall ? "__overall__" : category;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!effectiveCategory) return setErrors({ category: "Choose a category" });
    const r = budgetSchema.safeParse({ category: effectiveCategory === "__overall__" ? null : effectiveCategory, amount: new FormData(e.currentTarget).get("amount"), month: `${month}-01` });
    if (!r.success) return setErrors(issuesToErrors(r.error));
    setErrors({});
    await save.mutateAsync({ ...r.data, id: budget?.id }).then(() => {
      onOpenChange(false);
      setCategory("");
    }, () => undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : overall ? "Set overall budget" : "Add a category budget"}</DialogTitle>
          <DialogDescription>For {monthLabel(month, true)}.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit} noValidate key={`${open}-${budget?.id}`}>
          {!budget && !overall && (
            <FormField id="b-category" label="Category" error={errors.category}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="b-category"><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c} disabled={taken.has(c)}>
                      {c}{taken.has(c) ? " (already set)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <FormField id="b-amount" label="Monthly limit (₹)" error={errors.amount}>
            <Input id="b-amount" name="amount" type="number" min="0" step="1" inputMode="decimal" defaultValue={budget?.amount ?? ""} placeholder="3000" autoFocus />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Save budget</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
