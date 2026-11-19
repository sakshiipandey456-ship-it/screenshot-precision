import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("Choose a new password", "Set a new password for your CashCompass AI account."),
  component: ResetPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").regex(/[A-Za-z]/, "Include at least one letter").regex(/[0-9]/, "Include at least one number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

function ResetPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session || isRecovery));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!r.success) {
      const out: Record<string, string> = {};
      r.error.issues.forEach((i) => (out[String(i.path[0])] ??= i.message));
      return setErrors(out);
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: r.data.password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Make it at least 8 characters with a number." footer={<Link to="/login" className="font-medium text-primary-glow hover:underline">Back to sign in</Link>}>
      {hasSession === false ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">This reset link is invalid or has expired. <Link to="/forgot-password" className="text-primary-glow hover:underline">Request a new one</Link>.</p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field id="password" label="New password" type="password" autoComplete="new-password" error={errors.password} />
          <Field id="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm} />
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
