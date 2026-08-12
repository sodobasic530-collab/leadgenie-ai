import { supabase } from "./supabase";

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
  sent_at: string | null;
};

export type AddLeadInput = {
  name: string;
  company: string;
  email: string;
};

export type AddLeadResult =
  | { ok: true; lead: Lead }
  | { ok: false; error: "duplicate" | "invalid" };

const DUPLICATE_KEY_CODE = "23505";

export async function addLead(input: AddLeadInput): Promise<AddLeadResult> {
  const name = input.name?.trim();
  const company = input.company?.trim();
  const email = input.email?.trim().toLowerCase();

  if (!name || !company || !email) {
    return { ok: false, error: "invalid" };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ name, company, email })
    .select()
    .single();

  if (error) {
    if (error.code === DUPLICATE_KEY_CODE) {
      return { ok: false, error: "duplicate" };
    }
    throw error;
  }

  return { ok: true, lead: data as Lead };
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as Lead | null;
}

export async function markLeadSent(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Lead;
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select()
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as Lead[];
}
