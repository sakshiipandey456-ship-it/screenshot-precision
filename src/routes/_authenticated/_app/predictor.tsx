import { createFileRoute } from "@tanstack/react-router";
import { Radar, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { StageRoadmap } from "@/components/app/StageRoadmap";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/predictor")({
  head: () => pageHead("Future Expense Predictor", "Estimate next month's spending from your own history."),
  component: PredictorPage,
});

function PredictorPage() {
  return (
    <>
      <PageHeader title="Future Expense Predictor" description="See an estimate of next month's spending before it happens, based on your past months." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Next month forecast">
          <EmptyState icon={TrendingUp} title="Need more history" description="Forecasts need at least a few weeks of transactions. Until then, nothing is guessed." />
        </Panel>
        <Panel title="Unusual spending">
          <EmptyState icon={Radar} title="Nothing unusual" description="Spikes compared with your normal pattern will be flagged here, gently and with an explanation." />
        </Panel>
      </div>
      <StageRoadmap
        items={[
          { title: "Next month estimate", detail: "Overall and per category, from your history.", stage: 7 },
          { title: "Clear about uncertainty", detail: "Shows a range and says when there isn't enough data.", stage: 7 },
          { title: "Anomaly detector", detail: "Flags unusually high expenses and sudden category jumps.", stage: 7 },
          { title: "Repeated expense review", detail: "Points out repeats that might be worth a second look.", stage: 7 },
        ]}
      />
    </>
  );
}
