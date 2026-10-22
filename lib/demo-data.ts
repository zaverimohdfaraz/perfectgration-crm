import { isoFromToday } from "./dates";

/* ─── Types ─────────────────────────────────────────────── */
export type Role = "admin" | "manager" | "consultant";
export type TeamId = "study" | "work" | "visit" | "skilled" | "eb2niw";
export type CaseStatus = "active" | "on_hold" | "returned" | "withdrawn" | "refused" | "approved";
export type StageId =
  | "enrolled"
  | "firstcall"
  | "assessment"
  | "appointment"
  | "deal"
  | "documents"
  | "caseprep"
  | "submitted"
  | "outcome";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  teams: TeamId[];
  title: string;
  canAdd?: boolean;
  inactive?: boolean;
  lastSeen: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  nationality: string;
  country: string;
  dob: string;
  updatedAt: string;
};

export type Note = { text: string; author: string; at: string };
export type HistoryEntry = { from: StageId | null; to: StageId; actor: string; at: string; note?: string };

export type Case = {
  id: string;
  ref: string;
  clientId: string;
  visa: TeamId;
  stage: StageId;
  status: CaseStatus;
  consultantId: string;
  stageSince: string;
  deadline: string | null;
  leadSource: string;
  agentId?: string;
  commissionSar?: number | null; // admin-only field
  endReason?: string;
  waitingFor: string;
  nextAction: string;
  notes: Note[];
  history: HistoryEntry[];
  updatedAt: string;
};

export type Agent = {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  commissionType: "flat" | "percent";
  amount: number;
  paid: boolean;
  notes: string;
};

export type Doc = {
  id: string;
  caseId: string;
  name: string;
  category: string;
  status: "pending" | "received" | "verified";
  uploadedBy: string;
  at: string;
};

export type Task = {
  id: string;
  title: string;
  caseId: string;
  partner: string;
  assigneeId: string;
  deadline: string;
  progress: number;
};

export type TeamNote = {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
  pinned: boolean;
  updatedAt: string;
  /** Audience. Both empty means everyone. */
  departments: TeamId[];
  people: string[];
};

/* ─── Reference lists ───────────────────────────────────── */
export const STAGES: { id: StageId; label: string }[] = [
  { id: "enrolled", label: "Enrolled" },
  { id: "firstcall", label: "First Call" },
  { id: "assessment", label: "Assessment" },
  { id: "appointment", label: "Office Appointment" },
  { id: "deal", label: "Deal Finalised" },
  { id: "documents", label: "Documents & Coordination" },
  { id: "caseprep", label: "Case Prep" },
  { id: "submitted", label: "Submitted" },
  { id: "outcome", label: "Outcome" },
];

export const VISA_TYPES: { id: TeamId; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "work", label: "Work" },
  { id: "visit", label: "Visit" },
  { id: "skilled", label: "Skilled" },
  { id: "eb2niw", label: "EB2-NIW" },
];

export const STATUS_LABEL: Record<CaseStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  returned: "Returned",
  withdrawn: "Withdrawn",
  refused: "Refused",
  approved: "Approved",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  manager: "Manager",
  consultant: "Team member",
};

export const LEAD_SOURCES = ["Instagram", "Facebook", "WhatsApp", "TikTok", "LinkedIn", "Referral", "Other"];

export const stageLabel = (id: StageId) => STAGES.find((s) => s.id === id)?.label ?? id;
export const stageNumber = (id: StageId) => STAGES.findIndex((s) => s.id === id) + 1;
export const visaLabel = (id: TeamId) => VISA_TYPES.find((v) => v.id === id)?.label ?? id;

