import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { supabase } from "@/integrations/supabase/client";
import { registerSchema, toFieldErrors, type FieldErrors } from "@/lib/auth-schemas";
import { useAuth } from "@/lib/auth-context";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/register")({
  head: () => pageHead("Create account", "Create your free CashCompass AI account."),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard", replace: true });
  }, [ready, user, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const result = registerSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!result.success) return setErrors(toFieldErrors(result.error));
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: { emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent("/dashboard")}`, data: { full_name: result.data.name } },
    });
    setBusy(false);
    if (error) {
      setFormError(/registered|exists/i.test(error.message) ? "An account with this email already exists. Try signing in." : error.message);
      return;
    }
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else setSentTo(result.data.email);
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" subtitle="One last step to protect your account." footer={<Link to="/login" className="font-medium text-primary-glow hover:underline">Back to sign in</Link>}>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <MailCheck className="mx-auto size-10 text-success" />
          <p className="mt-4 text-sm">We sent a confirmation link to <span className="font-medium">{sentTo}</span>.</p>
          <p className="mt-2 text-xs text-muted-foreground">Click it to activate your account, then sign in. Can't find it? Check your spam folder.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free for students. Takes less than a minute."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-primary-glow hover:underline">Sign in</Link></>}
    >
      <SocialButtons onSignedIn={() => navigate({ to: "/dashboard", replace: true })} />
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field id="name" label="Full name" autoComplete="name" placeholder="Your name" error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@college.edu" error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" error={errors.password} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm} />
        {formError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Create account
        </Button>
        <p className="text-center text-xs text-muted-foreground">Passwords are stored securely hashed. We never ask for bank or card details.</p>
      </form>
    </AuthShell>
  );
}
