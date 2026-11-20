/**
 * Future Expense Predictor.
 *
 * Confidence depends on how many days of expense history exist (first recorded expense → today):
 *   < 7 days   → no prediction (insufficient data)
 *   7–29 days  → basic estimate: overall daily average × days in next month (low confidence)
 *   30–59 days → preliminary: average of the most recent 30 days (moderate-low)
 *   60–89 days → trend-aware: weekly totals + a damped linear trend (moderate)
 *   90+ days   → reliable: longer weekly history + stronger trend weighting (good)
 * A prediction also needs a handful of expense records (MIN_EXPENSES) so two entries never become a "forecast".
 * Nothing is invented: every figure is derived from the user's own recorded expenses.
 */
import { addDays, addMonths, daysBetween, daysInMonth, isoDate, monthKey, parseDate, type Budget, type Txn } from "./finance";

export const MIN_HISTORY_DAYS = 7;
export const MIN_EXPENSES = 5;
export const FULL_CONFIDENCE_DAYS = 90;
const round2 = (n: number) => Math.round(n * 100) / 100;

export type Tier = "basic" | "preliminary" | "trend" | "reliable";
export const TIER_INFO: Record<Tier, { label: string; level: "Low" | "Moderate-low" | "Moderate" | "Good"; note: string; minSpread: number }> = {
  basic: { label: "Basic estimate", level: "Low", note: "Based on under 30 days of history — treat this as a rough guide only.", minSpread: 0.35 },
  preliminary: { label: "Preliminary prediction", level: "Moderate-low", note: "Based on your last 30 days. It will sharpen as you record more.", minSpread: 0.25 },
  trend: { label: "Trend-based prediction", level: "Moderate", note: "Uses your weekly spending trend over the last two to three months.", minSpread: 0.18 },
  reliable: { label: "Trend-based estimate", level: "Good", note: "Uses 90+ days of spending patterns, the most reliable estimate available.", minSpread: 0.12 },
};