/* ─── Users (demo accounts; Admin creates real accounts in Phase 2) ─── */
export const USERS: User[] = [
  { id: "u-admin", name: "Aun Rehman", email: "admin@perfectgration.com", role: "admin", teams: ["study", "work", "visit", "skilled", "eb2niw"], title: "Administrator", lastSeen: isoFromToday(0) },
  { id: "u-manager", name: "Layla Hassan", email: "manager@perfectgration.com", role: "manager", teams: [], title: "Operations Manager", lastSeen: isoFromToday(0) },
  { id: "u-omar", name: "Omar Saleh", email: "omar@perfectgration.com", role: "consultant", teams: ["study", "visit"], title: "Visa Consultant", canAdd: true, lastSeen: isoFromToday(0) },
  { id: "u-noura", name: "Noura Al-Qahtani", email: "noura@perfectgration.com", role: "consultant", teams: ["work", "skilled"], title: "Visa Consultant", lastSeen: isoFromToday(-1) },
  { id: "u-faisal", name: "Faisal Mansour", email: "faisal@perfectgration.com", role: "consultant", teams: ["eb2niw"], title: "Senior Consultant", lastSeen: isoFromToday(-2) },
  { id: "u-hadi", name: "Hadi Karim", email: "hadi@perfectgration.com", role: "consultant", teams: ["work"], title: "Visa Consultant", inactive: true, lastSeen: isoFromToday(-40) },
];

export const userById = (id: string) => USERS.find((u) => u.id === id);
export const consultants = () => USERS.filter((u) => u.role === "consultant");

/* ─── Clients (fictional) ───────────────────────────────── */
export const CLIENTS: Client[] = [
  { id: "c1", name: "Amina Tariq", phone: "+92 300 555 0101", email: "amina.tariq@example.com", nationality: "Pakistani", country: "Pakistan", dob: "1994-03-12", updatedAt: isoFromToday(-2) },
  { id: "c2", name: "Karim Nasser", phone: "+20 100 555 0102", email: "karim.nasser@example.com", nationality: "Egyptian", country: "Egypt", dob: "1990-07-21", updatedAt: isoFromToday(-1) },
  { id: "c3", name: "Priya Menon", phone: "+91 98 5555 0103", email: "priya.menon@example.com", nationality: "Indian", country: "India", dob: "1988-11-05", updatedAt: isoFromToday(-6) },
  { id: "c4", name: "Hana Haddad", phone: "+962 79 555 0104", email: "hana.haddad@example.com", nationality: "Jordanian", country: "Jordan", dob: "1997-01-30", updatedAt: isoFromToday(-1) },
  { id: "c5", name: "Mohammed Rafiq", phone: "+92 321 555 0105", email: "m.rafiq@example.com", nationality: "Pakistani", country: "Pakistan", dob: "1985-09-14", updatedAt: isoFromToday(-5) },
  { id: "c6", name: "Rania Aziz", phone: "+20 111 555 0106", email: "rania.aziz@example.com", nationality: "Egyptian", country: "Egypt", dob: "1999-05-08", updatedAt: isoFromToday(-3) },
];
export const clientById = (id: string) => CLIENTS.find((c) => c.id === id);

/* ─── Agents (referral partners) ────────────────────────── */
export const AGENTS: Agent[] = [
  { id: "ag1", name: "Al Noor Consultancy", city: "Riyadh", phone: "+966 11 555 0201", email: "partners@alnoor.example", commissionType: "percent", amount: 10, paid: false, notes: "Monthly settlement" },
  { id: "ag2", name: "Gulf Education Bridge", city: "Jeddah", phone: "+966 12 555 0202", email: "hello@gulfbridge.example", commissionType: "flat", amount: 1500, paid: true, notes: "Student referral partner" },
];
export const agentById = (id?: string) => AGENTS.find((a) => a.id === id);

/* ─── Case helpers ──────────────────────────────────────── */
const note = (text: string, author: string, days: number): Note => ({ text, author, at: isoFromToday(days) });

/** Builds a stage history from a path, ending on `sinceDays` ago. */
const trail = (path: StageId[], sinceDays: number, actor: string): HistoryEntry[] =>
  path.map((to, i) => ({
    from: i === 0 ? null : path[i - 1],
    to,
    actor,
    at: isoFromToday(-sinceDays - 2 * (path.length - 1 - i)),
  }));

const STUDY_FULL: StageId[] = ["enrolled", "firstcall", "assessment", "appointment", "deal", "documents", "caseprep", "submitted", "outcome"];

