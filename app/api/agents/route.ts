import { api, body, requireAdmin } from "@/lib/server/http";
import { AgentModel } from "@/lib/server/models";
import { out } from "@/lib/server/data";
import { newAgent } from "@/lib/server/schemas";
import type { Agent } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const POST = api(async ({ req, user }) => {
  requireAdmin(user);
  const a = await body(req, newAgent);
  const { id, ...rest } = a;
  const doc = await AgentModel.create({ _id: id, ...rest, paid: false });
  return { agent: out<Agent>(doc.toObject()) };
});
