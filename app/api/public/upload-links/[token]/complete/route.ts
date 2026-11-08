import { publicApi, body, bad, HttpError } from "@/lib/server/http";
import { publicComplete } from "@/lib/server/schemas";
import { readTicket } from "@/lib/server/auth";
import { ALLOWED_TYPES, MAX_FILE_BYTES, deleteFile, headFile } from "@/lib/server/s3";
import { ClientModel, DocumentModel, UploadLinkModel } from "@/lib/server/models";
import { newId, nowIso } from "@/lib/server/data";
import { COMPLETE_GRACE_MS, MAX_UPLOADS_PER_LINK, findLink } from "@/lib/server/public-links";

export const dynamic = "force-dynamic";

/**
 * Client upload, step 2: checks the file arrived in S3, then records it on the case.
 * When the file matches a requested document that is still waiting, it is attached to that document; otherwise a new document is added.
 */
export const POST = publicApi<{ token: string }>(async ({ req, params }) => {
  const { ticket } = await body(req, publicComplete);
  const t = await readTicket(ticket);
  if (!t || t.token !== params.token) throw bad("This upload could not be confirmed. Please try again.");
  const link = await findLink(params.token);
  if (!link) throw new HttpError(404, "This link does not exist.");
  if (link.terminatedAt || Date.parse(link.expiresAt) + COMPLETE_GRACE_MS < Date.now()) {
    await deleteFile(t.key);
    throw new HttpError(410, "This link is no longer open.");
  }
  if (link.uploads.length >= MAX_UPLOADS_PER_LINK) { await deleteFile(t.key); throw bad("The upload limit for this link has been reached."); }
  if (!t.key.startsWith(`cases/${link.caseId}/`)) throw bad("This upload could not be confirmed.");
  if (await DocumentModel.exists({ storageKey: t.key })) return { ok: true }; // already recorded (the browser retried)

  const head = await headFile(t.key);
  if (!head) throw bad("The file did not arrive. Please try again.");
  if (head.size > MAX_FILE_BYTES || !ALLOWED_TYPES[head.contentType]) {
    await deleteFile(t.key);
    throw bad("Only PDF, JPG, PNG or WEBP files up to 10 MB are accepted.");
  }

  const at = nowIso();
  const client = (await ClientModel.findById(link.clientId).lean()) as { name?: string } | null;
  const by = `${client?.name ?? "Client"} (client upload)`;
  const file = { fileName: t.fileName, storageKey: t.key, size: head.size, contentType: head.contentType, source: "client_link", linkId: link.id, uploadedBy: by, at };
  const waiting = t.item ? await DocumentModel.findOneAndUpdate({ caseId: link.caseId, name: t.item, status: "pending", storageKey: { $exists: false } }, { $set: { ...file, status: "received" } }, { new: true }).lean() : null;
  const docId = (waiting as { _id?: string } | null)?._id ?? newId("d");
  if (!waiting) {
    await DocumentModel.create({ _id: docId, caseId: link.caseId, name: t.item ?? t.fileName.replace(/\.[^.]+$/, "").slice(0, 160), category: "", status: "received", ...file });
  }
  const name = t.item ?? t.fileName;
  await UploadLinkModel.updateOne({ _id: link.id }, { $push: { uploads: { docId, name, item: t.item, at } } });
  return { ok: true, received: { name, item: t.item, at } };
});
