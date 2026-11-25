import Link from "next/link";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

const STEPS = [
  {
    title: "Add a lead",
    text: "Name, company, email, plus an optional note about them. Duplicates are caught before they reach the list.",
  },
  {
    title: "Get an AI draft",
    text: "Tell it once what you sell. Then one click writes a short first email built around what you know about that person. Edit it if you want.",
  },
  {
    title: "Send and track",
    text: "Send it from the app. The lead is marked sent in the database, so nothing goes out twice.",
  },
];

const PREVIEW_ROWS = [
  { name: "Ava Thornton", company: "Nimbus Robotics", status: "drafted" },
  { name: "Priya Anand", company: "Fernbank Logistics", status: "drafted" },
  { name: "Marcus Feld", company: "BrightWave Media", status: "new" },
];

const BADGE: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  drafted: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  sent: "bg-green-50 text-green-800 ring-1 ring-green-200",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            LG
          </span>
          LeadGenie AI
        </div>
        <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
          Log in
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
            Leads, AI drafts and sending in one place
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            First emails that sound like you wrote them.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600">
            Keep your leads in one list, let AI write a short personal first email for each one,
            check it, and send. Every lead shows if it is new, drafted or sent.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login?demo=1"
              className="rounded-md bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Try the live demo
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Log in
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Demo login: <span className="font-mono">{DEMO_EMAIL}</span> /{" "}
            <span className="font-mono">{DEMO_PASSWORD}</span>. Sending is off in the demo.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-indigo-100 via-white to-amber-50" />
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="ml-3 text-xs text-gray-400">Leads</span>
            </div>
            <table className="w-full text-left text-sm">
              <tbody>
                {PREVIEW_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.company}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BADGE[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-gray-50 p-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                <p className="font-medium text-gray-900">Subject: routes into germany</p>
                <p className="mt-2 leading-relaxed text-gray-600">
                  Hi Priya, saw that Fernbank is adding freight routes into Germany this year. New
                  regions usually mean a pile of new contacts to reach out to...
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
                    Send email
                  </span>
                  <span className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700">
                    Edit draft
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-gray-900">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-gray-500">
        Built with Next.js, Supabase, OpenAI and Resend.
      </footer>
    </div>
  );
}
