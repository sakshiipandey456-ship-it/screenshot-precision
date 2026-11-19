/**
 * Pure money maths shared by the browser and the server (Compass AI).
 * Every number shown in the app is derived here from the user's own records.
 */

export type TxnKind = "income" | "expense";
export type Txn = {
  id: string;
  kind: TxnKind;
  title: string;
  amount: number;
  category: string;
  txn_date: string; // YYYY-MM-DD
  payment_method: string | null;
  description: string | null;
};
export type Budget = { id: string; month: string; category: string | null; amount: number };
export type Goal = { id: string; name: string; target_amount: number; saved_amount: number; target_date: string | null; created_at?: string };
export type Contribution = { id: string; goal_id: string; amount: number; contributed_on: string };
export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type Subscription = {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  next_payment_date: string;
  category: string;
  is_active: boolean;
  start_date?: string | null;
  payment_method?: string | null;
  updated_at?: string;
};
export type Challenge = {
  id: string;
  template_key: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "ended";
};

// ---------- dates ----------
const pad = (n: number) => String(n).padStart(2, "0");
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
export function daysBetween(a: Date, b: Date): number {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}
export function monthKey(d: Date | string): string {
  const x = typeof d === "string" ? parseDate(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
}
export function monthStartISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}
export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthLabel(key: string, withYear = false): string {
  const [y, m] = key.split("-").map(Number);
  return withYear ? `${MONTHS[(m ?? 1) - 1]} ${y}` : MONTHS[(m ?? 1) - 1]!;
}

// ---------- periods ----------
export type Period = "today" | "week" | "month" | "custom";
export type Range = { from: string; to: string };
export function periodRange(period: Period, today: Date, custom?: Partial<Range>): Range {
  const t = isoDate(today);
  if (period === "today") return { from: t, to: t };
  if (period === "week") {
    const dow = (today.getDay() + 6) % 7; // Monday = 0
    return { from: isoDate(addDays(today, -dow)), to: isoDate(addDays(today, 6 - dow)) };
  }
  if (period === "month") {
    return { from: monthStartISO(today), to: isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  }
  const from = custom?.from || "0000-01-01";
  const to = custom?.to || "9999-12-31";
  return from <= to ? { from, to } : { from: to, to: from };
}
export function inRange(t: { txn_date: string }, r: Range): boolean {
  return t.txn_date >= r.from && t.txn_date <= r.to;
}

// ---------- totals & series ----------
const round2 = (n: number) => Math.round(n * 100) / 100;
export function totals(txns: Txn[]) {
  let income = 0;
  let expense = 0;
  for (const t of txns) (t.kind === "income" ? (income += t.amount) : (expense += t.amount));
  return { income: round2(income), expense: round2(expense), savings: round2(income - expense) };
}
export function categoryBreakdown(txns: Txn[], kind: TxnKind = "expense") {
  const map = new Map<string, number>();
  for (const t of txns) if (t.kind === kind) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount), share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}
export function monthlySeries(txns: Txn[], today: Date, months = 6) {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = monthKey(addMonths(today, -i));
    const t = totals(txns.filter((x) => monthKey(x.txn_date) === key));
    out.push({ key, label: monthLabel(key), income: t.income, expense: t.expense, savings: t.savings });
  }
  return out;
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function dailySeries(txns: Txn[], today: Date, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = isoDate(d);
    const day = txns.filter((x) => x.txn_date === key);
    out.push({ date: key, label: days <= 7 ? DOW[d.getDay()]! : `${d.getDate()}/${d.getMonth() + 1}`, ...totals(day) });
  }
  return out;
}
export function weeklySeries(txns: Txn[], today: Date, weeks = 8) {
  const dow = (today.getDay() + 6) % 7;
  const thisMonday = addDays(today, -dow);
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i);
    const r = { from: isoDate(start), to: isoDate(addDays(start, 6)) };
    out.push({ key: r.from, label: `${start.getDate()} ${MONTHS[start.getMonth()]}`, ...totals(txns.filter((t) => inRange(t, r))) });
  }
  return out;
}
/** Running net balance (savings) at the end of each of the last N months. */
export function savingsTrend(txns: Txn[], today: Date, months = 6) {
  const series = monthlySeries(txns, today, months);
  const firstKey = series[0]!.key;
  let running = totals(txns.filter((t) => monthKey(t.txn_date) < firstKey)).savings;
  return series.map((m) => {
    running += m.savings;
    return { ...m, cumulative: round2(running) };
  });
}

