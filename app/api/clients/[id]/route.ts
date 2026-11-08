import { api, body, deny, notFound } from "@/lib/server/http";
import { CaseModel, ClientModel } from "@/lib/server/models";
import { out, outCase, nowIso } from "@/lib/server/data";
import { clientPatch } from "@/lib/server/schemas";
import { canEditCase } from "@/lib/permissions";
import type { Client } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/** Administrators and managers can edit any client. A team member can edit a client whose case they hold right now. */
export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  const patch = await body(req, clientPatch);
  if (user.role === "consultant") {
    const cases = (await CaseModel.find({ clientId: params.id }).lean()) as never[];
    if (!cases.map(outCase).some((c) => canEditCase(user, c))) throw deny("You can only edit clients whose case you hold.");
  }
  const doc = await ClientModel.findByIdAndUpdate(params.id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true }).lean();
  if (!doc) throw notFound("Client not found.");
  return { client: out<Client>(doc as never) };
});
