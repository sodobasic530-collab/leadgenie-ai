import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">LeadGenie AI</h1>
      <p className="mt-3 max-w-md text-gray-600">
        AI-powered lead management: track leads, draft personalized cold
        emails, and send them, all in one place.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        Log in
      </Link>

      <div className="mt-10 rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm">
        <p className="font-medium text-gray-900">Demo access</p>
        <p className="mt-1">
          Email: <span className="font-mono">demo@leadgenie.dev</span>
        </p>
        <p>
          Password: <span className="font-mono">DemoAccess2026!</span>
        </p>
      </div>
    </main>
  );
}
