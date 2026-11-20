# LeadGenie AI

AI-powered B2B lead generation and cold email automation. Add a lead, the app drafts a personal first email with AI, you check or edit it, and send. Duplicate protection, per-user data and auth built in.

**Live demo:** [leadgenie-ai-eosin.vercel.app](https://leadgenie-ai-eosin.vercel.app)
The demo login is on the homepage. Sending is turned off for the shared demo account.

## What it does

- **Lead capture with duplicate protection.** Add a lead by name, company and email, plus an optional role and notes. Duplicate emails are rejected by a database constraint, per user.
- **Private data per account.** Every lead belongs to the user who added it. All queries are scoped to the logged-in user on the server.
- **AI-drafted first emails.** One click writes a subject and body with OpenAI, using the lead's role and notes. Drafts are stored on the lead, survive a reload, and can be edited.
- **Real sending, from the stored draft only.** Send uses the draft saved in the database, never text sent from the browser. The lead is marked sent, so it can't go out twice.
- **Cost guard.** Each account has a daily AI draft limit (default 20, set with `DAILY_DRAFT_LIMIT`).
- **Dashboard.** Status per lead (new, drafted, sent), edit, delete, counts, log out.

## Stack

Next.js · TypeScript · Supabase (Postgres + Auth) · OpenAI · Resend · Tailwind CSS · deployed on Vercel

## Why it's built this way

Every route fails safely: unauthenticated requests get a `401`, duplicate leads get a `409`, a lead that isn't yours is a `404`, the daily AI limit is a `429`, and upstream failures (OpenAI, Resend) are caught server side and returned as generic errors, with no keys or raw provider errors reaching the client. Row level security is on for every table and only the server (service role) reads or writes them.

## Local development

```bash
npm install
cp .env.local.example .env.local   # add your Supabase, OpenAI, and Resend keys
npm run dev
```

Database changes live in `supabase/migrations`.

## Author

Built by [Senad Odobasic](https://github.com/sodobasic530-collab), full-stack developer specializing in AI-assisted SaaS builds (Next.js, Supabase, TypeScript).

- [Upwork](https://www.upwork.com/freelancers/~01165d99ead9281001?viewMode=1)
- [LinkedIn](https://www.linkedin.com/in/senad-odobasic/)
