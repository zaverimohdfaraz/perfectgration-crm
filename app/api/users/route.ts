import { api, body, requireAdmin } from "@/lib/server/http";
import { UserModel } from "@/lib/server/models";
import { hashPassword } from "@/lib/server/auth";
import { nowIso, outUser } from "@/lib/server/data";
import { newUser } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

/** Administrator adds a person. They sign in with the temporary password and must choose their own at once. */
export const POST = api(async ({ req, user }) => {
  requireAdmin(user);
  const u = await body(req, newUser);
  const consultant = u.role === "consultant";
  const doc = await UserModel.create({
    _id: u.id, name: u.name, email: u.email, role: u.role, workTeam: consultant ? u.workTeam : undefined, teams: consultant ? u.teams : [],
    title: u.title || "Team member", canAdd: u.canAdd || undefined, lastSeen: nowIso(),
    passwordHash: await hashPassword(u.tempPassword), mustChangePassword: true, failedLogins: 0, sessionVersion: 1,
  });
  return { user: outUser(doc.toObject()) };
});
