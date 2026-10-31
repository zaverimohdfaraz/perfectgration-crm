# Perfectgration CRM: interactive UI preview

A complete, working-looking interface for the Perfectgration visa and immigration CRM. Every screen and every flow is built and clickable. **Nothing is saved**: data lives in the browser's memory and resets when you reload the page. The backend (MongoDB, real login, file storage, emails) connects in the next phase.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # open http://localhost:3000/login
npm run build      # production check
npm start
```

## Demo accounts (login page)

| Account | Team | Departments |
|---|---|---|
| Aun Rehman | Administrator | All |
| Layla Hassan | Manager (QC sign-off and outcomes, no commission) | All |
| Reem Al-Zahrani | Social Media Team (captures leads) | All |
| Omar Saleh | Sales Team | Study, Visit |
| Noura Al-Qahtani | Sales Team | Work, Skilled |
| Faisal Mansour | Sales Team | EB2-NIW |
| Sultan Haddad | Case Manager | Study, Visit |
| Dina Karim | Case Manager | Work, Skilled, EB2-NIW |
| Hadi Karim | Sales Team (inactive: shows the inactive message) | Work |

Passwords are not checked in this preview. Set `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` to hide the list.

## The process (see `docs/PROCESS_AND_PHASES.md`)

Four teams own the stages: Social Media (Enrolled), Sales (First Call to Deal Finalised), Case Manager (Document Collection to Submitted), Admin / Manager (Outcome). Each case shows who is responsible now, and only that person or an administrator can work on it.

## What to try (everything below works in the preview)

1. **Capture a lead** as Reem (Add client): choose visa type, destination, budget, source and priority, and tag a Sales consultant. It is enrolled and handed to Sales.
2. **Sales:** sign in as that consultant and move the case forward. Each stage asks for what the process needs (call summary, appointment, visit and fee, agreement and fees). Moving past the deal hands the case to a Case Manager.
3. **Add documents** (Documents tab, Add document): there is no preset list. Give each document a name, attach a file now or later, and mark if it needs translation.
4. **Case Manager:** confirm documents are verified to move to Case Prep, then ask for QC.
5. **QC:** sign in as Layla. Approve the QC, or return it for changes. Submission is blocked until QC is approved.
6. **Submitted, then Outcome:** as Layla or Aun, log the outcome. Approved asks you to confirm the client was told (Aun can log commission). Refused offers appeal (loops back to Case Prep), re-apply (opens a new case) or no further action.
7. **Escalations:** the bell and dashboard show the flowchart's triggers, such as no call after 24 hrs or not submitted within 2 days of QC. Dismiss or send a reminder.
8. **Team page:** Teams (Social Media, Sales, Case Manager, Admin / Manager) and Departments (Study, Work, Visit, Skilled, EB2-NIW) are both shown. Filter by either, add a member and choose their team and departments.
9. **Workflow setup:** see the process map, change days allowed per stage and default handlers, then move a case to see them applied.
10. Everything else from before still works: end or pause and reactivate cases, eligibility, notes, partner tasks, team notepad with audiences, agents, reports with CSV and PDF, settings.

## Before real data goes in

- `lib/session.ts` and `app/login/actions.ts` are a **preview stub**: a plain cookie, no password check. Replace with hashed passwords, login rate limiting, a forced first-login password change and a server-side session store.
- `lib/permissions.ts` mirrors the rules in the screens. **The real enforcement must be on the server**: every API route, export and file download checks permissions, and commission and outcome fields are removed from responses for non-admins.
- `lib/store.tsx` holds all demo state. **Each function in it is where the matching API call goes** (for example `moveStage` becomes `POST /api/cases/:id/move`).
- `lib/demo-data.ts` is fictional. Do not load real client records into this build.
- `lib/dates.ts` uses a fixed demo date (21 October 2026) so the demo is stable. Use the real clock in Phase 2.
- Filters and pagination run in the browser here. In Phase 2 they move to the server (query parameters, database indexes) so large datasets stay fast.
- The Excel download is a `.csv`. Real `.xlsx` and A4 PDFs are produced on the server in Phase 2.
- Placeholder rules: the eligibility scoring and the required-document checklists are illustrative. The client has not supplied the real rules.

## Brand and design

- The logo is `public/brand/logo.png`, used as supplied. The favicon and app icons were made from the supplied mark. **The source file is small (150 px), so icons may look soft on high-resolution screens. A larger original (512 px or more) gives crisper icons.**
- Colours are in `tailwind.config.ts`: the logo light blue (`#009FE3`) with dark navy text on it. Each department has its own chip colour and icon (`components/department.tsx`). Status is always written in words, never shown by colour alone.
- Text is 15 to 16 px or larger, controls are at least 44 px tall, and dialogs trap keyboard focus.

