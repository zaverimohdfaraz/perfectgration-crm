import { Logo } from "@/components/logo";
import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABEL, USERS, visaLabel } from "@/lib/demo-data";
import { signIn } from "./actions";

const MESSAGES: Record<string, string> = {
  invalid: "That email or password is not right. Please try again.",
  inactive: "This account is inactive. Please ask your administrator.",
  expired: "Your session has ended. Please sign in again.",
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string; email?: string } }) {
  const error = searchParams.error ? MESSAGES[searchParams.error] : undefined;
  const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side: logo and image */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand to-brand-deep px-6 py-8 text-center sm:p-10">
        <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/15" />
        <div aria-hidden className="absolute -bottom-20 -right-16 h-96 w-96 rounded-full bg-white/10" />
        <div className="relative rounded-3xl bg-white p-4 shadow-2xl sm:p-8">
          <Logo className="h-12 w-auto sm:h-24" />
        </div>
        <p className="relative mt-5 max-w-md text-lg font-semibold text-ink-on sm:mt-10 sm:text-2xl">
          Your gateway to opportunities.
        </p>
        <p className="relative mt-3 hidden max-w-md text-lg text-ink-on/80 sm:block">
          Clients, cases and deadlines, all in one place.
        </p>
      </section>

      {/* Form side */}
      <main className="flex items-center justify-center bg-white px-5 py-8 sm:p-8 md:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold tracking-tight text-ink">Welcome</h1>
          <p className="mt-3 text-lg text-ink-muted">Sign in with the email and password your administrator gave you.</p>

          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-base text-red-900">
              {error}
            </div>
          )}

          <form action={signIn} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-base font-semibold text-ink">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                defaultValue={searchParams.email ?? ""}
                placeholder="name@perfectgration.com"
                className="mt-2 h-14 w-full rounded-xl border border-line bg-white px-4 text-lg text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/25"
              />
            </div>
            <PasswordField />
            <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
          </form>

          <p className="mt-6 text-base text-ink-muted">Forgot your password? Ask your administrator to reset it.</p>

          {showDemo && (
            <div className="mt-10 rounded-2xl bg-brand-tint p-6">
              <h2 className="text-base font-bold">Try a demo account</h2>
              <ul className="mt-3 divide-y divide-line">
                {USERS.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-semibold">{u.name}</span>
                      <span className="block text-sm text-ink-muted">{ROLE_LABEL[u.role]}{u.role === "consultant" && u.teams.length ? ` · ${u.teams.map((t) => visaLabel(t)).join(", ")}` : ""}{u.inactive ? " · inactive" : ""}</span>
                    </span>
                    <a href={`/login?email=${encodeURIComponent(u.email)}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-brand-deep hover:bg-white">
                      Use
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
