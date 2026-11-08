import { api, body, bad, deny } from "@/lib/server/http";
import { MessageModel } from "@/lib/server/models";
import { allUsers, nowIso, out } from "@/lib/server/data";
import { newMessage } from "@/lib/server/schemas";
import { canSeeMessage, canSendMessage } from "@/lib/permissions";
import type { Message } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/** Team Notepad. The administrator can write to anyone; everyone else can write only to the administrator. */
export const POST = api(async ({ req, user }) => {
  const m = await body(req, newMessage);
  const users = await allUsers();
  if (m.toUserIds.some((id) => !users.some((u) => u.id === id))) throw bad("One of the people chosen does not exist.");
  if (!canSendMessage(user, m, users)) throw deny(user.role === "admin" ? "Choose who should receive this message." : "You can only send messages to the administrator.");
  if (m.replyToId) {
    const parent = await MessageModel.findById(m.replyToId).lean();
    if (!parent || !canSeeMessage(user, out<Message>(parent as never))) throw bad("The message you are replying to was not found.");
  }
  const doc = await MessageModel.create({ _id: m.id, fromId: user.id, subject: m.subject, body: m.body, at: nowIso(), toAll: user.role === "admin" && m.toAll, toUserIds: [...new Set(m.toUserIds)], toTeams: m.toTeams, toDepartments: m.toDepartments, replyToId: m.replyToId, pinned: false, readBy: [user.id] });
  return { message: out<Message>(doc.toObject()) };
});
