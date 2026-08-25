# LeadGenie AI

AI-powered B2B lead generation and cold email automation. Add a lead, the app drafts a personalized cold email with AI, and sends it — with duplicate protection and auth built in.

**Live demo:** [leadgenie-ai-eosin.vercel.app](https://leadgenie-ai-eosin.vercel.app)
Demo login is shown directly on the homepage.

## What it does

- **Lead capture with duplicate protection** — add a lead by name, company, and email; duplicate emails are caught and rejected before they hit the database.
- **Authenticated dashboard** — email/password login gates every API route and page; no valid session, no access.
- **AI-drafted cold emails** — one click generates a subject and body per lead using OpenAI, tailored to that lead's info.
- **Real email sending** — drafts go out for real via Resend, with delivery status tracked per lead so it survives a page reload.
- **Clean, responsive UI** — built with Tailwind, styled login/dashboard/table views, per-lead action states (draft → send → sent).

## Stack

Next.js · TypeScript · Supabase (Postgres + Auth) · OpenAI · Resend · Tailwind CSS · deployed on Vercel

## Why it's built this way

Every route fails safely: unauthenticated requests get a clean `401`, duplicate leads get a `409` instead of a crash, and upstream failures (OpenAI, Resend) are caught server-side and returned as generic errors — no leaked keys or raw provider errors ever reach the client.

## Local development

```bash
npm install
cp .env.local.example .env.local   # add your Supabase, OpenAI, and Resend keys
npm run dev
```

## Author

Built by [Senad Odobasic](https://github.com/sodobasic530-collab) — full-stack developer specializing in AI-assisted SaaS builds (Next.js, Supabase, TypeScript).

- [Upwork](https://www.upwork.com/freelancers/~01165d99ead9281001?viewMode=1)
- [LinkedIn](https://www.linkedin.com/in/senad-odobasic/)
