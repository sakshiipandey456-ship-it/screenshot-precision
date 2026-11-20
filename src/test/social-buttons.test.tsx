import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
const toastError = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@lovable.dev/cloud-auth-js/react", () => ({ LovableMark: () => null }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

async function renderButtons() {
  vi.resetModules();
  vi.stubEnv("VITE_OAUTH_MODE", "direct");
  const { SocialButtons } = await import("@/components/auth/SocialButtons");
  return render(<SocialButtons onSignedIn={() => {}} />);
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://auth.example.com/authorize?provider=google" }, error: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Google sign-in on Netlify builds", () => {
  it("hides the Google button when the provider has no credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ msg: "Unsupported provider: missing OAuth secret" }), { status: 400 })));
    await renderButtons();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("button", { name: /Continue with Google/ })).not.toBeInTheDocument());
    expect(screen.queryByText("or use email")).not.toBeInTheDocument();
  });

  it("shows the Google button when the provider redirects to Google", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ type: "opaqueredirect", ok: false, status: 0 }));
    await renderButtons();
    expect(await screen.findByRole("button", { name: /Continue with Google/ })).toBeEnabled();
  });

  it("keeps the button when the check can't reach the server, and explains a failure on click", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);
    await renderButtons();
    const button = await screen.findByRole("button", { name: /Continue with Google/ });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ msg: "Unsupported provider: missing OAuth secret" }), { status: 400 }));
    fireEvent.click(button);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Google sign-in isn't set up for this site yet. Please use email for now."));
  });
});