/* ─── Cases ─────────────────────────────────────────────── */
export const CASES: Case[] = [
  {
    id: "cs1", ref: "PG-26-0001", clientId: "c1", visa: "study", stage: "documents", status: "active",
    consultantId: "u-omar", stageSince: isoFromToday(-12), deadline: isoFromToday(2), leadSource: "Instagram",
    waitingFor: "Six months of bank statements from the client",
    nextAction: "Confirm bank statement upload with the client",
    notes: [note("IELTS 6.5 overall certificate received and filed.", "Omar Saleh", -5), note("Client asked whether dependants can be included in the application.", "Omar Saleh", -2)],
    history: trail(["enrolled", "firstcall", "assessment", "appointment", "deal", "documents"], 12, "Omar Saleh"),
    updatedAt: isoFromToday(-2),
  },
  {
    id: "cs2", ref: "PG-26-0002", clientId: "c2", visa: "work", stage: "assessment", status: "active",
    consultantId: "u-noura", stageSince: isoFromToday(-4), deadline: isoFromToday(9), leadSource: "Facebook",
    waitingFor: "Employment letter from the current employer",
    nextAction: "Share eligibility result once the letter arrives",
    notes: [note("Employer contacted. Letter promised by Thursday.", "Noura Al-Qahtani", -1)],
    history: trail(["enrolled", "firstcall", "assessment"], 4, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-1),
  },
  {
    id: "cs3", ref: "PG-26-0003", clientId: "c3", visa: "visit", stage: "deal", status: "active",
    consultantId: "u-omar", stageSince: isoFromToday(-1), deadline: isoFromToday(-2), leadSource: "WhatsApp",
    waitingFor: "Client to sign the service agreement at the office",
    nextAction: "Confirm fee and agreement signing, then mark the deal as Won",
    notes: [note("Client visited the office and asked for a fee breakdown.", "Omar Saleh", -1)],
    history: trail(["enrolled", "firstcall", "appointment", "deal"], 1, "Omar Saleh"),
    updatedAt: isoFromToday(-1),
  },
  {
    id: "cs4", ref: "PG-26-0004", clientId: "c4", visa: "skilled", stage: "submitted", status: "active",
    consultantId: "u-noura", stageSince: isoFromToday(-24), deadline: isoFromToday(1), leadSource: "TikTok",
    waitingFor: "Biometric appointment details from the visa centre",
    nextAction: "Call the client to confirm biometric appointment details",
    notes: [note("VFS appointment booked for 25 October.", "Noura Al-Qahtani", -3)],
    history: trail(["enrolled", "firstcall", "assessment", "appointment", "deal", "documents", "caseprep", "submitted"], 24, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-3),
  },
  {
    id: "cs5", ref: "PG-26-0005", clientId: "c5", visa: "eb2niw", stage: "caseprep", status: "active",
    consultantId: "u-faisal", stageSince: isoFromToday(-8), deadline: isoFromToday(6), leadSource: "LinkedIn", agentId: "ag1",
    waitingFor: "Client approval of the final draft",
    nextAction: "Send the final draft to the client for approval",
    notes: [note("Internal manager review is scheduled for Monday.", "Faisal Mansour", -2)],
    history: trail(["enrolled", "firstcall", "assessment", "appointment", "deal", "documents", "caseprep"], 8, "Faisal Mansour"),
    updatedAt: isoFromToday(-2),
  },
  {
    id: "cs6", ref: "PG-26-0006", clientId: "c6", visa: "study", stage: "outcome", status: "approved",
    consultantId: "u-omar", stageSince: isoFromToday(-2), deadline: null, leadSource: "Referral", agentId: "ag2", commissionSar: 4500,
    waitingFor: "Nothing outstanding",
    nextAction: "Close the file and log the commission payment",
    notes: [],
    history: trail(STUDY_FULL, 2, "Omar Saleh"),
    updatedAt: isoFromToday(-2),
  },
  {
    id: "cs7", ref: "PG-26-0007", clientId: "c1", visa: "visit", stage: "enrolled", status: "active",
    consultantId: "u-omar", stageSince: isoFromToday(0), deadline: isoFromToday(14), leadSource: "Instagram",
    waitingFor: "First call with the client",
    nextAction: "Call or WhatsApp the client within 24 hours",
    notes: [],
    history: trail(["enrolled"], 0, "Omar Saleh"),
    updatedAt: isoFromToday(0),
  },
  {
    id: "cs8", ref: "PG-26-0008", clientId: "c4", visa: "work", stage: "firstcall", status: "active",
    consultantId: "u-noura", stageSince: isoFromToday(-3), deadline: isoFromToday(20), leadSource: "Referral", agentId: "ag2",
    waitingFor: "The client's English test date",
    nextAction: "Schedule the assessment call",
    notes: [],
    history: trail(["enrolled", "firstcall"], 3, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-3),
  },
  {
    id: "cs9", ref: "PG-26-0009", clientId: "c6", visa: "study", stage: "appointment", status: "on_hold",
    consultantId: "u-omar", stageSince: isoFromToday(-16), deadline: null, leadSource: "Facebook",
    endReason: "Paused while the client gathers a salary letter",
    waitingFor: "Bank statement and salary letter from the client",
    nextAction: "Resume the case when documents arrive",
    notes: [note("Client asked to pause while the salary letter is processed.", "Omar Saleh", -16)],
    history: trail(["enrolled", "firstcall", "assessment", "appointment"], 16, "Omar Saleh"),
    updatedAt: isoFromToday(-16),
  },
  {
    id: "cs10", ref: "PG-26-0010", clientId: "c5", visa: "skilled", stage: "outcome", status: "refused",
    consultantId: "u-noura", stageSince: isoFromToday(-5), deadline: null, leadSource: "TikTok",
    endReason: "Refused by the authority. Appeal options are under review.",
    waitingFor: "Decision on appeal options",
    nextAction: "Review the refusal letter with the client",
    commissionSar: null,
    notes: [],
    history: trail(["enrolled", "firstcall", "assessment", "appointment", "deal", "documents", "caseprep", "submitted", "outcome"], 5, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-5),
  },
  {
    id: "cs11", ref: "PG-26-0011", clientId: "c3", visa: "eb2niw", stage: "documents", status: "active",
    consultantId: "u-faisal", stageSince: isoFromToday(-22), deadline: isoFromToday(4), leadSource: "LinkedIn",
    waitingFor: "Degree attestation documents",
    nextAction: "Chase degree attestation with the client",
    notes: [note("Client sent passport copy. Degree still pending.", "Faisal Mansour", -4)],
    history: trail(["enrolled", "firstcall", "assessment", "appointment", "deal", "documents"], 22, "Faisal Mansour"),
    updatedAt: isoFromToday(-4),
  },
];
export const caseById = (id: string) => CASES.find((c) => c.id === id);

