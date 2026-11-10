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

export const quizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  course: z.string().trim().min(1).max(200),
  semester: z.string().trim().min(1).max(80),
  description: z.string().max(4000),
  instructions: z.string().max(4000),
  durationMinutes: z.number().int().min(1).max(360),
  totalMarks: z.number().int().min(1).max(100000),
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
    text: z.string().trim().min(1).max(4000),
    options: z.array(z.string().trim().min(1).max(1500)).length(4),
    correct: z.number().int().min(0).max(3),
    marks: z.number().int().min(1).max(1000),
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
