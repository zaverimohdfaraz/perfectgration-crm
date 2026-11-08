import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { changePassword } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Change password · Perfectgration" };

const ERRORS: Record<string, string> = {
  current: "Your current password is not right.",
  match: "The two new passwords do not match.",
  same: "Choose a password different from the current one.",
  weak: "The new password is too weak. Use 10 to 128 characters with at least one letter and one number.",
};

const input = "mt-2 h-14 w-full rounded-xl border border-line bg-white px-4 text-lg text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/25";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "api") redirect("/login");
  const { loadAccount } = await import("@/lib/server/http");
  const account = await loadAccount();
  if (!account) redirect("/login?error=expired");
  const sp = await searchParams;
  const error = sp.error ? ERRORS[sp.error] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-tint p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <Logo className="h-10" />
        <h1 className="mt-6 text-3xl font-bold text-ink">{account.mustChangePassword ? "Choose your own password" : "Change password"}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {account.mustChangePassword ? "You signed in with a temporary password. Replace it before you continue." : `Signed in as ${account.user.email}.`} Use at least 10 characters with a letter and a number. You will sign in again afterwards.
        </p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-base text-red-900">{error}</div>}
        <form action={changePassword} className="mt-6 space-y-5">
          <div><label htmlFor="current" className="block text-base font-semibold">{account.mustChangePassword ? "Temporary password" : "Current password"}</label><input id="current" name="current" type="password" autoComplete="current-password" required className={input} /></div>
          <div><label htmlFor="next" className="block text-base font-semibold">New password</label><input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} className={input} /></div>
          <div><label htmlFor="confirm" className="block text-base font-semibold">Type the new password again</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} className={input} /></div>
          <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
        </form>
        {!account.mustChangePassword && <a href="/" className="mt-5 inline-block text-base font-semibold text-brand-deep hover:underline">Cancel</a>}
      </div>
    </main>
  );
}
