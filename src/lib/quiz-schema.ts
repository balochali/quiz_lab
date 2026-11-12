import { z } from "zod";

export const settings = {
  randomQuestions: "Shuffle questions",
  randomOptions: "Shuffle options",
  requireFullscreen: "Require fullscreen",
  detectTabSwitch: "Monitor tab switches",
  terminateOnTabSwitch: "End attempt on tab switch",
  autoSubmit: "Automatically submit at expiry",
  multipleAttempts: "Allow repeat attempts",

} as const;

export const questionTypes = { MCQ: "Multiple choice", BLANK: "Fill in the blank", THEORY: "Theory / written answer" } as const;

export const quizSchema = z.object({
  title: z.string().trim().min(1, "Enter a quiz title.").max(200, "Use no more than 200 characters."),
  course: z.string().trim().min(1, "Choose a subject.").max(200),
  semester: z.string().trim().min(1, "Enter the semester.").max(80),
  description: z.string().max(4000),
  instructions: z.string().max(4000),
  durationMinutes: z.number().int("Use a whole number of minutes.").min(1, "Duration must be at least 1 minute.").max(360, "Duration cannot exceed 360 minutes."),
  totalMarks: z.number().int("Use whole-number marks.").min(1, "Total marks must be at least 1.").max(100000),
  randomQuestions: z.boolean(),
  randomOptions: z.boolean(),
  requireFullscreen: z.boolean(),
  detectTabSwitch: z.boolean(),
  terminateOnTabSwitch: z.boolean(),
  autoSubmit: z.boolean(),
  multipleAttempts: z.boolean(),
  showResults: z.boolean(),
  opensAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  questions: z.array(z.object({
    type: z.enum(["MCQ", "BLANK", "THEORY"]).default("MCQ"),
    acceptedAnswers: z.array(z.string().max(1500)).max(30).transform(values => values.map(value => value.trim()).filter(Boolean)).default([]),
    text: z.string().min(1, "Enter the question text.").refine(value => !!value.trim(), "Enter the question text.").max(4000, "Use no more than 4000 characters."),
    options: z.array(z.string().max(1500, "Use no more than 1500 characters.")).max(4),
    correct: z.number().int().min(0, "Select one correct answer.").max(3, "Select one correct answer."),
    durationSeconds: z.number().int().min(1).max(21600).nullable().optional(),
    marks: z.number().int("Use whole-number marks.").min(1, "Assign at least 1 mark.").max(1000, "A question cannot exceed 1000 marks."),
  }).superRefine((question, context) => {
    if (question.type === "MCQ") {
      if (question.options.length !== 4) context.addIssue({ code: "custom", path: ["options"], message: "Provide four answer options." });
      question.options.forEach((option, index) => { if (!option.trim()) context.addIssue({ code: "custom", path: ["options", index], message: "Enter answer text." }); });
    }
    if (question.type === "BLANK" && !question.acceptedAnswers.length) context.addIssue({ code: "custom", path: ["acceptedAnswers"], message: "Enter at least one accepted answer." });
  })).max(200),
});
// Drafts validate the payload structure, while allowing unfinished assessment content.
const draftText = z.string().max(100000);
const draftNumber = z.number().finite().nullable().transform(value => value ?? 0);
export const draftSchema = quizSchema.extend({
  title: draftText, course: draftText, semester: draftText, description: draftText, instructions: draftText,
  durationMinutes: draftNumber, totalMarks: draftNumber,
  opensAt: z.string().nullable(), expiresAt: z.string().nullable(),
  questions: z.array(z.object({
    type: z.enum(["MCQ", "BLANK", "THEORY"]).default("MCQ"), text: draftText,
    acceptedAnswers: z.array(draftText).max(200).default([]), options: z.array(draftText).max(4),
    correct: draftNumber, marks: draftNumber, durationSeconds: draftNumber.optional().nullable(),
  })).max(200),
});
export type QuizInput = z.infer<typeof quizSchema>;
export const statuses = {
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  EXPIRED: "Time expired",
  TAB_SWITCH: "Terminated – tab switch",
  FULLSCREEN_EXIT: "Terminated – fullscreen exit",
} as const;
export function statusLabel(status: string) {
  return statuses[status as keyof typeof statuses] ?? status;
}
