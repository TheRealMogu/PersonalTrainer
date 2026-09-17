/**
 * Titolo di sezione fuori dalle schede.
 *
 * Prima ogni scheda portava il proprio titolo dentro il riquadro, e due
 * schede che parlano della stessa cosa restavano due oggetti separati. Con il
 * titolo fuori si legge "questo gruppo riguarda X", e le schede sotto sono i
 * pezzi di X. E' il modo in cui si organizzano le app di settore, e non costa
 * niente: e' un'intestazione e un margine.
 */
export function Section({
  id,
  title,
  action,
  children,
}: {
  /** Ancora per arrivarci con un tocco da altrove. */
  id?: string;
  title: string;
  /** Voce a destra del titolo, per esempio un "Modifica". */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-5 scroll-mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
