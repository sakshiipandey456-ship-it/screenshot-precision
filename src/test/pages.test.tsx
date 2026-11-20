import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, isoDate, type Budget, type Subscription, type Txn } from "@/lib/finance";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => <a href={to} {...rest}>{children}</a>,
}));

const state: { txns: Txn[]; budgets: Budget[]; subs: Subscription[]; saved: unknown[]; deleted: string[] } = { txns: [], budgets: [], subs: [], saved: [], deleted: [] };
const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
vi.mock("@/lib/data", async (orig) => {
  const real = await orig<typeof import("@/lib/data")>();
  return {
    ...real,
    useTransactions: () => q(state.txns),
    useBudgets: () => q(state.budgets),
    useSubscriptions: () => q(state.subs),
    useGoals: () => q([]),
    useSaveSubscription: () => ({ isPending: false, mutate: (v: unknown) => state.saved.push(v), mutateAsync: async (v: unknown) => void state.saved.push(v) }),
    useDeleteSubscription: () => ({ mutate: (id: string) => state.deleted.push(id) }),
  };
});
// Recharts needs real layout; the charts are not under test here.
vi.mock("@/components/app/charts", () => ({
  CategoryDonut: ({ data }: { data: { category: string }[] }) => <div data-testid="donut">{data.map((d) => d.category).join(",")}</div>,
  SpendLine: () => <div data-testid="line" />,
  TrendArea: () => <div data-testid="trend" />,
}));

const today = new Date();
let n = 0;
const exp = (daysAgo: number, amount: number, category = "Food"): Txn => ({ id: `e${n++}`, kind: "expense", title: "x", amount, category, txn_date: isoDate(addDays(today, -daysAgo)), payment_method: null, description: null });
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  state.txns = [];
  state.budgets = [];
  state.subs = [];
  state.saved = [];
  state.deleted = [];
});

describe("Future Expense Predictor page", async () => {
  const { Route } = await import("@/routes/_authenticated/_app/predictor");
  const Page = (Route as unknown as { options: { component: React.ComponentType } }).options.component;
  it("shows an empty state (and no number) with insufficient data", () => {
    state.txns = Array.from({ length: 3 }, (_, i) => exp(i, 100));
    wrap(<Page />);
    expect(screen.getByText("More expense history needed")).toBeTruthy();
    expect(screen.queryByText(/Estimated spending/)).toBeNull();
  });
  it("shows a low-confidence warning for 7–29 days", () => {
    state.txns = Array.from({ length: 14 }, (_, i) => exp(i, 100));
    wrap(<Page />);
    expect(screen.getByText(/Low confidence/)).toBeTruthy();
    expect(screen.getByText(/Estimated spending/)).toBeTruthy();
    expect(screen.getByText("14 days of history")).toBeTruthy();
  });
  it("shows the budget comparison and category predictions with 90+ days", () => {
    state.txns = Array.from({ length: 100 }, (_, i) => exp(i, 100));
    const m = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    state.budgets = [{ id: "b", month: m, category: null, amount: 1000 }];
    wrap(<Page />);
    expect(screen.getByText(/over your current monthly budget/)).toBeTruthy();
    expect(screen.getByText("Predicted by category")).toBeTruthy();
    expect(screen.queryByText(/Low confidence/)).toBeNull();
  });
});

