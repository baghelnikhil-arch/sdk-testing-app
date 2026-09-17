import { db } from "./db";
import type { CartLine, CartTotals } from "@/types";

/**
 * Placed orders — SERVER ONLY, always scoped to one user.
 *
 * Names and prices are copied onto the order rather than joined to `Product`:
 * what somebody paid must not change when the catalogue does, and a product
 * deleted from the shop must not erase the order that bought it.
 */
export async function recordOrder(input: {
  userId: string;
  reference: string;
  lines: CartLine[];
  totals: CartTotals;
}) {
  return db().order.create({
    data: {
      userId: input.userId,
      reference: input.reference,
      subtotal: input.totals.subtotal,
      discount: input.totals.discount,
      shipping: input.totals.shipping,
      total: input.totals.total,
      items: {
        create: input.lines.map((line) => ({
          productId: line.product.id,
          name: line.product.name,
          category: line.product.category,
          image: line.product.images[0] ?? null,
          size: line.size ?? null,
          color: line.color ?? null,
          quantity: line.quantity,
          price: line.product.price,
          lineTotal: line.lineTotal,
        })),
      },
    },
  });
}

export async function markOrderExported(
  orderId: string,
  exported: boolean,
  exportError?: string,
) {
  await db()
    .order.update({
      where: { id: orderId },
      data: { exported, exportError: exportError ?? null },
    })
    .catch(() => null);
}

/** Someone's own orders. The user id comes from the session, never the request. */
export async function getOrders(userId: string) {
  return db().order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}
