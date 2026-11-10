"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="narrow card"><h1>Something went wrong</h1>
    <p>Try again. If the problem persists, contact the quiz administrator.</p>
    <button className="primary" onClick={reset}>Try again</button></main>;
}
