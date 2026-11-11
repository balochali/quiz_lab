"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function addSubject(_: string, form: FormData) {
  const adminId = await requireAdmin();
  const name = z.string().trim().min(1).max(200).safeParse(form.get("name"));
  if (!name.success) return "Enter a subject name of 1 to 200 characters.";
  const nameKey = name.data.toLowerCase();
  try {
    await db.subject.create({ data: { adminId, name: name.data, nameKey } });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") return "This subject is already in your collection.";
    return "Unable to save the subject. Try again.";
  }
  redirect("/admin/subjects?added=1");
}
