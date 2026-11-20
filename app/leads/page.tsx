"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Lead } from "@/lib/leads";

type Me = {
  email: string | null;
  isDemo: boolean;
  draftsUsed: number;
  draftLimit: number;
};

type LeadForm = {
  name: string;
  company: string;
  email: string;
  role: string;
  notes: string;
};

const EMPTY_FORM: LeadForm = { name: "", company: "", email: "", role: "", notes: "" };

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function statusOf(lead: Lead): "sent" | "drafted" | "new" {
  if (lead.sent_at) return "sent";
  if (lead.draft_subject) return "drafted";
  return "new";
}

const STATUS_STYLE = {
  new: "bg-gray-100 text-gray-700",
  drafted: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  sent: "bg-green-50 text-green-800 ring-1 ring-green-200",
};

const ERROR_TEXT: Record<string, string> = {
  duplicate: "You already have a lead with that email.",
  invalid: "Please fill in name, company and a valid email.",
  limit_reached: "Daily AI draft limit reached. Try again tomorrow.",
  timeout: "That took too long and timed out. Try again.",
  demo_cannot_send: "Sending is turned off for the shared demo account.",
  no_draft: "Generate a draft first.",
  already_sent: "This email was already sent.",
  not_found: "This lead no longer exists. Refresh the page.",
};

function errorText(code: string | undefined, fallback: string) {
  return (code && ERROR_TEXT[code]) || fallback;
}

