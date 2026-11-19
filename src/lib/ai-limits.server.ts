import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Per-user limits on AI calls: 6 per minute, 100 per day. */
export async function checkAiRateLimit(supabase: SupabaseClient<Database>, userId: string, kind: "chat" | "receipt") {
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: perMinute }, { count: perDay }] = await Promise.all([
    supabase.from("ai_requests").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", minuteAgo),
    supabase.from("ai_requests").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayAgo),
  ]);
  if ((perMinute ?? 0) >= 6) return "You're sending requests quickly — please wait a minute and try again.";
  if ((perDay ?? 0) >= 100) return "You've reached today's Compass AI limit. It resets in 24 hours.";
  await supabase.from("ai_requests").insert({ user_id: userId, kind });
  return null;
}
