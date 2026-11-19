import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => pageHead("Reset your password", "Get a link to reset your CashCompass AI password."),
  component: ForgotPage,
});

function ForgotPage() {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = z.string().trim().email("Enter a valid email address").safeParse(new FormData(e.currentTarget).get("email"));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true);
  }
  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a link to choose a new one." footer={<Link to="/login" className="font-medium text-primary-glow hover:underline">Back to sign in</Link>}>
      {sent ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <MailCheck className="mx-auto size-10 text-success" />
          <p className="mt-4 text-sm">If an account exists for that email, a reset link is on its way.</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@college.edu" error={error} />
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
