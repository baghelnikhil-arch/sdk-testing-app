import { products as staticProducts } from "@/data/products";
import { img } from "@/data/images";
import { readImportedCatalogue } from "./integration-store";
import { slugify } from "./utils";
import type { CategorySlug, Product, ProductColor } from "@/types";

/**
 * Turning spreadsheet rows into products.
 *
 * Everything here is deliberately forgiving. The operator is typing into a
 * spreadsheet, not filling in a form: headers get renamed, prices get typed with
 * currency symbols, booleans arrive as "Yes". A row that cannot be understood is
 * skipped with a reason rather than failing the whole import.
 */

/** Imported ids are namespaced so they can never collide with the seed catalogue. */
export const IMPORTED_PREFIX = "sheet-";

export function isImported(product: Product) {
  return product.id.startsWith(IMPORTED_PREFIX);
}

const FALLBACK_IMAGE = img("photo-1523381210434-271e8be1f52b");

/** Header aliases, matched case- and punctuation-insensitively. */
const COLUMNS: Record<string, string[]> = {
  id: ["id", "sku", "productid", "code"],
  name: ["name", "product", "productname", "title"],
  price: ["price", "saleprice", "currentprice"],
  originalPrice: ["originalprice", "wasprice", "listprice", "rrp", "compareat"],
  category: ["category", "department", "collection"],
  description: ["description", "details", "summary", "about"],
  images: ["image", "images", "imageurl", "photo", "photos", "picture"],
  sizes: ["size", "sizes"],
  colors: ["color", "colors", "colour", "colours"],
  tags: ["tag", "tags", "keywords"],
  inStock: ["instock", "stock", "available", "availability"],
  featured: ["featured", "isfeatured"],
  newArrival: ["new", "newarrival", "isnew", "newarrivals"],
  rating: ["rating", "stars", "score"],
  reviewCount: ["reviews", "reviewcount", "numreviews"],
};