export default function LeadsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [showMore, setShowMore] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [busy, setBusy] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [openDraft, setOpenDraft] = useState<string | null>(null);
  const [draftEdit, setDraftEdit] = useState<{ id: string; subject: string; body: string } | null>(null);
  const [leadEdit, setLeadEdit] = useState<{ id: string; form: LeadForm } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function getToken() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function api(path: string, init: RequestInit = {}) {
    const token = await getToken();
    if (!token) {
      router.push("/login");
      throw new Error("no session");
    }
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      await supabaseBrowser.auth.signOut();
      router.push("/login");
      throw new Error("unauthorized");
    }
    return res;
  }

  async function loadLeads() {
    const res = await api("/api/leads");
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setMe(data.me);
    }
  }

  useEffect(() => {
    async function checkAuthAndLoad() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      setCheckingAuth(false);
      await loadLeads().catch(() => {});
    }
    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replaceLead(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  function setRowError(id: string, message: string) {
    setRowErrors((prev) => ({ ...prev, [id]: message }));
  }

  function setRowBusy(id: string, action: string | null) {
    setBusy((prev) => {
      const next = { ...prev };
      if (action) next[id] = action;
      else delete next[id];
      return next;
    });
  }

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api("/api/leads", { method: "POST", body: JSON.stringify(form) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFormError(errorText(body.error, "Could not add lead."));
        return;
      }
      const lead: Lead = await res.json();
      setLeads((prev) => [lead, ...prev]);
      setForm(EMPTY_FORM);
      setShowMore(false);
    } catch {
      /* redirected */
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDraft(lead: Lead) {
    setRowBusy(lead.id, "draft");
    setRowError(lead.id, "");
    try {
      const res = await api(`/api/leads/${lead.id}/draft-email`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(lead.id, errorText(body.error, "Could not generate a draft. Try again."));
        if (body.error === "limit_reached" && me) setMe({ ...me, draftsUsed: me.draftLimit });
        return;
      }
      replaceLead(body as Lead);
      setOpenDraft(lead.id);
      setDraftEdit(null);
      if (me) setMe({ ...me, draftsUsed: me.draftsUsed + 1 });
    } catch {
      /* redirected */
    } finally {
      setRowBusy(lead.id, null);
    }
  }

  async function handleSaveDraft() {
    if (!draftEdit) return;
    const { id, subject, body } = draftEdit;
    setRowBusy(id, "save-draft");
    setRowError(id, "");
    try {
      const res = await api(`/api/leads/${id}/draft`, {
        method: "PATCH",
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(id, errorText(data.error, "Could not save the draft."));
        return;
      }
      replaceLead(data as Lead);
      setDraftEdit(null);
    } catch {
      /* redirected */
    } finally {
      setRowBusy(id, null);
    }
  }

  async function handleSend(lead: Lead) {
    setRowBusy(lead.id, "send");
    setRowError(lead.id, "");
    try {
      const res = await api(`/api/leads/${lead.id}/send-email`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(lead.id, errorText(body.error, "Could not send the email. Try again."));
        return;
      }
      replaceLead(body as Lead);
    } catch {
      /* redirected */
    } finally {
      setRowBusy(lead.id, null);
    }
  }

  async function handleSaveLead() {
    if (!leadEdit) return;
    const { id, form: f } = leadEdit;
    setRowBusy(id, "save-lead");
    setRowError(id, "");
    try {
      const res = await api(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(f) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(id, errorText(data.error, "Could not save changes."));
        return;
      }
      replaceLead(data as Lead);
      setLeadEdit(null);
    } catch {
      /* redirected */
    } finally {
      setRowBusy(id, null);
    }
  }

  async function handleDelete(id: string) {
    setRowBusy(id, "delete");
    try {
      const res = await api(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        setRowError(id, "Could not delete this lead.");
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setConfirmDelete(null);
    } catch {
      /* redirected */
    } finally {
      setRowBusy(id, null);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading...
      </main>
    );
  }

  const counts = {
    total: leads.length,
    drafted: leads.filter((l) => statusOf(l) === "drafted").length,
    sent: leads.filter((l) => statusOf(l) === "sent").length,
  };
  const limitReached = me ? me.draftsUsed >= me.draftLimit : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
              LG
            </span>
            LeadGenie AI
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {me?.isDemo && (
              <span className="hidden rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 sm:inline">
                Demo account
              </span>
            )}
            <span className="hidden text-gray-500 md:inline">{me?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add a lead, let AI write the first email, check it, then send.
            </p>
          </div>
          {me && (
            <p className={`text-xs ${limitReached ? "text-red-600" : "text-gray-500"}`}>
              AI drafts today: {me.draftsUsed} of {me.draftLimit}
            </p>
          )}
        </div>

        {me?.isDemo && (
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            You are in the shared demo account. You can add leads and generate AI drafts. Sending real
            emails is turned off here so nobody can email strangers from a public login.
          </div>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            ["Leads", counts.total],
            ["Drafted", counts.drafted],
            ["Sent", counts.sent],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <Field label="Name">
              <input className={inputClass} placeholder="Jane Doe" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Company">
              <input className={inputClass} placeholder="Acme Inc" value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className={inputClass} placeholder="jane@acme.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add lead"}
            </button>
          </div>

          {showMore ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Field label="Role (optional)">
                <input className={inputClass} placeholder="Head of Sales" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </Field>
              <Field label="Notes for the AI (optional)">
                <input className={inputClass} maxLength={500}
                  placeholder="Just opened a second office in Berlin"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
          ) : (
            <button type="button" onClick={() => setShowMore(true)}
              className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-500">
              + Add role and notes for a more personal email
            </button>
          )}

          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        </form>

        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <p className="text-base font-medium text-gray-900">No leads yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Add your first lead above. A short note about them (a recent launch, a new hire, a
              post they wrote) makes the AI draft a lot more personal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-500">Lead</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const status = statusOf(lead);
                  const action = busy[lead.id];
                  const editing = leadEdit?.id === lead.id ? leadEdit : null;
                  const draftOpen = openDraft === lead.id && !!lead.draft_subject;
                  const editingDraft = draftEdit?.id === lead.id ? draftEdit : null;

                  return (
                    <Fragment key={lead.id}>
                      <tr className="border-b border-gray-100 align-top last:border-0 hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{lead.name}</p>
                          <p className="text-xs text-gray-500">
                            {[lead.role, lead.company].filter(Boolean).join(" at ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{lead.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[status]}`}>
                            {status === "sent" && lead.sent_at
                              ? `Sent ${new Date(lead.sent_at).toLocaleDateString()}`
                              : status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {status === "new" && (
                              <SmallButton primary onClick={() => handleDraft(lead)}
                                disabled={!!action || limitReached}>
                                {action === "draft" ? "Drafting..." : "Draft email"}
                              </SmallButton>
                            )}
                            {status === "drafted" && (
                              <SmallButton primary
                                onClick={() => setOpenDraft(draftOpen ? null : lead.id)}>
                                {draftOpen ? "Hide draft" : "View draft"}
                              </SmallButton>
                            )}
                            {status === "sent" && lead.draft_subject && (
                              <SmallButton onClick={() => setOpenDraft(draftOpen ? null : lead.id)}>
                                {draftOpen ? "Hide email" : "View email"}
                              </SmallButton>
                            )}
                            {!editing && (
                              <SmallButton disabled={!!action}
                                onClick={() => {
                                  setConfirmDelete(null);
                                  setLeadEdit({
                                    id: lead.id,
                                    form: {
                                      name: lead.name,
                                      company: lead.company,
                                      email: lead.email,
                                      role: lead.role ?? "",
                                      notes: lead.notes ?? "",
                                    },
                                  });
                                }}>
                                Edit
                              </SmallButton>
                            )}
                            {confirmDelete === lead.id ? (
                              <>
                                <SmallButton danger disabled={!!action} onClick={() => handleDelete(lead.id)}>
                                  {action === "delete" ? "Deleting..." : "Yes, delete"}
                                </SmallButton>
                                <SmallButton onClick={() => setConfirmDelete(null)}>Cancel</SmallButton>
                              </>
                            ) : (
                              <SmallButton disabled={!!action} onClick={() => setConfirmDelete(lead.id)}>
                                Delete
                              </SmallButton>
                            )}
                          </div>
                        </td>
                      </tr>

                      {rowErrors[lead.id] && (
                        <tr className="border-b border-gray-100 bg-red-50">
                          <td colSpan={5} className="px-4 py-2 text-sm text-red-700">
                            {rowErrors[lead.id]}
                          </td>
                        </tr>
                      )}

                      {editing && (
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                              {(["name", "company", "email", "role"] as const).map((key) => (
                                <Field key={key} label={key === "role" ? "Role" : key[0].toUpperCase() + key.slice(1)}>
                                  <input className={inputClass} value={editing.form[key]}
                                    onChange={(e) => setLeadEdit({ id: lead.id, form: { ...editing.form, [key]: e.target.value } })} />
                                </Field>
                              ))}
                              <div className="sm:col-span-2">
                                <Field label="Notes for the AI">
                                  <input className={inputClass} maxLength={500} value={editing.form.notes}
                                    onChange={(e) => setLeadEdit({ id: lead.id, form: { ...editing.form, notes: e.target.value } })} />
                                </Field>
                              </div>
                            </div>
                            {status === "drafted" && (
                              <p className="mt-2 text-xs text-gray-500">
                                Changing the details clears the current draft so you can generate a fresh one.
                              </p>
                            )}
                            <div className="mt-3 flex gap-2">
                              <SmallButton primary disabled={!!action} onClick={handleSaveLead}>
                                {action === "save-lead" ? "Saving..." : "Save"}
                              </SmallButton>
                              <SmallButton onClick={() => setLeadEdit(null)}>Cancel</SmallButton>
                            </div>
                          </td>
                        </tr>
                      )}

                      {draftOpen && (
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <td colSpan={5} className="px-4 py-4">
                            {editingDraft ? (
                              <div className="space-y-3">
                                <Field label="Subject">
                                  <input className={inputClass} maxLength={150} value={editingDraft.subject}
                                    onChange={(e) => setDraftEdit({ ...editingDraft, subject: e.target.value })} />
                                </Field>
                                <Field label="Body">
                                  <textarea className={`${inputClass} min-h-[160px]`} maxLength={3000}
                                    value={editingDraft.body}
                                    onChange={(e) => setDraftEdit({ ...editingDraft, body: e.target.value })} />
                                </Field>
                                <div className="flex gap-2">
                                  <SmallButton primary disabled={!!action} onClick={handleSaveDraft}>
                                    {action === "save-draft" ? "Saving..." : "Save draft"}
                                  </SmallButton>
                                  <SmallButton onClick={() => setDraftEdit(null)}>Cancel</SmallButton>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-gray-200 bg-white p-4">
                                <p className="text-sm font-medium text-gray-900">
                                  Subject: {lead.draft_subject}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                  {lead.draft_body}
                                </p>
                                {status === "drafted" && (
                                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                                    <SmallButton primary
                                      disabled={!!action || me?.isDemo}
                                      onClick={() => handleSend(lead)}>
                                      {action === "send" ? "Sending..." : "Send email"}
                                    </SmallButton>
                                    <SmallButton disabled={!!action}
                                      onClick={() => setDraftEdit({ id: lead.id, subject: lead.draft_subject ?? "", body: lead.draft_body ?? "" })}>
                                      Edit draft
                                    </SmallButton>
                                    <SmallButton disabled={!!action || limitReached} onClick={() => handleDraft(lead)}>
                                      {action === "draft" ? "Drafting..." : "Write a new one"}
                                    </SmallButton>
                                    {me?.isDemo && (
                                      <span className="text-xs text-gray-500">Sending is off in the demo account.</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const style = danger
    ? "bg-red-600 text-white hover:bg-red-500"
    : primary
      ? "bg-indigo-600 text-white hover:bg-indigo-500"
      : "border border-gray-300 text-gray-700 hover:bg-gray-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${style}`}
    >
      {children}
    </button>
  );
}
