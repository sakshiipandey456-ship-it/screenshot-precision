import { Link } from "@tanstack/react-router";
import { HeartPulse, Lightbulb, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { Panel } from "./Panel";
import { ScoreRing } from "./ScoreRing";
import type { HealthResult } from "@/lib/health";
import { cn } from "@/lib/utils";

const toneClass = { success: "bg-success/15 text-success", primary: "bg-primary/15 text-primary-glow", warning: "bg-warning/15 text-warning", danger: "bg-destructive/15 text-destructive" } as const;

/** Financial Health Score: score ring, category, contributing factors and personalised tips. */
export function HealthScoreCard({ result, loading, compact = false, className }: { result: HealthResult | null; loading?: boolean; compact?: boolean; className?: string }) {
  const link = compact ? (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/health">Full breakdown</Link>
    </Button>
  ) : undefined;
  return (
    <Panel title="Financial Health Score" subtitle="Updates automatically as your records change" action={link} {...(className ? { className } : {})}>
      {loading || !result ? (
        <LoadingState label="Calculating your score…" />
      ) : result.status === "insufficient" ? (
        <EmptyState
          icon={HeartPulse}
          title="Not enough data for a score yet"
          description={`A fair score needs at least ${result.neededDays} days of history and ${result.neededTxns} transactions including an expense. You have ${result.days} day${result.days === 1 ? "" : "s"} and ${result.txnCount} transaction${result.txnCount === 1 ? "" : "s"} so far — keep recording and it will appear here.`}
          className="py-6"
        />
      ) : (
        <div className={cn("grid gap-6", compact ? "md:grid-cols-[200px_1fr]" : "")}>
          <div className="text-center">
            <ScoreRing value={result.total} size={compact ? "size-40" : "size-48"} />
            <Badge className={cn("mt-3 border-0", toneClass[result.category.tone])}>{result.category.label}</Badge>
            <p className="mx-auto mt-2 max-w-[220px] text-xs text-muted-foreground">{result.category.blurb}</p>
          </div>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">What makes up your score</p>
              <ul className="space-y-3">
                {result.indicators.map((i) => (
                  <li key={i.key}>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{i.label}</span>
                      <span className="tabular text-muted-foreground">{i.score}/{i.max}</span>
                    </div>
                    <Progress value={(i.score / i.max) * 100} className="mt-1 h-1.5" />
                    {!compact && <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>}
                  </li>
                ))}
              </ul>
            </div>
            {!compact && result.positives.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium"><ThumbsUp className="size-4 text-success" /> What's going well</p>
                <ul className="space-y-1 text-xs text-muted-foreground">{result.positives.map((p) => <li key={p}>• {p}</li>)}</ul>
              </div>
            )}
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Lightbulb className="size-4 text-warning" /> How to improve</p>
              {result.tips.length ? (
                <ul className="space-y-1 text-xs text-muted-foreground">{(compact ? result.tips.slice(0, 2) : result.tips).map((t) => <li key={t}>• {t}</li>)}</ul>
              ) : (
                <p className="text-xs text-muted-foreground">Every factor is in good shape — keep recording every transaction to stay on track.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
