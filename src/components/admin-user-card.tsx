"use client";

import { useRef, type ReactNode } from "react";
import { UserRound, ArrowUpRight, X } from "lucide-react";

export function AdminUserCard({ title, subtitle, status, metrics, tone = 0, children }: { title: string; subtitle: string; status: string; metrics: string[]; tone?: number; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <article className={"admin-user-card admin-user-tone-" + tone % 4}>
    <button type="button" className="admin-user-open" onClick={() => dialog.current?.showModal()} aria-label={"View profile: " + title}>
      <span className="admin-user-cover"><span className="admin-avatar"><UserRound size={31} /><span>{title.slice(0, 2).toUpperCase()}</span></span><span className="admin-user-status">{status}</span></span>
      <span className="admin-user-body"><small>{subtitle}</small><strong>{title}</strong><span className="admin-user-metrics">{metrics.map(metric => <span key={metric}>{metric}</span>)}</span><span className="admin-profile-link">View profile <ArrowUpRight size={16} /></span></span>
    </button>
    <dialog ref={dialog} className="admin-profile-modal" aria-label={"Profile: " + title} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <header className="admin-profile-header"><span className="admin-avatar"><UserRound size={28} /></span><div><small>{subtitle}</small><h2>{title}</h2><span>{status}</span></div><button type="button" className="admin-profile-close" onClick={() => dialog.current?.close()} aria-label="Close profile"><X size={21} /></button></header>
      <div className="admin-profile-content stack">{children}</div>
    </dialog>
  </article>;
}
