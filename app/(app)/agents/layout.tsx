import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function AdminOnlyLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}
