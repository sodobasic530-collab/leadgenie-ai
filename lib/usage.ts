import { supabase } from "./supabase";

const DEFAULT_LIMIT = 20;

export function dailyDraftLimit(): number {
  const fromEnv = Number(process.env.DAILY_DRAFT_LIMIT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? Math.floor(fromEnv) : DEFAULT_LIMIT;
}

export async function draftsUsedToday(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) throw error;
  return count ?? 0;
}

// Records the attempt before calling OpenAI, so failed or repeated calls still count
export async function recordDraft(userId: string): Promise<void> {
  const { error } = await supabase.from("ai_usage").insert({ user_id: userId });
  if (error) throw error;
}
