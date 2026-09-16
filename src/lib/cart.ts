import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE } from "./constants";
import type { CartItem, CartLine, CartTotals, Product } from "@/types";

/** Identity of a cart line: the same product in a different size is a different line. */
export function cartItemKey(
  productId: string,
  size?: string,
  color?: string,
): string {
  return [productId, size ?? "-", color ?? "-"].join("::");
}

/** Joins stored cart items with the catalogue, dropping anything that no longer exists. */
export function buildCartLines(
  items: CartItem[],
  lookup: (id: string) => Product | undefined,
): CartLine[] {
  return items.flatMap((item) => {
    const product = lookup(item.productId);
    if (!product) return [];
    return [{ ...item, product, lineTotal: product.price * item.quantity }];
  });
}

/**
 * Pricing rules live here rather than in a component, so a real pricing or
 * promotions service can replace this one function later.
 */
export function computeTotals(lines: CartLine[]): CartTotals {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const subtotal = lines.reduce(
    (sum, line) =>
      sum + (line.product.originalPrice ?? line.product.price) * line.quantity,
    0,
  );

  const payable = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = subtotal - payable;
  const shipping =
    payable === 0 || payable >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;

  return {
    subtotal,
    discount,
    shipping,
    total: payable + shipping,
    itemCount,
  };
}
