"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { useCatalogue } from "./use-catalogue";
import type { Product } from "@/types";

const STORAGE_KEY = "aurelle.wishlist.v1";

type WishlistContextValue = {
  ids: string[];
  products: Product[];
  count: number;
  hydrated: boolean;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { lookup } = useCatalogue();

  useEffect(() => {
    setIds(readJSON<string[]>(STORAGE_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJSON(STORAGE_KEY, ids);
  }, [ids, hydrated]);

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const toggle = useCallback((productId: string) => {
    setIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [productId, ...current],
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setIds((current) => current.filter((id) => id !== productId));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const products = useMemo(
    () => ids.flatMap((id) => lookup(id) ?? []),
    [ids, lookup],
  );

  const value = useMemo(
    () => ({
      ids,
      products,
      count: ids.length,
      hydrated,
      isWishlisted,
      toggle,
      remove,
      clear,
    }),
    [ids, products, hydrated, isWishlisted, toggle, remove, clear],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside a WishlistProvider");
  }
  return context;
}
