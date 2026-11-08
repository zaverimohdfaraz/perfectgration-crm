import { api, body, deny } from "@/lib/server/http";
import { ClientModel } from "@/lib/server/models";
import { out, nowIso } from "@/lib/server/data";
import { newClient } from "@/lib/server/schemas";
import { canAddCases } from "@/lib/permissions";
import type { Client } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const POST = api(async ({ req, user }) => {
  if (!canAddCases(user)) throw deny("Only the Social Media team or an administrator can add clients.");
  const input = await body(req, newClient);
  const doc = await ClientModel.create({ _id: input.id, name: input.name, phone: input.phone, email: input.email, nationality: input.nationality, country: input.country ?? "", dob: input.dob ?? "", updatedAt: nowIso() });
  return { client: out<Client>(doc.toObject()) };
});
