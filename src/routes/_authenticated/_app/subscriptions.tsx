import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BellRing, CalendarCheck, CalendarClock, Loader2, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { DatePicker } from "@/components/app/DatePicker";
import { EmptyState } from "@/components/app/EmptyState";
import { FormField } from "@/components/app/FormField";
import { ErrorState, LoadingState } from "@/components/app/LoadingState";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { StatCard } from "@/components/app/StatCard";
import { useToday } from "@/hooks/use-today";
import { expenseCategories } from "@/lib/categories";
import { useDeleteSubscription, useSaveSubscription, useSubscriptions } from "@/lib/data";
import { advanceDate, daysBetween, isoDate, monthlyEquivalent, parseDate, type Frequency, type Subscription } from "@/lib/finance";
import { formatDate, formatINR } from "@/lib/format";
import { issuesToErrors, subscriptionSchema, type FieldErrors } from "@/lib/schemas";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/subscriptions")({
  head: () => pageHead("Subscription Tracker", "Keep an eye on recharges, bills and memberships that repeat."),
  component: SubscriptionsPage,
});

const FREQ: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];
const REMINDER_DAYS = 7;

function SubscriptionsPage() {
  const today = useToday();
  const q = useSubscriptions();
  const del = useDeleteSubscription();
  const save = useSaveSubscription();
  const [dialog, setDialog] = useState<{ open: boolean; sub: Subscription | null }>({ open: false, sub: null });
  const subs = useMemo(() => q.data ?? [], [q.data]);

  const view = useMemo(() => {
    const active = subs.filter((s) => s.is_active);
    const monthly = active.reduce((a, s) => a + monthlyEquivalent(s.amount, s.frequency), 0);
    const withDays = active.map((s) => ({ s, days: daysBetween(today, parseDate(s.next_payment_date)) })).sort((a, b) => a.days - b.days);
    return {
      active,
      monthly,
      yearly: monthly * 12,
      due: withDays.filter((x) => x.days <= REMINDER_DAYS),
      share: active.map((s) => ({ s, monthly: monthlyEquivalent(s.amount, s.frequency) })).sort((a, b) => b.monthly - a.monthly),
    };
  }, [subs, today]);

  const dueText = (d: number) => (d < 0 ? `${-d} day${d === -1 ? "" : "s"} overdue` : d === 0 ? "due today" : d === 1 ? "due tomorrow" : `due in ${d} days`);

  return (
    <>
      <PageHeader
        title="Subscription Tracker"
        description="List your recurring payments to see what's due next and what they cost. CashCompass only reminds you — it never charges or starts payments."
        actions={<Button variant="hero" onClick={() => setDialog({ open: true, sub: null })}><Plus /> Add subscription</Button>}
      />
      {q.isError && <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      {view.due.length > 0 && (
        <div role="status" className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-warning"><BellRing className="size-4" /> Payment reminders</p>
          <ul className="mt-2 space-y-1 text-sm">
            {view.due.map(({ s, days }) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span><strong>{s.name}</strong> · {formatINR(s.amount)} · <span className={days < 0 ? "text-destructive" : ""}>{dueText(days)}</span></span>
                {days < 0 && (
                  <Button size="sm" variant="ghost" className="h-7" disabled={save.isPending} onClick={() => save.mutate({ name: s.name, amount: s.amount, frequency: s.frequency, category: s.category, is_active: s.is_active, id: s.id, next_payment_date: advanceDate(s.next_payment_date, s.frequency) })}>
                    <CalendarCheck /> Mark paid
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly subscription cost" value={formatINR(view.monthly)} hint={`Across ${view.active.length} active subscription${view.active.length === 1 ? "" : "s"}`} icon={Repeat} />
        <StatCard label="Yearly subscription cost" value={formatINR(view.yearly)} hint="Monthly cost × 12" icon={CalendarClock} tone="cyan" />
        <StatCard label="Due in the next 7 days" value={String(view.due.length)} hint={view.due.length ? "See reminders above" : "Nothing due soon"} icon={BellRing} tone="danger" />
      </div>

      {q.isLoading ? (
        <LoadingState label="Loading subscriptions…" />
      ) : subs.length === 0 ? (
        <Panel>
          <EmptyState icon={Repeat} title="No subscriptions yet" description="Add mobile recharges, internet, rent, streaming and other regular payments to see what they cost and when they're due." action={<Button variant="hero" size="sm" onClick={() => setDialog({ open: true, sub: null })}><Plus /> Add subscription</Button>} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="All subscriptions" subtitle="Ordered by next payment date" className="lg:col-span-2">
            <ul className="divide-y divide-border">
              {subs.map((s) => {
                const d = daysBetween(today, parseDate(s.next_payment_date));
                return (
                  <li key={s.id} className={cn("flex items-center gap-3 py-3", !s.is_active && "opacity-60")}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{s.name}</span>{!s.is_active && <Badge variant="outline" className="text-[10px]">Cancelled</Badge>}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">{s.category}</Badge>
                        <span>{FREQ.find((f) => f.value === s.frequency)?.label}</span>
                        {s.is_active && <span>· Next {formatDate(s.next_payment_date)} ({dueText(d)})</span>}
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular">{formatINR(s.amount)}</p>
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${s.name}`} onClick={() => setDialog({ open: true, sub: s })}><Pencil className="size-3.5" /></Button>
                      <ConfirmDialog
                        title="Delete this subscription?"
                        description={`“${s.name}” will be removed and your totals will update.`}
                        onConfirm={() => del.mutate(s.id)}
                        trigger={<Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${s.name}`}><Trash2 className="size-3.5" /></Button>}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Spending by subscription" subtitle="Monthly equivalent, active only">
            {view.share.length ? (
              <ul className="space-y-4">
                {view.share.map(({ s, monthly }) => (
                  <li key={s.id}>
                    <div className="flex justify-between gap-2 text-sm"><span className="truncate">{s.name}</span><span className="tabular text-muted-foreground">{formatINR(monthly)}/mo</span></div>
                    <Progress value={view.monthly ? (monthly / view.monthly) * 100 : 0} className="mt-1.5 h-1.5" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No active subscriptions.</p>
            )}
          </Panel>
        </div>
      )}
      <SubscriptionDialog open={dialog.open} sub={dialog.sub} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </>
  );
}

function SubscriptionDialog({ open, sub, onOpenChange }: { open: boolean; sub: Subscription | null; onOpenChange: (o: boolean) => void }) {
  const save = useSaveSubscription();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [category, setCategory] = useState("");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [status, setStatus] = useState("active");
  const [prevKey, setPrevKey] = useState("");
  const key = `${open}-${sub?.id ?? "new"}`;
  if (key !== prevKey) {
    setPrevKey(key);
    setCategory(sub?.category ?? "Bills");
    setFreq(sub?.frequency ?? "monthly");
    setStatus(sub ? (sub.is_active ? "active" : "cancelled") : "active");
    setErrors({});
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = subscriptionSchema.safeParse({ name: f.get("name"), amount: f.get("amount"), frequency: freq, next_payment_date: f.get("next_payment_date"), category, is_active: status === "active" });
    if (!r.success) return setErrors(issuesToErrors(r.error));
    setErrors({});
    await save.mutateAsync({ ...r.data, id: sub?.id }).then(
      () => {
        onOpenChange(false);
      },
      () => undefined,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sub ? "Edit subscription" : "Add subscription"}</DialogTitle>
          <DialogDescription>Saved to your account. We only remind you — nothing is ever charged.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit} noValidate key={key}>
          <FormField id="s-name" label="Subscription name" error={errors.name}>
            <Input id="s-name" name="name" defaultValue={sub?.name ?? ""} placeholder="e.g. Netflix, Mobile recharge" maxLength={80} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="s-amount" label="Amount (₹)" error={errors.amount}>
              <Input id="s-amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={sub?.amount ?? ""} placeholder="0" />
            </FormField>
            <FormField id="s-freq" label="Billing frequency">
              <Select value={freq} onValueChange={(v) => setFreq(v as Frequency)}>
                <SelectTrigger id="s-freq"><SelectValue /></SelectTrigger>
                <SelectContent>{FREQ.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="s-cat" label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="s-cat"><SelectValue /></SelectTrigger>
                <SelectContent>{expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField id="s-status" label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="s-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField id="s-next" label="Next payment date" error={errors.next_payment_date}>
            <DatePicker id="s-next" name="next_payment_date" defaultValue={sub?.next_payment_date ?? isoDate(new Date())} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />} {sub ? "Save changes" : "Add subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
