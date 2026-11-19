import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNED_TABLES = ["savings_contributions", "savings_goals", "transactions", "budgets", "subscriptions", "notifications", "challenges", "advisor_messages", "ai_requests"] as const;

/** Permanently deletes the signed-in user's records, photo and account. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const table of OWNED_TABLES) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) throw new Error("Could not delete your data. Please try again.");
    }
    const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
    if (files?.length) await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete your account. Please try again.");
    return { ok: true };
  });
