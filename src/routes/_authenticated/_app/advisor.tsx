import { createFileRoute } from "@tanstack/react-router";
import { SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { StageRoadmap } from "@/components/app/StageRoadmap";
import { LogoMark } from "@/components/brand/Logo";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/advisor")({
  head: () => pageHead("AI Financial Advisor", "Ask Compass AI about your spending, budgets and savings."),
  component: AdvisorPage,
});

const suggestions = [
  "Where am I spending the most?",
  "How much did I save this month?",
  "Which category increased the most?",
  "Am I following my budget?",
  "How can I improve my savings?",
  "Give me a summary of my financial activity.",
];

function AdvisorPage() {
  return (
    <>
      <PageHeader
        title="Compass AI"
        description="Your personal money assistant. It reads only your own records to explain where your money goes and how to save more."
      />
      <Panel className="overflow-hidden">
        <div className="flex min-h-[380px] flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-brand opacity-40 blur-2xl" />
              <LogoMark className="relative size-14 rounded-2xl" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">Ask me anything about your money</p>
              <p className="mt-1 text-sm text-muted-foreground">Compass AI goes live in Stage 6, once you have transactions to analyse.</p>
            </div>
            <div className="mt-2 flex max-w-2xl flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <span key={s} className="rounded-full border border-border bg-surface-raised/60 px-3 py-1.5 text-xs text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <Input placeholder="Compass AI is not switched on yet" disabled className="h-11" aria-label="Message Compass AI" />
            <Button variant="hero" size="icon" className="size-11" disabled aria-label="Send">
              <SendHorizonal />
            </Button>
          </form>
        </div>
      </Panel>
      <StageRoadmap
        items={[
          { title: "Top spending categories", detail: "Finds where most of your money goes.", stage: 6 },
          { title: "Month-to-month comparison", detail: "Shows what went up or down versus last month.", stage: 6 },
          { title: "Budget check", detail: "Flags categories that are over your plan.", stage: 6 },
          { title: "Savings ideas", detail: "Practical, realistic suggestions based on your habits.", stage: 6 },
          { title: "Works without an AI key", detail: "A built-in rule-based analysis answers if AI is unavailable.", stage: 6 },
          { title: "Unusual spending alerts", detail: "Spots spikes compared to your normal pattern.", stage: 7 },
        ]}
      />
    </>
  );
}
