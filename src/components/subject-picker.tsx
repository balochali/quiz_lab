"use client";
import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, Search } from "lucide-react";
import { subjectStyle } from "@/lib/subject-style";

export function SubjectPicker({ value, subjects, onChange, id, ...aria }: {
  value: string; subjects: string[]; onChange: (value: string) => void; id: string;
  "aria-invalid"?: boolean; "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const options = subjects.filter(subject => subject.toLowerCase().includes(query.toLowerCase()));
  const current = subjectStyle(value);
  const CurrentIcon = value ? current.Icon : BookOpen;

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(listId + "-" + active)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function select(subject: string) {
    onChange(subject);
    setOpen(false);
    trigger.current?.focus();
  }
  return <div className="subject-picker" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <button type="button" ref={trigger} id={id} className={"subject-picker-trigger subject-" + current.theme}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} {...aria}
      onClick={() => { setOpen(!open); setQuery(""); setActive(0); }}>
      <span className="picker-icon"><CurrentIcon size={19} /></span><span>{value || "Choose a subject"}</span><ChevronDown size={17} />
    </button>
    {open && <div className="subject-picker-popup" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive(index => options.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : 0);
      }
      if (event.key === "Enter") { event.preventDefault(); if (options[active]) select(options[active]); }
    }}>
      <div className="picker-search"><Search size={16} /><input autoFocus aria-label="Find a subject" placeholder="Find your subject…" value={query}
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={options[active] ? listId + "-" + active : undefined}
        onChange={event => { setQuery(event.target.value); setActive(0); }} /></div>
      <div role="listbox" id={listId} aria-label="Subjects" className="picker-options">
        {options.map((subject, index) => {
          const { Icon, theme } = subjectStyle(subject);
          return <button type="button" role="option" aria-selected={value === subject} tabIndex={-1} key={subject} id={listId + "-" + index}
            className={"picker-option subject-" + theme + (index === active ? " picker-option-active" : "")}
            onMouseEnter={() => setActive(index)} onClick={() => select(subject)}>
            <span className="picker-icon"><Icon size={18} /></span><span>{subject}</span>{value === subject && <Check size={16} />}
          </button>;
        })}
        {!options.length && <p className="muted">No subjects match your search.</p>}
      </div>
    </div>}
  </div>;
}
