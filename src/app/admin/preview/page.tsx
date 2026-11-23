import { StudentPreview } from "@/components/student-preview";
import { requireAdmin } from "@/lib/auth";

/** A protected, browser-only simulation used while creating a quiz. */
export default async function StudentPreviewPage() {
  await requireAdmin();
  return <StudentPreview />;
}
