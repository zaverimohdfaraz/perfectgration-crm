import type { Role, User, WorkTeam } from "./demo-data";

export type NavItem = { href: string; label: string; roles: Role[]; teams?: WorkTeam[]; group: "Teams" | "Workspace" | "Management" | "Administration" };

const ALL: Role[] = ["admin", "manager", "consultant"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ALL, group: "Teams" },
  { href: "/social", label: "Social Media", roles: ALL, teams: ["social"], group: "Teams" },
  { href: "/sales", label: "Sales", roles: ALL, teams: ["sales"], group: "Teams" },
  { href: "/case-manager", label: "Case Manager", roles: ALL, teams: ["case"], group: "Teams" },
  { href: "/cases", label: "Cases", roles: ALL, group: "Workspace" },
  { href: "/clients", label: "Clients", roles: ALL, group: "Workspace" },
  { href: "/todo", label: "To-Do List", roles: ALL, group: "Workspace" },
  { href: "/partner-tasks", label: "Partner Tasks", roles: ALL, group: "Workspace" },
  { href: "/notepad", label: "Team Notepad", roles: ALL, group: "Workspace" },
  { href: "/reports", label: "Reports", roles: ["admin", "manager"], group: "Management" },
  { href: "/team", label: "Team", roles: ["admin"], group: "Administration" },
  { href: "/sign-ins", label: "Sign-in record", roles: ["admin"], group: "Administration" },
  { href: "/agents", label: "Agents", roles: ["admin"], group: "Administration" },
  { href: "/workflow", label: "Workflow Setup", roles: ["admin"], group: "Administration" },
  { href: "/settings", label: "Settings", roles: ["admin"], group: "Administration" },
];

/** Team pages: Admin and Manager see all three; a team member sees only their own team's page. */
export const navFor = (u: User) => NAV_ITEMS.filter((i) => i.roles.includes(u.role) && (!i.teams || u.role !== "consultant" || (u.workTeam && i.teams.includes(u.workTeam))));
/** Everyone starts on the Dashboard (leaders see everything, a team member sees only their own work). */
export const homeFor = (u: User) => (u ? "/dashboard" : "/login");
