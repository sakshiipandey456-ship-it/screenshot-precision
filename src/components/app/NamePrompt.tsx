import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "./Panel";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useSaveProfile } from "@/lib/data";
import { profileSchema } from "@/lib/schemas";

/** Shown when no usable name is stored; saves it to the profile. */
export function NamePrompt() {
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const save = useSaveProfile(user?.id);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = profileSchema.shape.full_name.safeParse(name);
    if (!r.success) return setError(r.error.issues[0]?.message);
    setError(undefined);
    await save.mutateAsync({ full_name: r.data, monthly_income: profile.data?.monthly_income ?? null, occupation: profile.data?.occupation ?? null }).catch(() => undefined);
  }
  return (
    <Panel>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground sm:flex"><UserRound className="size-5" /></span>
        <div className="flex-1">
          <label htmlFor="np-name" className="text-sm font-medium">What should we call you?</label>
          <p className="text-xs text-muted-foreground">We couldn't find your full name. Add it once and your greeting updates everywhere.</p>
          <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" maxLength={80} autoComplete="name" className="mt-2 max-w-sm" aria-invalid={!!error} />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" variant="hero" disabled={save.isPending} className="sm:mt-5">
          {save.isPending && <Loader2 className="animate-spin" />} Save name
        </Button>
      </form>
    </Panel>
  );
}
