import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { Category, CategorySlug, Product, Review } from "@/types";

/**
 * Everything the storefront reads — SERVER ONLY.
 *
 * The catalogue, its categories and its reviews all live in Postgres. The files
 * under `src/data` are now only the seed the database is loaded from
 * (`npm run db:seed`), not something the app reads at runtime.
 *
 * Products carry a `source`: `"seed"` shipped with the repository, `"sheet"`
 * came from an operator's spreadsheet. Only the latter is replaced by an import.
 */

type ProductRow = {
  id: string;
  source: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  reviewCount: number;
  images: string[];
  sizes: string[];
  tags: string[];
  details: string[];
  colors: Prisma.JsonValue;
  specifications: Prisma.JsonValue;
  featured: boolean;
  newArrival: boolean;
  inStock: boolean;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category as CategorySlug,
    description: row.description,
    price: row.price,
    originalPrice: row.originalPrice ?? undefined,
    rating: row.rating,
    reviewCount: row.reviewCount,
    images: row.images,
    sizes: row.sizes.length > 0 ? row.sizes : undefined,
    tags: row.tags.length > 0 ? row.tags : undefined,
    details: row.details.length > 0 ? row.details : undefined,
    colors: (row.colors as Product["colors"]) ?? undefined,
    specifications:
      (row.specifications as Product["specifications"]) ?? undefined,
    featured: row.featured,
    newArrival: row.newArrival,
    inStock: row.inStock,
  };
}

/** Imported products first, so a freshly added row is easy to spot. */
const CATALOGUE_ORDER = [
  { source: "desc" as const },
  { position: "asc" as const },
];

export async function getCatalogueProducts(): Promise<Product[]> {
  try {
    const rows = await db().product.findMany({ orderBy: CATALOGUE_ORDER });
    return rows.map(toProduct);
  } catch {
    // An unreachable database must not take the shop down with a stack trace.
    return [];
  }
}

export async function getCatalogueProduct(
  idOrSlug: string,
): Promise<Product | undefined> {
  try {
    const row =
      (await db().product.findUnique({ where: { id: idOrSlug } })) ??
      (await db().product.findFirst({ where: { slug: idOrSlug } }));
    return row ? toProduct(row) : undefined;
  } catch {
    return undefined;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await db().category.findMany({ orderBy: { position: "asc" } });
    return rows.map((row) => ({
      slug: row.slug as CategorySlug,
      name: row.name,
      description: row.description,
      tagline: row.tagline,
      image: row.image,
    }));
  } catch {
    return [];
  }
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((category) => category.slug === slug);
}

export async function getReviews(productId: string): Promise<Review[]> {
  try {
    const rows = await db().review.findMany({
      where: { productId },
      orderBy: { date: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      author: row.author,
      rating: row.rating,
      date: row.date.toISOString(),
      title: row.title,
      body: row.body,
    }));
  } catch {
    return [];
  }
}

/**
 * Writes imported products into the shop's own catalogue.
 *
 * Each row is upserted rather than the whole set being deleted and recreated.
 * That was the old shape, and it meant every import — including one fired by a
 * single new row arriving — briefly destroyed every imported product, taking
 * their reviews with them permanently, since Review cascades from Product. A
 * product that has not changed is now simply updated in place.
 *
 * `prune` says whether products missing from this payload should be removed.
 * A full re-read sets it, so a row deleted in the sheet leaves the shop. The
 * live-update path does not: one added row says nothing about the rest.
 */
export async function writeSheetProducts(
  products: Product[],
  source: { spreadsheet: string; sheet: string },
  { prune }: { prune: boolean },
) {
  const syncedAt = new Date();

  const rows = products.map((product, position) => ({
    id: product.id,
    position,
    sourceSpreadsheet: source.spreadsheet,
    sourceSheet: source.sheet,
    syncedAt,
    ...productColumns(product),
  }));

  await db().$transaction([
    ...rows.map(({ id, ...fields }) =>
      db().product.upsert({
        where: { id },
        update: fields,
        create: { id, source: "sheet", ...fields },
      }),
    ),
    ...(prune
      ? [
          db().product.deleteMany({
            where: { source: "sheet", id: { notIn: rows.map((r) => r.id) } },
          }),
        ]
      : []),
  ]);
}

/** The spreadsheet-derived columns, shared by insert and update. */
function productColumns(product: Product) {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    rating: product.rating,
    reviewCount: product.reviewCount,
    images: product.images,
    sizes: product.sizes ?? [],
    tags: product.tags ?? [],
    details: product.details ?? [],
    colors: (product.colors ?? undefined) as Prisma.InputJsonValue,
    specifications: (product.specifications ?? undefined) as Prisma.InputJsonValue,
    featured: product.featured ?? false,
    newArrival: product.newArrival ?? false,
    inStock: product.inStock,
  };
}

export async function countSheetProducts(): Promise<number> {
  try {
    return await db().product.count({ where: { source: "sheet" } });
  } catch {
    return 0;
  }
}