/* ─── Documents, assessments, tasks, notes (demo) ───────── */
export const DOCS: Doc[] = [
  { id: "d1", caseId: "cs1", name: "Passport (all pages)", category: "Passport", status: "verified", uploadedBy: "Omar Saleh", at: isoFromToday(-10) },
  { id: "d2", caseId: "cs1", name: "IELTS certificate", category: "English certificate", status: "verified", uploadedBy: "Omar Saleh", at: isoFromToday(-5) },
  { id: "d3", caseId: "cs1", name: "Bank statements (6 months)", category: "Bank statement", status: "pending", uploadedBy: "—", at: isoFromToday(-5) },
  { id: "d4", caseId: "cs2", name: "Employment letter", category: "Employment evidence", status: "pending", uploadedBy: "—", at: isoFromToday(-4) },
  { id: "d5", caseId: "cs2", name: "Passport scan", category: "Passport", status: "received", uploadedBy: "Noura Al-Qahtani", at: isoFromToday(-3) },
  { id: "d6", caseId: "cs4", name: "Passport copy", category: "Passport", status: "verified", uploadedBy: "Noura Al-Qahtani", at: isoFromToday(-20) },
  { id: "d7", caseId: "cs5", name: "Employer petition draft", category: "Visa-specific", status: "received", uploadedBy: "Faisal Mansour", at: isoFromToday(-4) },
  { id: "d8", caseId: "cs11", name: "Degree certificate", category: "Education certificate", status: "received", uploadedBy: "Faisal Mansour", at: isoFromToday(-15) },
];
export const docsFor = (caseId: string) => DOCS.filter((d) => d.caseId === caseId);

