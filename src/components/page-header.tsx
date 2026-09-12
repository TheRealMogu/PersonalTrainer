export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="pt-12 pb-6">
      <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-[15px] text-muted">{subtitle}</p> : null}
    </header>
  );
}
