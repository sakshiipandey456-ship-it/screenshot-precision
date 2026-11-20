import { useEffect, useRef, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function ResendConfirmation({ email, redirectTo = "/dashboard" }: { email: string; redirectTo?: string }) {
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setTimeout(() => setCooldown((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    setError(null);
    setRequested(false);
  }, [email]);

  async function resend() {
    if (inFlight.current || cooldown > 0) return;
    setError(null);
    setRequested(false);
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email address above, then resend the verification email.");
      return;
    }

    inFlight.current = true;
    setBusy(true);
    try {
      const callback = new URL("/login", window.location.origin);
      callback.searchParams.set("redirect", redirectTo);
      const { error: sendError } = await supabase.auth.resend({
        type: "signup",
        email: parsed.data,
        options: { emailRedirectTo: callback.href },
      });
      if (sendError) {
        if (sendError.status === 429 || sendError.code === "over_email_send_rate_limit") {
          setCooldown(60);
          setError("Too many email requests. Wait a few minutes before trying again.");
        } else {
          setError("The verification email could not be requested. Please try again in a few minutes.");
        }
        return;
      }
      setRequested(true);
      setCooldown(60);
    } catch {
      setError("We couldn't connect to send the verification email. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-3 rounded-xl border border-border bg-card/50 p-4 text-left">
      <p className="text-sm font-medium">Didn't receive your verification email?</p>
      <p className="text-xs text-muted-foreground">Verification is needed once after creating an account. Check your email address and your Spam or Promotions folder.</p>
      <Button type="button" variant="outline" className="w-full" disabled={busy || cooldown > 0} onClick={resend}>
        {busy ? <Loader2 className="animate-spin" /> : <Mail />}
        {busy ? "Requesting email…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
      </Button>
      {requested && <p role="status" className="text-xs text-muted-foreground">If this account still needs verification, check your inbox and spam folder for a new link. Email delivery may take a few minutes.</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
