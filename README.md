# Perfectgration CRM (v11.2)

Visa and immigration CRM with three teams (Social Media, Sales, Case Manager), handoffs with "first to accept", problems and holds on every case, client upload links, and a full backend: MongoDB Atlas, private Amazon S3 file storage, real sign-in.

The app runs in two modes, chosen by one environment variable:

| `NEXT_PUBLIC_DATA_MODE` | What you get |
|---|---|
| empty (default) | **Demo**: sample data in memory, demo accounts on the sign-in page, nothing saved. Good for showing the client. |
| `api` | **Live**: real database, real passwords, real file uploads. Set it up with **[docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md)**. |

## Run it

Requires Node.js 22.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # business rules, lead sharing, permissions, database shapes and API input checks (no database needed)
npm run build        # production build
```

Live mode only (after filling `.env.local`, see the setup guide):

```bash
npm run db:seed      # once: creates the 13 collections, settings and the first administrator
npm run check:setup  # checks env variables, MongoDB, S3 and CORS
```

## What is new in v11.2

- **Sign-in record (administrator only).** The Dashboard has a **Sign-ins** panel: who signed in today and at what time, who is online now, who has not signed in, wrong-password attempts today, and (for the date filter) on how many working days each person signed in. **Administration → Sign-in record** has the full day-by-day history: a calendar (first sign-in time per person per day), a list by day (first sign-in, last seen, sign-out, time the CRM was open, device) and totals by person (days in, usual start time), with a team filter and **Download CSV**.
- Recorded automatically on every sign-in, sign-out, wrong password and once-a-minute report from an open CRM, in a 13th collection `logins` (one row per person per day). It never stops anyone signing in if the record cannot be written.
- **Agents page** rebuilt: link a case by its reference, record commission per case, mark each case paid.

## What was new in v11

- **Dashboard is back**, at the top of the sidebar and the first page after signing in. Administrators and managers see all three teams in one place; a team member sees **only their own work** (their leads and cases, and what is waiting for them).
- **The date filter now applies to everything** on the Dashboard and the Social Media, Sales and Case Manager pages: numbers, boards, lists and tables, not only the charts. A case counts in a period when anything happened on it then (created, moved, accepted, a note, a problem, a submission update, an appointment or a deadline).
- **Team members see only their own data** on the team pages (not the whole team's pipeline or tables). Leads they can accept are shown separately as "waiting for you".
- **"Waiting to be accepted" says which team**: "in Sales", "in Case Manager", and the visa team when there is one.
- **On hold by client**: a separate choice when pausing a case, shown as "On hold by client" everywhere, and counted separately on the Dashboard.

## What was new in v10

- **Automatic lead sharing (Sales).** Leads passed to Sales go straight to the Sales members who are online, split evenly. When another member signs in, untouched leads move to them (40 leads, 4 people: 10 each; a 5th: 8 each). A lead never moves once its holder has worked on it or pressed **Keep this lead**. Settings → Lead sharing switches it off (back to "first to accept"). Rules: `lib/lead-share.ts`; guide: docs/BACKEND_SETUP.md section 7.
- **Meta Ads and Google Ads, read directly from Meta and Google** (no Excel). The Social Media page shows spend, clicks, leads reported by the ads, the leads actually created in the CRM per campaign, and the real cost per CRM lead. **Optional**: without the keys the page says "Not connected" and nothing else changes. Setup: **docs/ADS_SETUP.md**.
- Screens refresh themselves within a minute when something changes (a lead shared with you, a new message), and the Team page shows who is online.
- 12th collection: `adinsights`.

## What was new in v9

- **Sidebar pages per team** instead of one dashboard: **Social Media** (leads, sources, campaigns, time to pass, ad platforms panel ready for Meta and Google Ads), **Sales** (pipeline board, appointments this week, conversion, fees, team performance), **Case Manager** (submissions, awaiting result, approvals and denials, problems and holds, third-party waits, workload). Every page has **Today / This week / This month / Custom range** with day-by-day charts.
- **Problems and holds** on every case: record what is stopping it and who it is waiting on (client, third party, authority, internal), then mark it resolved. Open problems show on the case, on the team pages, and in the case lists. Pausing a case records a problem automatically.
- **Team Notepad**: only the administrator can message everyone, a team, a visa department or chosen people. Team members can only message the administrator.
- **Client upload links**: Documents → New upload link. Choose files to request and an expiry (24 h, 3 days, 7 days or a date). Share by copy or WhatsApp. The client uploads from their phone without signing in; files go to S3 and are attached to the case. End a link at any time.
- **Team page**: totals, per-person work (holding, overdue, problems, steps moved and accepted this month, open to-dos), cases they hold, quick deactivate.
- **Backend**: 30 API routes, every one checking permissions on the server with the same rule functions the screens use.

## How the live system is built

```
Browser ── screens (React) ── lib/store.tsx ──► /api/*  (Next.js route handlers on Vercel)
                    │                                   │
            lib/case-logic.ts  ◄──── same rules ────►  lib/case-logic.ts
                                                        │
                                       MongoDB Atlas (records)   Amazon S3 (files, private)
```

- **One set of rules.** `lib/case-logic.ts` holds every case change (create, pass, accept, move, review, submit, result, hold, problems). The browser runs it for an instant update; the server runs the same function on the stored case and saves the result. The rules can never differ.
- **"First to accept" is safe.** A case is saved only if nobody changed it since it was read, so when two people press Accept, one gets it and the other is told "Someone else already accepted this case."
- **Each person receives only what they may see.** Team members get only their cases; commission is removed for everyone except the administrator. After a handoff, the previous team keeps only a reduced copy for their own figures (no details from after the handoff).
- **Files never touch the database.** The browser uploads straight to S3 with a 5-minute signed link; the server checks the file arrived (type and size) and saves only its key. Files open through another 5-minute signed link, after a permission check.
- **Sign-in**: bcrypt password hashes, an httpOnly signed cookie (10 hours), a forced password change on first sign-in, a 15-minute lock after 5 wrong passwords, and instant sign-out everywhere when an account is switched off or its password reset.
- **Every API input is checked** (zod); requests from other websites are refused.

## Structure

```
app/(app)/            signed-in screens: dashboard, social, sales, case-manager, cases, clients, todo, partner-tasks, notepad, reports, team, sign-ins, agents, workflow, settings
app/api/              the API (31 routes) · app/api/public/ = client upload links (no sign-in)
app/u/[token]/        the page clients open to upload files
app/login, app/change-password
components/           UI pieces · hub.tsx (charts, boards, range picker) · case-extras.tsx (problems, upload links)
lib/case-logic.ts     all case rules (shared by browser and server)
lib/permissions.ts    who may see and do what
lib/store.tsx         screen state; in live mode sends every change to the API
lib/server/           database connection, the 13 collections (models.ts), sign-in, S3, API helpers, input checks
scripts/              seed.ts, check-setup.ts, test-logic.ts
docs/BACKEND_SETUP.md step-by-step: Atlas, S3, Vercel, Hostinger domain
```

## Demo accounts (demo mode only)

| Account | Team | Departments |
|---|---|---|
| Aun Rehman | Administrator | All |
| Layla Hassan | Manager (review sign-off and results, no commission) | All |
| Reem Al-Zahrani | Social Media | All |
| Omar Saleh | Sales | Study, Visit |
| Noura Al-Qahtani | Sales | Work, Skilled |
| Faisal Mansour | Sales | EB2-NIW |
| Sultan Haddad | Case Manager | Study, Visit |
| Dina Karim | Case Manager | Work, Skilled, EB2-NIW |
| Hadi Karim | Sales (inactive) | Work |

In demo mode passwords are not checked. To protect a public demo, set `DEMO_ACCESS_CODE` (it becomes the password for every account) or turn on Vercel Deployment Protection. **Never put real client data into demo mode.**

## Updating an existing project

Copying a new zip over an old folder leaves old files behind. Delete everything except `.git` and your `.env*` files, copy this project in, then `npm install` and `npm run build`. `scripts/clean-stale.mjs` also removes known leftovers from older versions on every build.

## Still to decide with the client

- The eligibility scoring and document checklists are placeholders: the client has not supplied the real rules.
- Meta Ads and Google Ads results: the Social Media page has the panel ready; connecting their reporting APIs is a separate step (needs the client's ad accounts).
- Saudi Personal Data Protection Law: check with a lawyer where client data may be stored (Atlas and S3 regions).
- Emails (EmailJS or similar) are not connected yet; WhatsApp sharing uses links.