## Keeping it light and fast

- Only three runtime packages: Next.js, React and React DOM. Styling uses Tailwind, and icons are a small local file (`components/icons.tsx`).
- `node_modules` is mostly the Next.js framework itself, which is required. Never copy `node_modules` or `.next` into zips or cloud-synced folders.
- For a smooth demo use `npm run build` then `npm start`. It is much faster than `npm run dev`.
- On Windows, exclude the project folder from antivirus scanning and keep it out of OneDrive or Dropbox.

## Security upgrade (Next.js)

The earlier build used Next.js 14.2.15, which npm flags as vulnerable. The whole Next.js 14 line is no longer receiving security fixes, so this version moves to the supported 15.5 line:

- `next` 15.5.28 and React 19.1 (patched releases).
- The image optimiser is switched off (`images.unoptimized`). The app uses plain `<img>` tags, and the optimiser was the target of recent Next.js advisories.
- A Strict-Transport-Security header was added to the existing security headers.
- Node 22 is required (`engines` is `22.x`). Node 20 is end-of-life. Vercel picks Node 22 automatically from this setting.
- Run `npm audit` after installing, and keep Next.js updated. Check https://nextjs.org/blog/tag/security from time to time.

**Protecting a public preview.** This preview has no real login, so anyone with the link could open it. Do one or both:

1. In Vercel, set an environment variable `DEMO_ACCESS_CODE` to a secret phrase. People must then enter it as the password on the login page.
2. Turn on Vercel Deployment Protection (Project, Settings, Deployment Protection).

Never put real client data into this preview.

## Updating an existing project (important)

Copying a new zip over an old folder leaves old files behind. Those leftovers caused the failed Vercel build (`app/(app)/notes` and `app/(app)/tasks` are from older versions and no longer exist). To update cleanly:

1. Open your project folder. Delete everything **except** the hidden `.git` folder and any `.env` files.
   - Windows PowerShell: `Get-ChildItem -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -notlike ".env*" } | Remove-Item -Recurse -Force`
   - Mac or Linux: `find . -mindepth 1 -maxdepth 1 ! -name .git ! -name ".env*" -exec rm -rf {} +`
2. Copy the contents of this zip's `perfectgration-crm-ui` folder into it.
3. Run `npm install` (this creates a fresh `package-lock.json`), then `npm run build`.
4. When the build passes: `git add -A`, `git commit -m "Upgrade Next.js and restore v4 layout"`, `git push`. Vercel redeploys on its own.

As a safety net, `npm run build` and `npm run dev` first run `scripts/clean-stale.mjs`, which deletes the known leftover files from older versions and prints what it removed.

## Structure

```
app/login               sign-in
app/(app)               signed-in area: sidebar, topbar, demo state
  dashboard cases clients partner-tasks notepad
  reports  (Admin and Manager)
  team agents workflow settings  (Admin)
components              UI, dialogs, status badges, departments, stepper
lib                     demo data, state (store.tsx), permissions, dates
```

## Hosting notes

Intended target: Hostinger managed Node.js hosting (`npm run build`, then `npm start`). Confirm the plan runs a long-lived Node process, and whether uploaded files persist and are backed up. Database: MongoDB Atlas. Check which regions are available near Saudi Arabia, and what the Saudi Personal Data Protection Law means for where personal data is stored. Get legal advice.
