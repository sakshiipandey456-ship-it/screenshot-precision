import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";
import { Route as LoginRoute } from "@/routes/login";
import { Route as RegisterRoute } from "@/routes/register";
import { Route as ForgotRoute } from "@/routes/forgot-password";

const auth = vi.hoisted(() => ({ resend: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => ({ redirect: "/budgets" }) }),
  useNavigate: () => navigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null, ready: true }), safeRedirect: (path: string | undefined) => path || "/dashboard" }));
vi.mock("@/components/auth/AuthShell", () => ({ AuthShell: ({ title, children }: { title: string; children: ReactNode }) => <main><h1>{title}</h1>{children}</main> }));
vi.mock("@/components/auth/SocialButtons", () => ({ SocialButtons: () => null }));

const LoginPage = (LoginRoute as unknown as { options: { component: ComponentType } }).options.component;
const RegisterPage = (RegisterRoute as unknown as { options: { component: ComponentType } }).options.component;
const ForgotPage = (ForgotRoute as unknown as { options: { component: ComponentType } }).options.component;

beforeEach(() => {
  vi.resetAllMocks();
  auth.resend.mockResolvedValue({ error: null });
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("verification email requests", () => {
  it("requires a valid email before contacting the authentication service", async () => {
    render(<ResendConfirmation email="" />);
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address above");
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it("requests signup verification for the entered email and preserves the destination", async () => {
    render(<ResendConfirmation email=" person@example.com " redirectTo="/budgets" />);
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByRole("status")).toHaveTextContent("If this account still needs verification");
    expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email: "person@example.com", options: { emailRedirectTo: `${window.location.origin}/login?redirect=%2Fbudgets` } });
    expect(screen.getByRole("button", { name: "Resend available in 60s" })).toBeDisabled();
  });

  it("shows failed delivery requests without claiming that an email was sent", async () => {
    auth.resend.mockResolvedValue({ error: { status: 500, message: "SMTP failure" } });
    render(<ResendConfirmation email="person@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be requested");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeEnabled();
  });

  it("handles network failures and allows retrying", async () => {
    auth.resend.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<ResendConfirmation email="person@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check your connection");
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeEnabled();
  });

  it("prevents repeat requests while the service is responding", async () => {
    let finish!: (result: { error: null }) => void;
    auth.resend.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<ResendConfirmation email="person@example.com" />);
    const button = screen.getByRole("button", { name: "Resend verification email" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(auth.resend).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => finish({ error: null }));
  });

  it("shows rate limiting and allows a retry after the cooldown", async () => {
    vi.useFakeTimers();
    auth.resend.mockResolvedValue({ error: { status: 429, code: "over_email_send_rate_limit" } });
    render(<ResendConfirmation email="person@example.com" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend verification email" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Too many email requests");
    expect(screen.getByRole("button")).toBeDisabled();
    for (let second = 0; second < 60; second++) {
      await act(async () => vi.advanceTimersByTime(1000));
    }
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeEnabled();
  });
});

describe("email authentication pages", () => {
  it("helps unverified users request a link using the login email without signing in", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed", message: "Email not confirmed" } });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Use Resend verification email below");
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: "person@example.com" })));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("offers verification resend after signup", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Person" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "example123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ email: "person@example.com" })));
  });

  it("tells people an email is already registered instead of waiting for an email that never comes", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: { id: "x", identities: [] } }, error: null });
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Person" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example123" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "example123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("An account with this email already exists");
    expect(screen.queryByRole("heading", { name: "Check your email" })).not.toBeInTheDocument();
  });

  it("reports password reset email failures without showing success", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 500, message: "Email delivery failure" } });
    render(<ForgotPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("The reset email could not be requested. Please try again in a few minutes.")).toBeInTheDocument();
    expect(screen.queryByText(/a reset link is on its way/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeEnabled();
  });
});
