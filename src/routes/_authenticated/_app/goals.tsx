import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, History, Loader2, Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { LoadingState } from "@/components/app/LoadingState";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { FormField } from "@/components/app/FormField";
import { HorizontalBars } from "@/components/app/charts";
import { useToday } from "@/hooks/use-today";
import { useAddContribution, useContributions, useDeleteContribution, useDeleteGoal, useGoals, useSaveGoal } from "@/lib/data";
import { goalEta, goalProgress, isoDate, parseDate, type Goal } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { contributionSchema, goalSchema, issuesToErrors, type FieldErrors } from "@/lib/schemas";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/goals")({
  head: () => pageHead("Savings Goals", "Save for a laptop, a trip or an emergency fund and track progress."),
  component: GoalsPage,
});

const fmt = (s: string) => parseDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function GoalsPage() {
  const today = useToday();
  const goalsQ = useGoals();
  const contribQ = useContributions();
  const del = useDeleteGoal();
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const goals = goalsQ.data ?? [];
  const contributions = contribQ.data ?? [];

  return (
    <>
      <PageHeader
        title="Savings Goals"
        description="Name a goal, set a target and date, then add money to it as you save."
        actions={<Button variant="hero" onClick={() => setGoalDialog({ open: true, goal: null })}><Plus /> New goal</Button>}
      />
      {goalsQ.isLoading ? (
        <LoadingState />
      ) : goals.length === 0 ? (
        <Panel>
          <EmptyState icon={Target} title="No goals yet" description="Try a new laptop, a trip with friends, or an emergency fund. Your progress and estimated finish date will appear here." action={<Button variant="glass" size="sm" onClick={() => setGoalDialog({ open: true, goal: null })}><Plus /> Create your first goal</Button>} />
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => {
              const pct = goalProgress(g);
              const eta = goalEta(g, contributions, today);
              const late = eta.status === "estimate" && g.target_date && eta.date! > g.target_date;
              const history = contributions.filter((c) => c.goal_id === g.id);
              return (
                <Panel
                  key={g.id}
                  title={g.name}
                  subtitle={g.target_date ? `Target date ${fmt(g.target_date)}` : "No target date"}
                  action={
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="size-7" aria-label={`Edit ${g.name}`} onClick={() => setGoalDialog({ open: true, goal: g })}><Pencil className="size-3.5" /></Button>
                      <ConfirmDialog
                        title={`Delete “${g.name}”?`}
                        description="The goal and its contribution history will be removed. Your transactions are not affected."
                        onConfirm={() => del.mutate(g.id)}
                        trigger={<Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label={`Delete ${g.name}`}><Trash2 className="size-3.5" /></Button>}
                      />
                    </div>
                  }
                >
                  <div className="flex items-end justify-between">
                    <p className="font-display text-2xl font-semibold tabular">{formatINR(g.saved_amount)}</p>
                    <p className="text-sm text-muted-foreground">of {formatINR(g.target_amount)}</p>
                  </div>
                  <Progress value={pct} className="mt-3 h-2.5 [&>div]:bg-gradient-brand" aria-label={`${Math.round(pct)}% saved`} />
                  <p className="mt-1.5 text-xs text-muted-foreground">{Math.round(pct)}% saved · {formatINR(Math.max(0, g.target_amount - g.saved_amount))} to go</p>
                  <div className="mt-4 rounded-xl border border-border bg-surface-raised/50 p-3 text-xs">
                    {eta.status === "done" ? (
                      <p className="flex items-center gap-1.5 font-medium text-success"><Trophy className="size-3.5" /> Goal reached — well done!</p>
                    ) : eta.status === "estimate" ? (
                      <p className="flex items-start gap-1.5">
                        <CalendarClock className="mt-px size-3.5 shrink-0 text-cyan" />
                        <span>
                          <span className="font-medium">Estimated finish: {fmt(eta.date!)}</span>
                          <span className="block text-muted-foreground">Estimate based on your recent pace of about {formatINR(eta.monthlyPace)}/month.{late ? " That's after your target date — a little extra each month would close the gap." : ""}</span>
                        </span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Add a contribution to see an estimated finish date.</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="hero" className="flex-1" onClick={() => setContribGoal(g)} disabled={pct >= 100}><Plus /> Add money</Button>
                    <HistoryPopover items={history} />
                  </div>
                </Panel>
              );
            })}
          </div>
          <Panel title="Progress across goals">
            <HorizontalBars data={goals.map((g) => ({ label: g.name.length > 14 ? `${g.name.slice(0, 13)}…` : g.name, value: Math.round(goalProgress(g)) }))} className={goals.length > 4 ? "h-80" : "h-48"} />
          </Panel>
        </>
      )}
      <GoalDialog open={goalDialog.open} goal={goalDialog.goal} onOpenChange={(open) => setGoalDialog((d) => ({ ...d, open }))} />
      <ContributionDialog goal={contribGoal} onClose={() => setContribGoal(null)} />
    </>
  );
}

