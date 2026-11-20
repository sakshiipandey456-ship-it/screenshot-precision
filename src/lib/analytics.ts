/**
 * Spending Analytics maths. Pure functions over the user's own transactions and budgets.
 */
import {
  addDays,
  categoryBreakdown,
  dailySeries,
  daysBetween,
  daysInMonth,
  inRange,
  isoDate,
  monthBudgets,
  monthKey,
  monthlySeries,
  parseDate,
  totals,
  type Budget,
  type Range,
  type Txn,
} from "./finance";

export type AnalyticsPeriod = "week" | "month" | "year";

const round2 = (n: number) => Math.round(n * 100) / 100;

function periodBounds(period: AnalyticsPeriod, d: Date): Range {
  if (period === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    const mon = addDays(d, -dow);
    return { from: isoDate(mon), to: isoDate(addDays(mon, 6)) };
  }
  if (period === "month") return { from: isoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
}
function previousAnchor(period: AnalyticsPeriod, d: Date): Date {
  if (period === "week") return addDays(d, -7);
  if (period === "month") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return new Date(d.getFullYear() - 1, 0, 1);
}

export const PERIOD_LABELS: Record<AnalyticsPeriod, { current: string; previous: string; noun: string }> = {
  week: { current: "This week", previous: "last week", noun: "week" },
  month: { current: "This month", previous: "last month", noun: "month" },
  year: { current: "This year", previous: "last year", noun: "year" },
};

export function computeAnalytics(txns: Txn[], budgets: Budget[], period: AnalyticsPeriod, today: Date) {
  const range = periodBounds(period, today);
  const todayISO = isoDate(today);
  const prevAnchor = previousAnchor(period, today);
  const prevRange = periodBounds(period, prevAnchor);

  // Days of the current period that have actually happened (so averages and comparisons are fair mid-period).
  const lastDay = todayISO < range.to ? todayISO : range.to;
  const elapsedDays = Math.max(1, daysBetween(parseDate(range.from), parseDate(lastDay)) + 1);
  const prevSameSpanTo = isoDate(addDays(parseDate(prevRange.from), elapsedDays - 1));
  const prevSpan: Range = { from: prevRange.from, to: prevSameSpanTo < prevRange.to ? prevSameSpanTo : prevRange.to };

  const expenses = txns.filter((t) => t.kind === "expense");
  const cur = expenses.filter((t) => inRange(t, range));
  const total = totals(cur).expense;
  const previousTotal = totals(expenses.filter((t) => inRange(t, prevRange))).expense;
  const previousSameSpan = totals(expenses.filter((t) => inRange(t, prevSpan))).expense;
  const changePct = previousSameSpan > 0 ? ((total - previousSameSpan) / previousSameSpan) * 100 : null;

  const byCategory = categoryBreakdown(cur);

  // Spending over the selected period
  const series =
    period === "week"
      ? dailySeries(expenses, parseDate(range.to), 7)
      : period === "month"
        ? dailySeries(expenses, parseDate(range.to), daysInMonth(today))
        : monthlySeries(expenses, new Date(today.getFullYear(), 11, 1), 12);

  // Budgets: this month's for week/month views; every budgeted month up to now for the year view.
  const budgetRows = budgetVsActual(budgets, txns, period, today);

  return {
    period,
    range,
    prevRange,
    elapsedDays,
    expenseCount: cur.length,
    total,
    previousTotal,
    previousSameSpan,
    changePct,
    byCategory,
    topCategory: byCategory[0] ?? null,
    avgDaily: round2(total / elapsedDays),
    series,
    monthlyTrend: monthlySeries(expenses, today, 6),
    budgetRows,
  };
}

export type BudgetRow = { category: string; budgeted: number; actual: number; pct: number; level: "ok" | "warning" | "exceeded" };

export function budgetVsActual(budgets: Budget[], txns: Txn[], period: AnalyticsPeriod, today: Date): BudgetRow[] {
  const curKey = monthKey(today);
  const months = period === "year" ? [...new Set(budgets.map((b) => b.month.slice(0, 7)))].filter((k) => k.slice(0, 4) === String(today.getFullYear()) && k <= curKey) : [curKey];
  const agg = new Map<string, { budgeted: number; actual: number }>();
  for (const m of months) {
    for (const r of monthBudgets(budgets, txns, m)) {
      const key = r.budget.category ?? "Overall";
      const e = agg.get(key) ?? { budgeted: 0, actual: 0 };
      e.budgeted += r.limit;
      e.actual += r.spent;
      agg.set(key, e);
    }
  }
  return [...agg.entries()]
    .map(([category, v]) => {
      const pct = v.budgeted > 0 ? (v.actual / v.budgeted) * 100 : 0;
      return { category, budgeted: round2(v.budgeted), actual: round2(v.actual), pct, level: (pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok") as BudgetRow["level"] };
    })
    .sort((a, b) => (a.category === "Overall" ? -1 : b.category === "Overall" ? 1 : b.pct - a.pct));
}
