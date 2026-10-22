import type { Role } from "./demo-data";

export type NavItem = { href: string; label: string; roles: Role[]; group: "Workspace" | "Management" | "Administration" };

const ALL: Role[] = ["admin", "manager", "consultant"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ALL, group: "Workspace" },
  { href: "/cases", label: "Cases", roles: ALL, group: "Workspace" },
  { href: "/clients", label: "Clients", roles: ALL, group: "Workspace" },
  { href: "/partner-tasks", label: "Partner Tasks", roles: ALL, group: "Workspace" },
  { href: "/notepad", label: "Team Notepad", roles: ALL, group: "Workspace" },
  { href: "/reports", label: "Reports", roles: ["admin", "manager"], group: "Management" },
  { href: "/team", label: "Team", roles: ["admin"], group: "Administration" },
  { href: "/agents", label: "Agents", roles: ["admin"], group: "Administration" },
  { href: "/workflow", label: "Workflow Setup", roles: ["admin"], group: "Administration" },
  { href: "/settings", label: "Settings", roles: ["admin"], group: "Administration" },
];
