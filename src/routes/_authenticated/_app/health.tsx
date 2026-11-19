import { createFileRoute } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { StageRoadmap } from "@/components/app/StageRoadmap";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/health")({
  head: () => pageHead("Financial Health Score", "A friendly score for your money habits, with tips to improve."),
  component: HealthPage,
});

function ScoreRing({ value }: { value: number | null }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  return (
    <div className="relative mx-auto size-48">
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <defs>
          <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--cyan)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-semibold tabular">{value ?? "—"}</span>
        <span className="text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

function HealthPage() {
  return (
    <>
      <PageHeader title="Financial Health Score" description="A learning tool to build better habits. It is not a credit score and says nothing about your worth." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Your score">
          <ScoreRing value={null} />
          <p className="mt-4 text-center text-sm text-muted-foreground">Add a month of transactions to get your first score.</p>
        </Panel>
        <Panel title="Spending challenges" subtitle="Optional and encouraging" className="lg:col-span-2">
          <EmptyState icon={Flag} title="No challenges started" description="Try small habits like tracking every expense for 7 days or staying within your food budget this week." />
        </Panel>
      </div>
      <StageRoadmap
        items={[
          { title: "Score from your habits", detail: "Savings rate, budget discipline, consistency and more.", stage: 7 },
          { title: "What's going well", detail: "Positive habits are called out first.", stage: 7 },
          { title: "Tips to improve", detail: "Small, practical steps to raise your score.", stage: 7 },
          { title: "Spending challenges", detail: "Opt-in habit challenges with progress tracking.", stage: 8 },
        ]}
      />
    </>
  );
}
