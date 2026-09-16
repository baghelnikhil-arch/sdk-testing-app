/**
 * Domain types for the storefront.
 *
 * These deliberately describe the *shape of the data*, not where it comes from.
 * Swapping the mock data in `src/data` for a real API only requires the
 * functions in `src/lib/queries.ts` to return these same types.
 */

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: CategorySlug;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  description: string;
  details?: string[];
  specifications?: Record<string, string>;
  sizes?: string[];
  colors?: ProductColor[];
  tags?: string[];
  featured?: boolean;
  newArrival?: boolean;
  inStock: boolean;
};

export type ProductColor = {
  name: string;
  /** Any valid CSS colour — used for the swatch. */
  hex: string;
};

export type CategorySlug = "men" | "women" | "accessories" | "new-arrivals";

export type Category = {
  slug: CategorySlug;
  name: string;
  description: string;
  image: string;
  /** Short line shown on the home page category cards. */
  tagline: string;
};

export type CartItem = {
  /** Stable key derived from product + chosen variant. */
  key: string;
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
};

/** A cart line joined with its product record, ready to render. */
export type CartLine = CartItem & {
  product: Product;
  lineTotal: number;
};

export type CartTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  itemCount: number;
};

export type SortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "newest";

export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
};

export type ProductFilters = {
  query?: string;
  categories?: CategorySlug[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
};
