import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, CalendarDays, FileDown } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { StageRoadmap } from "@/components/app/StageRoadmap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/analytics")({
  head: () => pageHead("Spending Analytics", "Daily, weekly and monthly reports on your spending and savings."),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Spending Analytics" description="Reports that turn your transactions into clear charts and summaries." />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        {[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ].map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={`${t.label} spending`}>
                <EmptyState icon={CalendarDays} title="No data for this report" description="Add transactions to generate this report." />
              </Panel>
              <Panel title="By category">
                <EmptyState icon={BarChart3} title="No categories yet" description="See how each category compares over time." />
              </Panel>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <StageRoadmap
        items={[
          { title: "Daily, weekly and monthly reports", detail: "Built from your real transactions.", stage: 4 },
          { title: "Income vs expenses and savings trend", detail: "Track how your savings change month to month.", stage: 4 },
          { title: "Budget performance", detail: "How well you stayed within each budget.", stage: 5 },
          { title: "CSV export and monthly summary", detail: "Download your data and a monthly money summary.", stage: 4 },
        ]}
      />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileDown className="size-3.5" /> Downloads will only ever include your own data.
      </p>
    </>
  );
}
