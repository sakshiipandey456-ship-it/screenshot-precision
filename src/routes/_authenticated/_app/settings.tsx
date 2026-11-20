import { createFileRoute } from "@tanstack/react-router";
import { Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/app/FormField";
import { profileSchema, issuesToErrors, type FieldErrors } from "@/lib/schemas";
import { useSaveProfile, type Profile } from "@/lib/data";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/PageHeader";
import { Panel } from "@/components/app/Panel";
import { EmptyState } from "@/components/app/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  head: () => pageHead("Settings", "Manage your profile, appearance and privacy."),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  return (
    <>
      <PageHeader title="Settings" description="Your profile, how the app looks, and how your data is handled." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Appearance">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised/50 p-4">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="size-4 text-primary-glow" /> : <Sun className="size-4 text-warning" />}
              <div>
                <Label htmlFor="theme-switch" className="text-sm">Dark mode</Label>
                <p className="text-xs text-muted-foreground">Navy dark theme is the default.</p>
              </div>
            </div>
            <Switch id="theme-switch" checked={theme === "dark"} onCheckedChange={toggle} />
          </div>
        </Panel>
        <Panel title="Profile">
          {profile.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading your profile…</p>
          ) : profile.isError ? (
            <EmptyState icon={UserRound} title="Couldn't load your profile" description="Please refresh the page to try again." className="py-6" />
          ) : (
            <ProfileForm profile={profile.data ?? null} email={user?.email ?? "—"} userId={user?.id} />
          )}
        </Panel>
      </div>
      <Panel title="Privacy notice">
        <div className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="space-y-2">
            <p>CashCompass AI never asks for bank logins, card numbers or payment details, and it does not connect to banks or move money.</p>
            <p>Everything you see comes from transactions you enter yourself. Your records are tied to your account and are never visible to other users.</p>
            <p>When Compass AI analyses your finances, it receives only the summaries it needs (like category totals), not your password or personal profile.</p>
          </div>
        </div>
      </Panel>
    </>
  );
}

function ProfileForm({ profile, email, userId }: { profile: Profile | null; email: string; userId: string | undefined }) {
  const save = useSaveProfile(userId);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [income, setIncome] = useState(profile?.monthly_income?.toString() ?? "");
  const [status, setStatus] = useState<string>(profile?.occupation ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  useEffect(() => {
    setName(profile?.full_name ?? "");
    setIncome(profile?.monthly_income?.toString() ?? "");
    setStatus(profile?.occupation ?? "");
  }, [profile?.full_name, profile?.monthly_income, profile?.occupation]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = profileSchema.safeParse({ full_name: name, monthly_income: income, occupation: status || null });
    if (!r.success) return setErrors(issuesToErrors(r.error));
    setErrors({});
    await save.mutateAsync({ full_name: r.data.full_name, monthly_income: r.data.monthly_income, occupation: r.data.occupation }).catch(() => undefined);
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormField id="p-name" label="Full name" error={errors.full_name}>
        <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="First and last name" autoComplete="name" />
      </FormField>
      <FormField id="p-email" label="Email" hint="Your sign-in email can't be changed here.">
        <Input id="p-email" value={email} readOnly disabled />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="p-income" label="Monthly income / allowance (₹)" error={errors.monthly_income}>
          <Input id="p-income" type="number" min="0" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="Optional" />
        </FormField>
        <FormField id="p-status" label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="p-status"><SelectValue placeholder="Not set" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="working">Working</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <Button type="submit" variant="hero" disabled={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" />} Save profile
      </Button>
    </form>
  );
}
