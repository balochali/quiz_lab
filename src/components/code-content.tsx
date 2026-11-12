export function CodeContent({ text }: { text: string }) {
  const parts = text.split(/(```[^\n]*\n[\s\S]*?```)/g);
  return <span className="code-content">{parts.map((part, index) => {
    const match = /^```([^\n]*)\n([\s\S]*?)```$/.exec(part);
    return match ? <span className="quiz-code-block" key={index}><span className="quiz-code-language">{match[1].trim() || "Code"}</span><code>{match[2].replace(/\n$/, "")}</code></span> : <span className="quiz-prose" key={index}>{part}</span>;
  })}</span>;
}
