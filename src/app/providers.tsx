"use client";

import { CatalogueProvider } from "@/hooks/use-catalogue";
import { CartProvider } from "@/hooks/use-cart";
import { WishlistProvider } from "@/hooks/use-wishlist";
import { SessionProvider, type SessionUser } from "@/hooks/use-session";

/**
 * One place to mount client-side stores.
 *
 * `user` comes from the root layout, which verified the session against the
 * database. The cart and wishlist read it to decide whether they belong to an
 * account or to this browser.
 */
export function Providers({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider user={user}>
      <CatalogueProvider>
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </CatalogueProvider>
    </SessionProvider>
  );
}
