"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Lead } from "@/lib/leads";

export default function LeadsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  if (checkingAuth) {
    return <main className="p-8 text-gray-500">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Leads</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add lead"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Company</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b">
              <td className="py-2 pr-4">{lead.name}</td>
              <td className="py-2 pr-4">{lead.company}</td>
              <td className="py-2 pr-4">{lead.email}</td>
              <td className="py-2 pr-4">
                {new Date(lead.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
