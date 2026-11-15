"use client";

import { useState } from "react";

export function AdminCharts({ days, lecturers, students }: { days: { date: string; label: string; attempts: number; students: number }[]; lecturers: number; students: number }) {
  const [range, setRange] = useState(7);
  const [selected, setSelected] = useState<string | null>(null);
  const shown = days.slice(-range);
  const max = Math.max(1, ...shown.map(day => day.attempts));
  const detail = shown.find(day => day.date === selected);
  const total = lecturers + students;
  return <div className="admin-chart-grid">
    <section className="card admin-activity-chart"><div className="row between wrap"><div><p className="eyebrow">Assessment activity · PKT</p><h2>Learning in motion</h2></div><div className="admin-chart-controls">{[7, 30].map(value => <button type="button" key={value} aria-pressed={range === value} onClick={() => { setRange(value); setSelected(null); }}>{value} days</button>)}</div></div>
      <div className="admin-bars" role="group" aria-label="Daily quiz attempts and participating students">{shown.map(day => <button type="button" key={day.date} aria-pressed={day.date === selected} aria-label={`${day.date}: ${day.attempts} attempts, ${day.students} participating students`} title={`${day.date}: ${day.attempts} attempts · ${day.students} students`} onClick={() => setSelected(day.date)}><span className="admin-bar-pair"><i style={{ height: (day.attempts ? Math.max(2, day.attempts / max * 100) : 0) + "%" }} /><i style={{ height: (day.students ? Math.max(2, day.students / max * 100) : 0) + "%" }} /></span><small>{range === 7 ? day.label : day.label.split(" ")[0]}</small></button>)}</div>
      <div className="admin-chart-legend"><span><i /> Quiz attempts</span><span><i /> Unique students per day</span></div><p className="admin-chart-detail" aria-live="polite">{detail ? `${detail.date}: ${detail.attempts} attempts from ${detail.students} students` : shown.every(day => !day.attempts) ? "No assessment activity in this period." : "Select a day to explore its activity."}</p>
    </section>
    <section className="card admin-community-chart"><p className="eyebrow">People on QuizLab</p><h2>Your community</h2><div className="admin-donut" role="img" aria-label={`${lecturers} lecturers and ${students} students`} style={{ background: total ? `conic-gradient(#9461d9 0 ${(lecturers / total) * 100}%, #79c8ac ${(lecturers / total) * 100}% 100%)` : "#e8e0ef" }}><span><strong>{total}</strong><small>people</small></span></div><div className="admin-chart-legend"><span><i />{lecturers} lecturers</span><span><i />{students} students</span></div></section>
  </div>;
}
