import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * Column counts are chosen per breakpoint rather than letting the layout shrink:
 * two on phones, three on tablets, four on desktop.
 */
const COLUMNS = {
  /** Full-bleed sections: 2 / 3 / 4 across the breakpoints. */
  full: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  /** Beside the shop filter rail, which only appears from `lg` up. */
  sidebar: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
} as const;

export function ProductGrid({
  products,
  columns = "full",
  priorityCount = 0,
  className,
}: {
  products: Product[];
  columns?: keyof typeof COLUMNS;
  /** Number of leading images to eager-load (above the fold). */
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10",
        COLUMNS[columns],
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}

/** Matches the card's shape so switching pages does not jump the layout. */
export function ProductGridSkeleton({
  count = 8,
  columns = "full",
}: {
  count?: number;
  columns?: keyof typeof COLUMNS;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10",
        COLUMNS[columns],
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col">
          <div className="aspect-4/5 animate-pulse rounded-lg bg-muted" />
          <div className="mt-3.5 h-3 w-16 animate-pulse rounded-xs bg-muted" />
          <div className="mt-2.5 h-3.5 w-3/4 animate-pulse rounded-xs bg-muted" />
          <div className="mt-3 h-3 w-24 animate-pulse rounded-xs bg-muted" />
          <div className="mt-3 h-4 w-20 animate-pulse rounded-xs bg-muted" />
          <div className="mt-4 h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}
