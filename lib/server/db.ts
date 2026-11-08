import "server-only";
import mongoose from "mongoose";
import { env } from "./env";

/**
 * One shared connection per server instance. Vercel reuses warm instances, so the connection is cached
 * on globalThis instead of opening a new one on every request (the free M0 cluster allows 500 connections).
 */
const cache = globalThis as unknown as { _pgMongo?: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } };

export async function connectDb(): Promise<typeof mongoose> {
  const c = (cache._pgMongo ??= {});
  if (c.conn) return c.conn;
  c.promise ??= mongoose.connect(env("MONGODB_URI"), { bufferCommands: false, maxPoolSize: 5, serverSelectionTimeoutMS: 10_000 });
  try {
    c.conn = await c.promise;
  } catch (e) {
    c.promise = undefined;
    throw e;
  }
  return c.conn;
}
