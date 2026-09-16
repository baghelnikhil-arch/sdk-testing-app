import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/layout/ContactForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${SITE.name} team — we usually reply within one business day.`,
};

const DETAILS = [
  {
    icon: Mail,
    label: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: SITE.phone,
    href: `tel:${SITE.phone.replace(/[^+\d]/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Location",
    value: SITE.address,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        title="Contact us"
        description="Questions about sizing, an order, or a repair? Send a note and a real person will answer."
      />

      <div className="container-page py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          <ContactForm />

          <aside className="flex flex-col gap-8">
            <ul className="flex flex-col gap-6">
              {DETAILS.map((detail) => (
                <li key={detail.label} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <detail.icon
                      className="h-[1.125rem] w-[1.125rem] text-foreground"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      {detail.label}
                    </h2>
                    {detail.href ? (
                      <a
                        href={detail.href}
                        className="mt-1 block text-sm leading-relaxed text-foreground transition-colors hover:text-primary"
                      >
                        {detail.value}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm leading-relaxed text-foreground">
                        {detail.value}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-border bg-subtle p-6">
              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
                <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                Business hours
              </h2>

              <dl className="mt-4 flex flex-col gap-3">
                {SITE.hours.map((entry) => (
                  <div
                    key={entry.days}
                    className="flex items-baseline justify-between gap-4 text-sm"
                  >
                    <dt className="text-muted-foreground">{entry.days}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {entry.time}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
