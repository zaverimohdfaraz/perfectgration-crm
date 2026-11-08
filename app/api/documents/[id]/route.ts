import { api, body } from "@/lib/server/http";
import { DocumentModel } from "@/lib/server/models";
import { out } from "@/lib/server/data";
import { docPatch } from "@/lib/server/schemas";
import type { Doc } from "@/lib/demo-data";
import { docFor } from "../doc-access";

export const dynamic = "force-dynamic";

export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  const patch = await body(req, docPatch);
  await docFor(user, params.id, true);
  const doc = await DocumentModel.findByIdAndUpdate(params.id, { $set: patch }, { new: true }).lean();
  return { doc: out<Doc>(doc as never) };
});
