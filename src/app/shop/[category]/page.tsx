import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCategories, getCategory, getProductsByCategory } from "@/lib/queries";
import { getCatalogueProducts } from "@/lib/catalogue";

type Params = Promise<{ category: string }>;

/** Every category is known at build time, so all four pages are prerendered. */
export function generateStaticParams() {
  return getCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);

  if (!category) return { title: "Category not found" };

  return { title: category.name, description: category.description };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ q?: string }>;
}) {
  const { category: slug } = await params;
  const { q = "" } = await searchParams;
  const category = getCategory(slug);

  if (!category) notFound();

  const products = getProductsByCategory(
    category.slug,
    await getCatalogueProducts(),
  );

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.name },
        ]}
        title={category.name}
        description={category.description}
      />

      <div className="container-page py-8 md:py-12">
        <ShopBrowser
          key={q}
          products={products}
          initialQuery={q}
          lockedCategory={category.slug}
        />
      </div>
    </>
  );
}
