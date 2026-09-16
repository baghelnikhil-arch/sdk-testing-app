/** Tiny class-name joiner — avoids pulling in a dependency for one helper. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatPrice(value: number) {
  return currency.format(value);
}

/** Whole-number discount percentage, or null when the item is not reduced. */
export function discountPercent(price: number, originalPrice?: number) {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Human label for a category slug.
 *
 * Client components only ever need the label, not the whole category record, so
 * deriving it here keeps the catalogue out of the browser bundle.
 */
export function formatCategory(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
