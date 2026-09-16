"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** First, last, and a window around the current page — everything else collapses. */
function buildPages(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("gap");
    result.push(page);
  });

  return result;
}

const CELL =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={cn(
          CELL,
          "text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {buildPages(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              CELL,
              entry === page
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className={cn(
          CELL,
          "text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
