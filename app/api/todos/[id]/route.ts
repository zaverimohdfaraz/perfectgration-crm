import { api, body, deny, notFound } from "@/lib/server/http";
import { TodoModel } from "@/lib/server/models";
import { out } from "@/lib/server/data";
import { todoPatch } from "@/lib/server/schemas";
import { canManageTodo } from "@/lib/permissions";
import type { Todo, User } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

async function mine(user: User, id: string): Promise<Todo> {
  const raw = await TodoModel.findById(id).lean();
  if (!raw) throw notFound("To-do not found.");
  const t = out<Todo>(raw as never);
  if (!canManageTodo(user, t.ownerId)) throw notFound("To-do not found.");
  return t;
}

export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  const patch = await body(req, todoPatch);
  const t = await mine(user, params.id);
  if (patch.ownerId && patch.ownerId !== t.ownerId && user.role !== "admin") throw deny("Only the administrator can move a to-do to someone else.");
  const doc = await TodoModel.findByIdAndUpdate(t.id, { $set: patch }, { new: true }).lean();
  return { todo: out<Todo>(doc as never) };
});

export const DELETE = api<{ id: string }>(async ({ user, params }) => {
  const t = await mine(user, params.id);
  await TodoModel.deleteOne({ _id: t.id });
  return { ok: true };
});
