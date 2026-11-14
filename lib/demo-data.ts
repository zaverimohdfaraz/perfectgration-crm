import { isoFromToday } from "./dates";

/* ─── Types ─────────────────────────────────────────────── */
export type Role = "admin" | "manager" | "consultant";
export type TeamId = "study" | "work" | "visit" | "skilled" | "eb2niw";
/** A case may have no visa type yet (for example a lead from a form that has no visa question). */
export type VisaChoice = TeamId | "";
export type CaseStatus = "active" | "on_hold" | "returned" | "withdrawn" | "refused" | "approved";
export type WorkTeam = "social" | "sales" | "case";
export type Priority = "normal" | "high" | "urgent";
export type StageOwner = "social" | "sales" | "case" | "leadership";
export type StageId =
  | "lead"
  | "firstcall"
  | "docassess"
  | "appointment"
  | "deal"
  | "advance"
  | "doccollect"
  | "verify"
  | "prep"
  | "review"
  | "submitted"
  | "outcome";

/** Who a pending handoff is addressed to. "person" assigns directly; "visa" goes to that visa team's pool; "team" goes to the whole next team. */
export type Route = { to: "sales" | "case"; kind: "person" | "visa" | "team"; visa?: TeamId; userId?: string; by: string; at: string };

/** A problem or hold recorded on a case, so it is clear why work stopped and who must act. */
export type IssueKind = "client" | "third_party" | "authority" | "internal" | "other";
export type Issue = { id: string; kind: IssueKind; text: string; by: string; at: string; resolvedAt?: string; resolvedBy?: string; resolution?: string };

/** Team Notepad message. Only the administrator can address other people or groups; everyone else can only write to the administrator. */
export type Message = {
  id: string;
  fromId: string;
  subject: string;
  body: string;
  at: string;
  /** Everyone on the team. Administrator only. */
  toAll: boolean;
  toUserIds: string[];
  toTeams: WorkTeam[];
  toDepartments: TeamId[];
  replyToId?: string;
  pinned: boolean;
  readBy: string[];
};

/** A secure link a client uses to upload files for one case. Files go to private storage; only the location is kept here. */
export type UploadLink = {
  id: string;
  token: string;
  caseId: string;
  clientId: string;
  createdById: string;
  createdAt: string;
  expiresAt: string;
  requested: string[];
  message?: string;
  terminatedAt?: string;
  terminatedById?: string;
  uploads: { docId: string; name: string; item?: string; at: string }[];
};

export type SubmissionStatus = "received" | "docs_requested" | "biometrics" | "under_review" | "returned";
export type SubmissionEvent = { status: SubmissionStatus; note?: string; by: string; at: string };

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  teams: TeamId[];
  /** Function in the process: Social Media, Sales or Case Manager. Not used for Admin or Manager. */
  workTeam?: WorkTeam;
  title: string;
  canAdd?: boolean;
  inactive?: boolean;
  lastSeen: string;
  /** Live mode: last time the CRM was open for this person (it pings every minute). Used to share leads among people who are online. */
  lastActiveAt?: string;
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
export type HistoryEntry = { from: StageId | null; to: StageId; actor: string; at: string; note?: string; handoff?: string; kind?: "stage" | "claim" | "assign" };

