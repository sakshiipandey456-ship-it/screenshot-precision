import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Repeat } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { StageRoadmap } from "@/components/app/StageRoadmap";
import { formatINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/subscriptions")({
  head: () => pageHead("Subscription Tracker", "Keep an eye on recharges, bills and memberships that repeat."),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  return (
    <>
      <PageHeader title="Subscription Tracker" description="List your recurring payments to see what's due next and what they cost each month." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Monthly recurring total">
          <p className="font-display text-3xl font-semibold tabular">{formatINR(0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across active subscriptions</p>
        </Panel>
        <Panel title="Upcoming payments" className="lg:col-span-2">
          <EmptyState icon={CalendarClock} title="Nothing due" description="Mobile recharges, internet, rent and apps you add will be listed by next payment date." />
        </Panel>
      </div>
      <Panel title="All subscriptions">
        <EmptyState icon={Repeat} title="No subscriptions yet" description="CashCompass only reminds you. It never charges or starts payments." />
      </Panel>
      <StageRoadmap
        items={[
          { title: "Add recurring payments", detail: "Name, amount, how often, next date and category.", stage: 8 },
          { title: "Active or cancelled", detail: "Mark subscriptions inactive when you stop them.", stage: 8 },
          { title: "Upcoming reminders", detail: "In-app alerts before a payment is due.", stage: 8 },
        ]}
      />
    </>
  );
}
