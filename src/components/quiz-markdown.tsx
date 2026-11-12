import { createElement } from "react";
import { CodeContent } from "./code-content";

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*)/g).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

/** Basic assessment formatting, rendered as React text without accepting raw HTML. */
export function QuizMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const key = index;
    if (!line.trim()) { index++; continue; }
    if (/^```/.test(line)) {
      const code = [line]; index++;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      code.push("```");
      blocks.push(<CodeContent key={key} text={code.join("\n")} />); continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { blocks.push(createElement("h" + Math.min(6, heading[1].length + 1), { key }, inline(heading[2]))); index++; continue; }
    const ordered = /^\s*\d+[.)]\s+/.test(line);
    const bullet = /^\s*[-*+]\s+/.test(line);
    if (ordered || bullet) {
      const items = [];
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
      const start = ordered ? Number(/^\s*(\d+)/.exec(line)?.[1] ?? 1) : undefined;
      while (index < lines.length && pattern.test(lines[index])) {
        const itemKey = index;
        let content = lines[index++].replace(pattern, "");
        while (index < lines.length && lines[index].trim() && !/^\s*(?:\d+[.)]|[-*+])\s+|^#{1,6}\s|^```/.test(lines[index])) content += "\n" + lines[index++];
        items.push(<li key={itemKey}>{inline(content)}</li>);
      }
      blocks.push(ordered ? <ol key={key} start={start}>{items}</ol> : <ul key={key}>{items}</ul>); continue;
    }
    let paragraph = lines[index++];
    while (index < lines.length && lines[index].trim() && !/^#{1,6}\s|^```|^\s*(?:\d+[.)]|[-*+])\s+/.test(lines[index])) paragraph += "\n" + lines[index++];
    blocks.push(<p key={key}>{inline(paragraph)}</p>);
  }
  return <div className="quiz-markdown">{blocks}</div>;
}
