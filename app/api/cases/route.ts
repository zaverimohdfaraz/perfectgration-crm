import { api, body, bad } from "@/lib/server/http";
import { AgentModel, CaseModel, ClientModel } from "@/lib/server/models";
import { ctxFor, forViewer, nextCaseRef } from "@/lib/server/data";
import { shareNow } from "@/lib/server/lead-share";
import { newCase } from "@/lib/server/schemas";
import { createCase, isFail } from "@/lib/case-logic";

export const dynamic = "force-dynamic";

/** Create a lead. The case reference (PG-26-0001) is always given by the server. */
export const POST = api(async ({ req, user }) => {
  const input = await body(req, newCase);
  if (!(await ClientModel.exists({ _id: input.clientId }))) throw bad("Choose an existing client.");
  if (input.agentId && !(await AgentModel.exists({ _id: input.agentId }))) throw bad("That referral agent does not exist.");
  const x = await ctxFor(user);
  const res = createCase(x, { ...input, ref: await nextCaseRef() });
  if (isFail(res)) throw bad(res.error);
  const { id, ...rest } = res;
  await CaseModel.create({ _id: id, ...rest });
  return { case: forViewer(user, res.route?.to === "sales" ? await shareNow(res) : res) };
});
