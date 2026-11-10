ALTER TABLE "Admin" ADD COLUMN "verifiedAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "verificationHash" TEXT;
ALTER TABLE "Admin" ADD COLUMN "verificationExpiresAt" DATETIME;
ALTER TABLE "Admin" ADD COLUMN "verificationSentAt" DATETIME;
CREATE UNIQUE INDEX "Admin_verificationHash_key" ON "Admin"("verificationHash");
UPDATE "Admin" SET "verifiedAt" = CURRENT_TIMESTAMP;

CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    CONSTRAINT "Subject_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Subject_adminId_nameKey_key" ON "Subject"("adminId", "nameKey");

INSERT OR IGNORE INTO "Subject" ("id", "adminId", "name", "nameKey")
SELECT lower(hex(randomblob(16))), "adminId", "course", lower("course")
FROM "Quiz" WHERE trim("course") <> '';

INSERT OR IGNORE INTO "Subject" ("id", "adminId", "name", "nameKey")
SELECT lower(hex(randomblob(16))), "Admin"."id", defaults.name, lower(defaults.name)
FROM "Admin" CROSS JOIN (
  SELECT 'Computer Networks' AS name
  UNION ALL SELECT 'Operating System'
  UNION ALL SELECT 'Programming for AI'
  UNION ALL SELECT 'Artificial Intelligence'
) AS defaults;
