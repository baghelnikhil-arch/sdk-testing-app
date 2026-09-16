import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { icon: "h-3.5 w-3.5", text: "text-xs" },
  md: { icon: "h-4 w-4", text: "text-sm" },
} as const;

function Stars({ className, size }: { className: string; size: string }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn(size, className)} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export function Rating({
  value,
  reviewCount,
  size = "sm",
  showValue = false,
  className,
}: {
  value: number;
  reviewCount?: number;
  size?: keyof typeof SIZES;
  showValue?: boolean;
  className?: string;
}) {
  const styles = SIZES[size];
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <span className={cn("flex items-center gap-2", className)}>
      {/* Empty stars sit underneath; the filled row is clipped to the score. */}
      <span className="relative inline-flex" aria-hidden="true">
        <Stars className="text-border-strong" size={styles.icon} />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${percent}%` }}
        >
          <Stars
            className="fill-foreground text-foreground"
            size={styles.icon}
          />
        </span>
      </span>

      {showValue && (
        <span className={cn("font-medium text-foreground", styles.text)}>
          {value.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && (
        <span className={cn("text-muted-foreground", styles.text)}>
          ({reviewCount})
        </span>
      )}

      <span className="sr-only">
        Rated {value.toFixed(1)} out of 5
        {reviewCount !== undefined ? ` from ${reviewCount} reviews` : ""}
      </span>
    </span>
  );
}