export type Assessment = {
  inputs: { label: string; value: string }[];
  missing: string[];
  ruleVersion: string;
  assessedBy: string;
  assessedAt: string;
  indicative?: string;
};
/** Illustrative only. Real scoring rules have not been supplied by the client. */
export const ASSESSMENTS: Record<string, Assessment> = {
  cs1: {
    inputs: [
      { label: "Education", value: "Bachelor's degree" },
      { label: "Field of study", value: "Engineering" },
      { label: "Work experience", value: "2 years" },
      { label: "English level", value: "IELTS 6.5 overall" },
      { label: "STEM field", value: "Yes" },
    ],
    missing: ["Six months of bank statements", "Proof of funds"],
    ruleVersion: "demo-v0 (illustrative)",
    assessedBy: "Omar Saleh",
    assessedAt: isoFromToday(-5),
  },
  cs2: {
    inputs: [
      { label: "Education", value: "Diploma" },
      { label: "Work experience", value: "4 years" },
      { label: "English level", value: "Pending test" },
    ],
    missing: ["Employment letter", "English test result"],
    ruleVersion: "demo-v0 (illustrative)",
    assessedBy: "Noura Al-Qahtani",
    assessedAt: isoFromToday(-3),
  },
};

export const TASKS: Task[] = [
  { id: "tk1", title: "Obtain university enrolment letter", caseId: "cs1", partner: "Partner university", assigneeId: "u-omar", deadline: isoFromToday(3), progress: 40 },
  { id: "tk2", title: "Employer reference letter", caseId: "cs2", partner: "Employer", assigneeId: "u-noura", deadline: isoFromToday(5), progress: 70 },
  { id: "tk3", title: "Confirm biometric slot with VFS", caseId: "cs4", partner: "VFS Global", assigneeId: "u-noura", deadline: isoFromToday(1), progress: 90 },
  { id: "tk4", title: "Confirm employer petition draft", caseId: "cs5", partner: "US employer", assigneeId: "u-faisal", deadline: isoFromToday(9), progress: 35 },
  { id: "tk5", title: "Request degree attestation", caseId: "cs11", partner: "University", assigneeId: "u-faisal", deadline: isoFromToday(-1), progress: 20 },
];

export const TEAM_NOTES: TeamNote[] = [
  { id: "tn1", title: "Document checklist: October update", content: "Bank statements must cover the last six months and show the account holder's name. Scans should be in colour, and passports need every page, including blank ones.", category: "Documents", author: "Layla Hassan", pinned: true, updatedAt: isoFromToday(-6), departments: [], people: [] },
  { id: "tn2", title: "Office hours", content: "The office runs Sunday to Thursday. Please confirm any weekend appointments with Layla before offering them to clients.", category: "Operations", author: "Layla Hassan", pinned: true, updatedAt: isoFromToday(-10), departments: [], people: [] },
  { id: "tn3", title: "Lead handover", content: "When a social media lead is allocated, record the source and visa interest in the first few minutes so the consultant has context before the first call.", category: "Process", author: "Aun Rehman", pinned: false, updatedAt: isoFromToday(-3), departments: [], people: ["u-omar", "u-noura"] },
  { id: "tn4", title: "Study intake deadlines", content: "Autumn intake applications close earlier than expected at several universities. Please confirm the closing date with the university before promising a timeline to the client.", category: "Reminder", author: "Aun Rehman", pinned: false, updatedAt: isoFromToday(-2), departments: ["study"], people: [] },
  { id: "tn5", title: "Language certificates for Work and Skilled", content: "Language certificates older than two years are rejected by some authorities. Ask for a recent test result at the first call, and note the test date on the case.", category: "Documents", author: "Layla Hassan", pinned: false, updatedAt: isoFromToday(-1), departments: ["work", "skilled"], people: [] },
];