export function tierForDays(days: number): Tier | null {
  if (days < MIN_HISTORY_DAYS) return null;
  if (days < 30) return "basic";
  if (days < 60) return "preliminary";
  if (days < 90) return "trend";
  return "reliable";
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
/** Least-squares slope and intercept of y over x = 0..n-1. */
function linearFit(y: number[]) {
  const n = y.length;
  const xm = (n - 1) / 2;
  const ym = mean(y);
  let num = 0;
  let den = 0;
  y.forEach((v, i) => {
    num += (i - xm) * (v - ym);
    den += (i - xm) ** 2;
  });
  const slope = den ? num / den : 0;
  return { slope, intercept: ym - slope * xm };
}

export type PredictionInput = { txns: Txn[]; budgets: Budget[]; today: Date };
export type CategoryPrediction = { category: string; estimate: number; share: number; budget: number | null; overBy: number | null; recentAvgMonthly: number };

export type Prediction =
  | { status: "insufficient"; days: number; expenseCount: number; neededDays: number; neededExpenses: number; reason: "days" | "records" | "none" }
  | {
      status: "ok";
      tier: Tier;
      label: string;
      confidenceLevel: string;
      note: string;
      days: number;
      expenseCount: number;
      coveragePct: number;
      month: string; // YYYY-MM of the predicted month
      daysInMonth: number;
      estimate: number;
      low: number;
      high: number;
      categories: CategoryPrediction[];
      weekly: { label: string; expense: number }[];
      budget: { amount: number; source: "overall" | "categories"; diff: number; pct: number; level: "under" | "near" | "over" } | null;
    };

export function expenseHistoryDays(txns: Txn[], today: Date): number {
  const todayISO = isoDate(today);
  const dates = txns.filter((t) => t.kind === "expense" && t.txn_date <= todayISO).map((t) => t.txn_date);
  if (!dates.length) return 0;
  const first = dates.reduce((m, d) => (d < m ? d : m), dates[0]!);
  return daysBetween(parseDate(first), today) + 1;
}

export function predictNextMonth({ txns, budgets, today }: PredictionInput): Prediction {
  const todayISO = isoDate(today);
  const expenses = txns.filter((t) => t.kind === "expense" && t.txn_date <= todayISO);
  const days = expenseHistoryDays(txns, today);
  const base = { days, expenseCount: expenses.length, neededDays: MIN_HISTORY_DAYS, neededExpenses: MIN_EXPENSES };
  if (!expenses.length) return { status: "insufficient", reason: "none", ...base };
  const tier = tierForDays(days);
  if (!tier) return { status: "insufficient", reason: "days", ...base };
  if (expenses.length < MIN_EXPENSES) return { status: "insufficient", reason: "records", ...base };

  const next = addMonths(today, 1);
  const nextDays = daysInMonth(next);
  const categories = [...new Set(expenses.map((t) => t.category))];

  // Weekly buckets ending today, oldest first (a bucket is 7 full days).
  const maxWeeks = tier === "reliable" ? 16 : 12;
  const weeks = Math.max(1, Math.min(maxWeeks, Math.floor(days / 7)));
  const bucket = (txnList: Txn[]) => {
    const out = new Array<number>(weeks).fill(0);
    for (const t of txnList) {
      const age = daysBetween(parseDate(t.txn_date), today); // 0 = today
      const idx = weeks - 1 - Math.floor(age / 7);
      if (idx >= 0 && idx < weeks) out[idx]! += t.amount;
    }
    return out;
  };

  const windowDays = Math.min(30, days);
  const recentFrom = isoDate(addDays(today, -(windowDays - 1)));
  const midNext = new Date(next.getFullYear(), next.getMonth(), 15);
  const weeksAhead = (daysBetween(today, midNext) + 3) / 7;
  const damping = tier === "reliable" ? 0.75 : 0.5;

  const estimateFor = (list: Txn[]): number => {
    if (tier === "basic") return (list.reduce((a, t) => a + t.amount, 0) / days) * nextDays;
    if (tier === "preliminary") return (list.filter((t) => t.txn_date >= recentFrom).reduce((a, t) => a + t.amount, 0) / windowDays) * nextDays;
    const wk = bucket(list);
    const m = mean(wk);
    const { slope, intercept } = linearFit(wk);
    const fittedLast = intercept + slope * (wk.length - 1);
    const level = Math.min(1.5 * m, Math.max(0.5 * m, fittedLast + damping * slope * weeksAhead));
    return Math.max(0, level) * (nextDays / 7);
  };

  const cats = categories.map((category) => ({ category, estimate: estimateFor(expenses.filter((t) => t.category === category)) })).filter((c) => c.estimate > 0);
  const total = cats.reduce((a, c) => a + c.estimate, 0);

  // Typical range: wider when history is short or weekly spending is erratic.
  const totalWeekly = bucket(expenses);
  const cv = mean(totalWeekly) > 0 ? stdev(totalWeekly) / mean(totalWeekly) : 0;
  const spread = Math.min(0.5, Math.max(TIER_INFO[tier].minSpread, cv * 0.5));

  // Budget comparison uses the current month's budget(s).
  const curKey = monthKey(today);
  const curBudgets = budgets.filter((b) => b.month.slice(0, 7) === curKey);
  const overall = curBudgets.find((b) => b.category === null);
  const catBudget = new Map(curBudgets.filter((b) => b.category !== null).map((b) => [b.category as string, b.amount]));
  const budgetAmount = overall ? overall.amount : catBudget.size ? [...catBudget.values()].reduce((a, b) => a + b, 0) : null;
  const budget =
    budgetAmount !== null && budgetAmount > 0
      ? {
          amount: round2(budgetAmount),
          source: (overall ? "overall" : "categories") as "overall" | "categories",
          diff: round2(total - budgetAmount),
          pct: (total / budgetAmount) * 100,
          level: (total > budgetAmount ? "over" : total >= budgetAmount * 0.9 ? "near" : "under") as "under" | "near" | "over",
        }
      : null;

  const monthsOfHistory = Math.max(1, days / 30);
  const info = TIER_INFO[tier];
  const today0 = parseDate(todayISO);
  return {
    status: "ok",
    tier,
    label: info.label,
    confidenceLevel: info.level,
    note: info.note,
    days,
    expenseCount: expenses.length,
    coveragePct: Math.min(100, Math.round((days / FULL_CONFIDENCE_DAYS) * 100)),
    month: monthKey(next),
    daysInMonth: nextDays,
    estimate: round2(total),
    low: round2(total * (1 - spread)),
    high: round2(total * (1 + spread)),
    categories: cats
      .map((c) => ({
        category: c.category,
        estimate: round2(c.estimate),
        share: total ? c.estimate / total : 0,
        budget: catBudget.get(c.category) ?? null,
        overBy: catBudget.has(c.category) ? round2(c.estimate - catBudget.get(c.category)!) : null,
        recentAvgMonthly: round2(expenses.filter((t) => t.category === c.category).reduce((a, t) => a + t.amount, 0) / monthsOfHistory),
      }))
      .sort((a, b) => b.estimate - a.estimate),
    weekly: totalWeekly.map((expense, i) => {
      const start = addDays(today0, -(weeks - i) * 7 + 1);
      return { label: `${start.getDate()}/${start.getMonth() + 1}`, expense: round2(expense) };
    }),
    budget,
  };
}
