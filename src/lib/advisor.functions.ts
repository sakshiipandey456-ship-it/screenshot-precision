import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSnapshot, ruleBasedAnswer } from "./advisor-core";
import { fetchAllRows } from "./fetch-all";
import type { Budget, Contribution, Goal, Subscription, Txn } from "./finance";

const input = z.object({ question: z.string().trim().min(1, "Type a question").max(500, "Keep questions under 500 characters") });

const INSTRUCTIONS = `You are Compass AI, the friendly money assistant inside CashCompass AI, an app for college students and young adults in India.
Answer ONLY from the JSON financial snapshot provided. It contains the signed-in user's own recorded data; amounts are Indian Rupees (₹, en-IN format like ₹2,500).
Rules:
- Never invent numbers, merchants or transactions. If the snapshot lacks the data needed, say clearly that more transaction data is needed and what to record.
- Use simple, encouraging, non-judgemental language. No shaming. No investment, tax or legal advice; suggest practical budgeting and saving habits instead.
- Be concise: 2–6 short sentences or a short bullet list. Mention specific categories and amounts from the snapshot.
- The app does not connect to banks or move money; never suggest it does.
- The health score is educational, not a credit score.`;

export const askAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [txns, budgets, goals, contributions, subs, profile, history] = await Promise.all([
      fetchAllRows<Txn>((f, t) => supabase.from("transactions").select("id,kind,title,amount,category,txn_date,payment_method,description").order("txn_date").range(f, t) as never),
      supabase.from("budgets").select("id,month,category,amount"),
      supabase.from("savings_goals").select("id,name,target_amount,saved_amount,target_date"),
      supabase.from("savings_contributions").select("id,goal_id,amount,contributed_on"),
      supabase.from("subscriptions").select("id,name,amount,frequency,next_payment_date,category,is_active"),
      supabase.from("profiles").select("occupation,monthly_income").eq("id", userId).maybeSingle(),
      supabase.from("advisor_messages").select("role,content").order("created_at", { ascending: false }).limit(8),
    ]);
    const snapshot = buildSnapshot(
      {
        txns: txns.map((t) => ({ ...t, amount: Number(t.amount) })),
        budgets: (budgets.data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })) as Budget[],
        goals: (goals.data ?? []).map((g) => ({ ...g, target_amount: Number(g.target_amount), saved_amount: Number(g.saved_amount) })) as Goal[],
        contributions: (contributions.data ?? []).map((c) => ({ ...c, amount: Number(c.amount) })) as Contribution[],
        subs: (subs.data ?? []).map((s) => ({ ...s, amount: Number(s.amount) })) as Subscription[],
        profile: profile.data ? { occupation: profile.data.occupation, monthly_income: profile.data.monthly_income === null ? null : Number(profile.data.monthly_income) } : null,
      },
      new Date(),
    );

    await supabase.from("advisor_messages").insert({ user_id: userId, role: "user", content: data.question });

    let answer: string;
    let source: "ai" | "rules" = "ai";
    let notice: string | null = null;

    const { checkAiRateLimit } = await import("./ai-limits.server");
    const limited = await checkAiRateLimit(supabase, userId, "chat");
    if (limited) {
      source = "rules";
      notice = limited;
      answer = ruleBasedAnswer(data.question, snapshot);
    } else if (snapshot.transactionCount === 0) {
      source = "rules";
      answer = ruleBasedAnswer(data.question, snapshot);
    } else {
      try {
        const { generateTextStreamed } = await import("./ai/gateway.server");
        const prior = (history.data ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        answer = await generateTextStreamed(INSTRUCTIONS, [
          ...prior,
          { role: "user", content: `My financial snapshot (JSON):\n${JSON.stringify(snapshot)}\n\nMy question: ${data.question}` },
        ]);
      } catch (err) {
        source = "rules";
        notice = err instanceof Error ? err.message : "The AI service is temporarily unavailable.";
        answer = ruleBasedAnswer(data.question, snapshot);
      }
    }

    await supabase.from("advisor_messages").insert({ user_id: userId, role: "assistant", content: answer.slice(0, 8000), source });
    return { answer, source, notice };
  });
