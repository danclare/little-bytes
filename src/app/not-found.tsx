import Link from "next/link";

export default function NotFound() {
  return (
    <main className="content">
      <section className="card">
        <p className="eyebrow">Not found</p>
        <h1>We could not find that page.</h1>
        <p>Try returning to your Little Bites home.</p>
        <Link className="button" href="/">
          Go home
        </Link>
      </section>
    </main>
  );
}
