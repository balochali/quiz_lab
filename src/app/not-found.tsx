import Link from "next/link";
export default function NotFound() {
  return <main className="narrow card"><h1>Page unavailable</h1><p>Check your link or ask your lecturer for the published quiz link.</p><Link href="/">QuizLab home</Link></main>;
}
