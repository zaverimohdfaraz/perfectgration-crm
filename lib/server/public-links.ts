import "server-only";
import { CaseModel, ClientModel, UploadLinkModel } from "./models";
import { loadSettings, out } from "./data";
import { linkState } from "@/lib/permissions";
import type { UploadLink } from "@/lib/demo-data";
import { connectDb } from "./db";

/** The only things a client ever sees on the upload page. Nothing else from the CRM is exposed. */
export type PublicLinkInfo = {
  state: "active" | "expired" | "terminated" | "missing";
  company: string;
  firstName: string;
  requested: string[];
  message?: string;
  expiresAt?: string;
  received: { name: string; item?: string; at: string }[];
};

export const MAX_UPLOADS_PER_LINK = 40;
/** A file that started uploading just before the expiry may still finish within this grace period. */
export const COMPLETE_GRACE_MS = 15 * 60_000;

const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

export async function findLink(token: string): Promise<UploadLink | null> {
  if (!TOKEN_RE.test(token)) return null;
  await connectDb();
  const raw = await UploadLinkModel.findOne({ token }).lean();
  return raw ? out<UploadLink>(raw as never) : null;
}

export async function publicLinkInfo(token: string): Promise<PublicLinkInfo> {
  await connectDb();
  const settings = await loadSettings();
  const company = settings.company.tradingName || "Perfectgration";
  const link = await findLink(token);
  if (!link || !(await CaseModel.exists({ _id: link.caseId }))) return { state: "missing", company, firstName: "", requested: [], received: [] };
  const client = (await ClientModel.findById(link.clientId).lean()) as { name?: string } | null;
  return {
    state: linkState(link, Date.now()),
    company,
    firstName: (client?.name ?? "").split(" ")[0] ?? "",
    requested: link.requested,
    message: link.message,
    expiresAt: link.expiresAt,
    received: link.uploads.map((u) => ({ name: u.name, item: u.item, at: u.at })),
  };
}
