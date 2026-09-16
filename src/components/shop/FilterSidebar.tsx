"use client";

import { formatPrice } from "@/lib/utils";
import type { Category, CategorySlug } from "@/types";

export type FilterState = {
  query: string;
  categories: CategorySlug[];
  maxPrice: number;
  minRating: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
};

const RATING_OPTIONS = [
  { value: 0, label: "Any rating" },
  { value: 3, label: "3 stars & up" },
  { value: 4, label: "4 stars & up" },
  { value: 4.5, label: "4.5 stars & up" },
];

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border pb-6 last:border-b-0 last:pb-0">
      <h3 className="mb-3.5 text-xs font-semibold tracking-[0.14em] text-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

const CONTROL_ROW =
  "flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  priceMax,
  categories,
  /** Category pages fix the category, so the picker is hidden there. */
  showCategories = true,
  /** The mobile drawer supplies its own title bar. */
  showTitle = true,
}: {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onReset: () => void;
  priceMax: number;
  categories: Category[];
  showCategories?: boolean;
  showTitle?: boolean;
}) {
  const toggleCategory = (slug: CategorySlug) => {
    onChange({
      categories: filters.categories.includes(slug)
        ? filters.categories.filter((item) => item !== slug)
        : [...filters.categories, slug],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {showTitle ? (
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Clear all
        </button>
      </div>

      {showCategories && (
        <Group title="Category">
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <label className={CONTROL_ROW}>
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category.slug)}
                    onChange={() => toggleCategory(category.slug)}
                    className="h-4 w-4 rounded-xs border-border-strong accent-primary"
                  />
                  {category.name}
                </label>
              </li>
            ))}
          </ul>
        </Group>
      )}

      <Group title="Price">
        <label htmlFor="max-price" className="sr-only">
          Maximum price
        </label>
        <input
          id="max-price"
          type="range"
          min={0}
          max={priceMax}
          step={5}
          value={filters.maxPrice}
          onChange={(event) => onChange({ maxPrice: Number(event.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
        />
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{formatPrice(0)}</span>
          <span className="font-medium text-foreground">
            Up to {formatPrice(filters.maxPrice)}
          </span>
        </div>
      </Group>

      <Group title="Rating">
        <ul>
          {RATING_OPTIONS.map((option) => (
            <li key={option.value}>
              <label className={CONTROL_ROW}>
                <input
                  type="radio"
                  name="min-rating"
                  checked={filters.minRating === option.value}
                  onChange={() => onChange({ minRating: option.value })}
                  className="h-4 w-4 border-border-strong accent-primary"
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Availability">
        <label className={CONTROL_ROW}>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => onChange({ inStockOnly: event.target.checked })}
            className="h-4 w-4 rounded-xs border-border-strong accent-primary"
          />
          In stock only
        </label>
        <label className={CONTROL_ROW}>
          <input
            type="checkbox"
            checked={filters.onSaleOnly}
            onChange={(event) => onChange({ onSaleOnly: event.target.checked })}
            className="h-4 w-4 rounded-xs border-border-strong accent-primary"
          />
          On sale
        </label>
      </Group>
    </div>
  );
}
