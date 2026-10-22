
import type { Role } from "./demo-data";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  group: "Workspace" | "Management" | "Administration";
  icon?: string;
};

const ALL: Role[] = ["admin", "manager", "consultant"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ALL, group: "Workspace", icon: "LayoutDashboard" },
  { href: "/cases", label: "Cases", roles: ALL, group: "Workspace", icon: "Briefcase" },
  { href: "/clients", label: "Clients", roles: ALL, group: "Workspace", icon: "Users" },
  { href: "/partner-tasks", label: "Partner Tasks", roles: ALL, group: "Workspace", icon: "ListChecks" },
  { href: "/notepad", label: "Team Notepad", roles: ALL, group: "Workspace", icon: "NotebookPen" },
  { href: "/reports", label: "Reports", roles: ["admin", "manager"], group: "Management", icon: "BarChart3" },
  { href: "/team", label: "Team", roles: ["admin"], group: "Administration", icon: "UserCog" },
  { href: "/agents", label: "Agents", roles: ["admin"], group: "Administration", icon: "Handshake" },
  { href: "/workflow", label: "Workflow Setup", roles: ["admin"], group: "Administration", icon: "Workflow" },
  { href: "/settings", label: "Settings", roles: ["admin"], group: "Administration", icon: "Settings" },
];
