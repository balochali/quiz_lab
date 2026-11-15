import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

assert.equal(process.env.DATABASE_URL, "file:./dev.db", "Run only against the local test database.");
const db = new PrismaClient();
const email = randomUUID() + "@example.test";
const password = randomUUID();
const env = { ...process.env, DATABASE_URL: "file:./dev.db", VERCEL: "0", ADMIN_ROLE: "SUPER_ADMIN", ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_BOOTSTRAP: "1", ADMIN_RESET_PASSWORD: "" };
function provision(overrides = {}) {
  return spawnSync(process.execPath, ["scripts/create-admin.mjs"], { env: { ...env, ...overrides }, encoding: "utf8" });
}
try {
  assert.equal(provision().status, 0, "Create missing administrator");
  const initial = await db.admin.findUniqueOrThrow({ where: { email } });
  assert.equal(initial.role, "SUPER_ADMIN");
  assert.ok(initial.verifiedAt);
  await db.admin.update({ where: { email }, data: { suspended: true, canPublishQuizzes: false } });
  const replacement = randomUUID();
  assert.equal(provision({ ADMIN_PASSWORD: replacement }).status, 0);
  assert.equal((await db.admin.findUniqueOrThrow({ where: { email } })).passwordHash, initial.passwordHash);
  assert.equal(provision({ ADMIN_PASSWORD: replacement, ADMIN_RESET_PASSWORD: "1" }).status, 0);
  const reset = await db.admin.findUniqueOrThrow({ where: { email } });
  const [salt, hash] = reset.passwordHash.split(":");
  assert.equal(scryptSync(replacement, salt, 64).toString("hex"), hash);
  assert.equal(reset.suspended, true);
  assert.equal(reset.canPublishQuizzes, false);
  assert.equal(reset.id, initial.id);
  assert.equal(provision({ ADMIN_ROLE: "LECTURER", ADMIN_RESET_PASSWORD: "1" }).status, 1);
  console.log("Passed: administrator creation, default password preservation, explicit reset, stable account ID, preserved suspension/permissions, and reset role guard.");
} finally {
  await db.admin.deleteMany({ where: { email } });
  await db.$disconnect();
}
