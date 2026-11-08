import { api, body, deny, notFound } from "@/lib/server/http";
import { MessageModel } from "@/lib/server/models";
import { out } from "@/lib/server/data";
import { messagePatch } from "@/lib/server/schemas";
import { canDeleteMessage, canPinMessage, canSeeMessage } from "@/lib/permissions";
import type { Message, User } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

async function visible(user: User, id: string): Promise<Message> {
  const raw = await MessageModel.findById(id).lean();
  if (!raw) throw notFound("Message not found.");
  const m = out<Message>(raw as never);
  if (!canSeeMessage(user, m)) throw notFound("Message not found.");
  return m;
}

export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  const p = await body(req, messagePatch);
  const m = await visible(user, params.id);
  if (p.pinned !== undefined && !canPinMessage(user)) throw deny("Only the administrator can pin messages.");
  const update: Record<string, unknown> = {};
  if (p.read) update.$addToSet = { readBy: user.id };
  if (p.pinned !== undefined) update.$set = { pinned: p.pinned };
  const doc = Object.keys(update).length ? await MessageModel.findByIdAndUpdate(m.id, update, { new: true }).lean() : await MessageModel.findById(m.id).lean();
  return { message: out<Message>(doc as never) };
});

export const DELETE = api<{ id: string }>(async ({ user, params }) => {
  if (!canDeleteMessage(user)) throw deny("Only the administrator can delete messages.");
  const m = await visible(user, params.id);
  await MessageModel.deleteOne({ _id: m.id });
  return { ok: true };
});
