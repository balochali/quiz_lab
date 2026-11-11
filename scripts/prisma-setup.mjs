import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const hosted = process.env.VERCEL === "1";
const postgres = hosted || /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");
if (hosted && !/^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Vercel requires a hosted PostgreSQL DATABASE_URL. Local file: SQLite databases are unsupported.");
  process.exit(1);
}
if (postgres) {
  mkdirSync("prisma/postgresql", { recursive: true });
  const source = readFileSync("prisma/schema.prisma", "utf8");
  writeFileSync("prisma/postgresql/schema.prisma", source.replace('provider = "sqlite"', 'provider = "postgresql"'));
}
const schema = postgres ? "prisma/postgresql/schema.prisma" : "prisma/schema.prisma";
const command = process.argv[2] ?? "generate";
if (!["generate", "migrate"].includes(command)) throw new Error("Unknown Prisma command");
const args = command === "migrate" ? ["migrate", "deploy"] : ["generate"];
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", ...args, "--schema", schema], {
  stdio: "inherit", env: process.env,
});
process.exit(result.status ?? 1);
