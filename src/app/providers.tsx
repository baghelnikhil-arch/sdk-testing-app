"use client";

import { CatalogueProvider } from "@/hooks/use-catalogue";
import { CartProvider } from "@/hooks/use-cart";
import { WishlistProvider } from "@/hooks/use-wishlist";

/**
 * One place to mount client-side stores. Adding auth or a toast system later
 * means wrapping here, not touching the layout.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CatalogueProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </CatalogueProvider>
  );
}
