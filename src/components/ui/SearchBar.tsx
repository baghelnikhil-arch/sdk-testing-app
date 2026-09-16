"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  placeholder = "Search products",
  id = "product-search",
  label = "Search products",
  autoFocus,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />

      <input
        id={id}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-11 w-full rounded-md border border-border-strong bg-background pr-10 pl-10 text-sm text-foreground",
          "placeholder:text-muted-foreground transition-colors duration-150",
          "hover:border-foreground/25 focus:border-primary",
          // The browser's own clear button would sit beside ours.
          "[&::-webkit-search-cancel-button]:hidden",
        )}
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
