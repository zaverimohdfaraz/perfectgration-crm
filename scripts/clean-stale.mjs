// Removes files from OLDER versions of this project that get left behind when a newer zip is copied over the top.
// They no longer match the current code and break the build. Only the paths listed here are touched.
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const stale = [
  "app/(app)/notes",           // old route, replaced by /notepad
  "app/(app)/tasks",           // old route, replaced by /partner-tasks
  "components/site-header.tsx", // old top navigation
  "components/sidebar.tsx",     // old sidebar
  "components/topbar.tsx",      // old topbar
  "lib/query.ts",               // no longer used
];

let removed = 0;
for (const p of stale) {
  const full = join(process.cwd(), ...p.split("/"));
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(`[clean] removed leftover from an older version: ${p}`);
    removed++;
  }
}
if (removed === 0) console.log("[clean] no leftover files found.");
