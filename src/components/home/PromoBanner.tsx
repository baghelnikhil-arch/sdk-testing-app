import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { img } from "@/lib/images";

const PROMO_IMAGE = img("photo-1483985988355-763728e1935b", 1200, 800);

export function PromoBanner() {
  return (
    <section className="container-page section-y">
      <div className="relative overflow-hidden rounded-xl bg-foreground">
        <Image
          src={PROMO_IMAGE}
          alt=""
          fill
          sizes="(min-width: 1280px) 76rem, 100vw"
          className="object-cover object-[center_20%] opacity-70"
        />

        <div
          className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/55 to-foreground/10"
          aria-hidden="true"
        />

        <div className="relative px-6 py-16 sm:px-10 md:px-14 md:py-24 lg:py-28">
          <div className="max-w-lg">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
              Limited time
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-balance text-white md:text-5xl">
              Summer Collection
            </h2>
            <p className="mt-3 font-display text-2xl text-white/85 md:text-3xl">
              Up to 40% off
            </p>
            <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-pretty text-white/70">
              Lightweight layers, open-weave knits and the accessories that go
              with them — reduced while stock lasts.
            </p>

            <ButtonLink
              href="/shop?sale=true"
              variant="inverse"
              size="lg"
              className="mt-8"
            >
              Explore Collection
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
