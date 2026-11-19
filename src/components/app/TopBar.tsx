import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Home, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAvatarUrl, useMarkNotifications, useNotifications, useProfile } from "@/lib/data";
import { allNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { EmptyState } from "./EmptyState";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function TopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = allNav.find((n) => pathname.startsWith(n.to));
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const avatar = useAvatarUrl(profile.data?.avatar_path);
  const notifications = useNotifications();
  const mark = useMarkNotifications();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;
  const name = profile.data?.full_name || user?.email?.split("@")[0] || "You";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-5" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold">{current?.title ?? "CashCompass AI"}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{current?.description}</p>
      </div>

      <ThemeToggle />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative">
            <Bell />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[340px] p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => mark.mutate("all")}>
                <CheckCheck className="size-3.5" /> Mark all read
              </Button>
            )}
          </div>
          {notifications.data?.length ? (
            <ScrollArea className="max-h-96">
              <ul className="divide-y divide-border">
                {notifications.data.map((n) => (
                  <li key={n.id}>
                    <button
                      className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent", !n.is_read && "bg-primary/5")}
                      onClick={() => {
                        if (!n.is_read) mark.mutate([n.id]);
                        if (n.link) navigate({ to: n.link });
                      }}
                    >
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-primary")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <EmptyState icon={BellOff} title="You're all caught up" description="Budget alerts, goal progress and upcoming payments will show up here, based on your own data." className="py-8" />
          )}
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
            <Avatar className="size-9 border border-border">
              {avatar.data && <AvatarImage src={avatar.data} alt="" className="object-cover" />}
              <AvatarFallback className="bg-gradient-brand text-xs font-semibold text-primary-foreground">{initials(name) || <UserRound className="size-4" />}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <p className="truncate text-sm">{name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings /> Profile & settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/">
              <Home /> Home page
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
