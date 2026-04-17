# Dhanam Workspace

Team diary and live task board for Dhanam Investment and Finance.

**Features**
- Digital diary with free-form entries, tags, and monthly stats
- Live task board with categories → subcategories → sub-subcategories
- Real-time updates across all team members (Supabase Realtime)
- Task assignment and reassignment with Email + in-app notifications
- Microsoft 365 login — sign in with your existing Dhanam account

**Everything runs on free tiers** — no credit card required to go live.

---

## Free tier summary

| Service | What it's used for | Free limit |
|---|---|---|
| Supabase | Database + real-time | 500 MB storage, unlimited API calls |
| Vercel | Hosting | Unlimited deploys, 100 GB bandwidth/month |
| Resend | Email notifications | 3,000 emails/month |
| Azure AD | Microsoft 365 login | Free for single-tenant apps |
| NextAuth | Auth library | Free, open source |

---

## One-time Setup (~30 minutes)

### Step 1 — Supabase (database)

1. Go to [supabase.com](https://supabase.com) → create a free account.
2. Click **New Project**, name it `dhanam-workspace`, pick the Singapore region.
3. Once created, go to **SQL Editor**, paste the full contents of `supabase/migrations/001_initial.sql`, and click **Run**. This creates all tables, policies, and seeds the default categories.
4. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 2 — Microsoft 365 / Azure AD (team login)

1. Go to [portal.azure.com](https://portal.azure.com) and sign in with your Microsoft 365 admin account.
2. Search **Azure Active Directory** → **App registrations** → **New registration**.
3. Name: `Dhanam Workspace`. Account type: **Single tenant** (accounts in this directory only).
4. Redirect URI: `Web` → add both:
   - `http://localhost:3000/api/auth/callback/azure-ad` (for local testing)
   - `https://your-vercel-app.vercel.app/api/auth/callback/azure-ad` (your live URL — update after Step 5)
5. After creation, copy:
   - **Application (client) ID** → `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
6. Go to **Certificates & Secrets → New client secret** → copy the value → `AZURE_AD_CLIENT_SECRET`
7. Go to **API permissions → Add → Microsoft Graph → Delegated → User.Read** → Grant admin consent.

---

### Step 3 — Resend (email notifications)

1. Go to [resend.com](https://resend.com) → create a free account.
2. Go to **API Keys → Create API Key** → copy it → `RESEND_API_KEY`.
3. *(Optional but recommended)* Add and verify your domain `dhanam.finance` under **Domains** so emails arrive from `notifications@dhanam.finance`. Until then you can use Resend's shared `@resend.dev` domain for testing.

---

### Step 4 — Set up environment variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in all the values from Steps 1–3. Generate `NEXTAUTH_SECRET` with:
```bash
openssl rand -base64 32
```

---

### Step 5 — Run locally and test

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with your Microsoft 365 account and confirm the diary and task board work end to end.

---

### Step 6 — Deploy to Vercel (go live for the whole team)

1. Push this folder to a GitHub repository (private is fine).
2. Go to [vercel.com](https://vercel.com) → connect GitHub → import the repo.
3. In **Project Settings → Environment Variables**, add all variables from `.env.local`. Change `NEXTAUTH_URL` to your Vercel URL.
4. Go back to Azure AD (Step 2) and add your Vercel URL as a second redirect URI.
5. Click **Deploy**. Share the URL — no installation needed for the team, just a browser.

---

## Adding team members

Each person signs in themselves using **Sign in with Microsoft** — their profile is created automatically. To verify your team is registered, check **Supabase → Table Editor → profiles**.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| Auth | NextAuth.js + Azure AD (Microsoft 365) |
| Email | Resend |
| Hosting | Vercel |
| Styling | Tailwind CSS |
