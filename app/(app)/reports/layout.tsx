import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  if (requireUser().role === "consultant") redirect("/dashboard");
  return <>{children}</>;
}
