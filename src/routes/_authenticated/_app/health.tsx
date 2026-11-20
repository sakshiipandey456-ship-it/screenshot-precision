import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Flag } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/LoadingState";
import { HealthScoreCard } from "@/components/app/HealthScoreCard";
import { StageRoadmap } from "@/components/app/StageRoadmap";
import { useToday } from "@/hooks/use-today";
import { useBudgets, useGoals, useTransactions } from "@/lib/data";
import { computeHealth } from "@/lib/health";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/health")({
  head: () => pageHead("Financial Health Score", "A friendly score for your money habits, with tips to improve."),
  component: HealthPage,
});

function HealthPage() {
  const today = useToday();
  const tx = useTransactions();
  const budgets = useBudgets();
  const goals = useGoals();
  const result = useMemo(
    () => (tx.data && budgets.data && goals.data ? computeHealth({ txns: tx.data, budgets: budgets.data, goals: goals.data, today }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx.data, budgets.data, goals.data, today.toDateString()],
  );
  const err = tx.error ?? budgets.error ?? goals.error;
  return (
    <>
      <PageHeader title="Financial Health Score" description="A learning tool to build better habits. It is not a credit score and says nothing about your worth." />
      {err && <ErrorState message={(err as Error).message} onRetry={() => { tx.refetch(); budgets.refetch(); goals.refetch(); }} />}
      <HealthScoreCard result={result} loading={!result && !err} />
      <Panel title="Spending challenges" subtitle="Optional and encouraging">
        <EmptyState icon={Flag} title="No challenges started" description="Try small habits like tracking every expense for 7 days or staying within your food budget this week." />
      </Panel>
      <StageRoadmap items={[{ title: "Spending challenges", detail: "Opt-in habit challenges with progress tracking.", stage: 8 }]} />
    </>
  );
}
