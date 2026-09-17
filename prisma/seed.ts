import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { products } from "./seed-data/products";
import { categories } from "./seed-data/categories";
import { getReviewsForProduct } from "./seed-data/reviews";

/**
 * Loads the repository's starting data into the database.
 *
 * Only `source: "seed"` rows are touched — products imported from a spreadsheet
 * are left alone, so re-seeding never destroys an operator's catalogue.
 * Safe to run repeatedly.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.category.deleteMany({});
  await prisma.category.createMany({
    data: categories.map((category, position) => ({ ...category, position })),
  });
  console.log(`categories: ${categories.length}`);

  // Cascades to their reviews.
  await prisma.product.deleteMany({ where: { source: "seed" } });

  await prisma.product.createMany({
    data: products.map((product, position) => ({
      id: product.id,
      source: "seed",
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
      colors: product.colors ?? undefined,
      specifications: product.specifications ?? undefined,
      featured: product.featured ?? false,
      newArrival: product.newArrival ?? false,
      inStock: product.inStock,
      position,
    })),
  });
  console.log(`products:   ${products.length}`);

  const reviews = products.flatMap((product) =>
    getReviewsForProduct(product.id).map((review) => ({
      id: review.id,
      productId: review.productId,
      author: review.author,
      rating: review.rating,
      date: new Date(review.date),
      title: review.title,
      body: review.body,
    })),
  );
  await prisma.review.createMany({ data: reviews, skipDuplicates: true });
  console.log(`reviews:    ${reviews.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