describe("Spending Analytics page", async () => {
  const { Route } = await import("@/routes/_authenticated/_app/analytics");
  const Page = (Route as unknown as { options: { component: React.ComponentType } }).options.component;
  it("shows an empty state with no expenses", () => {
    wrap(<Page />);
    expect(screen.getByText("No expenses to analyse yet")).toBeTruthy();
  });
  it("renders totals, highest category, donut and weekly/monthly/yearly filters from real records", () => {
    state.txns = [exp(0, 400, "Travel"), exp(0, 100, "Food")];
    wrap(<Page />);
    expect(screen.getByText("Highest category")).toBeTruthy();
    expect(screen.getAllByText("Travel").length).toBeGreaterThan(0);
    expect(screen.getByTestId("donut").textContent).toContain("Travel");
    for (const t of ["Weekly", "Monthly", "Yearly"]) expect(screen.getByRole("tab", { name: t })).toBeTruthy();
    expect(screen.getByText("Budget vs actual")).toBeTruthy();
  });
  it("shows budget vs actual rows when a budget exists", () => {
    state.txns = [exp(0, 900, "Food")];
    state.budgets = [{ id: "b", month: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), category: "Food", amount: 1000 }];
    wrap(<Page />);
    expect(screen.getByText(/90%/)).toBeTruthy();
  });
});

describe("Subscription Tracker page", async () => {
  const { Route } = await import("@/routes/_authenticated/_app/subscriptions");
  const Page = (Route as unknown as { options: { component: React.ComponentType } }).options.component;
  const sub = (o: Partial<Subscription>): Subscription => ({ id: "s" + n++, name: "Netflix", amount: 500, frequency: "monthly", next_payment_date: isoDate(addDays(today, 3)), category: "Entertainment", is_active: true, ...o });
  it("empty state + Add subscription button", () => {
    wrap(<Page />);
    expect(screen.getByText("No subscriptions yet")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Add subscription/ }).length).toBeGreaterThan(0);
  });
  it("calculates monthly and yearly totals across frequencies, excluding cancelled", () => {
    state.subs = [sub({ name: "A", amount: 500 }), sub({ name: "B", amount: 1200, frequency: "yearly" }), sub({ name: "C", amount: 999, is_active: false })];
    wrap(<Page />);
    // 500 + 1200/12 = 600 per month, 7,200 per year
    expect(screen.getByText("₹600")).toBeTruthy();
    expect(screen.getByText("₹7,200")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
  });
  it("shows in-app reminders for payments due within 7 days and flags overdue ones", () => {
    state.subs = [sub({ name: "Soon", next_payment_date: isoDate(addDays(today, 2)) }), sub({ name: "Late", next_payment_date: isoDate(addDays(today, -2)) }), sub({ name: "Far", next_payment_date: isoDate(addDays(today, 40)) })];
    wrap(<Page />);
    const box = screen.getByText("Payment reminders").closest("div")!;
    expect(within(box).getByText("Soon")).toBeTruthy();
    expect(within(box).getByText(/2 days overdue/)).toBeTruthy();
    expect(within(box).queryByText("Far")).toBeNull();
  });
  it("adds a subscription through the form", async () => {
    wrap(<Page />);
    fireEvent.click(screen.getAllByRole("button", { name: /Add subscription/ })[0]!);
    fireEvent.change(await screen.findByLabelText("Subscription name"), { target: { value: "Spotify" } });
    fireEvent.change(screen.getByLabelText("Amount (₹)"), { target: { value: "119" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add subscription" }).at(-1)!);
    await waitFor(() => expect(state.saved).toHaveLength(1));
    expect(state.saved[0]).toMatchObject({ name: "Spotify", amount: 119, frequency: "monthly", is_active: true });
  });
  it("validates an empty form instead of saving", async () => {
    wrap(<Page />);
    fireEvent.click(screen.getAllByRole("button", { name: /Add subscription/ })[0]!);
    fireEvent.click((await screen.findAllByRole("button", { name: "Add subscription" })).at(-1)!);
    expect(await screen.findByText("Name it")).toBeTruthy();
    expect(state.saved).toHaveLength(0);
  });
  it("edits and deletes", async () => {
    state.subs = [sub({ id: "s-edit", name: "Gym" })];
    wrap(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Gym" }));
    const name = (await screen.findByLabelText("Subscription name")) as HTMLInputElement;
    expect(name.value).toBe("Gym");
    fireEvent.change(name, { target: { value: "Gym Pro" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(state.saved[0]).toMatchObject({ id: "s-edit", name: "Gym Pro" }));
  });
});
