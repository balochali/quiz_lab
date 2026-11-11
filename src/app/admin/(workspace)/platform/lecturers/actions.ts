"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function updateLecturer(id: string, form: FormData) {
  const actor = await requireSuperAdmin();
  if (actor === id) throw new Error("You cannot restrict your own account.");
  const flag = z.enum(["on"]).optional().transform(value => value === "on");
  const settings = z.object({
    suspended: flag, canCreateQuizzes: flag, canPublishQuizzes: flag, canExportResults: flag, canCorrectMarks: flag,
  }).parse(Object.fromEntries(form));
  // Role changes are reserved for the provisioning script, including protection of other admins.
  await db.admin.updateMany({ where: { id, role: "LECTURER" }, data: settings });
  redirect("/admin/platform/lecturers?saved=1");
}
