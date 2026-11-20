"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

const inputClass =
  "rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/leads");
    });
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      fillDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/leads");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold text-gray-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
          LG
        </span>
        LeadGenie AI
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Log in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <button type="button" onClick={fillDemo}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Fill in the demo account
          </button>
        </div>
      </div>
    </main>
  );
}
