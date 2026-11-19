import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "./fetch-all";
import type { Budget, Challenge, Contribution, Frequency, Goal, Subscription, Txn, TxnKind } from "./finance";

export const qk = {
  txns: ["transactions"],
  budgets: ["budgets"],
  goals: ["goals"],
  contributions: ["contributions"],
  subs: ["subscriptions"],
  notifications: ["notifications"],
  challenges: ["challenges"],
  profile: ["profile"],
  advisor: ["advisor"],
} as const;

const num = (v: unknown) => Number(v ?? 0);
function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- reads ----------
export function useTransactions() {
  return useQuery({
    queryKey: qk.txns,
    queryFn: async (): Promise<Txn[]> => {
      const rows = await fetchAllRows((f, t) =>
        supabase.from("transactions").select("id,kind,title,amount,category,txn_date,payment_method,description").order("txn_date", { ascending: false }).order("created_at", { ascending: false }).range(f, t),
      );
      return rows.map((r) => ({ ...r, kind: r.kind as TxnKind, amount: num(r.amount) }));
    },
  });
}
export function useBudgets() {
  return useQuery({
    queryKey: qk.budgets,
    queryFn: async (): Promise<Budget[]> => must(await supabase.from("budgets").select("id,month,category,amount").order("month", { ascending: false })).map((b) => ({ ...b, amount: num(b.amount) })),
  });
}
export function useGoals() {
  return useQuery({
    queryKey: qk.goals,
    queryFn: async (): Promise<Goal[]> =>
      must(await supabase.from("savings_goals").select("id,name,target_amount,saved_amount,target_date,created_at").order("created_at")).map((g) => ({ ...g, target_amount: num(g.target_amount), saved_amount: num(g.saved_amount) })),
  });
}
export function useContributions() {
  return useQuery({
    queryKey: qk.contributions,
    queryFn: async (): Promise<Contribution[]> => must(await supabase.from("savings_contributions").select("id,goal_id,amount,contributed_on,note").order("contributed_on", { ascending: false })).map((c) => ({ ...c, amount: num(c.amount) })),
  });
}
export function useSubscriptions() {
  return useQuery({
    queryKey: qk.subs,
    queryFn: async (): Promise<Subscription[]> =>
      must(await supabase.from("subscriptions").select("id,name,amount,frequency,next_payment_date,category,is_active,updated_at").order("next_payment_date")).map((s) => ({ ...s, frequency: s.frequency as Frequency, amount: num(s.amount) })),
  });
}
export type AppNotification = { id: string; kind: string; title: string; body: string; link: string | null; is_read: boolean; created_at: string };
export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: async (): Promise<AppNotification[]> => must(await supabase.from("notifications").select("id,kind,title,body,link,is_read,created_at").order("created_at", { ascending: false }).limit(50)),
  });
}
export function useChallenges() {
  return useQuery({
    queryKey: qk.challenges,
    queryFn: async (): Promise<Challenge[]> => must(await supabase.from("challenges").select("id,template_key,title,description,start_date,end_date,status").order("created_at", { ascending: false })) as Challenge[],
  });
}
export type Profile = { id: string; full_name: string; avatar_path: string | null; monthly_income: number | null; occupation: "student" | "working" | "other" | null };
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: [...qk.profile, userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data: row, error } = await supabase.from("profiles").select("id,full_name,avatar_path,monthly_income,occupation").eq("id", userId!).maybeSingle();
      if (error) throw new Error(error.message);
      return row ? { ...row, monthly_income: row.monthly_income === null ? null : num(row.monthly_income), occupation: row.occupation as Profile["occupation"] } : null;
    },
  });
}
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

// ---------- writes ----------
function useWrite<TVars>(fn: (v: TVars) => Promise<unknown>, keys: readonly (readonly string[])[], success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      if (success) toast.success(success);
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });
}
export function friendlyError(msg: string) {
  if (/duplicate key|budgets_unique/.test(msg)) return "A budget for that category and month already exists — edit it instead.";
  if (/violates check constraint/.test(msg)) return "Some values aren't allowed. Please check the form.";
  if (/JWT|not authenticated|permission denied/i.test(msg)) return "Your session has expired. Please sign in again.";
  return msg || "Something went wrong. Please try again.";
}

