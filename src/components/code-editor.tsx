"use client";

import { type TextareaHTMLAttributes } from "react";
import { Code2, Type, X } from "lucide-react";
import { CodeContent } from "./code-content";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string; onValueChange: (value: string) => void; variant?: "question" | "option";
};

export function CodeEditor({ value, onValueChange, variant = "question", ...props }: Props) {
  const match = /```([^\n]*)\n([\s\S]*?)```/.exec(value);
  const hasCode = !!match;
  const before = match ? value.slice(0, match.index).replace(/\n$/, "") : value;
  const after = match ? value.slice(match.index + match[0].length) : "";
  const code = match ? match[2].replace(/\n$/, "") : "";
  const language = match?.[1].trim() || "python";
  function combine(text: string, source: string) {
    onValueChange((text ? text + "\n" : "") + "```" + language + "\n" + source + "\n```" + after);
  }
  function textMode() {
    if (match) onValueChange(before + (before && code ? "\n" : "") + code + after);
  }
  const codeBox = <span className="separate-code-box">
    <span className="separate-code-heading"><span><Code2 size={16} /> {language === "python" ? "Python code" : language + " code"}</span>{variant === "question" && <button type="button" aria-label="Convert code block to question text" title="Keep code as question text" onClick={textMode}><X size={15} /></button>}</span>
    <textarea {...(variant === "option" ? props : {})} id={(variant === "question" || !!before || !!after.trim()) && props.id ? props.id + "-code" : props.id} aria-label={variant === "question" ? "Question code" : "Answer option code"} rows={6} className="separate-code-input" spellCheck={false} value={code} placeholder="Paste Python code here…" onChange={event => combine(before, event.target.value)} onKeyDown={event => {
      if (event.key === "]" && event.ctrlKey) {
        event.preventDefault();
        const area = event.currentTarget;
        const start = area.selectionStart;
        const end = area.selectionEnd;
        combine(before, code.slice(0, start) + "    " + code.slice(end));
        requestAnimationFrame(() => area.setSelectionRange(start + 4, start + 4));
      }
    }} />
    <small>Indentation is preserved · Ctrl+] inserts 4 spaces</small>
  </span>;
  return <span className="code-editor">
    {variant === "option" && <span className="option-content-switch" role="group" aria-label="Option content type">
      <button type="button" aria-pressed={!hasCode} onClick={textMode}><Type size={14} /> Text</button>
      <button type="button" aria-pressed={hasCode} onClick={() => { if (!hasCode) onValueChange("```python\n" + value + "\n```"); }}><Code2 size={14} /> Code</button>
    </span>}
    {(variant === "question" || !hasCode || !!before || !!after.trim()) && <textarea {...props} aria-label={variant === "question" ? "Question text" : "Answer option text"} className="separate-prose-input" rows={props.rows ?? (variant === "option" ? 3 : 4)} value={hasCode ? before : value} onChange={event => hasCode ? combine(event.target.value, code) : onValueChange(event.target.value)} />}
    {variant === "question" && !hasCode && <button type="button" className="add-question-code" onClick={() => onValueChange((value ? value + "\n" : "") + "```python\n\n```")}><Code2 size={16} /> Add Python code</button>}
    {hasCode && codeBox}
    {hasCode && !!after.trim() && <span className="code-editor-preview"><small>Text following code (preserved)</small><CodeContent text={after} /></span>}
    {hasCode && code && <span className="code-editor-preview"><small>Student code preview</small><CodeContent text={"```" + language + "\n" + code + "\n```"} /></span>}
  </span>;
}
