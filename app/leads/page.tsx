"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Lead } from "@/lib/leads";
import type { DraftEmail } from "@/lib/openai";

export default function LeadsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftEmail>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});

  async function getToken() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function loadLeads() {
    const token = await getToken();
    if (!token) return;

    const res = await fetch("/api/leads", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setLeads(await res.json());
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
      await loadLeads();
    }
    checkAuthAndLoad();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const token = await getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, company, email }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error === "duplicate" ? "That email is already a lead." : "Could not add lead.");
      return;
    }

    setName("");
    setCompany("");
    setEmail("");
    await loadLeads();
  }

  async function handleDraftEmail(leadId: string) {
    setDraftingId(leadId);
    setDraftErrors((prev) => ({ ...prev, [leadId]: "" }));

    const token = await getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/leads/${leadId}/draft-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    setDraftingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        body.error === "timeout"
          ? "The draft took too long and timed out. Try again."
          : "Could not generate a draft. Try again.";
      setDraftErrors((prev) => ({ ...prev, [leadId]: message }));
      return;
    }

    const draft: DraftEmail = await res.json();
    setDrafts((prev) => ({ ...prev, [leadId]: draft }));
  }

  async function handleSendEmail(leadId: string) {
    const draft = drafts[leadId];
    if (!draft) return;

    setSendingId(leadId);
    setSendErrors((prev) => ({ ...prev, [leadId]: "" }));

    const token = await getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/leads/${leadId}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(draft),
    });

    setSendingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message =
        body.error === "timeout"
          ? "Sending timed out. Try again."
          : "Could not send the email. Try again.";
      setSendErrors((prev) => ({ ...prev, [leadId]: message }));
      return;
    }

    const updatedLead: Lead = await res.json();
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? updatedLead : l))
    );
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Leads</h1>

        <form
          onSubmit={handleSubmit}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Company</label>
            <input
              type="text"
              placeholder="Acme Inc"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Email</label>
            <input
              type="email"
              placeholder="jane@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add lead"}
          </button>
        </form>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500">Company</th>
                <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <Fragment key={lead.id}>
                  <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.company}</td>
                    <td className="px-4 py-3 text-gray-700">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {lead.sent_at ? (
                        <span className="text-xs font-medium text-green-700">
                          Sent {new Date(lead.sent_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDraftEmail(lead.id)}
                            disabled={draftingId === lead.id}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                          >
                            {draftingId === lead.id ? "Drafting..." : "Draft email"}
                          </button>
                          {drafts[lead.id] && (
                            <button
                              onClick={() => handleSendEmail(lead.id)}
                              disabled={sendingId === lead.id}
                              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                            >
                              {sendingId === lead.id ? "Sending..." : "Send"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {draftErrors[lead.id] && (
                    <tr className="border-b border-gray-100 bg-red-50">
                      <td colSpan={5} className="px-4 py-2 text-sm text-red-600">
                        {draftErrors[lead.id]}
                      </td>
                    </tr>
                  )}
                  {sendErrors[lead.id] && (
                    <tr className="border-b border-gray-100 bg-red-50">
                      <td colSpan={5} className="px-4 py-2 text-sm text-red-600">
                        {sendErrors[lead.id]}
                      </td>
                    </tr>
                  )}
                  {drafts[lead.id] && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          Subject: {drafts[lead.id].subject}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                          {drafts[lead.id].body}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