// ---------- budgets ----------
export type BudgetLevel = "ok" | "warning" | "exceeded";
/** Alerts: warning from 80% used, exceeded from 100%. */
export function budgetStatus(limit: number, spent: number) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const level: BudgetLevel = pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok";
  return { limit, spent: round2(spent), remaining: round2(limit - spent), pct, level };
}
export function monthBudgets(budgets: Budget[], txns: Txn[], month: string /* YYYY-MM */) {
  const monthTx = txns.filter((t) => t.kind === "expense" && monthKey(t.txn_date) === month);
  const byCat = new Map(categoryBreakdown(monthTx).map((c) => [c.category, c.amount]));
  const total = totals(monthTx).expense;
  return budgets
    .filter((b) => b.month.slice(0, 7) === month)
    .map((b) => ({ budget: b, ...budgetStatus(b.amount, b.category ? byCat.get(b.category) ?? 0 : total) }))
    .sort((a, b) => (a.budget.category === null ? -1 : b.budget.category === null ? 1 : b.pct - a.pct));
}

// ---------- goals ----------
export function goalProgress(g: Goal): number {
  return g.target_amount > 0 ? Math.min(100, (g.saved_amount / g.target_amount) * 100) : 0;
}
/** Estimated finish date from the saving pace of the last 90 days. Always an estimate. */
export function goalEta(g: Goal, contributions: Contribution[], today: Date) {
  const remaining = g.target_amount - g.saved_amount;
  if (remaining <= 0) return { status: "done" as const, date: null, monthlyPace: 0 };
  const windowStart = isoDate(addDays(today, -90));
  const recent = contributions.filter((c) => c.goal_id === g.id && c.contributed_on >= windowStart && c.contributed_on <= isoDate(today));
  if (recent.length === 0) return { status: "no-pace" as const, date: null, monthlyPace: 0 };
  const sum = recent.reduce((a, c) => a + c.amount, 0);
  const earliest = recent.reduce((m, c) => (c.contributed_on < m ? c.contributed_on : m), recent[0]!.contributed_on);
  const span = Math.max(30, daysBetween(parseDate(earliest), today) + 1);
  const daily = sum / span;
  const date = isoDate(addDays(today, Math.ceil(remaining / daily)));
  return { status: "estimate" as const, date, monthlyPace: round2(daily * 30) };
}

// ---------- subscriptions ----------
export function monthlyEquivalent(amount: number, f: Frequency): number {
  const m = f === "weekly" ? (amount * 52) / 12 : f === "monthly" ? amount : f === "quarterly" ? amount / 3 : amount / 12;
  return round2(m);
}
export function advanceDate(date: string, f: Frequency): string {
  const d = parseDate(date);
  if (f === "weekly") return isoDate(addDays(d, 7));
  const months = f === "monthly" ? 1 : f === "quarterly" ? 3 : 12;
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const day = Math.min(d.getDate(), daysInMonth(target));
  return isoDate(new Date(target.getFullYear(), target.getMonth(), day));
}

// ---------- forecasting ----------
function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
/** Complete months (before the current one) since the user's first expense, newest last, max `limit`. */
function completeMonths(expenses: Txn[], today: Date, limit: number): string[] {
  if (!expenses.length) return [];
  const first = expenses.reduce((m, t) => (t.txn_date < m ? t.txn_date : m), expenses[0]!.txn_date);
  const firstKey = monthKey(first);
  const out: string[] = [];
  for (let i = limit; i >= 1; i--) {
    const k = monthKey(addMonths(today, -i));
    if (k >= firstKey) out.push(k);
  }
  return out;
}
export const MIN_FORECAST_MONTHS = 2;
/**
 * Weighted moving average of the last up-to-3 complete months (newest weighs most).
 * Needs at least two complete months of history; otherwise says so instead of guessing.
 */
