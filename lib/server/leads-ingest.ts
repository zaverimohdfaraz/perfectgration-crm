import "server-only";
import { CaseModel, ClientModel } from "./models";
import { ctxFor, newId, nextCaseRef, nowIso } from "./data";
import { shareNow } from "./lead-share";
import { createCase, isFail } from "@/lib/case-logic";
import type { IncomingLead } from "@/lib/leads";
import type { User } from "@/lib/demo-data";
import { connectDb } from "./db";

/** The platform itself acts as the person who creates these leads (shown in the history as "Facebook lead form"). */
const actorFor = (source: IncomingLead["source"]) =>
  ({
    id: `sys_${source}_leads`, name: source === "meta" ? "Facebook lead form" : "Google Ads lead form", email: "", role: "consultant", workTeam: "social",
    teams: [], title: "Automatic", canAdd: false, inactive: false, lastSeen: nowIso(), mustChangePassword: false, sessionVersion: 1,
  }) as unknown as User;

const VISAS = ["study", "work", "visit", "skilled", "eb2niw"] as const;

/**
 * Visa for a lead whose form and campaign name say nothing about the visa. Set LEADS_DEFAULT_VISA in Vercel
 * (study, work, visit, skilled or eb2niw) to use one; leave it empty and the lead shows "Visa not chosen" until someone picks it.
 */
function defaultVisa(): IncomingLead["visa"] {
  const v = process.env.LEADS_DEFAULT_VISA?.trim().toLowerCase() ?? "";
  return (VISAS as readonly string[]).includes(v) ? (v as IncomingLead["visa"]) : "";
}

/**
 * Adds one lead from a platform. It goes straight to the Sales Team, exactly like a lead made by the Social Media team.
 * A lead that was already added is ignored, so the platform can safely send it again.
 */
export async function ingestLead(l: IncomingLead): Promise<{ status: "created" | "duplicate"; ref?: string }> {
  await connectDb();
  if (await CaseModel.exists({ externalId: l.externalId })) return { status: "duplicate" };

  // One client per phone number: a person who fills in two forms is the same client.
  let clientId: string | undefined;
  if (l.phone) clientId = ((await ClientModel.findOne({ phone: l.phone }).lean()) as { _id: string } | null)?._id;
  if (!clientId) {
    clientId = newId("cl");
    await ClientModel.create({ _id: clientId, name: l.name, phone: l.phone, email: l.email, nationality: "", country: "", dob: "", updatedAt: nowIso() });
  }

  // A lead from a spreadsheet keeps the time the person actually filled in the form.
  const x0 = await ctxFor(actorFor(l.source));
  const x = l.createdAt ? { ...x0, at: l.createdAt } : x0;
  const res = createCase(x, {
    id: newId("cs"), ref: await nextCaseRef(), clientId, visa: l.visa || defaultVisa(), leadSource: l.leadSource, campaign: l.campaign,
    priority: "normal", destination: "", note: l.answers.length ? `Form answers. ${l.answers.join(" · ")}` : undefined,
    pass: { kind: "team" },
  });
  if (isFail(res)) throw new Error(res.error);
  const { id, ...rest } = res;
  await CaseModel.create({ _id: id, ...rest, externalId: l.externalId });
  await shareNow(res);
  return { status: "created", ref: res.ref };
}

export const leadsLive = () => process.env.NEXT_PUBLIC_DATA_MODE === "api";
