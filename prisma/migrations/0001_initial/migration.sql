-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "randomQuestions" BOOLEAN NOT NULL DEFAULT false,
    "randomOptions" BOOLEAN NOT NULL DEFAULT false,
    "requireFullscreen" BOOLEAN NOT NULL DEFAULT true,
    "detectTabSwitch" BOOLEAN NOT NULL DEFAULT true,
    "terminateOnTabSwitch" BOOLEAN NOT NULL DEFAULT true,
    "autoSubmit" BOOLEAN NOT NULL DEFAULT true,
    "multipleAttempts" BOOLEAN NOT NULL DEFAULT false,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quiz_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "marks" INTEGER NOT NULL,
    CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rollNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "activeKey" TEXT,
    "studentName" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "quizTitle" TEXT NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "obtainedMarks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "questionOrder" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "submittedAt" DATETIME,
    CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Violation_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_code_key" ON "Quiz"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Question_quizId_position_key" ON "Question"("quizId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Option_questionId_position_key" ON "Option"("questionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNumber_key" ON "Student"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_tokenHash_key" ON "QuizAttempt"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_activeKey_key" ON "QuizAttempt"("activeKey");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_studentId_idx" ON "QuizAttempt"("quizId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptId_questionId_key" ON "StudentAnswer"("attemptId", "questionId");

