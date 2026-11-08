import { api, body, deny, notFound } from "@/lib/server/http";
import { CaseModel, TaskModel } from "@/lib/server/models";
import { out, outCase } from "@/lib/server/data";
import { taskPatch } from "@/lib/server/schemas";
import { canEditCase } from "@/lib/permissions";
import type { Task } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  const patch = await body(req, taskPatch);
  const raw = await TaskModel.findById(params.id).lean();
  if (!raw) throw notFound("Task not found.");
  const t = out<Task>(raw as never);
  if (user.role === "consultant" && t.assigneeId !== user.id) {
    const c = await CaseModel.findById(t.caseId).lean();
    if (!c || !canEditCase(user, outCase(c as never))) throw deny("You cannot update this task.");
  }
  const doc = await TaskModel.findByIdAndUpdate(t.id, { $set: patch }, { new: true }).lean();
  return { task: out<Task>(doc as never) };
});
