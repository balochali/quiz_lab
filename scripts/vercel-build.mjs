import { spawnSync } from "node:child_process";
import { configureDatabaseEnvironment } from "./database-env.mjs";

configureDatabaseEnvironment();

for (const name of ["SESSION_SECRET", "APP_URL", "SMTP_URL", "SMTP_FROM"]) {
  if (!process.env[name]) throw new Error("Missing Vercel environment variable: " + name);
}
if ((process.env.SESSION_SECRET ?? "").length < 32) throw new Error("SESSION_SECRET must have at least 32 characters");
let publicUrl;
try {
  publicUrl = new URL(process.env.APP_URL);
} catch {
  console.error("Invalid APP_URL. In Vercel, enter only the full HTTPS address, for example https://quiz-lab-amber.vercel.app. Remove surrounding quotes and any APP_URL= prefix.");
  process.exit(1);
}
if (publicUrl.protocol !== "https:") {
  console.error("Vercel APP_URL must start with https://");
  process.exit(1);
}
for (const args of [
  ["scripts/prisma-setup.mjs", "generate"],
  ["scripts/prisma-setup.mjs", "migrate"],
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: { ...process.env, VERCEL: "1" } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
