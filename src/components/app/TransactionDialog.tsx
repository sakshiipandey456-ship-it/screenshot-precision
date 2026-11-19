import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FormField } from "./FormField";
import { expenseCategories, incomeSources, paymentMethods } from "@/lib/categories";
import { useSaveTransaction } from "@/lib/data";
import { isoDate, type TxnKind } from "@/lib/finance";
import { issuesToErrors, transactionSchema, type FieldErrors } from "@/lib/schemas";

export type TxnDraft = {
  id?: string | undefined;
  kind?: TxnKind | undefined;
  title?: string | undefined;
  amount?: number | string | undefined;
  category?: string | undefined;
  txn_date?: string | undefined;
  payment_method?: string | null | undefined;
  description?: string | null | undefined;
};

export function TransactionDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: TxnDraft | null }) {
  const save = useSaveTransaction();
  const [kind, setKind] = useState<TxnKind>("expense");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState<string>("UPI");
  const [errors, setErrors] = useState<FieldErrors>({});
  const editing = !!initial?.id;

  useEffect(() => {
    if (!open) return;
    setKind(initial?.kind ?? "expense");
    setCategory(initial?.category ?? "");
    setMethod(initial?.payment_method ?? "UPI");
    setErrors({});
  }, [open, initial]);

  const categories: readonly string[] = kind === "expense" ? expenseCategories : incomeSources;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const desc = String(f.get("description") ?? "").trim();
    const r = transactionSchema.safeParse({
      kind,
      title: f.get("title"),
      amount: f.get("amount"),
      category,
      txn_date: f.get("txn_date"),
      payment_method: kind === "expense" ? method : null,
      description: desc || null,
    });
    if (!r.success) return setErrors(issuesToErrors(r.error));
    setErrors({});
    await save.mutateAsync({ ...r.data, id: initial?.id }).then(
      () => {
        toast.success(editing ? "Transaction updated" : kind === "expense" ? "Expense added" : "Income added");
        onOpenChange(false);
      },
      () => undefined,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "Add a transaction"}</DialogTitle>
          <DialogDescription>Saved to your account and visible only to you.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit} noValidate key={`${open}-${initial?.id ?? "new"}`}>
          <ToggleGroup
            type="single"
            value={kind}
            onValueChange={(v) => {
              if (!v) return;
              setKind(v as TxnKind);
              setCategory("");
            }}
            variant="outline"
            className="grid grid-cols-2"
            aria-label="Type"
          >
            <ToggleGroupItem value="expense" className="data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive">Expense</ToggleGroupItem>
            <ToggleGroupItem value="income" className="data-[state=on]:bg-success/15 data-[state=on]:text-success">Income</ToggleGroupItem>
          </ToggleGroup>
          <FormField id="title" label={kind === "expense" ? "Expense title" : "Income title"} error={errors.title}>
            <Input id="title" name="title" defaultValue={initial?.title ?? ""} placeholder={kind === "expense" ? "e.g. Lunch at canteen" : "e.g. Monthly allowance"} maxLength={100} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="amount" label="Amount (₹)" error={errors.amount}>
              <Input id="amount" name="amount" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={initial?.amount ?? ""} placeholder="0" />
            </FormField>
            <FormField id="txn_date" label="Date" error={errors.txn_date}>
              <Input id="txn_date" name="txn_date" type="date" defaultValue={initial?.txn_date ?? isoDate(new Date())} max="2100-12-31" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="category" label={kind === "expense" ? "Category" : "Source"} error={errors.category}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {kind === "expense" && (
              <FormField id="method" label="Payment method">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>
          <FormField id="description" label="Note (optional)" error={errors.description}>
            <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} maxLength={500} rows={2} placeholder="Anything to remember about it" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="hero" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />} {editing ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
