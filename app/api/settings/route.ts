import { api, body, requireAdmin } from "@/lib/server/http";
import { SettingsModel } from "@/lib/server/models";
import { loadSettings } from "@/lib/server/data";
import { settingsPut } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

/** Administrator saves company details, step deadlines, default handlers or message templates. */
export const PUT = api(async ({ req, user }) => {
  requireAdmin(user);
  const p = await body(req, settingsPut);
  const set: Record<string, unknown> = {};
  if (p.sla) set.sla = p.sla;
  if (p.handlers) set.handlers = Object.fromEntries(Object.entries(p.handlers).filter(([, v]) => v));
  if (p.templates) set.templates = p.templates;
  if (p.company) for (const [k, v] of Object.entries(p.company)) set[`company.${k}`] = v;
  await SettingsModel.updateOne({ _id: "main" }, { $set: set }, { upsert: true });
  const s = await loadSettings();
  return { sla: s.sla, handlers: s.handlers, templates: s.templates, settings: s.company };
});