export type TxnInput = Omit<Txn, "id">;
export function useSaveTransaction() {
  return useWrite(
    async (v: TxnInput & { id?: string | undefined }) => {
      const { id, ...row } = v;
      if (id) must(await supabase.from("transactions").update(row).eq("id", id).select("id"));
      else must(await supabase.from("transactions").insert(row).select("id"));
    },
    [qk.txns],
  );
}
export function useDeleteTransaction() {
  return useWrite(async (id: string) => must(await supabase.from("transactions").delete().eq("id", id).select("id")), [qk.txns], "Transaction deleted");
}
export function useSaveBudget() {
  return useWrite(
    async (v: { id?: string | undefined; month: string; category: string | null; amount: number }) => {
      const { id, ...row } = v;
      if (id) must(await supabase.from("budgets").update(row).eq("id", id).select("id"));
      else must(await supabase.from("budgets").insert(row).select("id"));
    },
    [qk.budgets],
    "Budget saved",
  );
}
export function useDeleteBudget() {
  return useWrite(async (id: string) => must(await supabase.from("budgets").delete().eq("id", id).select("id")), [qk.budgets], "Budget deleted");
}
export function useSaveGoal() {
  return useWrite(
    async (v: { id?: string | undefined; name: string; target_amount: number; saved_amount?: number; target_date: string | null }) => {
      const { id, ...row } = v;
      if (id) must(await supabase.from("savings_goals").update(row).eq("id", id).select("id"));
      else must(await supabase.from("savings_goals").insert(row).select("id"));
    },
    [qk.goals],
    "Goal saved",
  );
}
export function useDeleteGoal() {
  return useWrite(async (id: string) => must(await supabase.from("savings_goals").delete().eq("id", id).select("id")), [qk.goals, qk.contributions], "Goal deleted");
}
export function useAddContribution() {
  return useWrite(
    async (v: { goal_id: string; amount: number; contributed_on: string; note: string | null }) => must(await supabase.from("savings_contributions").insert(v).select("id")),
    [qk.goals, qk.contributions],
    "Contribution added",
  );
}
export function useDeleteContribution() {
  return useWrite(async (id: string) => must(await supabase.from("savings_contributions").delete().eq("id", id).select("id")), [qk.goals, qk.contributions], "Contribution removed");
}
export function useSaveSubscription() {
  return useWrite(
    async (v: Omit<Subscription, "id" | "updated_at"> & { id?: string | undefined }) => {
      const { id, ...row } = v;
      if (id) must(await supabase.from("subscriptions").update(row).eq("id", id).select("id"));
      else must(await supabase.from("subscriptions").insert(row).select("id"));
    },
    [qk.subs],
  );
}
export function useDeleteSubscription() {
  return useWrite(async (id: string) => must(await supabase.from("subscriptions").delete().eq("id", id).select("id")), [qk.subs], "Subscription deleted");
}
export function useMarkNotifications() {
  return useWrite(
    async (ids: string[] | "all") => {
      const q = supabase.from("notifications").update({ is_read: true });
      must(await (ids === "all" ? q.eq("is_read", false) : q.in("id", ids)).select("id"));
    },
    [qk.notifications],
  );
}
export function useStartChallenge() {
  return useWrite(
    async (v: { template_key: string; title: string; description: string; start_date: string; end_date: string }) => must(await supabase.from("challenges").insert(v).select("id")),
    [qk.challenges],
    "Challenge started — you've got this!",
  );
}
export function useUpdateChallenge() {
  return useWrite(
    async (v: { id: string; status: Challenge["status"] }) =>
      must(await supabase.from("challenges").update({ status: v.status, completed_at: v.status === "completed" ? new Date().toISOString() : null }).eq("id", v.id).select("id")),
    [qk.challenges],
  );
}
export function useDeleteChallenge() {
  return useWrite(async (id: string) => must(await supabase.from("challenges").delete().eq("id", id).select("id")), [qk.challenges], "Challenge removed");
}
