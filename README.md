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

| Account | Role | Department |
|---|---|---|
| Aun Rehman | Administrator | All |
| Layla Hassan | Manager | All (read only, no commission or outcomes) |
| Omar Saleh | Team member | Study, Visit (can add cases) |
| Noura Al-Qahtani | Team member | Work, Skilled |
| Faisal Mansour | Team member | EB2-NIW |
| Hadi Karim | Team member | Work (inactive: shows the inactive message) |

Passwords are not checked in this preview. Set `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` to hide the list.

## What to try (everything below works in the preview)

1. **Add a client** (Clients, or Dashboard): enter a phone number that already exists to see the duplicate warning, or create a new client with a case.
2. **Open a case and move it forward** ("Move to ..."): each stage asks for what it needs (call summary, appointment, fee, document checklist, submission reference). The deadline, handler and history update. Try a Visit case: Assessment is skipped.
3. **Record an outcome** as the Administrator when a case reaches the last stage (approve or refuse, with commission). Sign in as the Manager to see that it is hidden.
4. **End or pause a case**, then **reactivate** it as the Administrator.
5. **Upload a document** (Documents tab): progress bar, type and size checks, and the required-documents checklist ticks off.
6. **Run an eligibility assessment** (Eligibility tab). The rules are illustrative only.
7. **Add notes**, edit case details, and download a **PDF** of a client (Print, then Save as PDF).
8. **Partner tasks**: add a task, drag the progress slider, mark complete.
9. **Team notepad**: add, pin, edit, delete.
10. **Reports**: change the period or visa type, download an Excel-compatible `.csv`, and preview the all-clients PDF.
11. **Team** (Administrator): departments overview, filter by department, add a member (a temporary password is shown), edit access, deactivate.
12. **Agents**: add an agent, mark commission paid.
13. **Workflow setup**: change a stage deadline or default handler, save, then move a case into that stage.
14. **Settings**: edit company details; send a test email (simulated).
15. **Notifications** (bell): open, send a reminder (simulated), dismiss.

Pagination, sorting and filters work on Cases (31 demo cases), Clients, Tasks, Team and Agents. Rows per page can be changed.

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