export function forecast(txns: Txn[], today: Date) {
  const expenses = txns.filter((t) => t.kind === "expense");
  const months = completeMonths(expenses, today, 3);
  const nextKey = monthKey(addMonths(today, 1));
  if (months.length < MIN_FORECAST_MONTHS) {
    return { status: "insufficient" as const, monthsAvailable: months.length, needed: MIN_FORECAST_MONTHS, month: nextKey };
  }
  const weights = months.map((_, i) => i + 1); // oldest 1 … newest n
  const wsum = weights.reduce((a, b) => a + b, 0);
  const monthTotals = months.map((k) => totals(expenses.filter((t) => monthKey(t.txn_date) === k)).expense);
  const total = monthTotals.reduce((a, v, i) => a + v * weights[i]!, 0) / wsum;
  const sd = stdev(monthTotals);
  const cats = new Set(expenses.filter((t) => months.includes(monthKey(t.txn_date))).map((t) => t.category));
  const categories = [...cats]
    .map((category) => {
      const vals = months.map((k) => expenses.filter((t) => t.category === category && monthKey(t.txn_date) === k).reduce((a, t) => a + t.amount, 0));
      const est = vals.reduce((a, v, i) => a + v * weights[i]!, 0) / wsum;
      const last = vals[vals.length - 1]!;
      const earlier = mean(vals.slice(0, -1));
      const increasing = last > earlier * 1.15 && last - earlier >= 200;
      return { category, estimate: round2(est), last: round2(last), earlierAvg: round2(earlier), increasing };
    })
    .sort((a, b) => b.estimate - a.estimate);
  return {
    status: "ok" as const,
    month: nextKey,
    basedOn: months,
    estimate: round2(total),
    low: round2(Math.max(0, total - sd)),
    high: round2(total + sd),
    history: months.map((k, i) => ({ key: k, label: monthLabel(k), actual: monthTotals[i]! })),
    categories,
    topCategory: categories[0] ?? null,
  };
}

