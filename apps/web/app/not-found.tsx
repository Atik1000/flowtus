import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="page-center">
      <h1 className="display" style={{ fontSize: 48 }}>Page not found</h1>
      <p className="muted">This link does not lead anywhere. It may have moved.</p>
      <Link href="/" className="btn btn-rose">Home</Link>
    </section>
  );
}
