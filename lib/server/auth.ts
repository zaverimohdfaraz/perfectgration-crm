import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/** How long a sign-in lasts. */
export const SESSION_HOURS = 10;
/** Wrong passwords allowed before the account is locked for LOCK_MINUTES. */
export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;

const key = () => {
  const secret = env("JWT_SECRET");
  if (secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters long.");
  return new TextEncoder().encode(secret);
};

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** Password rule used everywhere: at least 10 characters with a letter and a number. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use at least one letter and one number.";
  return null;
}

export type SessionClaims = { sub: string; v: number };

export async function signSession(userId: string, version: number): Promise<string> {
  return new SignJWT({ v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.v !== "number") return null;
    return { sub: payload.sub, v: payload.v };
  } catch {
    return null;
  }
}

/* ─── Upload tickets (client upload links) ─── */
/** A short-lived signed note that says "this browser may register this exact file for this link". */
export type UploadTicket = { token: string; key: string; fileName: string; item?: string; contentType: string };

export async function signTicket(t: UploadTicket): Promise<string> {
  return new SignJWT({ k: t.key, n: t.fileName, i: t.item ?? "", c: t.contentType })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(t.token)
    .setAudience("client-upload")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key());
}

export async function readTicket(ticket: string): Promise<UploadTicket | null> {
  try {
    const { payload: p } = await jwtVerify(ticket, key(), { algorithms: ["HS256"], audience: "client-upload" });
    if (typeof p.sub !== "string" || typeof p.k !== "string" || typeof p.n !== "string" || typeof p.c !== "string") return null;
    return { token: p.sub, key: p.k, fileName: p.n, item: typeof p.i === "string" && p.i ? p.i : undefined, contentType: p.c };
  } catch {
    return null;
  }
}
