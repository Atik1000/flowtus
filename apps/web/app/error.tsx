'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page-center">
      <h1 className="display" style={{ fontSize: 44 }}>Something went wrong</h1>
      <p className="muted">We could not load this page. Please try again in a moment.</p>
      <button type="button" className="btn btn-rose" onClick={reset}>Try again</button>
    </section>
  );
}
