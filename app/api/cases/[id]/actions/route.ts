import { api, body, bad, HttpError } from "@/lib/server/http";
import { AgentModel, CaseModel } from "@/lib/server/models";
import { ctxFor, forViewer, getCase, nextCaseRef, saveCase } from "@/lib/server/data";
import { shareNow } from "@/lib/server/lead-share";
import { caseAction } from "@/lib/server/schemas";
import * as L from "@/lib/case-logic";
import { canSeeCase } from "@/lib/permissions";
import { STAGE_OWNER, type Case } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/**
 * Every change to a case goes through here. The server runs exactly the same rule functions as the browser
 * (lib/case-logic.ts), on the copy stored in the database, and saves the result.
 */
export const POST = api<{ id: string }>(async ({ req, user, params }) => {
  const a = await body(req, caseAction);
  const { c } = await getCase(params.id);
  if (!canSeeCase(user, c)) {
    // Someone else on the same team pressed Accept first.
    if (a.type === "claim" && !c.route && user.role === "consultant" && user.workTeam === STAGE_OWNER[c.stage]) throw new HttpError(409, "Someone else already accepted this case.");
    throw new HttpError(404, "Case not found.");
  }
  const x = await ctxFor(user);

  if (a.type === "outcome") {
    const res = L.logOutcome(c, x, { result: a.result, commission: a.commission, followUp: a.followUp, note: a.note, newId: a.newId, newRef: a.followUp === "reapply" && a.result === "refused" ? await nextCaseRef() : "unused" });
    if (L.isFail(res)) throw bad(res.error);
    const saved = await saveCase(c, res.updated);
    let created: Case | undefined;
    if (res.created) {
      const { id, ...rest } = res.created;
      delete (rest as Partial<Case>).pastWork;
      await CaseModel.create({ _id: id, ...rest });
      created = forViewer(user, res.created);
    }
    return { case: forViewer(user, saved), created };
  }

  let res: Case | L.Fail;
  switch (a.type) {
    case "edit": res = L.editCase(c, x, a.patch); break;
    case "move": res = L.moveStage(c, x, a); break;
    case "pass": res = L.passCase(c, x, a.target, a.note, { fees: a.fees }); break;
    case "claim": res = L.claimCase(c, x); break;
    case "assign": res = L.assignCase(c, x, a.team, a.userId); break;
    case "submission": res = L.addSubmissionUpdate(c, x, a.status, a.note); break;
    case "approveQc": res = L.approveQc(c, x); break;
    case "returnQc": res = L.returnQc(c, x, a.note); break;
    case "end": res = L.endCase(c, x, a.status, a.reason, a.kind); break;
    case "reactivate": res = L.reactivate(c, x); break;
    case "keep": res = L.keepLead(c, x); break;
    case "agent": {
      const agent = a.agentId ? await AgentModel.findById(a.agentId).lean() as { name?: string } | null : null;
      if (a.agentId && !agent) throw bad("That agent does not exist.");
      res = L.linkAgent(c, x, a.agentId, agent?.name);
      break;
    }
    case "agentPaid": res = L.setAgentPaid(c, x, a.paid); break;
    case "agentCommission": res = L.setAgentCommission(c, x, a.amount); break;
    case "note": res = L.addNote(c, x, a.text); break;
    case "issue": res = L.addIssue(c, x, a.kind, a.text, a.issueId); break;
    case "resolveIssue": res = L.resolveIssue(c, x, a.issueId, a.resolution); break;
  }
  if (L.isFail(res)) throw bad(res.error);
  let saved = await saveCase(c, res);
  // A lead just passed to the Sales pool is shared at once among the Sales members who are online.
  if (a.type === "pass" && saved.route?.to === "sales") saved = await shareNow(saved);
  return { case: forViewer(user, saved) };
});
