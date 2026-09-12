export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {title ? (
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
