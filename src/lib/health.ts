import { daysBetween, healthScore, isoDate, parseDate, type Budget, type Goal, type Txn } from "./finance";

/** A score needs a little real history. Below this we explain instead of inventing a number. */
export const HEALTH_MIN_DAYS = 7;
export const HEALTH_MIN_TXNS = 5;

export type HealthCategory = { label: "Excellent" | "Good" | "Fair" | "Needs attention"; tone: "success" | "primary" | "warning" | "danger"; blurb: string };
export function healthCategory(score: number): HealthCategory {
  if (score >= 80) return { label: "Excellent", tone: "success", blurb: "Your money habits are strong. Keep the momentum going." };
  if (score >= 60) return { label: "Good", tone: "primary", blurb: "You're on a solid track with a few things to polish." };
  if (score >= 40) return { label: "Fair", tone: "warning", blurb: "A few small habit changes could lift your score quickly." };
  return { label: "Needs attention", tone: "danger", blurb: "No judgement — the tips below are the easiest places to start." };
}

export function computeHealth(input: { txns: Txn[]; budgets: Budget[]; goals: Goal[]; today: Date }) {
  const { txns, today } = input;
  const todayISO = isoDate(today);
  const dated = txns.filter((t) => t.txn_date <= todayISO);
  const first = dated.length ? dated.reduce((m, t) => (t.txn_date < m ? t.txn_date : m), dated[0]!.txn_date) : null;
  const days = first ? daysBetween(parseDate(first), today) + 1 : 0;
  const hasExpense = dated.some((t) => t.kind === "expense");
  if (days < HEALTH_MIN_DAYS || dated.length < HEALTH_MIN_TXNS || !hasExpense) {
    return { status: "insufficient" as const, days, txnCount: dated.length, neededDays: HEALTH_MIN_DAYS, neededTxns: HEALTH_MIN_TXNS };
  }
  const r = healthScore({ ...input, txns: dated });
  if (!r) return { status: "insufficient" as const, days, txnCount: dated.length, neededDays: HEALTH_MIN_DAYS, neededTxns: HEALTH_MIN_TXNS };
  return { status: "ok" as const, days, ...r, category: healthCategory(r.total) };
}
export type HealthResult = ReturnType<typeof computeHealth>;
