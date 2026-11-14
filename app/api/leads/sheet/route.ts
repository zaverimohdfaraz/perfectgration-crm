import { api, requireLeader } from "@/lib/server/http";
import { sheetStatus, syncSheetLeads } from "@/lib/server/sheet-leads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Last sheet sync and whether the sheet is configured. Leaders only. */
export const GET = api(async ({ user }) => {
  requireLeader(user);
  return sheetStatus();
});

/** "Sync now": reads the sheet immediately and reports exactly what happened. Leaders only. */
export const POST = api(async ({ user }) => {
  requireLeader(user);
  const result = await syncSheetLeads();
  return { result, status: await sheetStatus() };
});
