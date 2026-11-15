import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

assert.equal(process.env.DATABASE_URL, "file:./dev.db", "Use only the local test database.");
const db = new PrismaClient();
const origin = "http://127.0.0.1:3018";
const tag = randomUUID();
let admin, lecturer, student;
function cookie(id) {
  const value = id + "." + (Date.now() + 300000);
  return "lecturer=" + value + "." + createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("hex");
}
async function page(path, account) {
  const response = await fetch(origin + path, { headers: account ? { Cookie: cookie(account.id) } : {}, redirect: "manual", signal: AbortSignal.timeout(20000) });
  return { response, html: await response.text() };
}
try {
  admin = await db.admin.create({ data: { email: tag + "-admin@example.test", passwordHash: "private-fixture-marker", role: "SUPER_ADMIN", verifiedAt: new Date() } });
  lecturer = await db.admin.create({ data: { email: tag + "-lecturer@example.test", passwordHash: "private-fixture-marker", verifiedAt: new Date(), subjects: { create: { name: "Fixture subject " + tag, nameKey: tag } } } });
  student = await db.student.create({ data: { name: "Profile fixture " + tag, rollNumber: tag.toUpperCase(), semester: "3" } });
  const dashboard = await page("/admin/platform", admin);
  assert.equal(dashboard.response.status, 200);
  for (const text of ["Admin dashboard", "Manage users", "Learning in motion", "Your community", "Platform signals", "not currently tracked"]) assert.ok(dashboard.html.includes(text), text);
  const users = await page("/admin/platform/users?q=" + encodeURIComponent(lecturer.email), admin);
  assert.equal(users.response.status, 200);
  assert.ok(users.html.includes(lecturer.email));
  assert.ok(users.html.includes("<dialog"));
  assert.ok(users.html.includes("Save lecturer access"));
  assert.ok(users.html.includes("Fixture subject " + tag));
  assert.ok(!users.html.includes("private-fixture-marker"));
  const students = await page("/admin/platform/users?type=students&q=" + encodeURIComponent(tag), admin);
  assert.equal(students.response.status, 200);
  assert.ok(students.html.includes(student.rollNumber));
  assert.ok(students.html.includes("View all attempts"));
  assert.ok(students.html.includes('name="type" value="students"'));
  const denied = await page("/admin/platform/users", lecturer);
  assert.ok(denied.response.headers.get("location")?.includes("/admin/dashboard") || denied.html.includes("NEXT_REDIRECT"));
  const anonymous = await page("/admin/platform/users");
  assert.ok(anonymous.response.headers.get("location")?.includes("/admin/login") || anonymous.html.includes("NEXT_REDIRECT"));
  console.log("Passed: dashboard charts and signals, profile cards/modals, lecturer controls and subjects, student profiles, preserved user filters, and admin-only access.");
} finally {
  if (student) await db.student.delete({ where: { id: student.id } });
  if (lecturer) await db.admin.delete({ where: { id: lecturer.id } });
  if (admin) await db.admin.delete({ where: { id: admin.id } });
  await db.$disconnect();
}
