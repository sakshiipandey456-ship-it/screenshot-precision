import {
  addMonths,
  categoryBreakdown,
  detectAnomalies,
  forecast,
  goalEta,
  goalProgress,
  healthScore,
  monthBudgets,
  monthKey,
  monthLabel,
  monthlyEquivalent,
  monthlySeries,
  totals,
  type Budget,
  type Contribution,
  type Goal,
  type Subscription,
  type Txn,
} from "./finance";

export type AdvisorData = {
  txns: Txn[];
  budgets: Budget[];
  goals: Goal[];
  contributions: Contribution[];
  subs: Subscription[];
  profile: { occupation: string | null; monthly_income: number | null } | null;
};

/** The minimum aggregated picture Compass AI needs — no notes, no payment details, no individual titles. */
export function buildSnapshot(d: AdvisorData, today: Date) {
  const cur = monthKey(today);
  const prev = monthKey(addMonths(today, -1));
  const curTx = d.txns.filter((t) => monthKey(t.txn_date) === cur);
  const prevTx = d.txns.filter((t) => monthKey(t.txn_date) === prev);
  const fc = forecast(d.txns, today);
  const hs = healthScore({ txns: d.txns, budgets: d.budgets, goals: d.goals, today });
  return {
    currency: "INR",
    today: today.toISOString().slice(0, 10),
    transactionCount: d.txns.length,
    profile: d.profile ? { status: d.profile.occupation, statedMonthlyIncome: d.profile.monthly_income } : null,
    allTime: totals(d.txns),
    thisMonth: { month: monthLabel(cur, true), ...totals(curTx), byCategory: categoryBreakdown(curTx).map((c) => ({ category: c.category, amount: c.amount })) },
    lastMonth: { month: monthLabel(prev, true), ...totals(prevTx), byCategory: categoryBreakdown(prevTx).map((c) => ({ category: c.category, amount: c.amount })) },
    lastSixMonths: monthlySeries(d.txns, today, 6).map(({ label, income, expense, savings }) => ({ month: label, income, expense, savings })),
    budgetsThisMonth: monthBudgets(d.budgets, d.txns, cur).map((b) => ({
      category: b.budget.category ?? "Overall",
      limit: b.limit,
      spent: b.spent,
      remaining: b.remaining,
      percentUsed: Math.round(b.pct),
      status: b.level,
    })),
    savingsGoals: d.goals.map((g) => {
      const eta = goalEta(g, d.contributions, today);
      return { name: g.name, target: g.target_amount, saved: g.saved_amount, percent: Math.round(goalProgress(g)), targetDate: g.target_date, estimatedFinish: eta.date };
    }),
    recurring: {
      monthlyTotal: d.subs.filter((s) => s.is_active).reduce((a, s) => a + monthlyEquivalent(s.amount, s.frequency), 0),
      items: d.subs.filter((s) => s.is_active).map((s) => ({ name: s.name, amount: s.amount, frequency: s.frequency, next: s.next_payment_date })),
    },
    unusualSpending: detectAnomalies(d.txns, today, d.subs).map((a) => a.title + " — " + a.detail),
    forecast: fc.status === "ok" ? { month: monthLabel(fc.month, true), estimate: fc.estimate, low: fc.low, high: fc.high, rising: fc.categories.filter((c) => c.increasing).map((c) => c.category) } : { status: "not enough history", monthsAvailable: fc.monthsAvailable },
    healthScore: hs ? { total: hs.total, indicators: hs.indicators.map((i) => ({ label: i.label, score: i.score, of: i.max })) } : null,
  };
}
export type Snapshot = ReturnType<typeof buildSnapshot>;

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Built-in analysis used when the AI service is unavailable. Answers only from the snapshot. */
export function ruleBasedAnswer(question: string, s: Snapshot): string {
  if (s.transactionCount === 0)
    return "I don't have any transactions to analyse yet. Add a few expenses and income entries in the Expense Tracker and I'll be able to explain where your money goes.";
  const q = question.toLowerCase();
  const tm = s.thisMonth;
  const lm = s.lastMonth;
  const parts: string[] = [];

  const top = () => {
    if (!tm.byCategory.length) return `You haven't recorded any expenses in ${tm.month} yet.`;
    const list = tm.byCategory.slice(0, 3).map((c) => `${c.category} (${inr(c.amount)})`).join(", ");
    return `In ${tm.month} your biggest spending categories are ${list}. ${tm.byCategory[0]!.category} alone is ${Math.round((tm.byCategory[0]!.amount / Math.max(1, tm.expense)) * 100)}% of your expenses.`;
  };
  const saved = () =>
    tm.income === 0
      ? `No income is recorded for ${tm.month} yet, so I can't work out savings. You've spent ${inr(tm.expense)} so far.`
      : `In ${tm.month} you earned ${inr(tm.income)} and spent ${inr(tm.expense)}, so you ${tm.savings >= 0 ? `saved ${inr(tm.savings)} (${Math.round((tm.savings / tm.income) * 100)}% of income)` : `spent ${inr(-tm.savings)} more than you earned`}.`;
  const change = () => {
    if (!lm.byCategory.length) return `I need last month's (${lm.month}) expenses to compare categories.`;
    const prevMap = new Map(lm.byCategory.map((c) => [c.category, c.amount]));
    const diffs = tm.byCategory.map((c) => ({ c: c.category, d: c.amount - (prevMap.get(c.category) ?? 0) })).sort((a, b) => b.d - a.d);
    const up = diffs[0];
    const totalLine = `Overall you've spent ${inr(tm.expense)} this month vs ${inr(lm.expense)} in ${lm.month}.`;
    if (!up || up.d <= 0) return `${totalLine} No category has gone up compared with ${lm.month} — nice work.`;
    return `${totalLine} ${up.c} increased the most, by ${inr(up.d)}. Consider setting a weekly limit for ${up.c} to keep it in check.`;
  };
  const budget = () => {
    if (!s.budgetsThisMonth.length) return "You haven't set any budgets for this month. Try setting one for your top category in the Smart Budget Planner.";
    return s.budgetsThisMonth
      .map((b) => `${b.category}: ${inr(b.spent)} of ${inr(b.limit)} (${b.percentUsed}%)${b.status === "exceeded" ? " — over budget" : b.status === "warning" ? " — close to the limit" : ""}`)
      .join("\n");
  };
  const tips = () => {
    const t: string[] = [];
    if (tm.byCategory[0]) t.push(`Set a weekly cap for ${tm.byCategory[0].category}, your biggest category.`);
    if (s.recurring.monthlyTotal > 0) t.push(`Review your recurring payments — they add up to about ${inr(s.recurring.monthlyTotal)} a month.`);
    if (tm.income > 0 && tm.savings / tm.income < 0.2) t.push("Try moving 10–20% of income into a savings goal as soon as it arrives.");
    if (!s.savingsGoals.length) t.push("Create a savings goal so every rupee saved has a purpose.");
    if (s.unusualSpending.length) t.push("Take a look at the unusual spending flagged on the Future Expense Predictor page.");
    return t.length ? t.map((x) => `• ${x}`).join("\n") : "You're on a good track. Keep recording every transaction so the advice stays accurate.";
  };

  if (/most|highest|biggest|where/.test(q)) parts.push(top());
  if (/sav(e|ed|ing)/.test(q) && !/improve/.test(q)) parts.push(saved());
  if (/increase|compare|previous|last month|more than/.test(q)) parts.push(change());
  if (/budget/.test(q)) parts.push(budget());
  if (/improve|tip|suggest|advice|help|reduce|cut/.test(q)) parts.push(tips());
  if (!parts.length || /summary|summar|analy|overview/.test(q)) {
    parts.push(saved(), top(), change());
    if (s.budgetsThisMonth.length) parts.push("Budgets:\n" + budget());
  }
  return parts.join("\n\n");
}
