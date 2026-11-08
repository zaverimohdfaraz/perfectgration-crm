import { api, body, bad, deny } from "@/lib/server/http";
import { TodoModel, UserModel } from "@/lib/server/models";
import { nowIso, out } from "@/lib/server/data";
import { newTodo } from "@/lib/server/schemas";
import { canManageTodo } from "@/lib/permissions";
import type { Todo } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/** The administrator manages everyone's to-do list; everyone else only their own. */
export const POST = api(async ({ req, user }) => {
  const t = await body(req, newTodo);
  if (!canManageTodo(user, t.ownerId)) throw deny("You can only add to your own to-do list.");
  if (!(await UserModel.exists({ _id: t.ownerId }))) throw bad("That person does not exist.");
  const doc = await TodoModel.create({ _id: t.id, title: t.title, notes: t.notes || undefined, due: t.due, priority: t.priority, ownerId: t.ownerId, caseId: t.caseId, done: false, createdBy: user.id, createdAt: nowIso() });
  return { todo: out<Todo>(doc.toObject()) };
});
