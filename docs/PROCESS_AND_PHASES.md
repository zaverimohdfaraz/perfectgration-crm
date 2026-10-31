# Perfectgration CRM: process and phases

A short reference. The process comes from the client's flowchart (CRM Process Flowchart, lead intake through visa outcome).

## 1. The process: four teams, three handoffs

| Phase | Team | Steps | Stage in the CRM | Deadline | Escalation |
|---|---|---|---|---|---|
| 1. Lead intake | Social Media Team | Lead generated (Instagram, Facebook, WhatsApp) → qualify interest (visa type, budget, destination) → enrolled in CRM → assign to Sales (tag consultant, set priority) | 1 Enrolled | Same day as contact | Not enrolled after 24 hrs: alert manager |
| 2. Sales | Sales Team | First call → assessment → office appointment → deal finalised → agreement signed and fees collected | 2 First Call, 3 Assessment, 4 Office Appointment, 5 Deal Finalised | 24 hrs; 48 hrs of call; 48 hrs of assessment; same day as visit | No call after 24 hrs: flag red. Stuck in First Call 3+ days: escalate. No appointment after 3 days: manager alert. Visit done, no deal after 24 hrs: follow-up |
| 3. Case management | Case Manager | Document collection (list sent within 24 hrs) → verify documents (completeness, translations) → case prep → manager review (QC sign-off) → submitted (VFS or embassy booking logged) | 6 Document Collection, 7 Case Prep, 8 Submitted | List within 24 hrs of deal; prep within 5 working days; submit same day as QC | Incomplete docs after 7 days: reminder. Prep not done in 7 days: manager escalation. Not submitted within 2 days of QC: urgent |
| 4. Outcome | Admin / Manager | Monitor application status → outcome. Approved: notify client, log commission. Refused: review appeal or re-apply, loop back | 9 Outcome | Log result same day as decision | If refused: review appeal options within 48 hrs |

Handoffs: Social Media to Sales (after enrolment), Sales to Case Manager (after the deal), Case Manager to Admin / Manager (awaiting outcome). Each handoff is recorded in the case history and changes who is responsible.

Visit visas skip the Assessment stage.

## 2. How this is built into the CRM

- Every case records who captured the lead, the sales consultant, and the case manager. The person responsible changes automatically at each handoff, and only that person (or an administrator) can work on the case.
- Moving a stage asks for what the process needs: call summary, appointment date, visit and deal fee, agreement and fees collected, documents verified, submission reference.
- Case Prep to Submitted needs a manager's QC approval first. A manager can approve or return the file for changes.
- Admin and Manager log the outcome. An approved visa records that the client was notified, and the administrator logs the commission. A refusal offers: appeal (loops back to Case Prep), re-apply (opens a new case), or no further action (review within 48 hours).
- The escalation triggers above raise alerts in the notification bell and on the dashboard.
- Documents: there is no preset list. The team adds each document by name, can attach the file now or later, and can flag that it needs translation. Default lists can be added later.

## 3. Build phases

| Phase | Scope | Status |
|---|---|---|
| 1. Interface | All screens and flows as an interactive preview with demo data (this build) | Done, awaiting review |
| 2. Backend core | MongoDB data model, real sign-in with hashed passwords and sessions, permissions enforced on the server, audit log, server-side search and pagination | Next |
| 3. Documents and reminders | Private file storage, upload and download through permission-checked links, scheduled escalation checks, EmailJS reminder emails | After phase 2 |
| 4. Reports and exports | Real Excel and PDF files, conversion and lead-source reports | After phase 3 |
| 5. Launch | Hosting setup, backups, security review, installable app icons, optional Arabic and right-to-left support, staff guides | Last |

## 4. Decisions to confirm with the client

1. Managers: the flowchart gives them the QC sign-off and the outcome. The CRM lets Managers approve QC and log outcomes, and still keeps commission administrator-only. Older client notes said Managers could not see outcomes.
2. The flowchart title spells the name "Perfegration" and the logo says "Perfectgration". Confirm the correct spelling.
3. "Not enrolled after 24 hrs" cannot be detected inside the CRM, because a lead only exists once enrolled. It stays a process rule for the Social Media Team.
4. The time allowed per stage (days) and the default handler per stage are editable under Workflow setup. Confirm the starting values.
5. Eligibility scoring rules and any default document lists, when the client is ready.
