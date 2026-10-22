import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="max-w-md text-ink-muted">This page may have moved, or you may not have access to it.</p>
      <Link href="/dashboard" className="mt-2 inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-semibold text-ink-on hover:bg-brand-hover">
        Go to dashboard
      </Link>
    </div>
  );
}
