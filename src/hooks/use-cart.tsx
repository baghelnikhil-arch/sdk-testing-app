"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { buildCartLines, cartItemKey, computeTotals } from "@/lib/cart";
import { readJSON, writeJSON } from "@/lib/storage";
import { useCatalogue } from "./use-catalogue";
import { useSession } from "./use-session";
import type { CartItem, CartLine, CartTotals, Product } from "@/types";

const STORAGE_KEY = "aurelle.cart.v1";
const MAX_QUANTITY = 10;

type AddOptions = { size?: string; color?: string; quantity?: number };

type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: CartItem }
  | { type: "remove"; key: string }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "clear" };

function clampQuantity(value: number) {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.round(value)));
}

function reducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "hydrate":
      return action.items;

    case "add": {
      const existing = state.find((item) => item.key === action.item.key);
      if (!existing) return [...state, action.item];
      return state.map((item) =>
        item.key === action.item.key
          ? {
              ...item,
              quantity: clampQuantity(item.quantity + action.item.quantity),
            }
          : item,
      );
    }

    case "remove":
      return state.filter((item) => item.key !== action.key);

    case "setQuantity":
      if (action.quantity < 1) {
        return state.filter((item) => item.key !== action.key);
      }
      return state.map((item) =>
        item.key === action.key
          ? { ...item, quantity: clampQuantity(action.quantity) }
          : item,
      );

    case "clear":
      return [];

    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  lines: CartLine[];
  totals: CartTotals;
  /** False until the cart has been loaded from wherever it lives. */
  hydrated: boolean;
  addItem: (product: Product, options?: AddOptions) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);
  const { lookup, loaded: catalogueLoaded } = useCatalogue();
  const user = useSession();

  /*
   * Where the cart lives depends on who is holding it: the database for a
   * signed-in account, localStorage for a visitor. The id is tracked so the
   * transition between them can be detected — that is the moment a browser cart
   * has to be adopted rather than discarded.
   */
  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const wasSignedOut = previousUserId.current === null;
      previousUserId.current = userId;

      if (!userId) {
        dispatch({ type: "hydrate", items: readJSON<CartItem[]>(STORAGE_KEY, []) });
        setHydrated(true);
        return;
      }

      // Just signed in: fold whatever was in the browser into the account, then
      // forget it so it cannot be merged again on the next sign-in.
      const local = readJSON<CartItem[]>(STORAGE_KEY, []);
      const shouldMerge = wasSignedOut && local.length > 0;

      try {
        const response = await fetch("/api/cart", {
          method: shouldMerge ? "POST" : "GET",
          headers: shouldMerge ? { "Content-Type": "application/json" } : undefined,
          body: shouldMerge ? JSON.stringify({ items: local }) : undefined,
          cache: "no-store",
        });
        const payload = await response.json();

        if (!cancelled && Array.isArray(payload.items)) {
          dispatch({ type: "hydrate", items: payload.items });
        }

        /*
         * Always drop the browser copy once signed in, not only after a merge.
         * A signed-in cart lives in the database; leaving the guest copy behind
         * means signing out — or signing in as somebody else on this machine —
         * resurrects the previous person's cart.
         */
        writeJSON(STORAGE_KEY, []);
      } catch {
        // Leave the cart empty rather than showing a stale one that will not save.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist after every change, to whichever store is in play.
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    if (!userId) {
      writeJSON(STORAGE_KEY, items);
      return;
    }

    fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).catch(() => {
      /* A failed save is not worth interrupting shopping for. */
    });
  }, [items, hydrated, userId]);

  const addItem = useCallback((product: Product, options: AddOptions = {}) => {
    const { size, color, quantity = 1 } = options;
    dispatch({
      type: "add",
      item: {
        key: cartItemKey(product.id, size, color),
        productId: product.id,
        quantity: clampQuantity(quantity),
        size,
        color,
      },
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    dispatch({ type: "remove", key });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    dispatch({ type: "setQuantity", key, quantity });
  }, []);

  const clearCart = useCallback(() => dispatch({ type: "clear" }), []);

  const lines = useMemo(() => buildCartLines(items, lookup), [items, lookup]);
  const totals = useMemo(() => computeTotals(lines), [lines]);

  const isInCart = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      lines,
      totals,
      hydrated: hydrated && catalogueLoaded,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      isInCart,
    }),
    [
      items,
      lines,
      totals,
      hydrated,
      catalogueLoaded,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      isInCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}

export { MAX_QUANTITY };
