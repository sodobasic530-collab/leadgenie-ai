import { supabase } from "./supabase";

export const MAX_OFFER = 500;

export async function getOffer(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("offer")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  const offer = data?.offer?.trim();
  return offer ? offer : null;
}

export async function saveOffer(userId: string, value: unknown): Promise<string | null> {
  const offer = typeof value === "string" ? value.trim().slice(0, MAX_OFFER) : "";
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, offer: offer || null, updated_at: new Date().toISOString() });

  if (error) throw error;
  return offer || null;
}
