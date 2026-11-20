import { describe, expect, it } from "vitest";
import { addDays, isoDate, type Budget, type Txn } from "@/lib/finance";
import { computeAnalytics } from "@/lib/analytics";
import { expenseHistoryDays, predictNextMonth, tierForDays } from "@/lib/predictor";
import { computeHealth, healthCategory } from "@/lib/health";
import { transactionSchema, subscriptionSchema } from "@/lib/schemas";
import { resolveDisplayName } from "@/lib/name";
import { formatDate } from "@/lib/format";
import { buildSnapshot, ruleBasedAnswer } from "@/lib/advisor-core";

const TODAY = new Date(2026, 10, 20); // 20 Nov 2026
let n = 0;
const exp = (daysAgo: number, amount: number, category = "Food"): Txn => ({ id: `e${n++}`, kind: "expense", title: "x", amount, category, txn_date: isoDate(addDays(TODAY, -daysAgo)), payment_method: null, description: null });
const inc = (daysAgo: number, amount: number): Txn => ({ id: `i${n++}`, kind: "income", title: "pay", amount, category: "Allowance", txn_date: isoDate(addDays(TODAY, -daysAgo)), payment_method: null, description: null });
/** One expense per day for `days` days ending today. */
const daily = (days: number, amount = 100, category = "Food") => Array.from({ length: days }, (_, i) => exp(i, amount, category));
const budget = (amount: number, category: string | null = null, month = "2026-11-01"): Budget => ({ id: `b${n++}`, month, category, amount });

describe("predictor tiers (history days)", () => {
  it("maps day counts to the requested tiers", () => {
    expect([0, 6, 7, 29, 30, 59, 60, 89, 90, 400].map(tierForDays)).toEqual([null, null, "basic", "basic", "preliminary", "preliminary", "trend", "trend", "reliable", "reliable"]);
  });
  it("<7 days: insufficient, no number fabricated", () => {
    const p = predictNextMonth({ txns: daily(6), budgets: [], today: TODAY });
    expect(p.status).toBe("insufficient");
    expect("estimate" in p).toBe(false);
  });
  it("no expenses: insufficient", () => {
    expect(predictNextMonth({ txns: [inc(1, 5000)], budgets: [], today: TODAY }).status).toBe("insufficient");
  });
  it("few records over many days is still insufficient (2 entries are not a forecast)", () => {
    const p = predictNextMonth({ txns: [exp(40, 100), exp(0, 100)], budgets: [], today: TODAY });
    expect(p).toMatchObject({ status: "insufficient", reason: "records" });
  });
  it("7–29 days: basic, low confidence, = daily avg × 31 days of December", () => {
    const p = predictNextMonth({ txns: daily(14, 100), budgets: [], today: TODAY });
    expect(p).toMatchObject({ status: "ok", tier: "basic", confidenceLevel: "Low", days: 14 });
    if (p.status === "ok") expect(p.estimate).toBeCloseTo(100 * 31, 0);
  });
  it("30–59 days: preliminary", () => {
    const p = predictNextMonth({ txns: daily(45, 100), budgets: [], today: TODAY });
    expect(p).toMatchObject({ status: "ok", tier: "preliminary" });
    if (p.status === "ok") expect(p.estimate).toBeCloseTo(3100, 0);
  });
  it("60–89 days: trend-aware — a rising spend predicts more than flat average", () => {
    const rising = Array.from({ length: 75 }, (_, i) => exp(i, 100 + (75 - i) * 4)); // older = cheaper, newer = pricier
    const flat = daily(75, 100);
    const pr = predictNextMonth({ txns: rising, budgets: [], today: TODAY });
    const pf = predictNextMonth({ txns: flat, budgets: [], today: TODAY });
    expect(pr).toMatchObject({ status: "ok", tier: "trend" });
    if (pr.status === "ok" && pf.status === "ok") {
      const avg = rising.reduce((a, t) => a + t.amount, 0) / 75;
      expect(pr.estimate).toBeGreaterThan(avg * 31);
      expect(pf.estimate).toBeCloseTo(3100, -1);
    }
  });
  it("90+ days: reliable, tighter range than basic", () => {
    const r = predictNextMonth({ txns: daily(120, 100), budgets: [], today: TODAY });
    const b = predictNextMonth({ txns: daily(10, 100), budgets: [], today: TODAY });
    expect(r).toMatchObject({ status: "ok", tier: "reliable", confidenceLevel: "Good", coveragePct: 100 });
    if (r.status === "ok" && b.status === "ok") expect(r.high - r.low).toBeLessThan(b.high - b.low);
  });
  it("category predictions add up to the total and compare with budgets", () => {
    const txns = [...daily(40, 100, "Food"), ...daily(40, 50, "Travel")];
    const p = predictNextMonth({ txns, budgets: [budget(4000), budget(2000, "Food")], today: TODAY });
    expect(p.status).toBe("ok");
    if (p.status === "ok") {
      expect(p.categories.reduce((a, c) => a + c.estimate, 0)).toBeCloseTo(p.estimate, 0);
      expect(p.budget).toMatchObject({ amount: 4000, source: "overall", level: "over" });
      expect(p.categories.find((c) => c.category === "Food")?.overBy).toBeGreaterThan(0);
    }
  });
  it("ignores future-dated and income entries when counting history", () => {
    expect(expenseHistoryDays([exp(-5, 10), inc(30, 100)], TODAY)).toBe(0);
  });
});

