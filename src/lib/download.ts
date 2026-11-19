import { toCSV, type Txn } from "./finance";

export function downloadFile(name: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function transactionsCSV(txns: Txn[]) {
  return toCSV(
    txns.map((t) => ({ Date: t.txn_date, Type: t.kind === "income" ? "Income" : "Expense", Title: t.title, Category: t.category, "Amount (INR)": t.amount.toFixed(2), "Payment method": t.payment_method, Note: t.description })),
    ["Date", "Type", "Title", "Category", "Amount (INR)", "Payment method", "Note"],
  );
}
