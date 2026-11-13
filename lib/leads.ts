/**
 * Leads that arrive automatically from Meta (Facebook and Instagram lead forms) and Google Ads lead forms.
 * Pure rules, no server code: they read a lead and check the security of each request.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { TeamId } from "./demo-data";

export type IncomingLead = {
  source: "meta" | "google";
  /** The platform's own id for this lead. A lead is only ever created once. */
  externalId: string;
  name: string;
  phone: string;
  email: string;
  campaign?: string;
  visa: TeamId;
  leadSource: string;
  /** The other form answers, written into the first note. */
  answers: string[];
};

/** Visa words that a form question may contain, e.g. "Which visa do you need?" → "Study". */
const VISA_WORDS: [TeamId, RegExp][] = [
  ["eb2niw", /eb-?2|niw/i],
  ["skilled", /skill/i],
  ["study", /study|student|university|college/i],
  ["work", /\bwork|job|employ/i],
  ["visit", /visit|tourist|tourism|family/i],
];
/** Used when the form does not say which visa the person wants. Sales confirms it when they open the lead. */
export const DEFAULT_VISA: TeamId = "study";

export function visaFromAnswer(label: string, value: string): TeamId | undefined {
  if (!/visa|service|interest|need/i.test(label)) return undefined;
  return VISA_WORDS.find(([, re]) => re.test(value))?.[0];
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Meta sends each answer as {name, values}. Names are lower-case field names from the form. */
export function parseMetaLead(graph: { field_data?: { name: string; values?: string[] }[]; campaign_name?: string }, leadgenId: string): IncomingLead {
  const answers = graph.field_data ?? [];
  const value = (name: string) => clean(answers.find((f) => f.name === name)?.values?.[0]);
  const name = value("full_name") || [value("first_name"), value("last_name")].filter(Boolean).join(" ");
  let visa: TeamId | undefined;
  const other: string[] = [];
  for (const f of answers) {
    const v = clean(f.values?.[0]);
    if (!v || ["full_name", "first_name", "last_name", "phone_number", "email"].includes(f.name)) continue;
    visa = visa ?? visaFromAnswer(f.name, v);
    other.push(`${f.name.replace(/_/g, " ")}: ${v}`);
  }
  return {
    source: "meta", externalId: `meta:${leadgenId}`,
    name: name || "Facebook lead", phone: value("phone_number"), email: value("email"),
    campaign: clean(graph.campaign_name) || undefined,
    visa: visa ?? DEFAULT_VISA, leadSource: "Facebook", answers: other,
  };
}

/** Google sends the answers as user_column_data: {column_id, column_name, string_value}. */
export function parseGoogleLead(body: { lead_id?: unknown; campaign_id?: unknown; user_column_data?: { column_id?: string; column_name?: string; string_value?: string }[] }): IncomingLead {
  const cols = body.user_column_data ?? [];
  const value = (id: string) => clean(cols.find((c) => c.column_id === id)?.string_value);
  const name = value("FULL_NAME") || [value("FIRST_NAME"), value("LAST_NAME")].filter(Boolean).join(" ");
  let visa: TeamId | undefined;
  const other: string[] = [];
  for (const c of cols) {
    const v = clean(c.string_value);
    const label = c.column_name || c.column_id || "";
    if (!v || ["FULL_NAME", "FIRST_NAME", "LAST_NAME", "PHONE_NUMBER", "EMAIL"].includes(c.column_id ?? "")) continue;
    visa = visa ?? visaFromAnswer(label, v);
    other.push(`${label}: ${v}`);
  }
  return {
    source: "google", externalId: `google:${clean(String(body.lead_id ?? ""))}`,
    name: name || "Google Ads lead", phone: value("PHONE_NUMBER"), email: value("EMAIL"),
    campaign: clean(String(body.campaign_id ?? "")) ? `Campaign ${clean(String(body.campaign_id))}` : undefined,
    visa: visa ?? DEFAULT_VISA, leadSource: "Google Ads", answers: other,
  };
}

/** Meta signs every request with the app secret: X-Hub-Signature-256 = "sha256=" + HMAC of the raw body. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !appSecret || !header.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Compares two secrets without revealing where they differ. */
export function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return !!a && x.length === y.length && timingSafeEqual(x, y);
}

/** Meta's lead-form data is sent with the page or system token; the app secret proof is required if the app asks for it. */
export const appSecretProof = (token: string, secret: string) => createHmac("sha256", secret).update(token).digest("hex");
