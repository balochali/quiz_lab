import { BookOpen, GraduationCap, NotebookPen, Library, School, Lightbulb, Shapes, Compass, Palette, Globe } from "lucide-react";

const icons = [BookOpen, GraduationCap, NotebookPen, Library, School, Lightbulb, Shapes, Compass, Palette, Globe];
const themes = ["violet", "blue", "mint", "amber", "rose"];

export function subjectStyle(name: string) {
  const key = name.toLowerCase();
  const hash = Array.from(key).reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 7);
  const theme = themes[hash % themes.length];
  const Icon = icons[Math.floor(hash / themes.length) % icons.length];
  return { Icon, theme, label: "Your teaching collection" };
}
