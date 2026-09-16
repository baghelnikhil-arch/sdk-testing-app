import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { getCategories } from "@/lib/shop-data";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default async function NotFound() {
  const categories = await getCategories();

  return (
    <div className="container-page flex flex-col items-center py-24 text-center md:py-36">
      <p className="font-display text-7xl leading-none text-border-strong md:text-8xl">
        404
      </p>

      <h1 className="mt-6 font-display text-3xl tracking-tight text-balance text-foreground md:text-4xl">
        We couldn&rsquo;t find that page.
      </h1>

      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground">
        The link may be out of date, or the product may no longer be part of the
        collection.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink href="/shop" variant="secondary" size="lg">
          Browse the shop
        </ButtonLink>
      </div>

      <div className="mt-14 w-full max-w-lg border-t border-border pt-8">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Or jump to a category
        </h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/shop/${category.slug}`}
                className="inline-flex h-9 items-center rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
