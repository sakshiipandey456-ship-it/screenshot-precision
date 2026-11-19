import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { qk, useBudgets, useGoals, useSubscriptions, useTransactions } from "@/lib/data";
import { buildNotifications } from "@/lib/finance";

/** Turns the user's real data into in-app alerts (each alert is created once, thanks to its dedupe key). */
export function NotificationSync() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const txns = useTransactions();
  const budgets = useBudgets();
  const goals = useGoals();
  const subs = useSubscriptions();
  const last = useRef("");

  useEffect(() => {
    if (!user || !txns.data || !budgets.data || !goals.data || !subs.data) return;
    const drafts = buildNotifications({ txns: txns.data, budgets: budgets.data, goals: goals.data, subs: subs.data, today: new Date() });
    const sig = drafts.map((d) => d.dedupe_key).join("|");
    if (!drafts.length || sig === last.current) return;
    last.current = sig;
    supabase
      .from("notifications")
      .upsert(drafts.map((d) => ({ ...d, user_id: user.id })), { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
      .then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: qk.notifications });
      });
  }, [user, txns.data, budgets.data, goals.data, subs.data, qc]);

  return null;
}