/* ─── Workflow defaults (Admin-configurable later) ──────── */
export const SLA_RULES: { stage: StageId; target: string }[] = [
  { stage: "enrolled", target: "First call within 24 hours" },
  { stage: "firstcall", target: "Assessment complete within 48 hours" },
  { stage: "assessment", target: "Office appointment within 48 hours" },
  { stage: "appointment", target: "Deal finalised on the day of the visit" },
  { stage: "deal", target: "Documents requested within 7 days" },
  { stage: "documents", target: "Case prep within 5 days of documents" },
  { stage: "caseprep", target: "Submission on the same day as client approval" },
  { stage: "submitted", target: "Outcome recorded within 24 hours of decision" },
  { stage: "outcome", target: "Commission logged; case closed or reactivated" },
];


/* ─── Extra types used by the interactive demo ──────────── */
export type Template = { id: string; name: string; channel: "WhatsApp" | "Email"; stage: StageId; body: string };

export const DEFAULT_SLA_DAYS: Record<StageId, number> = {
  enrolled: 1, firstcall: 2, assessment: 2, appointment: 2, deal: 1,
  documents: 7, caseprep: 5, submitted: 1, outcome: 1,
};

/** What the case is waiting for, and the next step, once it enters each stage. */
export const STAGE_GUIDE: Record<StageId, { waitingFor: string; nextAction: string }> = {
  enrolled: { waitingFor: "First call with the client", nextAction: "Call or WhatsApp the client within 24 hours" },
  firstcall: { waitingFor: "Client's details for the eligibility check", nextAction: "Complete the eligibility assessment" },
  assessment: { waitingFor: "Assessment result to share with the client", nextAction: "Book an office appointment" },
  appointment: { waitingFor: "Client to attend the office visit", nextAction: "Confirm the fee and sign the agreement" },
  deal: { waitingFor: "Service agreement and fee confirmation", nextAction: "Send the document checklist" },
  documents: { waitingFor: "Documents from the client", nextAction: "Follow up with the client every 2 days" },
  caseprep: { waitingFor: "Internal review and client approval", nextAction: "Send the final draft to the client for approval" },
  submitted: { waitingFor: "Decision from the authority", nextAction: "Monitor the application status" },
  outcome: { waitingFor: "Nothing outstanding", nextAction: "Close the file and log the commission payment" },
};

export const TEMPLATES: Template[] = [
  { id: "t1", name: "WhatsApp: first contact", channel: "WhatsApp", stage: "enrolled",
    body: "Hello [Client Name], this is [Consultant Name] from Perfectgration. Thank you for your enquiry about the [Visa Type] visa. I would love to explain the process and check your eligibility. When is a good time for a quick 5-minute call?" },
  { id: "t2", name: "Email: welcome", channel: "Email", stage: "enrolled",
    body: "Subject: Your visa enquiry with Perfectgration\n\nDear [Client Name],\n\nThank you for contacting Perfectgration. Your enquiry has been assigned to me and I will contact you within 24 hours. Please keep your passport (valid for at least 6 months), recent photographs and previous visa history ready.\n\n[Consultant Name]\n[Consultant Phone]" },
  { id: "t3", name: "WhatsApp: document checklist", channel: "WhatsApp", stage: "documents",
    body: "Hello [Client Name], here is your [Visa Type] document checklist: passport (all pages), 2 white-background photos, 3 to 6 months of bank statements and employment evidence. Please send everything within 7 days so we can keep your application on schedule." },
  { id: "t4", name: "Email: application submitted", channel: "Email", stage: "submitted",
    body: "Subject: Your application has been submitted\n\nDear [Client Name],\n\nYour application was submitted on [Submission Date] to [Submitted To]. Your reference number is [Reference]. We will keep monitoring the status and update you within 24 hours of any news." },
];

