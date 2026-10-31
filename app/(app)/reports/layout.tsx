import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role === "consultant") redirect("/dashboard");
  return <>{children}</>;
}
