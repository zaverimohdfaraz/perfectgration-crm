import { api, body, deny, notFound } from "@/lib/server/http";
import { CaseModel, UploadLinkModel } from "@/lib/server/models";
import { nowIso, out, outCase } from "@/lib/server/data";
import { linkPatch } from "@/lib/server/schemas";
import { canSeeCase, canTerminateUploadLink } from "@/lib/permissions";
import type { UploadLink } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/** Ends a link early. Files already received are kept. */
export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  await body(req, linkPatch);
  const raw = await UploadLinkModel.findById(params.id).lean();
  if (!raw) throw notFound("Link not found.");
  const link = out<UploadLink>(raw as never);
  const caseRaw = await CaseModel.findById(link.caseId).lean();
  const c = caseRaw ? outCase(caseRaw as never) : undefined;
  if (user.role === "consultant" && !(c && canSeeCase(user, c)) && link.createdById !== user.id) throw notFound("Link not found.");
  if (!canTerminateUploadLink(user, link, c)) throw deny("You cannot end this link.");
  if (link.terminatedAt) return { link };
  const updated = await UploadLinkModel.findByIdAndUpdate(link.id, { $set: { terminatedAt: nowIso(), terminatedById: user.id } }, { new: true }).lean();
  return { link: out<UploadLink>(updated as never) };
});