function HistoryPopover({ items }: { items: { id: string; amount: number; contributed_on: string; note?: string | null }[] }) {
  const del = useDeleteContribution();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="glass" aria-label="Contribution history"><History /> {items.length}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-2 text-sm font-semibold">Contributions</p>
        {items.length ? (
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {items.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className="flex-1">
                  <span className="font-medium tabular">{formatINR(c.amount)}</span>
                  <span className="block text-xs text-muted-foreground">{fmt(c.contributed_on)}{c.note ? ` · ${c.note}` : ""}</span>
                </span>
                <ConfirmDialog title="Remove this contribution?" description="The goal's saved amount will go down by this amount." confirmLabel="Remove" onConfirm={() => del.mutate(c.id)} trigger={<Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Remove contribution"><Trash2 className="size-3.5" /></Button>} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No contributions yet.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function GoalDialog({ open, goal, onOpenChange }: { open: boolean; goal: Goal | null; onOpenChange: (o: boolean) => void }) {
  const save = useSaveGoal();
  const [errors, setErrors] = useState<FieldErrors>({});
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = goalSchema.safeParse({ name: f.get("name"), target_amount: f.get("target_amount"), saved_amount: goal ? goal.saved_amount : f.get("saved_amount") || 0, target_date: f.get("target_date") || null });
    if (!r.success) return setErrors(issuesToErrors(r.error));
    setErrors({});
    const { saved_amount, ...rest } = r.data;
    await save.mutateAsync(goal ? { ...rest, id: goal.id } : { ...rest, saved_amount }).then(() => onOpenChange(false), () => undefined);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>Examples: a laptop, a trip, an emergency fund, education costs.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit} noValidate key={`${open}-${goal?.id}`}>
          <FormField id="g-name" label="Goal name" error={errors.name}>
            <Input id="g-name" name="name" defaultValue={goal?.name ?? ""} placeholder="New laptop" maxLength={80} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="g-target" label="Target amount (₹)" error={errors.target_amount}>
              <Input id="g-target" name="target_amount" type="number" min="0" inputMode="decimal" defaultValue={goal?.target_amount ?? ""} placeholder="50000" />
            </FormField>
            {!goal && (
              <FormField id="g-saved" label="Already saved (₹)" error={errors.saved_amount}>
                <Input id="g-saved" name="saved_amount" type="number" min="0" inputMode="decimal" placeholder="0" />
              </FormField>
            )}
          </div>
          <FormField id="g-date" label="Target date (optional)" error={errors.target_date}>
            <Input id="g-date" name="target_date" type="date" defaultValue={goal?.target_date ?? ""} min={isoDate(new Date())} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Save goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContributionDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const add = useAddContribution();
  const [errors, setErrors] = useState<FieldErrors>({});
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!goal) return;
    const f = new FormData(e.currentTarget);
    const note = String(f.get("note") ?? "").trim();
    const r = contributionSchema.safeParse({ amount: f.get("amount"), contributed_on: f.get("contributed_on"), note: note || null });
    if (!r.success) return setErrors(issuesToErrors(r.error));
    setErrors({});
    await add.mutateAsync({ ...r.data, goal_id: goal.id }).then(onClose, () => undefined);
  }
  return (
    <Dialog open={!!goal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add money to {goal?.name}</DialogTitle>
          <DialogDescription>Record money you've set aside. Nothing is moved from any bank.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit} noValidate key={goal?.id}>
          <FormField id="c-amount" label="Amount (₹)" error={errors.amount}>
            <Input id="c-amount" name="amount" type="number" min="0" inputMode="decimal" autoFocus placeholder="500" />
          </FormField>
          <FormField id="c-date" label="Date" error={errors.contributed_on}>
            <Input id="c-date" name="contributed_on" type="date" defaultValue={isoDate(new Date())} />
          </FormField>
          <FormField id="c-note" label="Note (optional)" error={errors.note}>
            <Input id="c-note" name="note" maxLength={200} placeholder="Birthday money" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={add.isPending}>{add.isPending && <Loader2 className="animate-spin" />} Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