// ---------- anomalies ----------
export type Anomaly = { kind: "high_expense" | "category_jump" | "repeated"; title: string; detail: string; key: string };
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export function detectAnomalies(txns: Txn[], today: Date, subs: Subscription[] = []): Anomaly[] {
  const out: Anomaly[] = [];
  const expenses = txns.filter((t) => t.kind === "expense").sort((a, b) => a.txn_date.localeCompare(b.txn_date));
  const since = isoDate(addDays(today, -30));

  // 1. a single unusually large expense compared with that category's own history
  for (const t of expenses) {
    if (t.txn_date < since) continue;
    const prior = expenses.filter((p) => p.category === t.category && p.id !== t.id && p.txn_date <= t.txn_date).map((p) => p.amount);
    if (prior.length < 5) continue;
    const m = mean(prior);
    const sd = stdev(prior);
    if (t.amount >= 500 && t.amount > m + 2.5 * sd && t.amount >= 1.8 * m) {
      out.push({
        kind: "high_expense",
        key: `high:${t.id}`,
        title: `“${t.title}” is larger than your usual ${t.category} spend`,
        detail: `₹${Math.round(t.amount).toLocaleString("en-IN")} on ${t.txn_date}, while your typical ${t.category} expense is about ₹${Math.round(m).toLocaleString("en-IN")}.`,
      });
    }
  }

  // 2. a category rising sharply this month vs the previous complete months
  const months = completeMonths(expenses, today, 3);
  if (months.length >= 2) {
    const cur = monthKey(today);
    const cats = new Set(expenses.map((t) => t.category));
    for (const c of cats) {
      const now = expenses.filter((t) => t.category === c && monthKey(t.txn_date) === cur).reduce((a, t) => a + t.amount, 0);
      const avg = mean(months.map((k) => expenses.filter((t) => t.category === c && monthKey(t.txn_date) === k).reduce((a, t) => a + t.amount, 0)));
      if (avg > 0 && now > avg * 1.5 && now - avg >= 1000) {
        out.push({
          kind: "category_jump",
          key: `jump:${c}:${cur}`,
          title: `${c} spending is unusually high this month`,
          detail: `₹${Math.round(now).toLocaleString("en-IN")} so far, compared with your recent monthly average of ₹${Math.round(avg).toLocaleString("en-IN")}.`,
        });
      }
    }
  }

  // 3. the same expense repeated several times in 30 days (not already a tracked subscription)
  const subNames = new Set(subs.filter((s) => s.is_active).map((s) => norm(s.name)));
  const groups = new Map<string, Txn[]>();
  for (const t of expenses) {
    if (t.txn_date < since) continue;
    const k = `${norm(t.title)}|${t.amount}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  for (const [k, list] of groups) {
    if (list.length < 3 || subNames.has(norm(list[0]!.title))) continue;
    out.push({
      kind: "repeated",
      key: `repeat:${k}`,
      title: `“${list[0]!.title}” repeated ${list.length} times this month`,
      detail: `₹${Math.round(list[0]!.amount).toLocaleString("en-IN")} each time. If it's a regular payment, consider adding it to your subscriptions so it's easier to plan for.`,
    });
  }
  return out;
}

// ---------- financial health score ----------
export type Indicator = { key: string; label: string; score: number; max: number; detail: string };
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
/** Educational 0–100 score from five transparent indicators (20 points each). Not a credit score. */
export function healthScore(input: { txns: Txn[]; budgets: Budget[]; goals: Goal[]; today: Date }) {
  const { txns, budgets, goals, today } = input;
  if (txns.length === 0) return null;
  const cur = monthKey(today);
  const ind: Indicator[] = [];

  // Budget adherence
  const mb = monthBudgets(budgets, txns, cur);
  if (mb.length === 0) ind.push({ key: "budget", label: "Budget adherence", score: 10, max: 20, detail: "No budget set this month yet — setting one earns the full 20 points when you stay within it." });
  else {
    const within = mb.filter((b) => b.level !== "exceeded").length;
    ind.push({ key: "budget", label: "Budget adherence", score: Math.round((within / mb.length) * 20), max: 20, detail: `${within} of ${mb.length} budgets are within their limit this month.` });
  }

  // Savings consistency: share of the last 3 months (incl. current) with positive savings
  const last3 = monthlySeries(txns, today, 3).filter((m) => m.income + m.expense > 0);
  const positive = last3.filter((m) => m.savings > 0).length;
  ind.push({
    key: "consistency",
    label: "Savings consistency",
    score: last3.length ? Math.round((positive / last3.length) * 20) : 0,
    max: 20,
    detail: last3.length ? `You saved money in ${positive} of the last ${last3.length} active months.` : "Not enough months recorded yet.",
  });

  // Spending stability: coefficient of variation of monthly expenses
  const exp = monthlySeries(txns, today, 4).slice(0, 3).map((m) => m.expense).filter((v) => v > 0);
  if (exp.length < 2) ind.push({ key: "stability", label: "Spending stability", score: 10, max: 20, detail: "Needs at least two complete months of spending to judge." });
  else {
    const cv = stdev(exp) / mean(exp);
    ind.push({ key: "stability", label: "Spending stability", score: Math.round(clamp(1 - (cv - 0.15) / 0.45) * 20), max: 20, detail: `Your monthly spending varies by about ${Math.round(cv * 100)}%.` });
  }

  // Income vs expenses this month: savings rate
  const t = totals(txns.filter((x) => monthKey(x.txn_date) === cur));
  if (t.income === 0) ind.push({ key: "ratio", label: "Income vs expenses", score: t.expense === 0 ? 10 : 0, max: 20, detail: t.expense === 0 ? "No money in or out recorded this month yet." : "No income recorded this month yet." });
  else {
    const rate = t.savings / t.income;
    ind.push({ key: "ratio", label: "Income vs expenses", score: Math.round(clamp(rate / 0.2) * 20), max: 20, detail: `You're keeping ${Math.round(rate * 100)}% of this month's income (20% or more earns full points).` });
  }

  // Goal progress
  if (goals.length === 0) ind.push({ key: "goals", label: "Savings goal progress", score: 10, max: 20, detail: "No savings goals yet — create one to earn these points." });
  else {
    const avg = mean(goals.map(goalProgress));
    ind.push({ key: "goals", label: "Savings goal progress", score: Math.round(clamp(avg / 100) * 20), max: 20, detail: `Your goals are ${Math.round(avg)}% complete on average.` });
  }

  const total = ind.reduce((a, i) => a + i.score, 0);
  const positives = ind.filter((i) => i.score >= 15).map((i) => `${i.label}: ${i.detail}`);
  const improvements = ind.filter((i) => i.score < 12).map((i) => `${i.label}: ${i.detail}`);
  const tips: string[] = [];
  for (const i of ind) {
    if (i.score >= 15) continue;
    if (i.key === "budget") tips.push("Set a monthly budget for your top two spending categories and check in weekly.");
    if (i.key === "consistency") tips.push("Move a small fixed amount into a savings goal as soon as income arrives.");
    if (i.key === "stability") tips.push("Plan big purchases ahead so one month doesn't spike far above the others.");
    if (i.key === "ratio") tips.push("Aim to keep at least 20% of what you earn — start with 5% and build up.");
    if (i.key === "goals") tips.push("Add a contribution to a goal this week, even a small one keeps momentum.");
  }
  return { total, indicators: ind, positives, improvements, tips };
}

// ---------- challenges ----------
export type ChallengeContext = { txns: Txn[]; budgets: Budget[]; contributions: Contribution[]; subs: Subscription[]; today: Date };
export type ChallengeTemplate = {
  key: string;
  title: string;
  description: string;
  days: number;
  evaluate: (c: Challenge, ctx: ChallengeContext) => { progress: number; detail: string };
};
const windowOf = (c: Challenge, today: Date) => ({ from: c.start_date, to: c.end_date < isoDate(today) ? c.end_date : isoDate(today) });
export const challengeTemplates: ChallengeTemplate[] = [
  {
    key: "track7",
    title: "Track every day for 7 days",
    description: "Record at least one transaction on each of 7 days.",
    days: 7,
    evaluate: (c, { txns, today }) => {
      const r = windowOf(c, today);
      const days = new Set(txns.filter((t) => inRange(t, r)).map((t) => t.txn_date)).size;
      return { progress: Math.min(100, (days / 7) * 100), detail: `${days} of 7 days tracked` };
    },
  },
  {
    key: "food-week",
    title: "Stay within your food budget this week",
    description: "Keep Food spending under one week's share of your monthly Food budget.",
    days: 7,
    evaluate: (c, { txns, budgets, today }) => {
      const b = budgets.find((x) => x.category === "Food" && x.month.slice(0, 7) === monthKey(c.start_date));
      if (!b) return { progress: 0, detail: "Set a Food budget for this month to start this challenge." };
      const allowance = (b.amount * 7) / daysInMonth(parseDate(c.start_date));
      const r = windowOf(c, today);
      const spent = txns.filter((t) => t.kind === "expense" && t.category === "Food" && inRange(t, r)).reduce((a, t) => a + t.amount, 0);
      const elapsed = Math.min(7, daysBetween(parseDate(c.start_date), today) + 1);
      if (spent > allowance) return { progress: Math.min(99, (elapsed / 7) * 100), detail: `₹${Math.round(spent)} of ₹${Math.round(allowance)} used — a new week is a fresh start.` };
      const done = isoDate(today) >= c.end_date;
      return { progress: done ? 100 : Math.min(99, (elapsed / 7) * 100), detail: `₹${Math.round(spent)} of ₹${Math.round(allowance)} weekly allowance used` };
    },
  },
  {
    key: "record-income",
    title: "Record every income this month",
    description: "Log allowance, salary or any money you receive this month.",
    days: 30,
    evaluate: (c, { txns, today }) => {
      const n = txns.filter((t) => t.kind === "income" && inRange(t, windowOf(c, today))).length;
      return { progress: n > 0 ? 100 : 0, detail: n ? `${n} income ${n === 1 ? "entry" : "entries"} recorded` : "No income recorded yet" };
    },
  },
  {
    key: "save-month",
    title: "Save ₹1,000 towards a goal in 30 days",
    description: "Add contributions to any savings goal adding up to ₹1,000.",
    days: 30,
    evaluate: (c, { contributions, today }) => {
      const r = windowOf(c, today);
      const sum = contributions.filter((x) => x.contributed_on >= r.from && x.contributed_on <= r.to).reduce((a, x) => a + x.amount, 0);
      return { progress: Math.min(100, (sum / 1000) * 100), detail: `₹${Math.round(sum)} of ₹1,000 saved` };
    },
  },
  {
    key: "review-subs",
    title: "Review your recurring expenses",
    description: "Add or update your subscriptions and recurring bills this week.",
    days: 7,
    evaluate: (c, { subs }) => {
      const touched = subs.filter((s) => (s.updated_at ?? "").slice(0, 10) >= c.start_date).length;
      return { progress: touched > 0 ? 100 : 0, detail: touched ? `${touched} recurring ${touched === 1 ? "payment" : "payments"} reviewed` : "Open the Subscription Tracker to review" };
    },
  },
];

// ---------- notifications ----------
export type NotificationDraft = { kind: "budget" | "goal" | "subscription" | "spending" | "report" | "challenge"; title: string; body: string; link: string; dedupe_key: string };
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export function buildNotifications(ctx: { txns: Txn[]; budgets: Budget[]; goals: Goal[]; subs: Subscription[]; today: Date }): NotificationDraft[] {
  const { txns, budgets, goals, subs, today } = ctx;
  const out: NotificationDraft[] = [];
  const cur = monthKey(today);
  for (const b of monthBudgets(budgets, txns, cur)) {
    const name = b.budget.category ? `${b.budget.category} budget` : "monthly budget";
    if (b.level === "exceeded")
      out.push({ kind: "budget", title: `Your ${name} has been exceeded`, body: `${inr(b.spent)} spent of ${inr(b.limit)}.`, link: "/budgets", dedupe_key: `budget100:${cur}:${b.budget.category ?? "all"}` });
    if (b.level !== "ok")
      out.push({ kind: "budget", title: `You've reached ${Math.min(100, Math.floor(b.pct))}% of your ${name}`, body: `${inr(Math.max(0, b.remaining))} left for ${monthLabel(cur, true)}.`, link: "/budgets", dedupe_key: `budget80:${cur}:${b.budget.category ?? "all"}` });
  }
  for (const g of goals) {
    const p = goalProgress(g);
    if (p >= 100) out.push({ kind: "goal", title: `Goal reached: ${g.name} 🎉`, body: `You saved ${inr(g.saved_amount)}.`, link: "/goals", dedupe_key: `goal100:${g.id}` });
    else if (p >= 50) out.push({ kind: "goal", title: `${g.name} is ${Math.floor(p)}% done`, body: `${inr(g.target_amount - g.saved_amount)} to go — your savings goal is progressing.`, link: "/goals", dedupe_key: `goal50:${g.id}` });
  }
  for (const s of subs) {
    if (!s.is_active) continue;
    const d = daysBetween(today, parseDate(s.next_payment_date));
    if (d >= 0 && d <= 3)
      out.push({ kind: "subscription", title: `Upcoming payment: ${s.name}`, body: `${inr(s.amount)} due ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}.`, link: "/subscriptions", dedupe_key: `sub:${s.id}:${s.next_payment_date}` });
  }
  if (today.getDate() >= 7) {
    const prev = addMonths(today, -1);
    const sameDayPrev = isoDate(new Date(prev.getFullYear(), prev.getMonth(), Math.min(today.getDate(), daysInMonth(prev))));
    const nowSpent = totals(txns.filter((t) => t.txn_date >= monthStartISO(today) && t.txn_date <= isoDate(today))).expense;
    const prevSpent = totals(txns.filter((t) => t.txn_date >= monthStartISO(prev) && t.txn_date <= sameDayPrev)).expense;
    if (prevSpent > 0 && nowSpent > prevSpent * 1.2 && nowSpent - prevSpent >= 500)
      out.push({ kind: "spending", title: "Your spending increased compared with last month", body: `${inr(nowSpent)} so far vs ${inr(prevSpent)} by the same day last month.`, link: "/analytics", dedupe_key: `spendup:${cur}` });
  }
  if (today.getDate() <= 7) {
    const prevKey = monthKey(addMonths(today, -1));
    if (txns.some((t) => monthKey(t.txn_date) === prevKey))
      out.push({ kind: "report", title: `Your ${monthLabel(prevKey, true)} report is ready`, body: "See your monthly summary and download it from Spending Analytics.", link: "/analytics", dedupe_key: `report:${prevKey}` });
  }
  return out;
}

