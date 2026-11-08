import { publicApi, body, bad, HttpError } from "@/lib/server/http";
import { publicPresign } from "@/lib/server/schemas";
import { fileProblem, newKey, uploadUrl } from "@/lib/server/s3";
import { signTicket } from "@/lib/server/auth";
import { linkState } from "@/lib/permissions";
import { MAX_UPLOADS_PER_LINK, findLink } from "@/lib/server/public-links";

export const dynamic = "force-dynamic";

/** Client upload, step 1: checks the link is open and the file is allowed, then gives a 5-minute signed upload link. */
export const POST = publicApi<{ token: string }>(async ({ req, params }) => {
  const f = await body(req, publicPresign);
  const link = await findLink(params.token);
  if (!link) throw new HttpError(404, "This link does not exist.");
  const state = linkState(link, Date.now());
  if (state !== "active") throw new HttpError(410, state === "expired" ? "This link has expired. Please ask your consultant for a new one." : "This link has been closed. Please ask your consultant for a new one.");
  if (link.uploads.length >= MAX_UPLOADS_PER_LINK) throw bad("The upload limit for this link has been reached. Please ask your consultant for a new link.");
  const problem = fileProblem(f.fileName, f.contentType, f.size);
  if (problem) throw bad(problem);
  const item = f.item && link.requested.includes(f.item) ? f.item : undefined;
  const key = newKey(link.caseId, f.contentType);
  return { url: await uploadUrl(key, f.contentType), ticket: await signTicket({ token: link.token, key, fileName: f.fileName, item, contentType: f.contentType }) };
});