/* ─── Extra demo clients and cases (deterministic) ──────── */
const FIRST = ["Sultan", "Maha", "Yara", "Tariq", "Dina", "Bilal", "Salma", "Imran", "Rashid", "Zainab", "Adel", "Lubna", "Nadir", "Huda", "Sami", "Farah", "Walid", "Mariam"];
const LAST = ["Al-Harbi", "Siddiqui", "Nasser", "Qureshi", "Haddad", "Ansari", "Khalil", "Mehta", "Farouk", "Rahman", "Aziz", "Saleh", "Mirza", "Obeid", "Hashmi"];
const NAT: [string, string][] = [["Saudi", "Saudi Arabia"], ["Pakistani", "Pakistan"], ["Egyptian", "Egypt"], ["Indian", "India"], ["Jordanian", "Jordan"], ["Filipino", "Philippines"], ["Sudanese", "Sudan"], ["Yemeni", "Yemen"]];
const TEAM_OWNER: Record<TeamId, string> = { study: "u-omar", visit: "u-omar", work: "u-noura", skilled: "u-noura", eb2niw: "u-faisal" };
const ACTOR: Record<string, string> = { "u-omar": "Omar Saleh", "u-noura": "Noura Al-Qahtani", "u-faisal": "Faisal Mansour" };

let seed = 20261021;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const pathTo = (stage: StageId, visa: TeamId): StageId[] => {
  const idx = STAGES.findIndex((s) => s.id === stage);
  return STAGES.slice(0, idx + 1).map((s) => s.id).filter((id) => !(visa === "visit" && id === "assessment"));
};

for (let i = 0; i < 14; i++) {
  const first = FIRST[i];
  const last = pick(LAST);
  const [nationality, country] = pick(NAT);
  CLIENTS.push({
    id: `c${7 + i}`,
    name: `${first} ${last}`,
    phone: `+966 5${between(0, 9)} ${between(100, 999)} ${between(1000, 9999)}`,
    email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
    nationality,
    country,
    dob: `19${between(82, 99)}-0${between(1, 9)}-${between(10, 28)}`,
    updatedAt: isoFromToday(-between(0, 12)),
  });
}

const VISAS: TeamId[] = ["study", "work", "visit", "skilled", "eb2niw", "study", "work", "visit"];
for (let i = 0; i < 20; i++) {
  const visa = pick(VISAS);
  const owner = TEAM_OWNER[visa];
  const stageIdx = between(0, 8);
  let stage = STAGES[stageIdx].id;
  if (visa === "visit" && stage === "assessment") stage = "appointment";
  const since = between(0, 28);
  const isOutcome = stage === "outcome";
  const approved = isOutcome && rnd() > 0.4;
  const onHold = !isOutcome && rnd() > 0.9;
  const agentId = rnd() > 0.65 ? pick(["ag1", "ag2"]) : undefined;
  const guide = STAGE_GUIDE[stage];
  CASES.push({
    id: `cs${12 + i}`,
    ref: `PG-26-${String(12 + i).padStart(4, "0")}`,
    clientId: `c${7 + (i % 14)}`,
    visa,
    stage,
    status: isOutcome ? (approved ? "approved" : "refused") : onHold ? "on_hold" : "active",
    consultantId: owner,
    stageSince: isoFromToday(-since),
    deadline: isOutcome ? null : isoFromToday(between(-3, 20)),
    leadSource: pick(LEAD_SOURCES),
    agentId,
    commissionSar: approved && agentId ? between(2, 6) * 1000 : null,
    endReason: onHold ? "Paused while the client arranges documents" : isOutcome && !approved ? "Refused by the authority" : undefined,
    waitingFor: guide.waitingFor,
    nextAction: guide.nextAction,
    notes: rnd() > 0.5 ? [{ text: "Client confirmed contact details and preferred call time.", author: ACTOR[owner], at: isoFromToday(-since) }] : [],
    history: trail(pathTo(stage, visa), since, ACTOR[owner]),
    updatedAt: isoFromToday(-Math.max(0, since - 1)),
  });
}
