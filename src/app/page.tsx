import { Hero } from "@/components/home/Hero";
import { Benefits } from "@/components/home/Benefits";
import { PromoBanner } from "@/components/home/PromoBanner";
import { CategoryCard } from "@/components/product/CategoryCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Newsletter } from "@/components/ui/Newsletter";
import { getFeaturedProducts, getNewArrivals } from "@/lib/queries";
import { getCatalogueProducts, getCategories } from "@/lib/shop-data";

export default async function HomePage() {
  // Seed products plus anything imported from the operator's product sheet.
  const [categories, catalogue] = await Promise.all([
    getCategories(),
    getCatalogueProducts(),
  ]);
  const featured = getFeaturedProducts(catalogue, 8);
  const newArrivals = getNewArrivals(catalogue, 4);

  return (
    <>
      <Hero />

      <section className="container-page section-y">
        <SectionHeading
          eyebrow="Browse"
          title="Shop by category"
          description="Four edits, each kept deliberately small so everything in it earns its place."
          action={{ href: "/shop", label: "View all products" }}
        />

        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {categories.map((category, index) => (
            <CategoryCard
              key={category.slug}
              category={category}
              priority={index < 2}
            />
          ))}
        </div>
      </section>

      <section className="container-page pb-14 md:pb-20">
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured products"
          description="The pieces our customers come back for, and the ones we would pick ourselves."
          action={{ href: "/shop", label: "Shop all" }}
        />
        <ProductGrid products={featured} />
      </section>

      <PromoBanner />

      <section className="container-page pb-14 md:pb-20">
        <SectionHeading
          eyebrow="Just landed"
          title="New arrivals"
          description="Released in small runs as they come out of the workshop."
          action={{ href: "/shop/new-arrivals", label: "See everything new" }}
        />
        <ProductGrid products={newArrivals} />
      </section>

      <Benefits />

      <Newsletter />
    </>
  );
}
