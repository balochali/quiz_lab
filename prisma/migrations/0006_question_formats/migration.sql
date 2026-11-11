ALTER TABLE "Question" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'MCQ';
ALTER TABLE "Question" ADD COLUMN "acceptedAnswers" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "QuizAttempt" ADD COLUMN "gradingPending" BOOLEAN NOT NULL DEFAULT false;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentAnswer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionId" TEXT,
  "textAnswer" TEXT,
  "awardedMarks" INTEGER,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StudentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StudentAnswer" ("id","attemptId","questionId","optionId","updatedAt")
SELECT "id","attemptId","questionId","optionId","updatedAt" FROM "StudentAnswer";
DROP TABLE "StudentAnswer";
ALTER TABLE "new_StudentAnswer" RENAME TO "StudentAnswer";
CREATE UNIQUE INDEX "StudentAnswer_attemptId_questionId_key" ON "StudentAnswer"("attemptId","questionId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
