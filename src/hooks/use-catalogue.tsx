"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getProduct } from "@/lib/queries";
import type { Product } from "@/types";

/**
 * Product lookup for the browser.
 *
 * The cart and wishlist persist ids only, so they need to resolve products that
 * were imported from a spreadsheet and therefore are not in the bundled seed
 * data. Imported products are fetched once on mount; until they arrive, lookups
 * fall back to the seed catalogue, which is why cart lines re-resolve when this
 * value changes.
 */
type CatalogueContextValue = {
  imported: Product[];
  loaded: boolean;
  lookup: (id: string) => Product | undefined;
  refresh: () => Promise<void>;
};

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [imported, setImported] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/catalogue", { cache: "no-store" });
      const payload = await response.json();
      setImported(Array.isArray(payload.products) ? payload.products : []);
    } catch {
      // An unreachable catalogue endpoint must not break the cart; the seed
      // products still resolve.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byId = useMemo(
    () => new Map(imported.map((product) => [product.id, product])),
    [imported],
  );

  const lookup = useCallback(
    (id: string) => byId.get(id) ?? getProduct(id),
    [byId],
  );

  const value = useMemo(
    () => ({ imported, loaded, lookup, refresh }),
    [imported, loaded, lookup, refresh],
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
