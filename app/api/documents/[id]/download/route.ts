import { NextResponse } from "next/server";
import { api, notFound } from "@/lib/server/http";
import { downloadUrl } from "@/lib/server/s3";
import { docFor } from "../../doc-access";

export const dynamic = "force-dynamic";

/** Opens a file: checks access, then sends the browser to a 5-minute private link. */
export const GET = api<{ id: string }>(async ({ user, params }) => {
  const { doc } = await docFor(user, params.id, false);
  if (!doc.storageKey) throw notFound("No file is attached to this document yet.");
  return NextResponse.redirect(await downloadUrl(doc.storageKey, doc.fileName ?? doc.name), { status: 302, headers: { "Cache-Control": "no-store" } });
});