const normalise = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Builds a lookup from this sheet's actual headers to our field names. */
function buildHeaderMap(row: Record<string, unknown>) {
  const map = new Map<string, string>();

  for (const header of Object.keys(row)) {
    const cleaned = normalise(header);
    for (const [field, aliases] of Object.entries(COLUMNS)) {
      if (aliases.includes(cleaned) && !map.has(field)) {
        map.set(field, header);
        break;
      }
    }
  }
  return map;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function money(value: unknown): number | undefined {
  const raw = text(value).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!raw) return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function flag(value: unknown, fallback: boolean): boolean {
  const raw = text(value).toLowerCase();
  if (!raw) return fallback;
  if (["true", "yes", "y", "1", "in stock", "instock"].includes(raw)) return true;
  if (["false", "no", "n", "0", "out of stock", "sold out"].includes(raw)) return false;
  return fallback;
}

function list(value: unknown): string[] {
  return text(value)
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const CATEGORIES: Record<string, CategorySlug> = {
  men: "men",
  mens: "men",
  man: "men",
  male: "men",
  women: "women",
  womens: "women",
  woman: "women",
  female: "women",
  accessories: "accessories",
  accessory: "accessories",
};

function toCategory(value: unknown): { category: CategorySlug; extraTag?: string } {
  const raw = text(value);
  const matched = CATEGORIES[normalise(raw)];
  if (matched) return { category: matched };
  // Unknown departments still import — they land in Accessories and keep the
  // original word as a tag so nothing the operator typed is thrown away.
  return { category: "accessories", extraTag: raw || undefined };
}

/**
 * Swatches for colours written by name, so an operator who types "Black" gets a
 * black swatch rather than a placeholder. Anything unrecognised falls back to a
 * neutral, which reads as "unspecified" instead of wrong.
 */
const COLOR_NAMES: Record<string, string> = {
  black: "#1b1b1b",
  charcoal: "#3c3c3c",
  grey: "#9aa0a6",
  gray: "#9aa0a6",
  silver: "#c8ccd0",
  white: "#f7f6f3",
  cream: "#efe9dc",
  ecru: "#e4ded1",
  bone: "#efece5",
  natural: "#ddc9a3",
  sand: "#ded3c2",
  beige: "#e0d4bf",
  stone: "#cfc6b8",
  oat: "#d6c8ab",
  tan: "#b07f4f",
  camel: "#b4895c",
  brown: "#6b4a30",
  chocolate: "#4a3123",
  rust: "#b1603a",
  terracotta: "#c06a49",
  orange: "#d1722a",
  gold: "#c9a227",
  yellow: "#e3b81b",
  olive: "#5f6448",
  moss: "#767a5f",
  sage: "#7f8d78",
  green: "#2f6a4f",
  teal: "#2f6f6b",
  navy: "#22314f",
  blue: "#3f6ea8",
  denim: "#43628a",
  purple: "#6b4e8c",
  lilac: "#cfc4dd",
  pink: "#dba7b4",
  blush: "#d8a79b",
  red: "#b5271f",
  burgundy: "#6d2434",
};

/** "Black:#1b1b1b" or just "Black" — the hex is optional. */
function toColors(value: unknown): ProductColor[] | undefined {
  const entries = list(value);
  if (entries.length === 0) return undefined;

  return entries.map((entry) => {
    const [name, hex] = entry.split(":").map((part) => part.trim());
    const explicit =
      hex && /^#?[0-9a-f]{3,8}$/i.test(hex)
        ? hex.startsWith("#")
          ? hex
          : `#${hex}`
        : undefined;

    return {
      name: name || "Default",
      hex: explicit ?? COLOR_NAMES[normalise(name ?? "")] ?? "#cfc6b8",
    };
  });
}

function toImages(value: unknown): string[] {
  const urls = list(value).filter((url) => /^https?:\/\//i.test(url));
  return urls.length > 0 ? urls : [FALLBACK_IMAGE];
}

export type MappedRow =
  | { ok: true; product: Product }
  | { ok: false; row: number; reason: string };

/**
 * `List Rows in Sheet` has no published response schema, so the envelope is
 * unwrapped defensively: the rows may arrive as a bare array, or nested under
 * `rows` / `data` / `records`.
 */
export function extractRows(payload: unknown): Record<string, unknown>[] {
  const candidates: unknown[] = [payload];

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    candidates.push(record.rows, record.data, record.records, record.values);
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.every((r) => r && typeof r === "object")) {
      return candidate as Record<string, unknown>[];
    }
  }
  return [];
}

export function mapRowsToProducts(rows: Record<string, unknown>[]): MappedRow[] {
  const seen = new Set<string>();

  return rows.map((raw, index) => {
    const rowNumber = index + 2; // +1 for zero-index, +1 for the header row.

    // Some responses wrap the cells under a nested key; unwrap one level.
    const row =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? ((raw.row ?? raw.fields ?? raw) as Record<string, unknown>)
        : {};

    const headers = buildHeaderMap(row);
    const get = (field: string) => {
      const header = headers.get(field);
      return header ? row[header] : undefined;
    };

    const name = text(get("name"));
    if (!name) return { ok: false, row: rowNumber, reason: "no product name" };

    const price = money(get("price"));
    if (price === undefined) {
      return { ok: false, row: rowNumber, reason: `no usable price for "${name}"` };
    }

    const explicitId = text(get("id"));
    const base = slugify(explicitId || name) || `row-${rowNumber}`;
    let id = `${IMPORTED_PREFIX}${base}`;
    if (seen.has(id)) id = `${id}-${rowNumber}`;
    seen.add(id);

    const { category, extraTag } = toCategory(get("category"));
    const originalPrice = money(get("originalPrice"));
    const rating = Number.parseFloat(text(get("rating")));
    const reviewCount = Number.parseInt(text(get("reviewCount")), 10);

    const tags = list(get("tags"));
    if (extraTag) tags.push(extraTag);

    const product: Product = {
      id,
      name,
      slug: slugify(name) || base,
      category,
      price,
      originalPrice:
        originalPrice !== undefined && originalPrice > price ? originalPrice : undefined,
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
      reviewCount: Number.isFinite(reviewCount) ? Math.max(0, reviewCount) : 0,
      images: toImages(get("images")),
      description:
        text(get("description")) ||
        `${name} — imported from your product sheet. Add a Description column to replace this text.`,
      sizes: list(get("sizes")).length > 0 ? list(get("sizes")) : undefined,
      colors: toColors(get("colors")),
      tags: tags.length > 0 ? tags : undefined,
      featured: flag(get("featured"), false),
      newArrival: flag(get("newArrival"), true),
      inStock: flag(get("inStock"), true),
    };

    return { ok: true, product };
  });
}

/* ------------------------------------------------------------------ reading */

export async function getImportedProducts(): Promise<Product[]> {
  const catalogue = await readImportedCatalogue();
  return catalogue?.products ?? [];
}

/**
 * The catalogue the storefront actually shows: the seed products plus whatever
 * the operator's sheet contributed. Imported products come first so a freshly
 * added row is visible without hunting for it.
 */
export async function getCatalogueProducts(): Promise<Product[]> {
  const imported = await getImportedProducts();
  return imported.length > 0 ? [...imported, ...staticProducts] : staticProducts;
}

export async function getCatalogueProduct(
  idOrSlug: string,
): Promise<Product | undefined> {
  const all = await getCatalogueProducts();
  return all.find((p) => p.id === idOrSlug) ?? all.find((p) => p.slug === idOrSlug);
}
