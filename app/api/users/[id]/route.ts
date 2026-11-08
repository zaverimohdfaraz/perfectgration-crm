import { api, body, bad, notFound, requireAdmin } from "@/lib/server/http";
import { UserModel } from "@/lib/server/models";
import { hashPassword } from "@/lib/server/auth";
import { outUser } from "@/lib/server/data";
import { userPatch } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

type Stored = { _id: string; role: string; inactive?: boolean; sessionVersion?: number };

/** Administrator changes a person's role, teams or status, or resets their password. */
export const PATCH = api<{ id: string }>(async ({ req, user, params }) => {
  requireAdmin(user);
  const p = await body(req, userPatch);
  const current = (await UserModel.findById(params.id).lean()) as Stored | null;
  if (!current) throw notFound("Person not found.");

  const self = current._id === user.id;
  if (self && p.inactive) throw bad("You cannot switch off your own account.");
  if (self && p.role && p.role !== "admin") throw bad("You cannot remove your own administrator role.");
  const losingAdmin = current.role === "admin" && ((p.role && p.role !== "admin") || p.inactive);
  if (losingAdmin && (await UserModel.countDocuments({ role: "admin", inactive: { $ne: true } })) <= 1) throw bad("There must always be at least one active administrator.");

  const role = p.role ?? current.role;
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  for (const k of ["name", "email", "role", "title", "teams"] as const) if (p[k] !== undefined) set[k] = p[k];
  if (p.canAdd !== undefined) { if (p.canAdd) set.canAdd = true; else unset.canAdd = 1; }
  if (p.inactive !== undefined) { if (p.inactive) set.inactive = true; else unset.inactive = 1; }
  if (role !== "consultant") { unset.workTeam = 1; set.teams = []; }
  else if (p.workTeam) set.workTeam = p.workTeam;
  else if (p.workTeam === null) unset.workTeam = 1;

  // Switching an account off, or resetting its password, signs that person out everywhere.
  let bump = !!p.inactive;
  if (p.tempPassword) {
    set.passwordHash = await hashPassword(p.tempPassword);
    set.mustChangePassword = true;
    set.failedLogins = 0;
    unset.lockedUntil = 1;
    bump = true;
  }
  if (bump) set.sessionVersion = (current.sessionVersion ?? 1) + 1;

  const doc = await UserModel.findByIdAndUpdate(current._id, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true }).lean();
  return { user: outUser(doc as never) };
});
