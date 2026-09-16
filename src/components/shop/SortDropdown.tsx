"use client";

import { ChevronDown } from "lucide-react";
import { selectStyles } from "@/components/ui/field";
import type { SortOption } from "@/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

/**
 * A native select — it gets keyboard support, mobile pickers and screen-reader
 * behaviour for free, which a hand-rolled listbox would have to re-earn.
 */
export function SortDropdown({
  value,
  onChange,
  className,
}: {
  value: SortOption;
  onChange: (next: SortOption) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor="sort-products" className="sr-only">
        Sort products
      </label>

      <select
        id="sort-products"
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
        className={selectStyles("h-10")}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
