import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "./ConfirmDialog";
import { useDeleteTransaction } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { parseDate, type Txn } from "@/lib/finance";
import { cn } from "@/lib/utils";

const fmtDate = (s: string) => parseDate(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function TransactionList({ txns, onEdit }: { txns: Txn[]; onEdit: (t: Txn) => void }) {
  const del = useDeleteTransaction();
  return (
    <ul className="divide-y divide-border">
      {txns.map((t) => {
        const income = t.kind === "income";
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", income ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")} aria-label={income ? "Income" : "Expense"}>
              {income ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">{t.category}</Badge>
                <span>{fmtDate(t.txn_date)}</span>
                {t.payment_method && <span className="hidden sm:inline">· {t.payment_method}</span>}
              </div>
            </div>
            <p className={cn("shrink-0 text-sm font-semibold tabular", income ? "text-success" : "text-foreground")}>
              {income ? "+" : "−"}
              {formatINR(t.amount)}
            </p>
            <div className="flex shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
              <ConfirmDialog
                title="Delete this transaction?"
                description={`“${t.title}” (${formatINR(t.amount)}) will be removed permanently and your totals will update.`}
                onConfirm={() => del.mutate(t.id)}
                trigger={
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${t.title}`}>
                    <Trash2 className="size-3.5" />
                  </Button>
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
