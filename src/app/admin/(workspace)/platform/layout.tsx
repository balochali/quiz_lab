import { requireSuperAdmin } from "@/lib/auth";
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return <div className="platform-area">{children}</div>;
}
