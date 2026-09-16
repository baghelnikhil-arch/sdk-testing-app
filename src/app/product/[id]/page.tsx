import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getRelatedProducts } from "@/lib/queries";
import {
  getCatalogueProduct,
  getCatalogueProducts,
  getCategories,
  getReviews,
} from "@/lib/shop-data";

type Params = Promise<{ id: string }>;

/**
 * Product pages render on demand rather than at build time: the catalogue lives
 * in the database and changes whenever a sheet is imported, so prerendering a
 * fixed list would go stale and would make the build depend on the database
 * being reachable.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogueProduct(id);

  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.images[0]] },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const [product, catalogue, categories] = await Promise.all([
    getCatalogueProduct(id),
    getCatalogueProducts(),
    getCategories(),
  ]);

  if (!product) notFound();

  const category = categories.find((entry) => entry.slug === product.category);
  const reviews = await getReviews(product.id);
  const related = getRelatedProducts(product, catalogue, 4);

  return (
    <div className="container-page py-6 md:py-10">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(category
            ? [{ label: category.name, href: `/shop/${category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      {/* Two columns on desktop, a single stacked column below it. */}
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
        <ProductGallery images={product.images} name={product.name} />
        <ProductPurchasePanel product={product} />
      </div>

      <div className="mt-16 md:mt-24">
        <ProductTabs product={product} reviews={reviews} />
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-14 md:mt-24 md:pt-16">
          <SectionHeading
            title="You may also like"
            description="Pieces that sit naturally alongside this one."
          />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