// ---------- CSV ----------
export function toCSV(rows: Record<string, string | number | null>[], columns: string[]): string {
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    // neutralise spreadsheet formula injection
    const safe = /^[=+\-@]/.test(s) && typeof v === "string" ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c] ?? null)).join(","))].join("\n");
}


// ---------- analytics ----------
export type AnalyticsPeriod = "week" | "month" | "year";
/** Calendar bounds of the period containing `today`, shifted back by `offset` periods. */
export function periodBounds(period: AnalyticsPeriod, today: Date, offset = 0): Range {
  if (period === "week") {
    const dow = (today.getDay() + 6) % 7;
    const start = addDays(today, -dow - 7 * offset);
    return { from: isoDate(start), to: isoDate(addDays(start, 6)) };
  }
  if (period === "month") {
    const start = addMonths(today, -offset);
    return { from: monthStartISO(start), to: isoDate(new Date(start.getFullYear(), start.getMonth() + 1, 0)) };
  }
  const y = today.getFullYear() - offset;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return round2(((current - previous) / previous) * 100);
}
export function spendingAnalytics(txns: Txn[], period: AnalyticsPeriod, today: Date) {
  const cur = periodBounds(period, today, 0);
  const prev = periodBounds(period, today, 1);
  const todayISO = isoDate(today);
  const curTx = txns.filter((t) => inRange(t, cur) && t.txn_date <= todayISO);
  const prevTx = txns.filter((t) => inRange(t, prev));
  const curT = totals(curTx);
  const prevT = totals(prevTx);
  const elapsedDays = daysBetween(parseDate(cur.from), today) + 1;
  const byCategory = categoryBreakdown(curTx);
  const prevByCat = new Map(categoryBreakdown(prevTx).map((c) => [c.category, c.amount]));
  const trend =
    period === "week"
      ? dailySeries(txns, parseDate(cur.to) > today ? today : parseDate(cur.to), 7)
      : period === "month"
        ? monthlySeries(txns, today, 6)
        : monthlySeries(txns, today, 12);
  return {
    current: cur,
    previous: prev,
    expense: curT.expense,
    income: curT.income,
    previousExpense: prevT.expense,
    change: pctChange(curT.expense, prevT.expense),
    avgDaily: round2(curT.expense / Math.max(1, elapsedDays)),
    elapsedDays,
    transactionCount: curTx.filter((t) => t.kind === "expense").length,
    byCategory: byCategory.map((c) => ({ ...c, previous: round2(prevByCat.get(c.category) ?? 0), change: pctChange(c.amount, prevByCat.get(c.category) ?? 0) })),
    topCategory: byCategory[0] ?? null,
    trend,
  };
}

