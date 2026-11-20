import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) return null;

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

// The public demo login is shared by every visitor, so it can draft but never send
export function isDemoUser(user: User): boolean {
  const demoEmail = (process.env.DEMO_USER_EMAIL ?? "demo@leadgenie.dev").toLowerCase();
  return user.email?.toLowerCase() === demoEmail;
}
