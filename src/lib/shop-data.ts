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
 * Replaces every sheet-imported product with a new set, in one transaction, so
 * the shop is never briefly missing its stock. Seed products are untouched.
 */
export async function replaceSheetProducts(
  products: Product[],
  source: { spreadsheet: string; sheet: string },
) {
  const syncedAt = new Date();

  await db().$transaction([
    db().product.deleteMany({ where: { source: "sheet" } }),
    db().product.createMany({
      data: products.map((product, position) => ({
        id: product.id,
        source: "sheet",
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
        specifications: (product.specifications ??
          undefined) as Prisma.InputJsonValue,
        featured: product.featured ?? false,
        newArrival: product.newArrival ?? false,
        inStock: product.inStock,
        position,
        sourceSpreadsheet: source.spreadsheet,
        sourceSheet: source.sheet,
        syncedAt,
      })),
    }),
  ]);
}

export async function countSheetProducts(): Promise<number> {
  try {
    return await db().product.count({ where: { source: "sheet" } });
  } catch {
    return 0;
  }
}

export async function clearSheetProducts() {
  await db().product.deleteMany({ where: { source: "sheet" } });
}