describe("health score", () => {
  it("gives no score without enough data", () => {
    expect(computeHealth({ txns: [exp(0, 50)], budgets: [], goals: [], today: TODAY }).status).toBe("insufficient");
    expect(computeHealth({ txns: daily(5), budgets: [], goals: [], today: TODAY }).status).toBe("insufficient");
  });
  it("scores 0–100 from real data with indicators, tips and a category", () => {
    const txns = [inc(10, 20000), ...daily(10, 100)];
    const r = computeHealth({ txns, budgets: [budget(5000)], goals: [], today: TODAY });
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(100);
      expect(r.indicators).toHaveLength(5);
      expect(r.category.label).toBe(healthCategory(r.total).label);
    }
  });
  it("recalculates when data changes (overspending lowers the score)", () => {
    const base = [inc(10, 10000), ...daily(10, 100)];
    const a = computeHealth({ txns: base, budgets: [budget(5000)], goals: [], today: TODAY });
    const b = computeHealth({ txns: [...base, exp(0, 30000)], budgets: [budget(5000)], goals: [], today: TODAY });
    if (a.status === "ok" && b.status === "ok") expect(b.total).toBeLessThan(a.total);
    else throw new Error("expected scores");
  });
  it("category boundaries", () => {
    expect([100, 80, 79, 60, 59, 40, 39, 0].map((s) => healthCategory(s).label)).toEqual(["Excellent", "Excellent", "Good", "Good", "Fair", "Fair", "Needs attention", "Needs attention"]);
  });
});

