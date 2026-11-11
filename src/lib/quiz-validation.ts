import { quizSchema } from "./quiz-schema";

export type QuizIssue = { path: string; label: string; message: string; step: number };
const labels: Record<string, string> = {
  title: "Quiz title", course: "Subject", semester: "Semester", durationMinutes: "Duration",
  totalMarks: "Total marks", description: "Description", instructions: "Student instructions",
  opensAt: "Opening time", expiresAt: "Link expiration",
};

export function quizFieldId(path: string) { return "quiz-" + path.replaceAll(".", "-"); }

export function getQuizIssues(input: unknown, publish: boolean): QuizIssue[] {
  const parsed = quizSchema.safeParse(input);
  const issues: QuizIssue[] = parsed.success ? [] : parsed.error.issues.map(issue => {
    const path = issue.path.join(".");
    const questionIndex = typeof issue.path[1] === "number" ? issue.path[1] : null;
    let label = labels[String(issue.path[0])] ?? "Quiz settings";
    let step = ["opensAt", "expiresAt"].includes(String(issue.path[0])) ? 3 : 0;
    if (issue.path[0] === "questions") {
      step = 1;
      label = questionIndex === null ? "Questions" : "Question " + (questionIndex + 1);
      if (issue.path[2] === "options" && typeof issue.path[3] === "number") label += " · Option " + String.fromCharCode(65 + issue.path[3]);
      if (issue.path[2] === "acceptedAnswers") label += " · Accepted answers";
      if (issue.path[2] === "marks") label += " · Marks";
      if (issue.path[2] === "correct") label += " · Correct answer";
    } else if (!Object.hasOwn(labels, String(issue.path[0]))) step = 2;
    return { path, label, step, message: issue.message };
  });
  // Cross-field checks also run when some unrelated fields are invalid.
  const values = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const schedule = quizSchema.pick({ opensAt: true, expiresAt: true }).safeParse(input);
  const totalMarks = quizSchema.shape.totalMarks.safeParse(values.totalMarks);
  if (schedule.success && schedule.data.opensAt && schedule.data.expiresAt &&
      Date.parse(schedule.data.expiresAt) <= Date.parse(schedule.data.opensAt)) {
    issues.push({ path: "expiresAt", label: "Link expiration", step: 3, message: "Choose a closing time after the quiz opens." });
  }
  if (publish) {
    const questions = quizSchema.shape.questions.safeParse(
      input && typeof input === "object" && "questions" in input ? input.questions : undefined);
    if (questions.success) {
      if (!questions.data.length) issues.push({ path: "questions", label: "Questions", step: 1, message: "Add at least one question before publishing." });
      else if (totalMarks.success) {
        const sum = questions.data.reduce((total, question) => total + question.marks, 0);
        if (sum !== totalMarks.data) issues.push({
          path: "totalMarks", label: "Marks do not match", step: 0,
          message: `Questions add up to ${sum} marks, but the quiz total is ${totalMarks.data}. Adjust question marks or set the total to ${sum}.`,
        });
      }
    }
  }
  return issues;
}
