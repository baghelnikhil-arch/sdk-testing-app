"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { FilterSidebar, type FilterState } from "./FilterSidebar";
import { SortDropdown } from "./SortDropdown";
import { ProductGrid } from "@/components/product/ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { PRICE_BOUNDS } from "@/data/products";
import { filterProducts, paginate, sortProducts } from "@/lib/queries";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import type { CategorySlug, Product, SortOption } from "@/types";

/**
 * The single product-browsing experience. `/shop` and every `/shop/[category]`
 * page render this with a different `products` list — no duplicated UI.
 */
export function ShopBrowser({
  products,
  initialQuery = "",
  initialSaleOnly = false,
  /** Set on category pages, where the category picker would be redundant. */
  lockedCategory,
}: {
  products: Product[];
  initialQuery?: string;
  initialSaleOnly?: boolean;
  lockedCategory?: CategorySlug;
}) {
  const [filters, setFilters] = useState<FilterState>({
    query: initialQuery,
    categories: [],
    maxPrice: PRICE_BOUNDS.max,
    minRating: 0,
    inStockOnly: false,
    onSaleOnly: initialSaleOnly,
  });
  const [sort, setSort] = useState<SortOption>("featured");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const matched = filterProducts(products, {
      query: filters.query,
      categories: filters.categories.length ? filters.categories : undefined,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating || undefined,
      inStockOnly: filters.inStockOnly,
      onSaleOnly: filters.onSaleOnly,
    });
    return sortProducts(matched, sort);
  }, [products, filters, sort]);

  const pageData = paginate(visible, page, PRODUCTS_PER_PAGE);

  // Changing a filter should never leave you stranded on page 4 of 2.
  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const updateFilters = (next: Partial<FilterState>) =>
    setFilters((current) => ({ ...current, ...next }));

  const resetFilters = () =>
    setFilters({
      query: "",
      categories: [],
      maxPrice: PRICE_BOUNDS.max,
      minRating: 0,
      inStockOnly: false,
      onSaleOnly: false,
    });

  const activeFilterCount =
    filters.categories.length +
    (filters.maxPrice < PRICE_BOUNDS.max ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.onSaleOnly ? 1 : 0);

  const renderFilters = (showTitle: boolean) => (
    <FilterSidebar
      filters={filters}
      onChange={updateFilters}
      onReset={resetFilters}
      priceMax={PRICE_BOUNDS.max}
      showCategories={!lockedCategory}
      showTitle={showTitle}
    />
  );

  function goToPage(next: number) {
    setPage(next);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <SearchBar
        value={filters.query}
        onChange={(query) => updateFilters({ query })}
        placeholder="Search products"
        className="max-w-xl"
      />

      <div className="mt-8 flex gap-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-28">{renderFilters(true)}</div>
        </aside>

        <div className="min-w-0 flex-1" ref={gridRef}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground">
                {pageData.total}
              </span>{" "}
              {pageData.total === 1 ? "product" : "products"}
              {pageData.totalPages > 1 && (
                <span className="hidden sm:inline">
                  {" "}
                  · page {pageData.page} of {pageData.totalPages}
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border-strong px-3.5 text-sm font-medium transition-colors hover:bg-muted lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <SortDropdown value={sort} onChange={setSort} className="w-44" />
            </div>
          </div>

          <div className="pt-8">
            {pageData.items.length > 0 ? (
              <>
                <ProductGrid
                  products={pageData.items}
                  columns="sidebar"
                  priorityCount={4}
                />
                <Pagination
                  page={pageData.page}
                  totalPages={pageData.totalPages}
                  onPageChange={goToPage}
                  className="mt-12"
                />
              </>
            ) : (
              <EmptyState
                icon={PackageSearch}
                title="No products match those filters"
                description="Try widening the price range, clearing a filter, or searching for something else."
              />
            )}
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 animate-fade-in bg-foreground/35 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] animate-slide-in-right flex-col bg-background shadow-overlay"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold">Filters</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">{renderFilters(false)}</div>

            <div className="shrink-0 border-t border-border p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Show {pageData.total}{" "}
                {pageData.total === 1 ? "product" : "products"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
