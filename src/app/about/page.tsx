import type { Metadata } from "next";
import Image from "next/image";
import { Leaf, Ruler, Sparkles, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { img } from "@/data/images";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: SITE.description,
};

const VALUES = [
  {
    icon: Ruler,
    title: "Fewer, better",
    description:
      "We release a handful of pieces a season rather than a catalogue. If it does not earn a place, it does not ship.",
  },
  {
    icon: Leaf,
    title: "Materials that age well",
    description:
      "Natural fibres and full-grain leathers, chosen because they improve with wear instead of wearing out.",
  },
  {
    icon: Users,
    title: "Makers we know",
    description:
      "Every workshop we use is one we have visited. We pay their price, not the lowest one we could find.",
  },
  {
    icon: Sparkles,
    title: "Built to be repaired",
    description:
      "Replaceable buttons, resoleable shoes, and a repairs desk that will take something back years later.",
  },
];

const STATS = [
  { value: "2019", label: "Founded in San Francisco" },
  { value: "40+", label: "Countries shipped to" },
  { value: "12k", label: "Verified reviews" },
  { value: "94%", label: "Customers who reorder" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        title="Modern essentials, thoughtfully made."
        description="We started with one question: what would a wardrobe look like if nothing in it was disposable?"
      />

      <section className="container-page section-y">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted lg:aspect-4/5">
            <Image
              src={img("photo-1441986300917-64674bd600d8", 1000, 1250)}
              alt="Inside the Aurelle store, shelves of folded clothing and leather goods"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Our story
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-balance text-foreground md:text-4xl">
              It began with a shirt that would not last the year.
            </h2>

            <div className="mt-6 flex flex-col gap-4 text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
              <p>
                In 2019 we were three people with a small studio, frustrated by
                how quickly good-looking clothes fell apart. So we started at the
                other end: find the mills and workshops doing careful work, and
                build a small collection around what they could actually make
                well.
              </p>
              <p>
                That constraint became the whole idea. We do not chase trends or
                fill a catalogue. We make a short list of things worth owning,
                revise them slowly, and publish what they cost to produce.
              </p>
              <p>
                Today {SITE.name} ships to more than forty countries from the
                same block in San Francisco we started on — still small, still
                arguing about buttons.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-subtle">
        <div className="container-page section-y">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Our mission
              </p>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-balance text-foreground md:text-4xl">
                To make buying less, better, the easy choice.
              </h2>
            </div>

            <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
              Most of what is wrong with how clothes are made is invisible at the
              point of sale. We try to make it visible — where a garment was cut,
              what it is made from, what it costs to produce, and how to keep it
              going. When that information is on the table, buying less stops
              feeling like a sacrifice and starts feeling obvious.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page section-y">
        <SectionHeading
          eyebrow="What we hold to"
          title="Our values"
          description="Four commitments that decide what we make and what we turn down."
          align="center"
        />

        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value) => (
            <li key={value.title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
                <value.icon
                  className="h-5 w-5 text-foreground"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3 className="mt-4 text-[0.9375rem] font-medium text-foreground">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-subtle">
        <div className="container-page section-y">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-4xl text-foreground md:text-5xl">
                    {stat.value}
                  </span>
                  <span className="mt-2 block text-sm leading-snug text-muted-foreground">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-page section-y">
        <div className="relative overflow-hidden rounded-xl bg-foreground px-6 py-16 text-center sm:px-10 md:py-20">
          <Image
            src={img("photo-1445205170230-053b83016050", 1200, 800)}
            alt=""
            fill
            sizes="(min-width: 1280px) 76rem, 100vw"
            className="object-cover opacity-30"
          />
          <div
            className="absolute inset-0 bg-foreground/60"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-xl">
            <h2 className="font-display text-3xl leading-tight text-balance text-white md:text-4xl">
              Start with one piece.
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-pretty text-white/70">
              Have a look through the collection. If it is not right, send it
              back within thirty days — we cover the postage.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/shop"
                variant="inverse"
                size="lg"
              >
                Shop the collection
              </ButtonLink>
              <ButtonLink
                href="/contact"
                variant="inverseOutline"
                size="lg"
              >
                Talk to us
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
