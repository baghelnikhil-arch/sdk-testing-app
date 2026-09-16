import { cn, formatPrice } from "@/lib/utils";

type PriceSize = "sm" | "md" | "lg";

const SIZES: Record<PriceSize, { current: string; original: string }> = {
  sm: { current: "text-sm", original: "text-xs" },
  md: { current: "text-base", original: "text-sm" },
  lg: { current: "text-2xl", original: "text-base" },
};

export function Price({
  price,
  originalPrice,
  size = "md",
  className,
}: {
  price: number;
  originalPrice?: number;
  size?: PriceSize;
  className?: string;
}) {
  const showOriginal = Boolean(originalPrice && originalPrice > price);
  const styles = SIZES[size];

  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground", styles.current)}>
        {formatPrice(price)}
      </span>
      {showOriginal && (
        <span
          className={cn("text-muted-foreground line-through", styles.original)}
        >
          {formatPrice(originalPrice!)}
        </span>
      )}
      {showOriginal && <span className="sr-only">on sale, reduced from</span>}
    </span>
  );
}
