import type { CategorySlug, Product, ProductFilters, SortOption } from "@/types";

/**
 * Operations on a catalogue — pure, and deliberately holding no data of their
 * own. Where the products come from is `lib/shop-data.ts` on the server and
 * `/api/catalogue` in the browser; these functions work the same on either, so
 * filtering and sorting behave identically in both places.
 */

/** `new-arrivals` is a view over the catalogue, not a stored category. */
export function getProductsByCategory(
  slug: CategorySlug,
  source: Product[],
): Product[] {
  if (slug === "new-arrivals") {
    return source.filter((p) => p.newArrival);
  }
  return source.filter((p) => p.category === slug);
}

export function getFeaturedProducts(source: Product[], limit = 8): Product[] {
  return source.filter((p) => p.featured).slice(0, limit);
}

export function getNewArrivals(source: Product[], limit = 4): Product[] {
  return source.filter((p) => p.newArrival).slice(0, limit);
}

/** Same category first, then anything sharing a tag, then by rating. */
export function getRelatedProducts(
  product: Product,
  source: Product[],
  limit = 4,
): Product[] {
  const tags = new Set(product.tags ?? []);

  return source
    .filter((p) => p.id !== product.id)
    .map((p) => {
      const sharedTags = (p.tags ?? []).filter((t) => tags.has(t)).length;
      const score =
        (p.category === product.category ? 10 : 0) + sharedTags * 3 + p.rating;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.p);
}

export function filterProducts(
  source: Product[],
  filters: ProductFilters,
): Product[] {
  const query = filters.query?.trim().toLowerCase();

  return source.filter((product) => {
    if (query) {
      const haystack = [
        product.name,
        product.category,
        product.description,
        ...(product.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.categories?.length) {
      const matchesCategory = filters.categories.some((slug) =>
        slug === "new-arrivals"
          ? Boolean(product.newArrival)
          : product.category === slug,
      );
      if (!matchesCategory) return false;
    }

    if (filters.minPrice !== undefined && product.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) {
      return false;
    }
    if (filters.minRating !== undefined && product.rating < filters.minRating) {
      return false;
    }
    if (filters.inStockOnly && !product.inStock) return false;
    if (filters.onSaleOnly && !product.originalPrice) return false;

    return true;
  });
}

export function sortProducts(source: Product[], sort: SortOption): Product[] {
  const items = [...source];

  switch (sort) {
    case "price-asc":
      return items.sort((a, b) => a.price - b.price);
    case "price-desc":
      return items.sort((a, b) => b.price - a.price);
    case "rating":
      return items.sort((a, b) => b.rating - a.rating);
    case "newest":
      return items.sort(
        (a, b) => Number(Boolean(b.newArrival)) - Number(Boolean(a.newArrival)),
      );
    case "featured":
    default:
      return items.sort(
        (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
      );
  }
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    total: items.length,
  };
}
