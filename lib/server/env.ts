import "server-only";

/** Reads a required environment variable. Secrets live only in Vercel's settings (or .env.local), never in the code. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See docs/BACKEND_SETUP.md.`);
  return v;
}

export const LIVE = process.env.NEXT_PUBLIC_DATA_MODE === "api";
