import { api, body, deny } from "@/lib/server/http";
import { CaseModel } from "@/lib/server/models";
import { getVisibleCase } from "@/lib/server/data";
import { assessment } from "@/lib/server/schemas";
import { canEditCase } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const PUT = api<{ id: string }>(async ({ req, user, params }) => {
  const a = await body(req, assessment);
  const c = await getVisibleCase(user, params.id);
  if (!canEditCase(user, c)) throw deny("Only the person who holds this case can save the assessment.");
  await CaseModel.updateOne({ _id: c.id }, { $set: { assessment: { ...a, assessedBy: user.name } } });
  return { ok: true };
});
