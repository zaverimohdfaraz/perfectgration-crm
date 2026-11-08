import { api, requireLeader } from "@/lib/server/http";
import { adStatus, syncAds } from "@/lib/server/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Sync now" button: fetches the last 30 days from every connected ad platform. */
export const POST = api(async ({ user }) => {
  requireLeader(user);
  const results = await syncAds(30);
  return { results, status: await adStatus() };
});
