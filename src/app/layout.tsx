import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizLab · University assessments",
  description: "Build, share and grade university lab assessments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
