import { supabase } from "./supabase";

export type Lead = {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string;
  role: string | null;
  notes: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  drafted_at: string | null;
  created_at: string;
  sent_at: string | null;
};

export type LeadInput = {
  name?: string;
  company?: string;
  email?: string;
  role?: string | null;
  notes?: string | null;
};

export type LeadResult =
  | { ok: true; lead: Lead }
  | { ok: false; error: "duplicate" | "invalid" | "not_found" };

const DUPLICATE_KEY_CODE = "23505";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTES = 500;
const MAX_FIELD = 120;

function clean(value: unknown, max = MAX_FIELD): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalize(input: LeadInput) {
  const name = clean(input.name);
  const company = clean(input.company);
  const email = clean(input.email, 254)?.toLowerCase() ?? null;
  const role = clean(input.role);
  const notes = clean(input.notes, MAX_NOTES);

  if (!name || !company || !email || !EMAIL_RE.test(email)) return null;
  return { name, company, email, role, notes };
}

export async function addLead(userId: string, input: LeadInput): Promise<LeadResult> {
  const fields = normalize(input);
  if (!fields) return { ok: false, error: "invalid" };

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...fields, user_id: userId })
    .select()
    .single();

  if (error) {
    if (error.code === DUPLICATE_KEY_CODE) return { ok: false, error: "duplicate" };
    throw error;
  }

  return { ok: true, lead: data as Lead };
}

export async function updateLead(
  userId: string,
  id: string,
  input: LeadInput
): Promise<LeadResult> {
  const fields = normalize(input);
  if (!fields) return { ok: false, error: "invalid" };

  const existing = await getLeadById(userId, id);
  if (!existing) return { ok: false, error: "not_found" };

  // A new email or new details make the old draft stale
  const changed =
    existing.email !== fields.email ||
    existing.name !== fields.name ||
    existing.company !== fields.company ||
    existing.role !== fields.role ||
    existing.notes !== fields.notes;

  const update = changed && !existing.sent_at
    ? { ...fields, draft_subject: null, draft_body: null, drafted_at: null }
    : fields;

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === DUPLICATE_KEY_CODE) return { ok: false, error: "duplicate" };
    throw error;
  }

  return { ok: true, lead: data as Lead };
}

export async function deleteLead(userId: string, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function getLeadById(userId: string, id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select()
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Malformed uuid in the URL
    if (error.code === "22P02") return null;
    throw error;
  }

  return data as Lead | null;
}

export async function saveDraft(
  userId: string,
  id: string,
  draft: { subject: string; body: string }
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({
      draft_subject: draft.subject,
      draft_body: draft.body,
      drafted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function markLeadSent(userId: string, id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function listLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Lead[];
}
