/** The data a signed-in person starts with. The server fills it from the database, already filtered by their permissions. */
import type { Agent, Assessment, Case, Client, Doc, Message, StageId, Task, Template, Todo, UploadLink, User } from "./demo-data";

export type Settings = {
  tradingName: string; legalName: string; email: string; phone: string; city: string; country: string;
  language: string; currency: string; dateFormat: string; timezone: string; workweek: string; emailConnected: boolean;
  /** Share leads passed to Sales evenly among the Sales members who are online (live mode). */
  autoShareLeads: boolean;
  /** Minutes without the CRM open before someone counts as offline. */
  onlineMinutes: number;
};

export type Bootstrap = {
  userId: string;
  /** The server's time when the page was prepared. The app clock starts from it. */
  serverNow?: string;
  users: User[]; clients: Client[]; cases: Case[]; docs: Doc[]; tasks: Task[]; todos: Todo[];
  messages: Message[]; agents: Agent[]; assessments: Record<string, Assessment>; uploadLinks: UploadLink[];
  sla: Record<StageId, number>; handlers: Record<string, string>; templates: Template[]; settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  tradingName: "Perfectgration", legalName: "", email: "info@futurebridgeofficial.com", phone: "", city: "", country: "Saudi Arabia",
  language: "English", currency: "SAR", dateFormat: "DD MMM YYYY", timezone: "Asia/Riyadh (UTC+3)", workweek: "Sunday to Thursday", emailConnected: false,
  autoShareLeads: true, onlineMinutes: 10,
};