export type Case = {
  id: string;
  ref: string;
  clientId: string;
  visa: VisaChoice;
  stage: StageId;
  status: CaseStatus;
  /** The person responsible right now. It changes at each handoff. */
  consultantId: string;
  /** Social media team member who captured the lead. */
  leadById: string;
  /** Sales team member who accepted the lead. Empty until someone claims it. */
  salesId: string;
  /** Case manager who takes over after the deal. Empty until someone claims it. */
  caseManagerId: string;
  /** Pending handoff that nobody has claimed yet. Empty once claimed or assigned. */
  route?: Route;
  claimedAt?: string;
  submittedAt?: string;
  submissionLog?: SubmissionEvent[];
  resultNote?: string;
  /** Problems and holds: why the case stopped, and whether it is resolved. */
  issues: Issue[];
  /** Ad campaign the lead came from, when known. */
  campaign?: string;
  dealFeeSar?: number;
  priority: Priority;
  /** Country. Optional: left empty when the lead has not said. */
  destination: string;
  /** Sub-destination: city, province, state or university. Optional. */
  subDestination?: string;
  budget?: number;
  appointmentAt?: string;
  agreementSigned?: boolean;
  feesCollectedSar?: number | null;
  docsVerified?: boolean;
  qcApprovedAt?: string;
  qcBy?: string;
  qcNote?: string;
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
  /**
   * Live mode only. A reduced copy of a case this person worked on before handing it to the next team.
   * It counts towards their own figures, but it is never listed or opened, and it carries nothing that happened after the handoff.
   */
  pastWork?: boolean;
  /**
   * Set when the lead was given to a Sales member automatically and they have not done anything with it yet.
   * While set, the lead can be moved to another online member to keep everyone even. Cleared on the holder's first action.
   */
  autoShared?: { kind: "team" | "visa"; visa?: TeamId; at: string };
  /** Who put the case on hold: the client asked to pause it, or the team paused it (waiting on someone else). */
  holdBy?: "client" | "team";
  /** When the referral agent's commission for this case was paid, and by whom (administrator only). */
  agentPaidAt?: string;
  agentPaidBy?: string;
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
  needsTranslation?: boolean;
  note?: string;
  fileName?: string;
  /** Private storage key (S3). The file itself is never stored in the database. */
  storageKey?: string;
  size?: number;
  contentType?: string;
  /** Who added the file: a team member, or the client through an upload link. */
  source?: "team" | "client_link";
  linkId?: string;
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

export type Todo = {
  id: string;
  title: string;
  notes?: string;
  due: string | null;
  priority: Priority;
  done: boolean;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  caseId?: string;
};


/* ─── Reference lists ───────────────────────────────────── */
export const STAGES: { id: StageId; label: string }[] = [
  { id: "lead", label: "Lead Intake" },
  { id: "firstcall", label: "First Call" },
  { id: "docassess", label: "Document Assessment" },
  { id: "appointment", label: "Office Appointment" },
  { id: "deal", label: "Deal Finalised" },
  { id: "advance", label: "Advance / Fees Collection" },
  { id: "doccollect", label: "Document Collection" },
  { id: "verify", label: "Verify Documents" },
  { id: "prep", label: "Case Prep" },
  { id: "review", label: "Review" },
  { id: "submitted", label: "Submitted" },
  { id: "outcome", label: "Result" },
];

export const ISSUE_LABEL: Record<IssueKind, string> = {
  client: "Waiting on the client",
  third_party: "Waiting on a third party",
  authority: "Waiting on the authority",
  internal: "Internal delay",
  other: "Other",
};

export const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  received: "Application received by the authority",
  docs_requested: "Authority asked for more documents",
  biometrics: "Biometrics or interview scheduled",
  under_review: "Under review by the authority",
  returned: "Application returned",
};

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
  refused: "Denied",
  approved: "Approved",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  manager: "Manager",
  consultant: "Team member",
};

export const LEAD_SOURCES = ["Instagram", "Facebook", "WhatsApp", "TikTok", "LinkedIn", "Google Ads", "Referral", "Other"];

export const stageLabel = (id: StageId) => STAGES.find((s) => s.id === id)?.label ?? id;
/** Intake is step 0. Sales owns steps 1 to 5, the Case Manager owns step 6 onwards. */
export const stageNumber = (id: StageId) => STAGES.findIndex((s) => s.id === id);
export const visaLabel = (id: VisaChoice) => VISA_TYPES.find((v) => v.id === id)?.label ?? (id || "Not chosen");

