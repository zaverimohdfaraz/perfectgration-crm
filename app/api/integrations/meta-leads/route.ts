import { NextRequest, NextResponse } from "next/server";
import { leadsLive, ingestLead } from "@/lib/server/leads-ingest";
import { appSecretProof, parseMetaLead, sameSecret, verifyMetaSignature } from "@/lib/leads";

export const dynamic = "force-dynamic";

const GRAPH = (process.env.META_API_VERSION || "v25.0");

/** Meta checks the address once when it is added (the verify token must match). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "";
  if (p.get("hub.mode") === "subscribe" && token && sameSecret(p.get("hub.verify_token") ?? "", token)) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Meta sends each new Lead Ads form submission here. Only the lead id arrives, so the lead itself is fetched from Meta. */
export async function POST(req: NextRequest) {
  if (!leadsLive()) return new NextResponse("Not available", { status: 404 });
  const secret = process.env.META_APP_SECRET ?? "";
  const raw = await req.text();
  if (!secret || !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret)) return new NextResponse("Forbidden", { status: 403 });
  const token = process.env.META_LEADS_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "";
  if (!token) return new NextResponse("Lead access is not set up", { status: 503 });

  let body: { entry?: { changes?: { field?: string; value?: { leadgen_id?: string } }[] }[] };
  try { body = JSON.parse(raw); } catch { return new NextResponse("Bad request", { status: 400 }); }
  const ids = (body.entry ?? []).flatMap((e) => (e.changes ?? []).filter((c) => c.field === "leadgen" && c.value?.leadgen_id).map((c) => c.value!.leadgen_id!));

  try {
    for (const id of ids) {
      const url = new URL(`https://graph.facebook.com/${GRAPH}/${encodeURIComponent(id)}`);
      url.searchParams.set("fields", "field_data,campaign_name,created_time");
      url.searchParams.set("access_token", token);
      url.searchParams.set("appsecret_proof", appSecretProof(token, secret));
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Meta lead ${id}: ${res.status}`);
      await ingestLead(parseMetaLead(await res.json(), id));
    }
  } catch (e) {
    // A non-200 makes Meta send the leads again later, so nothing is lost.
    console.error("[meta-leads]", (e as Error).message);
    return new NextResponse("Try again", { status: 500 });
  }
  return new NextResponse("ok", { status: 200 });
}
