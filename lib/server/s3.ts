import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";
import { env } from "./env";

/**
 * Files live in a PRIVATE S3 bucket. The browser uploads straight to S3 with a short-lived signed link,
 * and files are opened through another short-lived signed link. The bucket is never public and the
 * database only keeps the file's key.
 */
let client: S3Client | undefined;
const s3 = () => (client ??= new S3Client({
  region: env("AWS_REGION"),
  credentials: { accessKeyId: env("AWS_ACCESS_KEY_ID"), secretAccessKey: env("AWS_SECRET_ACCESS_KEY") },
  // Signed browser uploads must not carry a pre-computed checksum (the SDK would sign the checksum of an empty body, and S3 would reject the real file).
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  // Only for S3-compatible storage or local testing. Leave S3_ENDPOINT empty for Amazon S3.
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
}));
const bucket = () => env("S3_BUCKET");

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Checks the file name, type and size. Returns a reason when it is not allowed. */
export function fileProblem(fileName: string, contentType: string, size: number): string | null {
  if (!ALLOWED_TYPES[contentType]) return "Only PDF, JPG, PNG or WEBP files are accepted.";
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(fileName)) return "Only PDF, JPG, PNG or WEBP files are accepted.";
  if (!Number.isFinite(size) || size <= 0) return "The file is empty.";
  if (size > MAX_FILE_BYTES) return "The file is larger than 10 MB.";
  return null;
}

/** A safe, unguessable key: cases/<caseId>/<random>.<ext>. The original name is kept in the database, not in the key. */
export function newKey(caseId: string, contentType: string): string {
  const safeCase = caseId.replace(/[^A-Za-z0-9_-]/g, "");
  return `cases/${safeCase}/${randomBytes(16).toString("hex")}.${ALLOWED_TYPES[contentType]}`;
}

/** Signed link the browser uses to PUT the file. Valid for 5 minutes, for this exact key and type. The size is checked after upload. */
export function uploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn: 300 });
}

/** Signed link to open a file. Valid for 5 minutes. */
export function downloadUrl(key: string, fileName: string): Promise<string> {
  const safe = fileName.replace(/["\\\r\n]/g, "");
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: `inline; filename="${safe}"` }), { expiresIn: 300 });
}

/** Confirms the file really arrived in S3, and returns its size and type. */
export async function headFile(key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  try { await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })); } catch { /* already gone */ }
}
