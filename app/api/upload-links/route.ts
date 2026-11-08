import { randomBytes } from "node:crypto";
import { api, body, bad, deny } from "@/lib/server/http";
import { UploadLinkModel } from "@/lib/server/models";
import { getVisibleCase, newId, nowIso, out } from "@/lib/server/data";
import { newLink } from "@/lib/server/schemas";
import { canCreateUploadLink } from "@/lib/permissions";
import type { UploadLink } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

const HOUR = 3_600_000;

/** Creates a link a client can use to upload files for one case, until it expires or is ended. */
export const POST = api(async ({ req, user }) => {
  const input = await body(req, newLink);
  const c = await getVisibleCase(user, input.caseId);
  if (!canCreateUploadLink(user, c)) throw deny("Only the person who holds this case can send an upload link.");
  const left = Date.parse(input.expiresAt) - Date.now();
  if (left < HOUR - 5 * 60_000 || left > 30 * 24 * HOUR) throw bad("Choose an expiry between 1 hour and 30 days from now.");
  const doc = await UploadLinkModel.create({
    _id: newId("ul"),
    // 32 random bytes: impossible to guess. The link only allows uploading to this case; it shows nothing from the CRM.
    token: randomBytes(32).toString("base64url"),
    caseId: c.id, clientId: c.clientId, createdById: user.id, createdAt: nowIso(), expiresAt: new Date(input.expiresAt).toISOString(),
    requested: [...new Set(input.requested)], message: input.message || undefined, uploads: [],
  });
  return { link: out<UploadLink>(doc.toObject()) };
});
