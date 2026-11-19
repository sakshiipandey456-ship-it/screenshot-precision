import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema, toFieldErrors, type FieldErrors } from "@/lib/auth-schemas";
import { safeRedirect, useAuth } from "@/lib/auth-context";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => pageHead("Sign in", "Sign in to CashCompass AI to see your money dashboard."),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goNext = () => navigate({ to: safeRedirect(redirect), replace: true });
  // Email links return here (a public page) so the session is restored before opening a private page.
  // An expired or already-used link comes back with an error in the address instead of a session.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    const desc = params.get("error_description");
    if (desc) setFormError(/expired|invalid/i.test(desc) ? "That confirmation link has expired or was already used. Sign in below, or create your account again to get a new link." : desc.replace(/\+/g, " "));
  }, []);

  useEffect(() => {
    if (ready && user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const result = loginSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!result.success) return setErrors(toFieldErrors(result.error));
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(result.data);
    setBusy(false);
    if (error) {
      setFormError(/confirm/i.test(error.message) ? "Please confirm your email first — check your inbox for the link." : "That email and password don't match. Please try again.");
      return;
    }
    goNext();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={<>New here? <Link to="/register" className="font-medium text-primary-glow hover:underline">Create an account</Link></>}
    >
      <SocialButtons onSignedIn={goNext} />
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@college.edu" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
        <div className="-mt-1 text-right text-xs">
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
        </div>
        {formError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
