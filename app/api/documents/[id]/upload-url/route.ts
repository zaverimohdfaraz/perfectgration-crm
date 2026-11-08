import { api, body, bad } from "@/lib/server/http";
import { fileInfo } from "@/lib/server/schemas";
import { fileProblem, newKey, uploadUrl } from "@/lib/server/s3";
import { docFor } from "../../doc-access";

export const dynamic = "force-dynamic";

/** Step 1 of attaching a file: a 5-minute signed link the browser uses to send the file straight to S3. */
export const POST = api<{ id: string }>(async ({ req, user, params }) => {
  const f = await body(req, fileInfo);
  const { c } = await docFor(user, params.id, true);
  const problem = fileProblem(f.fileName, f.contentType, f.size);
  if (problem) throw bad(problem);
  const key = newKey(c.id, f.contentType);
  return { url: await uploadUrl(key, f.contentType), key };
});
