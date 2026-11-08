import { z } from "zod";
import { api, body } from "@/lib/server/http";
import { CaseModel, MessageModel } from "@/lib/server/models";
import { runLeadSharing, setActive } from "@/lib/server/lead-share";
import { recordActivity } from "@/lib/server/logins";

export const dynamic = "force-dynamic";

const ping = z.object({ since: z.string().max(40).optional(), sinceMsg: z.string().max(40).optional() });

/**
 * Sent by every open CRM once a minute. It marks the person as online, lets automatic lead sharing run,
 * and says whether anything changed since the screen last loaded (so the screen refreshes itself).
 */
export const POST = api(async ({ req, user }) => {
  const p = await body(req, ping);
  await setActive(user.id, true);
  try { await recordActivity(user.id); } catch (e) { console.error("[logins]", e); }
  try { await runLeadSharing(false); } catch (e) { console.error("[lead-share]", e); }
  const [c, m] = await Promise.all([
    p.since ? CaseModel.exists({ updatedAt: { $gt: p.since } }) : null,
    p.sinceMsg ? MessageModel.exists({ at: { $gt: p.sinceMsg } }) : null,
  ]);
  return { changed: !!c || !!m };
});
