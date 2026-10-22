import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default function AdminOnlyLayout({ children }: { children: ReactNode }) {
  if (requireUser().role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}
