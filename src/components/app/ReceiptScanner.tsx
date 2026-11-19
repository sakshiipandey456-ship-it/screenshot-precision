import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, ImageUp, Loader2, PencilLine, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scanReceipt, type ReceiptResult } from "@/lib/receipt.functions";
import { validateReceiptFile } from "@/lib/receipt-rules";
import { formatINR } from "@/lib/format";
import type { TxnDraft } from "./TransactionDialog";

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Could not read that file."));
    r.readAsDataURL(file);
  });
}

/** Reads a receipt photo with AI and hands the details to the form for the user to check. Nothing is saved here. */
export function ReceiptScanner({ onReview }: { onReview: (draft: TxnDraft) => void }) {
  const scan = useServerFn(scanReceipt);
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptResult | null>(null);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setError(null);
    if (input.current) input.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    reset();
    const invalid = validateReceiptFile(file);
    if (invalid) return setError(invalid);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const base64 = await readBase64(file);
      const res = await scan({ data: { base64, mediaType: file.type as "image/jpeg" } });
      if (!res.ok) setError(`${res.message} You can still enter the details manually.`);
      else if (!res.result.readable) setError("This doesn't look like a readable receipt. Try a clearer photo, or enter it manually.");
      else setResult(res.result);
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "Scanning failed."} You can still enter the details manually.`);
    } finally {
      setBusy(false);
    }
  }

  const draft = (): TxnDraft => ({
    kind: "expense",
    title: result?.merchant ?? "",
    amount: result?.total ?? "",
    category: result?.category ?? "",
    txn_date: result?.date ?? undefined,
    description: "Added from receipt scan",
  });

  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="receipt-file" onChange={(e) => onFile(e.target.files?.[0])} />
      {!preview ? (
        <label htmlFor="receipt-file" className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/40 px-4 py-6 text-center transition-colors hover:border-primary/50">
          <ImageUp className="size-6 text-primary-glow" />
          <span className="text-sm font-medium">Upload a receipt photo</span>
          <span className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB</span>
        </label>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <img src={preview} alt="Receipt preview" className="max-h-48 w-full object-contain bg-surface-raised" />
          <Button variant="glass" size="icon" className="absolute right-2 top-2 size-7" onClick={reset} aria-label="Remove receipt">
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" /> Reading your receipt…
        </p>
      )}
      {error && (
        <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground" role="alert">
          <AlertTriangle className="size-4 shrink-0 text-warning" /> {error}
        </p>
      )}
      {result && (
        <div className="space-y-2 rounded-xl border border-border bg-surface-raised/50 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" /> Found these details — please check them
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Merchant</dt>
            <dd>{result.merchant ?? "Not found"}</dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd>{result.total !== null ? formatINR(result.total) : "Not found"}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{result.date ?? "Not found"}</dd>
            <dt className="text-muted-foreground">Category</dt>
            <dd>{result.category ?? "Not sure"}</dd>
          </dl>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {result && (
          <Button size="sm" variant="hero" onClick={() => onReview(draft())}>
            <ScanLine /> Review & save
          </Button>
        )}
        <Button size="sm" variant="glass" onClick={() => onReview({ kind: "expense" })}>
          <PencilLine /> Enter manually
        </Button>
      </div>
    </div>
  );
}
