"use client";

import { useEffect, useRef, useState } from "react";
import { X, Save, PencilLine } from "lucide-react";
import { adjustAttemptMarks } from "@/app/admin/adjust-marks";
import { adjustmentHistory, finalMarks } from "@/lib/score-adjustments";
import { formatKarachiDateTime } from "@/lib/monitoring";
import type { ResultRow } from "./results-browser";

export function AdjustMarksDialog({ row, onClose, onSaved }: { row: ResultRow; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [marks, setMarks] = useState(String(finalMarks(row)));
  const [reason, setReason] = useState("");
  const [restore, setRestore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const history = adjustmentHistory(row.markAdjustments);
  return <dialog ref={dialog} className="marks-adjustment-dialog" aria-labelledby="adjust-marks-title" onCancel={event => { if (busy) event.preventDefault(); }} onClose={onClose} onClick={event => { if (!busy && event.target === event.currentTarget) dialog.current?.close(); }}>
    <header><PencilLine size={27} /><button type="button" disabled={busy} onClick={() => dialog.current?.close()} aria-label="Close marks adjustment"><X size={20} /></button><p className="eyebrow">Lecturer grade adjustment</p><h2 id="adjust-marks-title">Update student marks</h2><strong>{row.studentName}</strong><p>{row.rollNumber} · Original: {row.obtainedMarks} / {row.totalMarks} · Current final: {finalMarks(row)} / {row.totalMarks}</p></header>
    <form className="stack" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const result = await adjustAttemptMarks({ attemptId: row.id, marks: restore ? null : Number(marks), reason, expectedAdjusted: row.adjustedMarks, expectedOriginal: row.obtainedMarks, expectedTotal: row.totalMarks });
        if (result.error) setError(result.error); else onSaved();
      } catch { setError("Could not confirm the adjustment. Refresh results before trying again."); }
      finally { setBusy(false); }
    }}>
      <p className="muted">Apply a deduction or grace marks explicitly. Original question scores remain unchanged. Final marks stay within the quiz total, including after any question regrading.</p>
      <fieldset disabled={busy} className="stack"><div className="row wrap"><button type="button" aria-pressed={!restore} onClick={() => setRestore(false)}>Set updated marks</button><button type="button" aria-pressed={restore} onClick={() => setRestore(true)}>Use original marks</button></div>
      {!restore && <label>Updated marks (0–{row.totalMarks})<input type="number" min={0} max={row.totalMarks} step={1} required value={marks} onChange={event => setMarks(event.target.value)} /></label>}
      <label>Reason for adjustment<textarea required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="e.g. 2 grace marks awarded, or 1 mark deducted after reviewing a violation" /></label></fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}><Save size={17} />{busy ? "Saving…" : restore ? "Restore original marks" : "Save updated marks"}</button>
      {history.length > 0 && <details className="adjustment-history"><summary>Adjustment history ({history.length})</summary>{[...history].reverse().map((entry, index) => <article key={index}><strong>{entry.from ?? "Original"} → {entry.to ?? "Original"}</strong><p>{entry.reason}</p><small>{entry.actorEmail} · {formatKarachiDateTime(entry.at)}</small></article>)}</details>}
    </form>
  </dialog>;
}