/* ─── Users (demo accounts; Admin creates real accounts in Phase 2) ─── */
export const USERS: User[] = [
  { id: "u-admin", name: "Aun Rehman", email: "admin@perfectgration.com", role: "admin", teams: ["study", "work", "visit", "skilled", "eb2niw"], title: "Administrator", lastSeen: isoFromToday(0) },
  { id: "u-manager", name: "Layla Hassan", email: "manager@perfectgration.com", role: "manager", teams: [], title: "Operations Manager", lastSeen: isoFromToday(0) },
  { id: "u-omar", name: "Omar Saleh", email: "omar@perfectgration.com", role: "consultant", teams: ["study", "visit"], workTeam: "sales", title: "Sales Consultant", canAdd: true, lastSeen: isoFromToday(0) },
  { id: "u-noura", name: "Noura Al-Qahtani", email: "noura@perfectgration.com", role: "consultant", teams: ["work", "skilled"], workTeam: "sales", title: "Sales Consultant", lastSeen: isoFromToday(-1) },
  { id: "u-faisal", name: "Faisal Mansour", email: "faisal@perfectgration.com", role: "consultant", teams: ["eb2niw"], workTeam: "sales", title: "Senior Sales Consultant", lastSeen: isoFromToday(-2) },
  { id: "u-hadi", name: "Hadi Karim", email: "hadi@perfectgration.com", role: "consultant", teams: ["work"], workTeam: "sales", title: "Sales Consultant", inactive: true, lastSeen: isoFromToday(-40) },
  { id: "u-reem", name: "Reem Al-Zahrani", email: "reem@perfectgration.com", role: "consultant", teams: ["study", "work", "visit", "skilled", "eb2niw"], workTeam: "social", title: "Social Media Executive", canAdd: true, lastSeen: isoFromToday(0) },
  { id: "u-sultan", name: "Sultan Haddad", email: "sultan@perfectgration.com", role: "consultant", teams: ["study", "visit"], workTeam: "case", title: "Case Manager", lastSeen: isoFromToday(0) },
  { id: "u-dina", name: "Dina Karim", email: "dina@perfectgration.com", role: "consultant", teams: ["work", "skilled", "eb2niw"], workTeam: "case", title: "Case Manager", lastSeen: isoFromToday(-1) },
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

const STUDY_FULL: StageId[] = ["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect", "verify", "prep", "review", "submitted", "outcome"];

/* ─── Cases ─────────────────────────────────────────────── */
type SeedCase = Omit<Case, "leadById" | "salesId" | "caseManagerId" | "priority" | "destination" | "issues">;
const SEED_CASES: SeedCase[] = [
  {
    id: "cs1", ref: "PG-26-0001", clientId: "c1", visa: "study", stage: "doccollect", status: "active",
    consultantId: "u-omar", stageSince: isoFromToday(-12), deadline: isoFromToday(2), leadSource: "Instagram",
    waitingFor: "Six months of bank statements from the client",
    nextAction: "Confirm bank statement upload with the client",
    notes: [note("IELTS 6.5 overall certificate received and filed.", "Omar Saleh", -5), note("Client asked whether dependants can be included in the application.", "Omar Saleh", -2)],
    history: trail(["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect"], 12, "Omar Saleh"),
    updatedAt: isoFromToday(-2),
  },
  {
    id: "cs2", ref: "PG-26-0002", clientId: "c2", visa: "work", stage: "docassess", status: "active",
    consultantId: "u-noura", stageSince: isoFromToday(-4), deadline: isoFromToday(9), leadSource: "Facebook",
    waitingFor: "Employment letter from the current employer",
    nextAction: "Share eligibility result once the letter arrives",
    notes: [note("Employer contacted. Letter promised by Thursday.", "Noura Al-Qahtani", -1)],
    history: trail(["lead", "firstcall", "docassess"], 4, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-1),
  },
  {
    id: "cs3", ref: "PG-26-0003", clientId: "c3", visa: "visit", stage: "deal", status: "active",
    consultantId: "u-omar", stageSince: isoFromToday(-1), deadline: isoFromToday(-2), leadSource: "WhatsApp",
    waitingFor: "Client to sign the service agreement at the office",
    nextAction: "Confirm fee and agreement signing, then mark the deal as Won",
    notes: [note("Client visited the office and asked for a fee breakdown.", "Omar Saleh", -1)],
    history: trail(["lead", "firstcall", "appointment", "deal"], 1, "Omar Saleh"),
    updatedAt: isoFromToday(-1),
  },
  {
    id: "cs4", ref: "PG-26-0004", clientId: "c4", visa: "skilled", stage: "submitted", status: "active",
    consultantId: "u-noura", stageSince: isoFromToday(-24), deadline: isoFromToday(1), leadSource: "TikTok",
    waitingFor: "Biometric appointment details from the visa centre",
    nextAction: "Call the client to confirm biometric appointment details",
    notes: [note("VFS appointment booked for 25 October.", "Noura Al-Qahtani", -3)],
    history: trail(["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect", "verify", "prep", "review", "submitted"], 24, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-3),
  },
  {
    id: "cs5", ref: "PG-26-0005", clientId: "c5", visa: "eb2niw", stage: "review", status: "active",
    consultantId: "u-faisal", stageSince: isoFromToday(-8), deadline: isoFromToday(6), leadSource: "LinkedIn", agentId: "ag1",
    waitingFor: "Client approval of the final draft",
    nextAction: "Send the final draft to the client for approval",
    notes: [note("Internal manager review is scheduled for Monday.", "Faisal Mansour", -2)],
    history: trail(["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect", "verify", "prep", "review"], 8, "Faisal Mansour"),
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
    id: "cs7", ref: "PG-26-0007", clientId: "c1", visa: "visit", stage: "lead", status: "active",
    consultantId: "u-omar", stageSince: isoFromToday(0), deadline: isoFromToday(14), leadSource: "Instagram",
    waitingFor: "First call with the client",
    nextAction: "Call or WhatsApp the client within 24 hours",
    notes: [],
    history: trail(["lead"], 0, "Omar Saleh"),
    updatedAt: isoFromToday(0),
  },
  {
    id: "cs8", ref: "PG-26-0008", clientId: "c4", visa: "work", stage: "firstcall", status: "active",
    consultantId: "u-noura", stageSince: isoFromToday(-3), deadline: isoFromToday(20), leadSource: "Referral", agentId: "ag2",
    waitingFor: "The client's English test date",
    nextAction: "Schedule the assessment call",
    notes: [],
    history: trail(["lead", "firstcall"], 3, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-3),
  },
  {
    id: "cs9", ref: "PG-26-0009", clientId: "c6", visa: "study", stage: "appointment", status: "on_hold",
    consultantId: "u-omar", stageSince: isoFromToday(-16), deadline: null, leadSource: "Facebook",
    endReason: "Paused while the client gathers a salary letter",
    waitingFor: "Bank statement and salary letter from the client",
    nextAction: "Resume the case when documents arrive",
    notes: [note("Client asked to pause while the salary letter is processed.", "Omar Saleh", -16)],
    history: trail(["lead", "firstcall", "docassess", "appointment"], 16, "Omar Saleh"),
    updatedAt: isoFromToday(-16),
  },
  {
    id: "cs10", ref: "PG-26-0010", clientId: "c5", visa: "skilled", stage: "outcome", status: "refused",
    consultantId: "u-noura", stageSince: isoFromToday(-5), deadline: null, leadSource: "TikTok",
    endReason: "Denied by the authority. Appeal options are under review.",
    waitingFor: "Decision on appeal options",
    nextAction: "Review the refusal letter with the client",
    commissionSar: null,
    notes: [],
    history: trail(["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect", "verify", "prep", "review", "submitted", "outcome"], 5, "Noura Al-Qahtani"),
    updatedAt: isoFromToday(-5),
  },
  {
    id: "cs11", ref: "PG-26-0011", clientId: "c3", visa: "eb2niw", stage: "doccollect", status: "active",
    consultantId: "u-faisal", stageSince: isoFromToday(-22), deadline: isoFromToday(4), leadSource: "LinkedIn",
    waitingFor: "Degree attestation documents",
    nextAction: "Chase degree attestation with the client",
    notes: [note("Client sent passport copy. Degree still pending.", "Faisal Mansour", -4)],
    history: trail(["lead", "firstcall", "docassess", "appointment", "deal", "advance", "doccollect"], 22, "Faisal Mansour"),
    updatedAt: isoFromToday(-4),
  },
];
export const caseById = (id: string) => CASES.find((c) => c.id === id);

/* ─── Documents, assessments, tasks, notes (demo) ───────── */
export const DOCS: Doc[] = [
  { id: "d1", caseId: "cs1", name: "Passport (all pages)", category: "Passport", status: "verified", uploadedBy: "Omar Saleh", at: isoFromToday(-10) },
  { id: "d2", caseId: "cs1", name: "IELTS certificate", category: "English certificate", status: "verified", uploadedBy: "Omar Saleh", at: isoFromToday(-5) },
  { id: "d3", caseId: "cs1", name: "Bank statements (6 months)", category: "Bank statement", status: "pending", uploadedBy: "—", at: isoFromToday(-5) },
  { id: "d4", caseId: "cs2", name: "Employment letter", category: "Employment evidence", status: "pending", uploadedBy: "—", at: isoFromToday(-4), needsTranslation: true },
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
    ruleVersion: "provisional-v0",
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
    ruleVersion: "provisional-v0",
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

/* ─── Team Notepad messages ─────────────────────────────── */
export const MESSAGES: Message[] = [
  { id: "m1", fromId: "u-admin", subject: "Document checklist: October update", body: "Bank statements must cover the last six months and show the account holder's name. Scans should be in colour, and passports need every page, including blank ones.", at: isoFromToday(-6), toAll: true, toUserIds: [], toTeams: [], toDepartments: [], pinned: true, readBy: ["u-admin", "u-omar"] },
  { id: "m2", fromId: "u-admin", subject: "Office hours", body: "The office runs Sunday to Thursday. Please confirm any weekend appointments with Layla before offering them to clients.", at: isoFromToday(-10), toAll: true, toUserIds: [], toTeams: [], toDepartments: [], pinned: false, readBy: ["u-admin"] },
  { id: "m3", fromId: "u-admin", subject: "Lead handover", body: "When you accept a lead, call within 24 hours and log the call so the next step can start.", at: isoFromToday(-3), toAll: false, toUserIds: [], toTeams: ["sales"], toDepartments: [], pinned: false, readBy: ["u-admin"] },
  { id: "m4", fromId: "u-admin", subject: "Study intake deadlines", body: "Autumn intake applications close earlier than expected at several universities. Confirm the closing date with the university before promising a timeline to the client.", at: isoFromToday(-2), toAll: false, toUserIds: [], toTeams: [], toDepartments: ["study"], pinned: false, readBy: ["u-admin"] },
  { id: "m5", fromId: "u-omar", subject: "Client asking for a fee discount", body: "Amina Tariq asked whether the fee can be reduced if she pays in full today. Can I offer 5%?", at: isoFromToday(-1), toAll: false, toUserIds: ["u-admin"], toTeams: [], toDepartments: [], pinned: false, readBy: ["u-omar"] },
  { id: "m6", fromId: "u-admin", subject: "Re: Client asking for a fee discount", body: "Yes, 5% is fine for full payment today. Note it on the case.", at: isoFromToday(0), toAll: false, toUserIds: ["u-omar"], toTeams: [], toDepartments: [], replyToId: "m5", pinned: false, readBy: ["u-admin"] },
];

/* ─── Client upload links ───────────────────────────────── */
export const UPLOAD_LINKS: UploadLink[] = [
  { id: "ul1", token: "demo-token-active-cs1", caseId: "cs1", clientId: "c1", createdById: "u-sultan", createdAt: isoFromToday(-1), expiresAt: isoFromToday(2), requested: ["Bank statements (6 months)", "Proof of funds"], message: "Please upload clear colour scans.", uploads: [] },
  { id: "ul2", token: "demo-token-expired-cs11", caseId: "cs11", clientId: "c3", createdById: "u-dina", createdAt: isoFromToday(-9), expiresAt: isoFromToday(-6), requested: ["Degree certificate", "Degree attestation"], uploads: [{ docId: "d8", name: "Degree certificate", item: "Degree certificate", at: isoFromToday(-8) }] },
];

/* ─── Workflow defaults (Admin-configurable later) ──────── */
export const SLA_RULES: { stage: StageId; target: string; escalation: string }[] = [
  { stage: "lead", target: "Same day as contact", escalation: "Not passed to Sales within 24 hrs: alert manager" },
  { stage: "firstcall", target: "Accepted and called within 24 hours of the pass", escalation: "Nobody accepts after 24 hrs, or no call after 24 hrs: flagged red" },
  { stage: "docassess", target: "Within 48 hrs of first call", escalation: "Stuck in First Call for 3+ days: escalate" },
  { stage: "appointment", target: "Within 48 hrs of the document assessment", escalation: "No appointment booked after 3 days: manager alert" },
  { stage: "deal", target: "Same day as office visit", escalation: "Visit done but no deal after 24 hrs: follow-up required" },
  { stage: "advance", target: "Same day as the deal", escalation: "Fees not collected after 2 days: manager alert" },
  { stage: "doccollect", target: "Checklist sent within 24 hrs of the pass; case manager accepts the same day", escalation: "Nobody accepts after 24 hrs, or incomplete docs after 7 days: reminder" },
  { stage: "verify", target: "Within 2 days of the last document", escalation: "Verification not done after 3 days: reminder" },
  { stage: "prep", target: "Complete within 5 working days", escalation: "Prep not done in 7 days: manager escalation" },
  { stage: "review", target: "Reviewed within 1 day", escalation: "Review pending after 2 days: urgent flag" },
  { stage: "submitted", target: "Submit same day as review approval; log what happened", escalation: "Not submitted within 2 days of approval: urgent flag" },
  { stage: "outcome", target: "Log result same day as decision", escalation: "If denied: review appeal options within 48 hrs" },
];

/* ─── Extra types used by the interactive demo ──────────── */
export type Template = { id: string; name: string; channel: "WhatsApp" | "Email"; stage: StageId; body: string };

export const DEFAULT_SLA_DAYS: Record<StageId, number> = {
  lead: 1, firstcall: 2, docassess: 2, appointment: 2, deal: 1, advance: 2,
  doccollect: 7, verify: 3, prep: 5, review: 1, submitted: 7, outcome: 1,
};

/** What the case is waiting for, and the next step, once it enters each stage. */
export const STAGE_GUIDE: Record<StageId, { waitingFor: string; nextAction: string }> = {
  lead: { waitingFor: "Lead details to be completed", nextAction: "Complete the lead, then pass it to the Sales Team" },
  firstcall: { waitingFor: "First call with the client", nextAction: "Call or WhatsApp the client within 24 hours" },
  docassess: { waitingFor: "Document assessment", nextAction: "Assess the client's documents within 48 hours of the call" },
  appointment: { waitingFor: "Client to attend the office visit", nextAction: "Book the office appointment within 48 hours" },
  deal: { waitingFor: "Deal to be finalised", nextAction: "Finalise the deal on the day of the visit" },
  advance: { waitingFor: "Advance or fees from the client", nextAction: "Collect the advance, confirm payment, then pass to the Case Manager" },
  doccollect: { waitingFor: "Documents from the client", nextAction: "Send the document list within 24 hours and collect every document" },
  verify: { waitingFor: "Document verification", nextAction: "Check completeness and translations" },
  prep: { waitingFor: "Case file to be prepared", nextAction: "Complete the file within 5 working days and send it for review" },
  review: { waitingFor: "Review sign-off", nextAction: "A reviewer approves the file or returns it for changes" },
  submitted: { waitingFor: "Update from the embassy or VFS", nextAction: "Record what happened with the application, then the result" },
  outcome: { waitingFor: "Nothing outstanding", nextAction: "Notify the client and close the file" },
};


export const TEMPLATES: Template[] = [
  { id: "t1", name: "WhatsApp: first contact", channel: "WhatsApp", stage: "lead",
    body: "Hello [Client Name], this is [Consultant Name] from Perfectgration. Thank you for your enquiry about the [Visa Type] visa. I would love to explain the process and check your eligibility. When is a good time for a quick 5-minute call?" },
  { id: "t2", name: "Email: welcome", channel: "Email", stage: "lead",
    body: "Subject: Your visa enquiry with Perfectgration\n\nDear [Client Name],\n\nThank you for contacting Perfectgration. Your enquiry has been assigned to me and I will contact you within 24 hours. Please keep your passport (valid for at least 6 months), recent photographs and previous visa history ready.\n\n[Consultant Name]\n[Consultant Phone]" },
  { id: "t3", name: "WhatsApp: document list", channel: "WhatsApp", stage: "doccollect",
    body: "Hello [Client Name], here is the list of documents we need for your [Visa Type] application: [Document List]. Please send everything within 7 days so we can keep your application on schedule." },
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
  return STAGES.slice(0, idx + 1).map((s) => s.id).filter((id) => !(visa === "visit" && id === "docassess"));
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
  const stageIdx = between(0, 11);
  let stage = STAGES[stageIdx].id;
  if (visa === "visit" && stage === "docassess") stage = "appointment";
  const since = between(0, 28);
  const isOutcome = stage === "outcome";
  const approved = isOutcome && rnd() > 0.4;
  const onHold = !isOutcome && rnd() > 0.9;
  const agentId = rnd() > 0.65 ? pick(["ag1", "ag2"]) : undefined;
  const guide = STAGE_GUIDE[stage];
  SEED_CASES.push({
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
    endReason: onHold ? "Paused while the client arranges documents" : isOutcome && !approved ? "Denied by the authority" : undefined,
    waitingFor: guide.waitingFor,
    nextAction: guide.nextAction,
    notes: rnd() > 0.5 ? [{ text: "Client confirmed contact details and preferred call time.", author: ACTOR[owner], at: isoFromToday(-since) }] : [],
    history: trail(pathTo(stage, visa), since, ACTOR[owner]),
    updatedAt: isoFromToday(-Math.max(0, since - 1)),
  });
}


/* ─── Process: owners, lanes and handoffs (from the client's flowchart) ─── */
export const STAGE_OWNER: Record<StageId, StageOwner> = {
  lead: "social", firstcall: "sales", docassess: "sales", appointment: "sales", deal: "sales", advance: "sales",
  doccollect: "case", verify: "case", prep: "case", review: "case", submitted: "case", outcome: "case",
};
export const OWNER_LABEL: Record<StageOwner, string> = { social: "Social Media Team", sales: "Sales Team", case: "Case Manager", leadership: "Admin / Manager" };
/** "Waiting to be accepted in the Sales Team (Study team)": which team a waiting case is with. */
export function waitingLabel(c: { route?: { to: StageOwner; kind: string; visa?: TeamId }; visa: VisaChoice }, short = false): string {
  if (!c.route) return "";
  const team = OWNER_LABEL[c.route.to].replace(/ Team$/, "");
  const visa = c.route.kind === "visa" ? ` · ${VISA_TYPES.find((v) => v.id === (c.route!.visa ?? c.visa))?.label ?? ""} team` : "";
  return short ? `Waiting · ${team}${visa}` : `Waiting to be accepted in ${team}${visa}`;
}
export const WORK_TEAM_LABEL: Record<WorkTeam, string> = { social: "Social Media Team", sales: "Sales Team", case: "Case Manager" };
export const PRIORITY_LABEL: Record<Priority, string> = { normal: "Normal", high: "High", urgent: "Urgent" };

export const PROCESS_LANES: { owner: StageOwner; handoff?: string; steps: { label: string; note: string; stage?: StageId }[] }[] = [
  { owner: "social", handoff: "Pass to Sales: a specific person, a visa team, or the whole Sales Team", steps: [
    { label: "Lead comes in", note: "Instagram, Facebook, WhatsApp" },
    { label: "Create client or lead", note: "Visa type, budget, destination", stage: "lead" },
    { label: "Pass to Sales", note: "Person, visa team or next team" },
  ] },
  { owner: "sales", handoff: "Pass to Case Manager: a specific person, a visa team, or any case manager", steps: [
    { label: "Accept the lead", note: "First member to accept gets it" },
    { label: "1. First call", note: "Within 24 hours", stage: "firstcall" },
    { label: "2. Document assessment", note: "Within 48 hours of the call", stage: "docassess" },
    { label: "3. Office appointment", note: "Within 48 hours of the assessment", stage: "appointment" },
    { label: "4. Deal finalised", note: "Same day as the visit", stage: "deal" },
    { label: "5. Advance / fees collection", note: "Payment confirmed", stage: "advance" },
  ] },
  { owner: "case", steps: [
    { label: "Accept the case", note: "Any available case manager, or the admin assigns" },
    { label: "6. Document collection", note: "List sent within 24 hours", stage: "doccollect" },
    { label: "7. Verify documents", note: "Completeness, translations", stage: "verify" },
    { label: "8. Case prep", note: "Within 5 working days", stage: "prep" },
    { label: "9. Review", note: "Sign-off before submission", stage: "review" },
    { label: "10. Submit", note: "Time recorded, then what happened", stage: "submitted" },
    { label: "11. Result", note: "Approved, denied or other", stage: "outcome" },
  ] },
];

const SALES_BY_VISA: Record<TeamId, string> = { study: "u-omar", visit: "u-omar", work: "u-noura", skilled: "u-noura", eb2niw: "u-faisal" };
const CM_BY_VISA: Record<TeamId, string> = { study: "u-sultan", visit: "u-sultan", work: "u-dina", skilled: "u-dina", eb2niw: "u-dina" };
const DESTINATION: Record<TeamId, string> = { study: "Canada", work: "Australia", visit: "United Kingdom", skilled: "Germany", eb2niw: "United States" };
/** "Toronto · Ontario" style text for lists and headings. Empty when neither is known. */
export const destinationOf = (c: { destination?: string; subDestination?: string }) => [c.destination, c.subDestination].filter(Boolean).join(" · ");

/** Who is responsible when a case sits in this stage. */
export function responsibleFor(stage: StageId, c: { leadById: string; salesId: string; caseManagerId: string }): string {
  const owner = STAGE_OWNER[stage];
  return owner === "social" ? c.leadById : owner === "sales" ? c.salesId : c.caseManagerId;
}

const PRIORITIES: Priority[] = ["normal", "normal", "high", "normal", "urgent"];
const DAY_MS = 86_400_000;

export const CASES: Case[] = SEED_CASES.map((c, i) => {
  const ids = { leadById: "u-reem", salesId: SALES_BY_VISA[c.visa as TeamId], caseManagerId: CM_BY_VISA[c.visa as TeamId] };
  const idx = STAGES.findIndex((x) => x.id === c.stage);
  const since = new Date(c.stageSince).getTime();
  const at = (k: StageId) => STAGES.findIndex((x) => x.id === k);
  const base: Case = {
    ...c, ...ids,
    priority: PRIORITIES[i % PRIORITIES.length],
    destination: DESTINATION[c.visa as TeamId],
    consultantId: "",
    appointmentAt: c.stage === "appointment" ? new Date(since + DAY_MS).toISOString() : undefined,
    agreementSigned: idx >= at("advance") ? true : undefined,
    feesCollectedSar: idx >= at("doccollect") ? 3500 + (i % 4) * 500 : undefined,
    docsVerified: idx >= at("prep") ? true : undefined,
    qcApprovedAt: idx >= at("submitted") || c.ref === "PG-26-0005" ? new Date(since - DAY_MS).toISOString() : undefined,
    qcBy: idx >= at("submitted") || c.ref === "PG-26-0005" ? "Layla Hassan" : undefined,
    submittedAt: idx >= at("submitted") ? new Date(since - DAY_MS / 2).toISOString() : undefined,
    submissionLog: idx >= at("submitted") ? [{ status: "received", by: "Dina Karim", at: new Date(since - DAY_MS / 2).toISOString() }] : undefined,
    dealFeeSar: idx >= at("advance") ? 6000 + (i % 5) * 1000 : undefined,
    campaign: c.leadSource === "Instagram" ? "IG Study Abroad Oct" : c.leadSource === "Facebook" ? "FB Work Permit Leads" : c.leadSource === "TikTok" ? "TikTok Visa Tips" : undefined,
    issues: c.status === "on_hold"
      ? [{ id: `is-${c.id}`, kind: "client", text: c.endReason ?? "Waiting for the client", by: "Omar Saleh", at: c.stageSince }]
      : c.ref === "PG-26-0011"
        ? [{ id: `is-${c.id}`, kind: "third_party", text: "University has not issued the degree attestation yet.", by: "Faisal Mansour", at: isoFromToday(-3) }]
        : c.ref === "PG-26-0004"
          ? [{ id: `is-${c.id}`, kind: "authority", text: "VFS asked for an extra bank letter.", by: "Noura Al-Qahtani", at: isoFromToday(-4), resolvedAt: isoFromToday(-2), resolvedBy: "Noura Al-Qahtani", resolution: "Bank letter sent to VFS." }]
          : [],
  };
  // A few cases wait in a pool to show the accept flow.
  if (c.ref === "PG-26-0008") { base.salesId = ""; base.route = { to: "sales", kind: "visa", visa: c.visa as TeamId, by: "Reem Al-Zahrani", at: isoFromToday(-1) }; }
  if (c.ref === "PG-26-0011") { base.caseManagerId = ""; base.route = { to: "case", kind: "team", by: "Faisal Mansour", at: isoFromToday(-1) }; }
  base.consultantId = base.route ? "" : responsibleFor(c.stage, ids.leadById ? { leadById: base.leadById, salesId: base.salesId, caseManagerId: base.caseManagerId } : ids);
  return base;
});

export const TODOS: Todo[] = [
  { id: "td1", title: "Call back the new Instagram leads", due: isoFromToday(0), priority: "high", done: false, ownerId: "u-reem", createdBy: "u-reem", createdAt: isoFromToday(-1) },
  { id: "td2", title: "Update lead source notes for last week", due: isoFromToday(2), priority: "normal", done: false, ownerId: "u-reem", createdBy: "u-admin", createdAt: isoFromToday(-2) },
  { id: "td3", title: "Confirm office appointment slots with Layla", due: isoFromToday(1), priority: "normal", done: false, ownerId: "u-omar", createdBy: "u-omar", createdAt: isoFromToday(-1) },
  { id: "td4", title: "Send fee breakdown to client", due: isoFromToday(-1), priority: "urgent", done: false, ownerId: "u-omar", createdBy: "u-admin", createdAt: isoFromToday(-3) },
  { id: "td5", title: "Chase degree attestation", due: isoFromToday(3), priority: "high", done: false, ownerId: "u-dina", createdBy: "u-dina", createdAt: isoFromToday(-2), caseId: "cs11" },
  { id: "td6", title: "Archive closed files from September", due: null, priority: "normal", done: true, ownerId: "u-sultan", createdBy: "u-sultan", createdAt: isoFromToday(-8) },
  { id: "td7", title: "Review team workload report", due: isoFromToday(4), priority: "normal", done: false, ownerId: "u-admin", createdBy: "u-admin", createdAt: isoFromToday(-1) },
];
