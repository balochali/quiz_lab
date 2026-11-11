import { PrismaClient } from "@prisma/client";
import { configureDatabaseEnvironment } from "../../scripts/database-env.mjs";

configureDatabaseEnvironment();

const globalDb = globalThis as typeof globalThis & { quizDb?: PrismaClient };
export const db = globalDb.quizDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.quizDb = db;
