import { NextResponse, type NextRequest } from "next/server";
import { connectDb } from "@/lib/server/db";
import { syncAds } from "@/lib/server/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily job (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
 * Without CRON_SECRET the job does nothing; the Social Media page then syncs on its own once a day.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NEXT_PUBLIC_DATA_MODE !== "api" || !secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ skipped: true }, { status: 401 });
  }
  try {
    await connectDb();
    return NextResponse.json({ results: await syncAds(30) });
  } catch (e) {
    console.error("[cron] ads sync failed", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
