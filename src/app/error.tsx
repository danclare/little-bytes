"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="content">
      <section className="card" role="alert">
        <h1>Something went wrong.</h1>
        <p>
          We could not finish that request. Your saved family information has not been changed
          unless you received a success message.
        </p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
