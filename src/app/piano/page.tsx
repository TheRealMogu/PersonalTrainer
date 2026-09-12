import { Card } from "@/components/card";
import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { PLAN_SECTIONS } from "@/lib/plan";
import { DAILY_TARGETS, MACRO_LABELS, MACRO_ORDER, MACRO_UNITS } from "@/lib/targets";

export default function PianoPage() {
  return (
    <main>
      <PageHeader title="Piano" subtitle="Linee guida del personal trainer" />

      <Card title="Target giornaliero">
        <dl className="divide-y divide-hairline">
          {MACRO_ORDER.map((key) => (
            <div key={key} className="flex items-baseline justify-between py-3 first:pt-0 last:pb-0">
              <dt className="text-[15px]">{MACRO_LABELS[key]}</dt>
              <dd className="text-[15px] font-semibold tabular-nums">
                {DAILY_TARGETS[key]} {MACRO_UNITS[key]}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {PLAN_SECTIONS.map((section) => (
        <Card key={section.title} title={section.title}>
          <ul className="space-y-3">
            {section.items.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-snug">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card title="Accesso">
        <LogoutButton />
      </Card>
    </main>
  );
}
