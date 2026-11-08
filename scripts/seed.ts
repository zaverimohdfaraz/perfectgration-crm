/**
 * One-time database setup. Run it once after creating the MongoDB Atlas cluster:
 *
 *   npm run db:seed
 *
 * It creates the 13 collections with their indexes, the default settings, and the first administrator
 * (from ADMIN_EMAIL / ADMIN_PASSWORD in .env.local). Running it again is safe: nothing that exists is overwritten.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { ALL_MODELS, SettingsModel, UserModel } from "../lib/server/models";
import { DEFAULT_SLA_DAYS, TEMPLATES } from "../lib/demo-data";
import { DEFAULT_SETTINGS } from "../lib/bootstrap";

function need(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`\n✗ ${name} is missing. Add it to .env.local (see .env.example).\n`); process.exit(1); }
  return v;
}

async function main() {
  const uri = need("MONGODB_URI");
  const email = need("ADMIN_EMAIL").trim().toLowerCase();
  const password = need("ADMIN_PASSWORD");
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    console.error("\n✗ ADMIN_PASSWORD must have at least 10 characters with a letter and a number.\n");
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  console.log(`✓ Connected to database "${mongoose.connection.name}"`);

  for (const m of ALL_MODELS) {
    await m.createCollection().catch(() => undefined);
    await m.syncIndexes();
    console.log(`✓ Collection ready: ${m.collection.collectionName}`);
  }

  if (!(await SettingsModel.exists({ _id: "main" }))) {
    await SettingsModel.create({ _id: "main", company: DEFAULT_SETTINGS, sla: DEFAULT_SLA_DAYS, handlers: {}, templates: TEMPLATES });
    console.log("✓ Default settings created");
  } else console.log("• Settings already exist (left as they are)");

  if (await UserModel.exists({ role: "admin" })) {
    console.log("• An administrator already exists (left as it is)");
  } else {
    await UserModel.create({
      _id: `u_${randomBytes(10).toString("hex")}`, name: process.env.ADMIN_NAME?.trim() || "Administrator", email, role: "admin", teams: [],
      title: "Administrator", lastSeen: new Date().toISOString(), passwordHash: await bcrypt.hash(password, 12),
      // The first administrator chose this password themselves, so no forced change.
      mustChangePassword: false, failedLogins: 0, sessionVersion: 1,
    });
    console.log(`✓ First administrator created: ${email}`);
  }

  await mongoose.disconnect();
  console.log("\nDone. You can now remove ADMIN_PASSWORD from .env.local.\n");
}

main().catch(async (e) => {
  console.error("\n✗ Setup failed:", e instanceof Error ? e.message : e);
  console.error("  Check MONGODB_URI, the database user's password, and Network Access in Atlas (see docs/BACKEND_SETUP.md).\n");
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
