import { Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel } from "./Panel";

export type RoadmapItem = { title: string; detail: string; stage: number };

/** Honest "what this page will do" list, shown until a stage is built. */
export function StageRoadmap({ items, title = "What this page will do" }: { items: RoadmapItem[]; title?: string }) {
  return (
    <Panel title={title} subtitle="Each part switches on in the build stage shown.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex gap-3 rounded-xl border border-border bg-surface-raised/50 p-4 transition-colors hover:border-primary/40"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              {item.stage <= 1 ? <Check className="size-3.5" /> : <Clock className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                  Stage {item.stage}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
