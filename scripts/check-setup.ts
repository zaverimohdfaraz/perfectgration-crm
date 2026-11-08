/**
 * Checks that everything the live system needs is in place, without changing anything:
 *
 *   npm run check:setup
 *
 * environment variables · MongoDB connection · S3 bucket access · S3 upload permission (CORS is checked in the browser).
 */
import mongoose from "mongoose";
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const REQUIRED = ["NEXT_PUBLIC_DATA_MODE", "MONGODB_URI", "JWT_SECRET", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "S3_BUCKET", "APP_URL"];
let failed = false;
const ok = (m: string) => console.log(`✓ ${m}`);
const bad = (m: string) => { failed = true; console.log(`✗ ${m}`); };

async function main() {
  console.log("\nEnvironment variables");
  for (const k of REQUIRED) (process.env[k] ? ok : bad)(`${k}${process.env[k] ? "" : " is missing"}`);
  if (process.env.NEXT_PUBLIC_DATA_MODE && process.env.NEXT_PUBLIC_DATA_MODE !== "api") bad('NEXT_PUBLIC_DATA_MODE must be "api" for the live system');
  if ((process.env.JWT_SECRET ?? "").length < 32) bad("JWT_SECRET must be at least 32 characters");

  console.log("\nMongoDB");
  try {
    await mongoose.connect(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 15_000 });
    ok(`Connected to "${mongoose.connection.name}"`);
    const names = (await mongoose.connection.db!.listCollections().toArray()).map((c) => c.name);
    const want = ["users", "clients", "cases", "documents", "uploadlinks", "messages", "todos", "partnertasks", "agents", "settings", "counters", "adinsights", "logins"];
    const missing = want.filter((n) => !names.includes(n));
    missing.length ? bad(`Collections missing: ${missing.join(", ")} (run npm run db:seed)`) : ok("All 13 collections exist");
    const admins = await mongoose.connection.db!.collection("users").countDocuments({ role: "admin" });
    admins ? ok(`${admins} administrator account(s)`) : bad("No administrator yet (run npm run db:seed)");
  } catch (e) {
    bad(`Could not connect: ${(e as Error).message}`);
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }

  console.log("\nAmazon S3");
  try {
    const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "" }, ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}) });
    const Bucket = process.env.S3_BUCKET ?? "";
    await s3.send(new HeadBucketCommand({ Bucket }));
    ok(`Bucket "${Bucket}" reachable`);
    const Key = `setup-check/${Date.now()}.txt`;
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: "ok", ContentType: "text/plain" }));
    await s3.send(new DeleteObjectCommand({ Bucket, Key }));
    ok("Can write and delete files");
    try {
      const cors = await s3.send(new GetBucketCorsCommand({ Bucket }));
      const origins = cors.CORSRules?.flatMap((r) => r.AllowedOrigins ?? []) ?? [];
      const app = process.env.APP_URL?.replace(/\/$/, "");
      origins.includes(app ?? "") ? ok(`CORS allows ${app}`) : bad(`CORS does not list ${app}. Allowed: ${origins.join(", ") || "none"}`);
    } catch {
      bad("No CORS rules on the bucket (browser uploads will fail). See docs/BACKEND_SETUP.md, step 2.5");
    }
  } catch (e) {
    bad(`S3 problem: ${(e as Error).name}: ${(e as Error).message}`);
  }

  console.log("\nOptional: ad platforms (see docs/ADS_SETUP.md)");
  const meta = ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_IDS"].every((k) => process.env[k]);
  const google = ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_IDS"].every((k) => process.env[k]);
  console.log(meta ? "✓ Meta Ads keys present" : "• Meta Ads not connected (optional)");
  console.log(google ? "✓ Google Ads keys present" : "• Google Ads not connected (optional)");
  console.log(process.env.CRON_SECRET ? "✓ CRON_SECRET set (nightly ads sync)" : "• CRON_SECRET not set (the Social Media page will sync by itself)");

  console.log(failed ? "\nSome checks failed. Fix the ✗ items above.\n" : "\nEverything is ready.\n");
  process.exit(failed ? 1 : 0);
}
void main();
