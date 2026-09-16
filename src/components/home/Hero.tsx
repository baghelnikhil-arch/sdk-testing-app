import Image from "next/image";
import { Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { img } from "@/data/images";

const HERO_IMAGE = img("photo-1517445312882-bc9910d016b7", 1000, 1250);

export function Hero() {
  return (
    <section className="border-b border-border bg-subtle">
      <div className="container-page">
        <div className="grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              New season · 2026
            </p>

            <h1 className="mt-4 font-display text-[2.75rem] leading-[1.05] tracking-tight text-balance text-foreground sm:text-6xl lg:text-[4.25rem]">
              Discover products you&rsquo;ll love.
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-pretty text-muted-foreground">
              Considered clothing and accessories made in small runs from
              materials worth keeping. Fewer things, chosen carefully, built to
              outlast the season they arrived in.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/shop" size="lg" className="sm:px-9">
                Shop Now
              </ButtonLink>
              <ButtonLink href="/shop/new-arrivals" variant="secondary" size="lg">
                Explore Collection
              </ButtonLink>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                { value: "180+", label: "Pieces in stock" },
                { value: "40+", label: "Countries shipped" },
                { value: "4.8", label: "Average rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block font-display text-2xl text-foreground md:text-3xl">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The floating card overlaps the image, so the wrapper keeps room for it. */}
          <div className="relative lg:pb-10 lg:pl-10">
            <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-muted sm:aspect-3/2 lg:aspect-4/5">
              <Image
                src={HERO_IMAGE}
                alt="Model wearing a relaxed shirt and pleated wide-leg trousers"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>

            <figure className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-raised lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:max-w-[16rem]">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50"
                aria-hidden="true"
              >
                <Star className="h-4 w-4 fill-accent-600 text-accent-600" />
              </span>
              <figcaption className="text-sm leading-snug">
                <span className="block font-medium text-foreground">
                  Rated 4.8 out of 5
                </span>
                <span className="block text-muted-foreground">
                  from 12,400 verified reviews
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
