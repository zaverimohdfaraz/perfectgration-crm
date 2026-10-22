import { LogOut, Search } from "lucide-react";
import type { Alert } from "@/lib/insights";
import type { User } from "@/lib/demo-data";
import { ROLE_LABEL } from "@/lib/demo-data";
import { signOut } from "@/app/(app)/actions";
import { NotificationBell } from "./notification-bell";

export function Topbar({ user, alerts }: { user: User; alerts: Alert[] }) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:px-8">
      <form action="/cases" role="search" className="relative min-w-0 flex-1 md:max-w-md">
        <label htmlFor="global-search" className="sr-only">Search clients, case references or visa types</label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
        <input
          id="global-search"
          name="q"
          type="search"
          placeholder="Search clients or case references"
          className="h-11 w-full rounded-lg border border-line bg-surface2 pl-10 pr-3 text-[15px] placeholder:text-ink-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
       <NotificationBell />
        <div className="hidden pl-2 text-right sm:block">
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-xs text-ink-muted">{ROLE_LABEL[user.role]}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink hover:bg-surface2">
            <LogOut size={18} aria-hidden />
            <span className="hidden lg:inline">Sign out</span>
            <span className="sr-only lg:hidden">Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
