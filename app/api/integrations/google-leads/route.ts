import { NextRequest, NextResponse } from "next/server";
import { leadsLive, ingestLead } from "@/lib/server/leads-ingest";
import { parseGoogleLead, sameSecret } from "@/lib/leads";

export const dynamic = "force-dynamic";

/** Google Ads lead forms send each new lead here, with the key set in the lead form's webhook settings. */
export async function POST(req: NextRequest) {
  if (!leadsLive()) return new NextResponse("Not available", { status: 404 });
  const key = process.env.GOOGLE_LEADS_KEY ?? "";
  let body: { google_key?: string; lead_id?: unknown; campaign_id?: unknown; user_column_data?: never[] };
  try { body = await req.json(); } catch { return new NextResponse("Bad request", { status: 400 }); }
  if (!key || !sameSecret(String(body.google_key ?? ""), key)) return new NextResponse("Forbidden", { status: 403 });
  if (!body.lead_id) return new NextResponse("Bad request", { status: 400 });
  try {
    await ingestLead(parseGoogleLead(body));
  } catch (e) {
    console.error("[google-leads]", (e as Error).message);
    return new NextResponse("Try again", { status: 500 });
  }
  return new NextResponse("ok", { status: 200 });
}
