import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ZodError, type ZodType } from "zod";
import type { User } from "@/lib/demo-data";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { connectDb } from "./db";
import { LIVE } from "./env";
import { readSession } from "./auth";
import { UserModel } from "./models";
import { outUser } from "./data";
import { HttpError } from "./http-error";

export { HttpError, deny, notFound, bad } from "./http-error";

type StoredUser = Record<string, unknown> & { _id: string; inactive?: boolean; sessionVersion?: number; mustChangePassword?: boolean };

/** The signed-in account, checked against the database on every request (so a switched-off account stops working at once). */
export async function loadAccount(): Promise<{ user: User; mustChangePassword: boolean } | null> {
  const jar = await cookies();
  const claims = await readSession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  await connectDb();
  const doc = (await UserModel.findById(claims.sub).lean()) as StoredUser | null;
  if (!doc || doc.inactive || (doc.sessionVersion ?? 1) !== claims.v) return null;
  return { user: outUser(doc), mustChangePassword: !!doc.mustChangePassword };
}

/** The signed-in person. Someone who still has to replace their temporary password gets no access to data. */
export async function currentUser(): Promise<User | null> {
  const a = await loadAccount();
  return a && !a.mustChangePassword ? a.user : null;
}

/** Blocks requests sent from other websites (cross-site request forgery). */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let host: string;
  try { host = new URL(origin).host; } catch { return false; }
  const allowed = new Set([req.headers.get("x-forwarded-host"), req.headers.get("host")].filter(Boolean) as string[]);
  if (process.env.APP_URL) { try { allowed.add(new URL(process.env.APP_URL).host); } catch { /* ignore */ } }
  return allowed.has(host);
}

type Handler<P> = (a: { req: NextRequest; user: User; params: P }) => Promise<unknown>;
type PublicHandler<P> = (a: { req: NextRequest; params: P }) => Promise<unknown>;
// Next.js passes the route's dynamic segments as a promise.
type RouteCtx = { params: Promise<Record<string, string>> };

function respond(result: unknown): Response {
  if (result instanceof Response) return result;
  return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
}

function failure(e: unknown): Response {
  const headers = { "Cache-Control": "no-store" };
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status, headers });
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return NextResponse.json({ error: `Some details are missing or not valid${first?.path.length ? ` (${first.path.join(".")})` : ""}.` }, { status: 400, headers });
  }
  if (typeof e === "object" && e && (e as { code?: number }).code === 11000) {
    return NextResponse.json({ error: "That record already exists (for example, the email is already used)." }, { status: 409, headers });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "Something went wrong on the server. Please try again." }, { status: 500, headers });
}

/** Wraps a signed-in API route: live mode only, same-site requests only, signed-in person required. */
export function api<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<Response> => {
    try {
      if (!LIVE) throw new HttpError(404, "The live API is off. Set NEXT_PUBLIC_DATA_MODE=api.");
      if (req.method !== "GET" && !sameOrigin(req)) throw new HttpError(403, "Request blocked.");
      const user = await currentUser();
      if (!user) throw new HttpError(401, "Your session has ended. Please sign in again.");
      return respond(await handler({ req, user, params: (await ctx.params) as P }));
    } catch (e) {
      return failure(e);
    }
  };
}

/** Wraps a public route (client upload links). No sign-in, but still same-site requests only. */
export function publicApi<P = Record<string, string>>(handler: PublicHandler<P>) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<Response> => {
    try {
      if (!LIVE) throw new HttpError(404, "Not found.");
      if (req.method !== "GET" && !sameOrigin(req)) throw new HttpError(403, "Request blocked.");
      await connectDb();
      return respond(await handler({ req, params: (await ctx.params) as P }));
    } catch (e) {
      return failure(e);
    }
  };
}

/** Reads and checks the JSON body. Anything that does not match the schema is refused. */
export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => {
    throw new HttpError(400, "The request was not valid.");
  });
  return schema.parse(raw);
}

export const requireAdmin = (u: User) => {
  if (u.role !== "admin") throw new HttpError(403, "Only an administrator can do that.");
};
export const requireLeader = (u: User) => {
  if (u.role === "consultant") throw new HttpError(403, "Only an administrator or manager can do that.");
};
