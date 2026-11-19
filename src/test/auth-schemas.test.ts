import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/auth-schemas";

const base = { name: "Asha", email: "asha@example.com", password: "secret123", confirm: "secret123" };

describe("registration rules", () => {
  it("accepts a valid sign-up", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });
  it("rejects passwords shorter than 8 characters", () => {
    expect(registerSchema.safeParse({ ...base, password: "abc123", confirm: "abc123" }).success).toBe(false);
  });
  it("requires a number in the password", () => {
    expect(registerSchema.safeParse({ ...base, password: "abcdefgh", confirm: "abcdefgh" }).success).toBe(false);
  });
  it("requires matching passwords", () => {
    expect(registerSchema.safeParse({ ...base, confirm: "secret124" }).success).toBe(false);
  });
});
