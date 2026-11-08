"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export async function changePassword(formData: FormData) {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "api") redirect("/login");
  const { loadAccount } = await import("@/lib/server/http");
  const { UserModel } = await import("@/lib/server/models");
  const { checkPassword, hashPassword, passwordProblem } = await import("@/lib/server/auth");

  const account = await loadAccount();
  if (!account) redirect("/login?error=expired");
  const current = String(formData.get("current") ?? "").slice(0, 200);
  const next = String(formData.get("next") ?? "").slice(0, 200);
  const confirm = String(formData.get("confirm") ?? "").slice(0, 200);

  const doc = (await UserModel.findById(account.user.id).lean()) as { passwordHash: string; sessionVersion?: number } | null;
  if (!doc || !(await checkPassword(current, doc.passwordHash))) redirect("/change-password?error=current");
  const problem = passwordProblem(next);
  if (problem) redirect("/change-password?error=weak");
  if (next !== confirm) redirect("/change-password?error=match");
  if (next === current) redirect("/change-password?error=same");

  // A new password signs the person out everywhere, including this browser.
  await UserModel.updateOne({ _id: account.user.id }, { $set: { passwordHash: await hashPassword(next), mustChangePassword: false, sessionVersion: (doc.sessionVersion ?? 1) + 1, failedLogins: 0 } });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect(`/login?error=changed&email=${encodeURIComponent(account.user.email)}`);
}
