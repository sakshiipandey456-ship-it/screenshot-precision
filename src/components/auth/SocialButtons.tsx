
import { useState } from "react";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const GoogleG = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

export function SocialButtons({ onSignedIn }: { onSignedIn: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function goGoogle() {
    setBusy("google");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        toast.error(error.message);
        setBusy(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.");
      setBusy(null);
    }
  }

  async function goLovable() {
    setBusy("lovable");

    try {
      const result = await lovable.auth.signInWithOAuth("lovable", {
        redirect_uri: `${window.location.origin}/login`,
      });

      if (result.error) {
        toast.error(result.error.message);
        setBusy(null);
        return;
      }

      if (result.redirected) return;

      onSignedIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lovable sign-in failed.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <Button
        type="button"
        variant="outline"
        className="btn-google h-11 w-full gap-2.5 px-3 text-sm font-medium"
        disabled={!!busy}
        onClick={goGoogle}
      >
        <GoogleG /> Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2.5 text-sm font-medium"
        disabled={!!busy}
        onClick={goLovable}
      >
        <LovableMark className="size-[18px]" /> Continue with Lovable
      </Button>

      <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
