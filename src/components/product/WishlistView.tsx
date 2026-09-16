"use client";

import { Heart } from "lucide-react";
import { ProductGrid, ProductGridSkeleton } from "./ProductGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWishlist } from "@/hooks/use-wishlist";

export function WishlistView() {
  const { products, hydrated, clear } = useWishlist();

  if (!hydrated) {
    return <ProductGridSkeleton count={4} />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is waiting for something special."
        description="Tap the heart on any product to save it here for later."
        action={{ href: "/shop", label: "Browse the collection" }}
        secondaryAction={{ href: "/shop/new-arrivals", label: "See new arrivals" }}
      />
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{products.length}</span>{" "}
          {products.length === 1 ? "item saved" : "items saved"}
        </p>

        <button
          type="button"
          onClick={clear}
          className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-sale"
        >
          Clear wishlist
        </button>
      </div>

      <ProductGrid products={products} priorityCount={4} />
    </div>
  );
}
