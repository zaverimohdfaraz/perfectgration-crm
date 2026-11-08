import { api, body, bad, deny } from "@/lib/server/http";
import { TaskModel, UserModel } from "@/lib/server/models";
import { getVisibleCase, out } from "@/lib/server/data";
import { newTask } from "@/lib/server/schemas";
import { canEditCase } from "@/lib/permissions";
import type { Task } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/** Partner tasks: work waiting on a third party. Leaders, or the person holding the case, can add one. */
export const POST = api(async ({ req, user }) => {
  const t = await body(req, newTask);
  const c = await getVisibleCase(user, t.caseId);
  if (user.role === "consultant" && !canEditCase(user, c)) throw deny("Only the person who holds this case can add a partner task.");
  if (!(await UserModel.exists({ _id: t.assigneeId }))) throw bad("Choose who follows this up.");
  const doc = await TaskModel.create({ _id: t.id, title: t.title, caseId: c.id, partner: t.partner, assigneeId: t.assigneeId, deadline: t.deadline, progress: 0 });
  return { task: out<Task>(doc.toObject()) };
});
