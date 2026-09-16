import type { Metadata } from "next";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCatalogueProducts } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse the full collection — clothing, footwear and accessories, filtered how you like.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sale?: string }>;
}) {
  const { q = "", sale } = await searchParams;
  const products = await getCatalogueProducts();

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
        title="Shop"
        description="Everything we make, in one place. Narrow it down with search, filters and sorting."
      />

      <div className="container-page py-8 md:py-12">
        {/* Remounting on a new query resets filters to match the incoming search. */}
        <ShopBrowser
          key={`${q}|${sale}`}
          products={products}
          initialQuery={q}
          initialSaleOnly={sale === "true"}
        />
      </div>
    </>
  );
}
