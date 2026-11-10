"use client";
import { useState } from "react";
import { Link2 } from "lucide-react";

export function CopyLink({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  const path = "/join/" + code;
  return <div className="row wrap">
    <button onClick={async () => {
      try {
        await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
        setMessage("Copied!");
      } catch {
        setMessage("Copy the link from the student page.");
      }
    }}><Link2 size={16} /> Copy student link</button>
    <a href={path} target="_blank" rel="noreferrer">Open link</a>
    {message && <span role="status">{message}</span>}
  </div>;
}
