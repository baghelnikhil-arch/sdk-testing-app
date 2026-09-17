"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { useCatalogue } from "./use-catalogue";
import { useSession } from "./use-session";
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

/** Same two-homes arrangement as the cart: account when signed in, browser otherwise. */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { lookup, loaded: catalogueLoaded } = useCatalogue();
  const user = useSession();

  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const wasSignedOut = previousUserId.current === null;
      previousUserId.current = userId;

      if (!userId) {
        setIds(readJSON<string[]>(STORAGE_KEY, []));
        setHydrated(true);
        return;
      }

      const local = readJSON<string[]>(STORAGE_KEY, []);
      const shouldMerge = wasSignedOut && local.length > 0;

      try {
        const response = await fetch("/api/wishlist", {
          method: shouldMerge ? "POST" : "GET",
          headers: shouldMerge ? { "Content-Type": "application/json" } : undefined,
          body: shouldMerge ? JSON.stringify({ ids: local }) : undefined,
          cache: "no-store",
        });
        const payload = await response.json();

        if (!cancelled && Array.isArray(payload.ids)) {
          setIds(payload.ids);
        }

        /*
         * Always drop the browser copy once signed in, not only after a merge.
         * A signed-in cart lives in the database; leaving the guest copy behind
         * means signing out — or signing in as somebody else on this machine —
         * resurrects the previous person's cart.
         */
        writeJSON(STORAGE_KEY, []);
      } catch {
        /* Leave it empty rather than showing saves that will not persist. */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    if (!userId) {
      writeJSON(STORAGE_KEY, ids);
      return;
    }

    fetch("/api/wishlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {
      /* Ignored: a failed save should not interrupt browsing. */
    });
  }, [ids, hydrated, userId]);

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
      hydrated: hydrated && catalogueLoaded,
      isWishlisted,
      toggle,
      remove,
      clear,
    }),
    [
      ids,
      products,
      hydrated,
      catalogueLoaded,
      isWishlisted,
      toggle,
      remove,
      clear,
    ],
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
