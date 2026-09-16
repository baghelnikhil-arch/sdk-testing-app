"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { buildCartLines, cartItemKey, computeTotals } from "@/lib/cart";
import { readJSON, writeJSON } from "@/lib/storage";
import { useCatalogue } from "./use-catalogue";
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
  /** False until localStorage has been read — use it to avoid a count flash. */
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
  // The catalogue is fetched, so lines cannot resolve until it lands.
  const { lookup, loaded: catalogueLoaded } = useCatalogue();

  // Read persisted state after mount so server and first client render match.
  useEffect(() => {
    dispatch({ type: "hydrate", items: readJSON<CartItem[]>(STORAGE_KEY, []) });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJSON(STORAGE_KEY, items);
  }, [items, hydrated]);

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
