"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/types";

/**
 * Product lookup for the browser.
 *
 * The cart and wishlist persist ids only, and the catalogue now lives in the
 * database rather than the bundle, so the client has to fetch it. `loaded`
 * guards the gap: until it flips, a cart line cannot be resolved and the page
 * shows its loading state rather than an empty cart.
 */
type CatalogueContextValue = {
  products: Product[];
  loaded: boolean;
  lookup: (id: string) => Product | undefined;
  refresh: () => Promise<void>;
};

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/catalogue", { cache: "no-store" });
      const payload = await response.json();
      setProducts(Array.isArray(payload.products) ? payload.products : []);
    } catch {
      // An unreachable catalogue endpoint leaves the cart empty rather than
      // throwing; the shop itself is server-rendered and unaffected.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byId = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const lookup = useCallback((id: string) => byId.get(id), [byId]);

  const value = useMemo(
    () => ({ products, loaded, lookup, refresh }),
    [products, loaded, lookup, refresh],
  );

  return (
    <CatalogueContext.Provider value={value}>
      {children}
    </CatalogueContext.Provider>
  );
}

export function useCatalogue() {
  const context = useContext(CatalogueContext);
  if (!context) {
    throw new Error("useCatalogue must be used inside a CatalogueProvider");
  }
  return context;
}
