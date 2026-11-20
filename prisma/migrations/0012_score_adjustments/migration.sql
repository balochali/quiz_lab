ALTER TABLE "QuizAttempt" ADD COLUMN "adjustedMarks" INTEGER;
ALTER TABLE "QuizAttempt" ADD COLUMN "markAdjustments" TEXT NOT NULL DEFAULT '[]';
