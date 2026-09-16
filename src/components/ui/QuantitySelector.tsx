"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { wrap: "h-9", button: "w-9", value: "w-8 text-sm" },
  md: { wrap: "h-11", button: "w-11", value: "w-10 text-sm" },
} as const;

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 10,
  size = "md",
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const styles = SIZES[size];

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) onChange(next);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border-strong bg-background",
        styles.wrap,
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={cn(
          "flex h-full items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
          styles.button,
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <span
        aria-live="polite"
        className={cn(
          "text-center font-medium tabular-nums text-foreground",
          styles.value,
        )}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={cn(
          "flex h-full items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35",
          styles.button,
        )}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
