import type { Metadata } from "next";
import { WishlistView } from "@/components/product/WishlistView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "The pieces you have saved for later.",
};

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
        title="Wishlist"
        description="Everything you have saved, kept in one place until you are ready."
      />

      <div className="container-page py-10 md:py-14">
        <WishlistView />
      </div>
    </>
  );
}