describe("analytics", () => {
  const txns = [exp(0, 200, "Food"), exp(1, 300, "Travel"), exp(40, 999, "Food"), inc(2, 9000)];
  it("monthly totals, top category, average, comparison", () => {
    const a = computeAnalytics(txns, [], "month", TODAY);
    expect(a.total).toBe(500);
    expect(a.topCategory?.category).toBe("Travel");
    expect(a.elapsedDays).toBe(20);
    expect(a.avgDaily).toBe(25);
    expect(a.monthlyTrend).toHaveLength(6);
    expect(a.previousSameSpan).toBe(999); // 11 Oct falls inside Oct 1–20
    expect(a.changePct).toBeCloseTo(((500 - 999) / 999) * 100, 5);
    expect(computeAnalytics([exp(0, 10)], [], "month", TODAY).changePct).toBeNull(); // nothing to compare with
  });
  it("percentage change vs the same span of the previous month", () => {
    const t = [exp(0, 300), exp(31, 200), exp(25, 777)]; // 20 Nov; 20 Oct (in span); 26 Oct (after span)
    const a = computeAnalytics(t, [], "month", TODAY);
    expect(a.previousSameSpan).toBe(200);
    expect(a.changePct).toBeCloseTo(50, 5);
  });
  it("yearly view covers the whole year and sums budgets of past months", () => {
    const a = computeAnalytics([exp(0, 100), exp(60, 400)], [budget(1000, "Food", "2026-11-01"), budget(1000, "Food", "2026-09-01")], "year", TODAY);
    expect(a.total).toBe(500);
    expect(a.series).toHaveLength(12);
    expect(a.budgetRows[0]).toMatchObject({ category: "Food", budgeted: 2000, actual: 500 });
  });
  it("updates when an expense is added or deleted (pure recompute)", () => {
    const before = computeAnalytics(txns, [], "month", TODAY).total;
    expect(computeAnalytics([...txns, exp(0, 50)], [], "month", TODAY).total).toBe(before + 50);
    expect(computeAnalytics(txns.slice(1), [], "month", TODAY).total).toBe(before - 200);
  });
  it("empty data produces zeros, not NaN", () => {
    const a = computeAnalytics([], [], "week", TODAY);
    expect(a.total).toBe(0);
    expect(a.avgDaily).toBe(0);
    expect(a.topCategory).toBeNull();
  });
});

describe("date validation and formatting", () => {
  const base = { kind: "expense", title: "t", amount: 10, category: "Food", payment_method: null, description: null };
  it("rejects future and impossible dates, accepts today", () => {
    expect(transactionSchema.safeParse({ ...base, txn_date: isoDate(addDays(new Date(), 1)) }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, txn_date: "2026-02-31" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, txn_date: isoDate(new Date()) }).success).toBe(true);
  });
  it("subscriptions may have future payment dates", () => {
    expect(subscriptionSchema.safeParse({ name: "N", amount: 99, frequency: "monthly", next_payment_date: isoDate(addDays(new Date(), 20)), category: "Bills", is_active: true }).success).toBe(true);
  });
  it("one display format", () => {
    expect(formatDate("2026-03-05")).toBe("05 Mar 2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("greeting name", () => {
  it("prefers the full profile name, then sign-up metadata, rejects single letters", () => {
    expect(resolveDisplayName("Sakshi Pandey", null)).toBe("Sakshi Pandey");
    expect(resolveDisplayName("", { full_name: "Sakshi Pandey" })).toBe("Sakshi Pandey");
    expect(resolveDisplayName("B", null)).toBeNull();
    expect(resolveDisplayName("  ", {})).toBeNull();
  });
});

describe("advisor (built-in analysis uses real data)", () => {
  const txns = [inc(5, 30000), ...daily(30, 200, "Shopping"), ...daily(30, 100, "Food")];
  const snap = buildSnapshot({ txns, budgets: [budget(2000, "Shopping")], goals: [], contributions: [], subs: [], profile: null }, TODAY);
  it("builds a snapshot from stored records", () => {
    expect(snap.transactionCount).toBe(txns.length);
    expect(snap.budgetsThisMonth[0]).toMatchObject({ category: "Shopping", status: "exceeded" });
    expect(snap.forecast).toHaveProperty("estimate");
  });
  it("answers with real figures and handles new intents", () => {
    expect(ruleBasedAnswer("Where am I spending the most?", snap)).toContain("Shopping");
    expect(ruleBasedAnswer("Where am I spending unnecessarily?", snap)).toContain("Shopping");
    expect(ruleBasedAnswer("Suggest realistic budget adjustments", snap)).toContain("Shopping");
    expect(ruleBasedAnswer("monthly summary", snap)).toMatch(/earned|spent/);
  });
  it("says so when there is no data", () => {
    const empty = buildSnapshot({ txns: [], budgets: [], goals: [], contributions: [], subs: [], profile: null }, TODAY);
    expect(ruleBasedAnswer("hi", empty)).toMatch(/don't have any transactions/);
  });
});
