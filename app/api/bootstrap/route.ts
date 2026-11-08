import { api } from "@/lib/server/http";
import { loadBootstrap } from "@/lib/server/data";

export const dynamic = "force-dynamic";

/** Everything the signed-in person may see. Used to refresh the screen after a failed save. */
export const GET = api(async ({ user }) => loadBootstrap(user));
