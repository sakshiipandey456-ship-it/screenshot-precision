import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/auth-context";

describe("post sign-in destination", () => {
  it("opens the dashboard when the confirmation link asks for it", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
  });
  it("falls back to the dashboard when no destination is given", () => {
    expect(safeRedirect(undefined)).toBe("/dashboard");
  });
  it("never sends people to another website", () => {
    expect(safeRedirect("https://evil.example/steal")).toBe("/dashboard");
  });
  it("never loops back to the sign-in page", () => {
    expect(safeRedirect("/login?redirect=/dashboard")).toBe("/dashboard");
  });
});
