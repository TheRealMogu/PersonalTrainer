export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
      {title ? (
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
