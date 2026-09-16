import { buildCartLines, cartItemKey, computeTotals } from "./cart";
import { getProduct } from "./queries";
import type { CartTotals } from "@/types";

/** What the browser is allowed to tell us about an order. */
export type SubmittedItem = {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
};

/**
 * Rebuilds the order from the catalogue rather than trusting the browser.
 *
 * The client sends product ids and quantities; prices, discounts and shipping
 * are recomputed here with the same `computeTotals` the cart UI uses, so the
 * exported figures cannot be edited from the console.
 */
export function rebuildOrder(items: SubmittedItem[]) {
  const cartItems = items
    .filter((item) => item?.productId && Number(item.quantity) > 0)
    .map((item) => ({
      key: cartItemKey(item.productId, item.size, item.color),
      productId: item.productId,
      quantity: Math.min(10, Math.max(1, Math.round(Number(item.quantity)))),
      size: item.size,
      color: item.color,
    }));

  const lines = buildCartLines(cartItems, getProduct);
  return { lines, totals: computeTotals(lines) };
}

export function newOrderId(now = new Date()) {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AUR-${stamp}-${suffix}`;
}

/**
 * One row per order line.
 *
 * These object keys become the sheet's header row: "Add Multiple Rows" creates
 * headers from the JSON keys when the sheet has none, which is why this action
 * was chosen over "Add New Row to Sheet" — the user does not have to prepare
 * columns before their first export. Keep the keys stable; renaming one adds a
 * new column to every sheet already in use.
 */
export function buildOrderRows({
  lines,
  totals,
  orderId,
  placedAt = new Date(),
  customer = "Demo customer",
}: {
  lines: ReturnType<typeof rebuildOrder>["lines"];
  totals: CartTotals;
  orderId: string;
  placedAt?: Date;
  customer?: string;
}) {
  const timestamp = placedAt.toISOString();

  return lines.map((line) => ({
    "Order ID": orderId,
    "Placed At": timestamp,
    Customer: customer,
    "Product ID": line.product.id,
    Product: line.product.name,
    Category: line.product.category,
    Size: line.size ?? "",
    Colour: line.color ?? "",
    Quantity: line.quantity,
    "Unit Price": line.product.price,
    "Line Total": line.lineTotal,
    "Order Subtotal": totals.subtotal,
    "Order Discount": totals.discount,
    "Order Shipping": totals.shipping,
    "Order Total": totals.total,
  }));
}
