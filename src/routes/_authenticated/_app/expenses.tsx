import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, ReceiptText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState, LoadingState } from "@/components/app/LoadingState";
import { ReceiptScanner } from "@/components/app/ReceiptScanner";
import { TransactionDialog, type TxnDraft } from "@/components/app/TransactionDialog";
import { TransactionList } from "@/components/app/TransactionList";
import { expenseCategories, incomeSources } from "@/lib/categories";
import { useTransactions } from "@/lib/data";
import { downloadFile, transactionsCSV } from "@/lib/download";
import { isoDate, totals } from "@/lib/finance";
import { formatINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/expenses")({
  head: () => pageHead("Expense Tracker", "Record, search and organise every expense and income."),
  component: ExpensesPage,
});

type Sort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

function ExpensesPage() {
  const q = useTransactions();
  const [dialog, setDialog] = useState<{ open: boolean; initial: TxnDraft | null }>({ open: false, initial: null });
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "income" | "expense">("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<Sort>("date-desc");
  const [limit, setLimit] = useState(50);

  const all = q.data ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = all.filter(
      (t) =>
        (kind === "all" || t.kind === kind) &&
        (category === "all" || t.category === category) &&
        (!from || t.txn_date >= from) &&
        (!to || t.txn_date <= to) &&
        (!s || t.title.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s) || t.category.toLowerCase().includes(s)),
    );
    const [key, dir] = sort.split("-") as ["date" | "amount", "asc" | "desc"];
    const m = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => (key === "amount" ? (a.amount - b.amount) * m : a.txn_date.localeCompare(b.txn_date) * m));
  }, [all, search, kind, category, from, to, sort]);

  const t = totals(filtered);
  const anyFilter = search || kind !== "all" || category !== "all" || from || to;

  return (
    <>
      <PageHeader
        title="Expense Tracker"
        description="Record what you spend and earn. Search, filter and sort your full history."
        actions={
          <>
            <Button variant="glass" disabled={!filtered.length} onClick={() => downloadFile(`cashcompass-transactions-${isoDate(new Date())}.csv`, transactionsCSV(filtered))}>
              <Download /> Export CSV
            </Button>
            <Button variant="hero" onClick={() => setDialog({ open: true, initial: null })}>
              <Plus /> Add transaction
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Transaction history" subtitle={`${filtered.length} shown · in ${formatINR(t.income)} · out ${formatINR(t.expense)}`} className="lg:col-span-2">
          <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="relative sm:col-span-2 xl:col-span-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, note or category" className="pl-9" aria-label="Search transactions" />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger aria-label="Type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Income & expenses</SelectItem>
                <SelectItem value="expense">Expenses only</SelectItem>
                <SelectItem value="income">Income only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectGroup>
                  <SelectLabel>Expenses</SelectLabel>
                  {expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Income</SelectLabel>
                  {incomeSources.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger aria-label="Sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="amount-desc">Highest amount</SelectItem>
                <SelectItem value="amount-asc">Lowest amount</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-3">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="h-9" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="h-9" />
              {anyFilter && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setKind("all"); setCategory("all"); setFrom(""); setTo(""); }}>
                  <X /> Clear
                </Button>
              )}
            </div>
          </div>
          {q.isLoading ? (
            <LoadingState />
          ) : q.isError ? (
            <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
          ) : filtered.length ? (
            <>
              <TransactionList txns={filtered.slice(0, limit)} onEdit={(tx) => setDialog({ open: true, initial: tx })} />
              {filtered.length > limit && (
                <Button variant="ghost" className="mt-2 w-full" onClick={() => setLimit((l) => l + 50)}>Show more</Button>
              )}
            </>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title={all.length ? "No matches" : "No transactions yet"}
              description={all.length ? "Try a different search or clear the filters." : "Add your first expense or income — it's saved to your account right away."}
              action={!all.length ? <Button variant="glass" size="sm" onClick={() => setDialog({ open: true, initial: null })}><Plus /> Add transaction</Button> : undefined}
            />
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Receipt scanner" subtitle="AI reads the receipt; you confirm before saving">
            <ReceiptScanner onReview={(draft) => setDialog({ open: true, initial: draft })} />
          </Panel>
          <Panel title="Quick tips">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Record expenses the same day — small ones add up.</li>
              <li>• Use notes for anything you'll want to remember.</li>
              <li>• Export to CSV anytime to open in Excel or Google Sheets.</li>
            </ul>
          </Panel>
        </div>
      </div>
      <TransactionDialog open={dialog.open} initial={dialog.initial} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </>
  );
}
