import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  // `next dev` writes to its own folder so running `npm run build` never breaks a running dev server
  // ("Cannot find module .next/server/app/page.js"). Production builds (and Vercel) still use .next.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root to this project; a stray lockfile in the home folder otherwise makes Next guess wrong.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  eslint: { ignoreDuringBuilds: true },
  // The app uses plain <img> tags, so the image optimiser is switched off. That removes an attack surface (it was the target of recent Next.js advisories).
  images: { unoptimized: true },
  // Upload links sent out with /k/<token> (v11.7) still reach the upload page, which lives at /u/<token>.
  async redirects() {
    return [{ source: "/k/:token", destination: "/u/:token", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
});
export default nextConfig;