// ---------- expense prediction ----------
export type PredictionTier = "insufficient" | "basic" | "preliminary" | "trend" | "reliable";
export const PREDICTION_MIN_DAYS = 7;
/** Days of expense history → confidence tier. <7 none, 7–29 basic, 30–59 preliminary, 60–89 trend, 90+ reliable. */
export function predictionTier(historyDays: number): PredictionTier {
  if (historyDays < PREDICTION_MIN_DAYS) return "insufficient";
  if (historyDays < 30) return "basic";
  if (historyDays < 60) return "preliminary";
  if (historyDays < 90) return "trend";
  return "reliable";
}
const TIER_UNCERTAINTY: Record<Exclude<PredictionTier, "insufficient">, number> = { basic: 0.4, preliminary: 0.3, trend: 0.2, reliable: 0.12 };
const clampGrowth = (g: number) => Math.max(-0.3, Math.min(0.3, g));

/** Estimate of next month's spending from the user's own expense history. Never guesses below 7 days of history. */
export function predictExpenses(txns: Txn[], budgets: Budget[], today: Date) {
  const todayISO = isoDate(today);
  const expenses = txns.filter((t) => t.kind === "expense" && t.txn_date <= todayISO);
  const next = addMonths(today, 1);
  const month = monthKey(next);
  if (!expenses.length) return { tier: "insufficient" as const, historyDays: 0, needed: PREDICTION_MIN_DAYS, month };
  const first = expenses.reduce((m, t) => (t.txn_date < m ? t.txn_date : m), expenses[0]!.txn_date);
  const historyDays = daysBetween(parseDate(first), today) + 1;
  const tier = predictionTier(historyDays);
  if (tier === "insufficient") return { tier, historyDays, needed: PREDICTION_MIN_DAYS, month };

  const sumBetween = (list: Txn[], fromDaysAgo: number, toDaysAgo: number) => {
    const from = isoDate(addDays(today, -fromDaysAgo + 1));
    const to = isoDate(addDays(today, -toDaysAgo));
    return list.filter((t) => t.txn_date >= from && t.txn_date <= to).reduce((a, t) => a + t.amount, 0);
  };
  /** Daily spending rate for a list of expenses, using the method for this tier. */
  const rate = (list: Txn[]) => {
    if (tier === "basic") return list.reduce((a, t) => a + t.amount, 0) / historyDays;
    const r1 = sumBetween(list, 30, 0) / 30;
    if (tier === "preliminary") return r1;
    const r2 = sumBetween(list, 60, 30) / 30;
    if (tier === "trend") return r2 > 0 ? r1 * (1 + clampGrowth(r1 / r2 - 1) / 2) : r1;
    const r3 = sumBetween(list, 90, 60) / 30;
    const weighted = (3 * r1 + 2 * r2 + r3) / 6;
    return r3 > 0 ? weighted * (1 + clampGrowth((r1 - r3) / r3 / 2)) : weighted;
  };

  const nextDays = daysInMonth(next);
  const curKey = monthKey(today);
  const budgetFor = (category: string | null) =>
    budgets.find((b) => b.month.slice(0, 7) === month && b.category === category) ?? budgets.find((b) => b.month.slice(0, 7) === curKey && b.category === category) ?? null;
  const cats = [...new Set(expenses.map((t) => t.category))];
  const categories = cats
    .map((category) => {
      const estimate = round2(rate(expenses.filter((t) => t.category === category)) * nextDays);
      const b = budgetFor(category);
      return { category, estimate, budget: b ? b.amount : null };
    })
    .filter((c) => c.estimate > 0)
    .sort((a, b) => b.estimate - a.estimate);
  const estimate = round2(categories.reduce((a, c) => a + c.estimate, 0));
  const u = TIER_UNCERTAINTY[tier];
  const overall = budgetFor(null);
  const catBudgetSum = categories.reduce((a, c) => a + (c.budget ?? 0), 0);
  const budget = overall ? { amount: overall.amount, source: "overall" as const } : catBudgetSum > 0 ? { amount: round2(catBudgetSum), source: "categories" as const } : null;
  return {
    tier,
    historyDays,
    month,
    estimate,
    low: round2(estimate * (1 - u)),
    high: round2(estimate * (1 + u)),
    categories,
    budget,
    overBudget: budget ? round2(estimate - budget.amount) : null,
  };
}
export type Prediction = ReturnType<typeof predictExpenses>;

// ---------- health assessment ----------
export type HealthBand = "Excellent" | "Good" | "Fair" | "Needs attention";
export function healthBand(score: number): HealthBand {
  return score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs attention";
}
/** Score only when there's enough real data: 1+ income, 3+ expenses, spanning at least 7 days. */
export function healthAssessment(input: { txns: Txn[]; budgets: Budget[]; goals: Goal[]; today: Date }) {
  const incomes = input.txns.filter((t) => t.kind === "income").length;
  const expenses = input.txns.filter((t) => t.kind === "expense").length;
  const dates = input.txns.map((t) => t.txn_date).sort();
  const spanDays = dates.length ? daysBetween(parseDate(dates[0]!), parseDate(dates[dates.length - 1]!)) + 1 : 0;
  const missing: string[] = [];
  if (incomes < 1) missing.push("at least one income entry (allowance, salary…)");
  if (expenses < 3) missing.push(`${3 - expenses} more expense${3 - expenses === 1 ? "" : "s"}`);
  if (spanDays < 7) missing.push("records covering at least 7 days");
  if (missing.length) return { status: "insufficient" as const, missing };
  const hs = healthScore(input)!;
  return { status: "ok" as const, ...hs, band: healthBand(hs.total) };
}
