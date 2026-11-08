import { api, body, notFound, requireAdmin } from "@/lib/server/http";
import { AgentModel } from "@/lib/server/models";
import { out } from "@/lib/server/data";
import { agentPatch } from "@/lib/server/schemas";
import type { Agent } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  requireAdmin(user);
  const patch = await body(req, agentPatch);
  const doc = await AgentModel.findByIdAndUpdate(params.id, { $set: patch }, { new: true }).lean();
  if (!doc) throw notFound("Agent not found.");
  return { agent: out<Agent>(doc as never) };
});
