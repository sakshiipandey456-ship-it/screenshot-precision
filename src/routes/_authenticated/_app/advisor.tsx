import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { ErrorState } from "@/components/app/LoadingState";
import { LogoMark } from "@/components/brand/Logo";
import { askAdvisor } from "@/lib/advisor.functions";
import { qk, useAdvisorHistory, type AdvisorMessage } from "@/lib/data";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/advisor")({
  head: () => pageHead("AI Financial Advisor", "Ask Compass AI about your spending, budgets and savings."),
  component: AdvisorPage,
});

const suggestions = [
  "Give me a summary of my financial activity.",
  "Where am I spending the most?",
  "Which category increased the most?",
  "Am I following my budget?",
  "Where am I spending unnecessarily?",
  "Suggest realistic budget adjustments.",
  "How can I improve my savings?",
  "How much did I save this month?",
];

function friendly(msg: string) {
  if (/not authenticated|JWT|unauthor|401/i.test(msg)) return "Your session has expired. Please sign in again.";
  if (/fetch|network|Failed to/i.test(msg)) return "Couldn't reach the server. Check your connection and try again.";
  return msg || "Something went wrong. Please try again.";
}

function AdvisorPage() {
  const qc = useQueryClient();
  const history = useAdvisorHistory();
  const ask = useServerFn(askAdvisor);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (question: string) => ask({ data: { question } }),
    onMutate: (q) => {
      setPending(q);
      setError(null);
      setNotice(null);
    },
    onSuccess: (r) => setNotice(r.notice ?? (r.source === "rules" ? "Showing the built-in analysis of your records." : null)),
    onError: (e: Error) => setError(friendly(e.message)),
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.advisor });
      setPending(null);
    },
  });

  const messages: AdvisorMessage[] = history.data ?? [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function submit(q: string) {
    const question = q.trim();
    if (!question || send.isPending) return;
    if (question.length > 500) return setError("Keep questions under 500 characters.");
    setInput("");
    send.mutate(question);
  }
  const empty = !history.isLoading && messages.length === 0 && !pending;

  return (
    <>
      <PageHeader title="Compass AI" description="Your personal money assistant. It reads only your own records to explain where your money goes and how to save more." />
      {history.isError && <ErrorState message={(history.error as Error).message} onRetry={() => history.refetch()} />}
      <Panel className="overflow-hidden">
        <div className="flex min-h-[420px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "55vh" }} aria-live="polite">
            {empty && (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-brand opacity-40 blur-2xl" />
                  <LogoMark className="relative size-14 rounded-2xl" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">Ask me anything about your money</p>
                  <p className="mt-1 text-sm text-muted-foreground">Answers come from your own transactions, budgets and goals.</p>
                </div>
              </div>
            )}
            {messages.map((m) => <Bubble key={m.id} role={m.role} text={m.content} source={m.source} />)}
            {pending && <Bubble role="user" text={pending} source={null} />}
            {send.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" /> Compass AI is analysing your records…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {notice && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning" role="status">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" disabled={send.isPending} onClick={() => submit(s)} className="rounded-full border border-border bg-surface-raised/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your spending, budgets or savings…" className="h-11" maxLength={500} aria-label="Message Compass AI" />
            <Button type="submit" variant="hero" size="icon" className="size-11" disabled={send.isPending || !input.trim()} aria-label="Send">
              {send.isPending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
            </Button>
          </form>
        </div>
      </Panel>
    </>
  );
}

function Bubble({ role, text, source }: { role: "user" | "assistant"; text: string; source: string | null }) {
  const user = role === "user";
  return (
    <div className={cn("flex", user ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed", user ? "bg-gradient-brand text-primary-foreground" : "border border-border bg-surface-raised")}>
        {text}
        {!user && source === "rules" && <p className="mt-2 text-[11px] text-muted-foreground">Built-in analysis of your records</p>}
      </div>
    </div>
  );
}
