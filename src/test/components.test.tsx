import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addDays, isoDate } from "@/lib/finance";
import { DatePicker } from "@/components/app/DatePicker";
import { HealthScoreCard } from "@/components/app/HealthScoreCard";
import type { HealthResult } from "@/lib/health";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));

describe("DatePicker", () => {
  it("shows the app date format, opens a calendar, and writes an ISO value to its hidden form field", () => {
    const onChange = vi.fn();
    const { container } = render(<form><DatePicker name="d" defaultValue="2026-03-05" onChange={onChange} /></form>);
    expect(screen.getByText("05 Mar 2026")).toBeTruthy();
    expect((container.querySelector('input[name="d"]') as HTMLInputElement).value).toBe("2026-03-05");
    fireEvent.click(screen.getByRole("button"));
    const day = Array.from(document.querySelectorAll("button[data-day]")).find((x) => x.textContent === "12") as HTMLButtonElement;
    fireEvent.click(day);
    expect(onChange).toHaveBeenCalledWith("2026-03-12");
    expect((container.querySelector('input[name="d"]') as HTMLInputElement).value).toBe("2026-03-12");
    expect(screen.getByText("12 Mar 2026")).toBeTruthy();
  });
  it("disables days after maxDate (no future expense dates)", () => {
    const tomorrow = isoDate(addDays(new Date(), 1));
    render(<DatePicker defaultValue={isoDate(new Date())} maxDate={isoDate(new Date())} />);
    fireEvent.click(screen.getByRole("button"));
    const dayNum = String(addDays(new Date(), 1).getDate());
    const cells = Array.from(document.querySelectorAll("button[data-day]")).filter((b) => b.getAttribute("data-day") === new Date(tomorrow + "T00:00:00").toLocaleDateString());
    expect(cells.length === 0 || cells.every((c) => (c as HTMLButtonElement).disabled), `day ${dayNum} should be disabled`).toBe(true);
  });
});

describe("HealthScoreCard", () => {
  it("explains missing data instead of showing a score", () => {
    const r: HealthResult = { status: "insufficient", days: 2, txnCount: 3, neededDays: 7, neededTxns: 5 };
    render(<HealthScoreCard result={r} />);
    expect(screen.getByText("Not enough data for a score yet")).toBeTruthy();
    expect(screen.getByText(/You have 2 days and 3 transactions/)).toBeTruthy();
  });
  it("shows score, category, factors and tips", () => {
    const r = {
      status: "ok", days: 30, total: 72, category: { label: "Good", tone: "primary", blurb: "b" },
      indicators: [{ key: "budget", label: "Budget adherence", score: 10, max: 20, detail: "d" }],
      positives: [], improvements: [], tips: ["Set a monthly budget"],
    } as unknown as HealthResult;
    render(<HealthScoreCard result={r} />);
    expect(screen.getByText("72")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Budget adherence")).toBeTruthy();
    expect(screen.getByText(/Set a monthly budget/)).toBeTruthy();
  });
});
