export const lecturerPermissions = {
  canCreateQuizzes: "Create quizzes",
  canPublishQuizzes: "Publish quizzes",
  canExportResults: "Export results",
  canCorrectMarks: "Correct marks and regrade",
} as const;
export type LecturerPermission = keyof typeof lecturerPermissions;
