"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { CheckoutSheetsPanel } from "./CheckoutSheetsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGridSkeleton } from "@/components/product/ProductGrid";
import { useCart } from "@/hooks/use-cart";

export function CartView() {
  const { items, lines, totals, hydrated, setQuantity, removeItem, clearCart } =
    useCart();

  // Cart contents live in localStorage, so there is nothing to show until mount.
  if (!hydrated) {
    return (
      <div className="container-page py-10 md:py-14">
        <ProductGridSkeleton count={3} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-10 md:py-14">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty."
          description="Nothing here yet. Browse the collection and add something you will actually wear."
          action={{ href: "/shop", label: "Continue Shopping" }}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12 xl:gap-16">
        <div className="min-w-0">
          {/* Mirrors the column structure of CartItem so the labels line up. */}
          <div className="hidden gap-6 border-b border-border pb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:flex">
            <span className="w-24 shrink-0" aria-hidden="true" />
            <div className="flex flex-1 gap-6">
              <span className="flex-1">Product</span>
              <span className="w-28 shrink-0">Price</span>
              <span className="w-24 shrink-0 text-right">Subtotal</span>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <CartItem
                key={line.key}
                line={line}
                onQuantityChange={(quantity) => setQuantity(line.key, quantity)}
                onRemove={() => removeItem(line.key)}
              />
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Continue shopping
            </Link>

            <button
              type="button"
              onClick={clearCart}
              className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-sale"
            >
              Clear cart
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
          <CartSummary totals={totals} items={items} />
          <CheckoutSheetsPanel />
        </div>
      </div>
    </div>
  );
}
