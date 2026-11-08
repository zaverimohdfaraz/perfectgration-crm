import { api, body, bad } from "@/lib/server/http";
import { DocumentModel } from "@/lib/server/models";
import { out, nowIso } from "@/lib/server/data";
import { completeUpload } from "@/lib/server/schemas";
import { ALLOWED_TYPES, MAX_FILE_BYTES, deleteFile, headFile } from "@/lib/server/s3";
import type { Doc } from "@/lib/demo-data";
import { docFor } from "../../doc-access";

export const dynamic = "force-dynamic";

/** Step 2: checks the file really arrived in S3, then saves only its key and details on the document. */
export const POST = api<{ id: string }>(async ({ req, user, params }) => {
  const input = await body(req, completeUpload);
  const { doc, c } = await docFor(user, params.id, true);
  if (!input.key.startsWith(`cases/${c.id}/`) || input.key.includes("..")) throw bad("That file does not belong to this case.");
  const head = await headFile(input.key);
  if (!head) throw bad("The file did not arrive in storage. Please try again.");
  if (head.size > MAX_FILE_BYTES || !ALLOWED_TYPES[head.contentType]) {
    await deleteFile(input.key);
    throw bad("Only PDF, JPG, PNG or WEBP files up to 10 MB are accepted.");
  }
  const updated = await DocumentModel.findByIdAndUpdate(doc.id, {
    $set: { status: doc.status === "verified" ? "verified" : "received", uploadedBy: user.name, at: nowIso(), fileName: input.fileName, storageKey: input.key, size: head.size, contentType: head.contentType, source: "team" },
    $unset: { linkId: 1 },
  }, { new: true }).lean();
  if (doc.storageKey && doc.storageKey !== input.key) await deleteFile(doc.storageKey);
  return { doc: out<Doc>(updated as never) };
});
