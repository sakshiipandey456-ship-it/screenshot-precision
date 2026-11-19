import { createFileRoute } from "@tanstack/react-router";
import { Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
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
  const status = { student: "Student", working: "Working", other: "Other" } as const;
  const rows = [
    { label: "Name", value: profile.data?.full_name || "Not set" },
    { label: "Email", value: user?.email ?? "—" },
    { label: "Status", value: profile.data?.occupation ? status[profile.data.occupation] : "Not set" },
  ];
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
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface-raised/50">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="truncate font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
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
