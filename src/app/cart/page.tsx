import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your bag before checking out.",
};

export default function CartPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Cart" }]}
        title="Your cart"
        description="Review your selection, adjust quantities, and check the totals before you continue."
      />
      <CartView />
    </>
  );
}
