/**
 * Scheletro mostrato mentre la pagina carica.
 *
 * Non gira e non lampeggia forte: e' un'attesa di qualche centinaio di
 * millisecondi, e un'animazione insistente la fa sembrare piu' lunga. Le
 * forme hanno le misure delle schede vere, cosi' quando arrivano i dati non
 * salta tutto.
 */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Caricamento">
      <div className="pt-12 pb-6">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-hairline" />
      </div>

      {[0, 1].map((index) => (
        <section
          key={index}
          className="mb-4 rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="h-3 w-24 animate-pulse rounded bg-hairline" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-hairline" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-hairline" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-hairline" />
          </div>
        </section>
      ))}
    </main>
  );
}
