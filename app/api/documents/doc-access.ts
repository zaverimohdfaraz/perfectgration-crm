import "server-only";
import { deny, notFound } from "@/lib/server/http";
import { DocumentModel } from "@/lib/server/models";
import { getVisibleCase, out } from "@/lib/server/data";
import { canEditCase } from "@/lib/permissions";
import type { Case, Doc, User } from "@/lib/demo-data";

/** Loads a document and its case, checking the person may see it (and change it, when `edit` is set). */
export async function docFor(user: User, id: string, edit: boolean): Promise<{ doc: Doc; c: Case }> {
  const raw = await DocumentModel.findById(id).lean();
  if (!raw) throw notFound("Document not found.");
  const doc = out<Doc>(raw as never);
  const c = await getVisibleCase(user, doc.caseId).catch(() => {
    throw notFound("Document not found.");
  });
  if (edit && !canEditCase(user, c)) throw deny("Only the person who holds this case can change its documents.");
  return { doc, c };
}
