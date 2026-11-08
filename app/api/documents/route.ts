import { api, body, deny } from "@/lib/server/http";
import { DocumentModel } from "@/lib/server/models";
import { getVisibleCase, out, nowIso } from "@/lib/server/data";
import { newDoc } from "@/lib/server/schemas";
import { canEditCase } from "@/lib/permissions";
import type { Doc } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/** Adds a named document to a case. The file is attached separately (upload-url, then complete). */
export const POST = api(async ({ req, user }) => {
  const input = await body(req, newDoc);
  const c = await getVisibleCase(user, input.caseId);
  if (!canEditCase(user, c)) throw deny("Only the person who holds this case can add documents.");
  const doc = await DocumentModel.create({ _id: input.id, caseId: c.id, name: input.name, note: input.note || undefined, needsTranslation: input.needsTranslation || undefined, category: "", status: "pending", uploadedBy: "—", at: nowIso(), source: "team" });
  return { doc: out<Doc>(doc.toObject()) };
});
