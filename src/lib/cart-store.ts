import { db } from "./db";
import { cartItemKey } from "./cart";
import type { CartItem } from "@/types";

/**
 * Cart and wishlist storage — SERVER ONLY, always scoped to one user.
 *
 * Every function takes a `userId` and every query filters on it. There is no
 * way to read another person's cart through this module, which is the point:
 * the ownership check lives here rather than being repeated at each call site.
 *
 * `size` and `color` are stored as empty strings rather than NULL so the unique
 * index on (user, product, size, colour) actually catches duplicates — Postgres
 * treats NULLs as distinct.
 */

function toCartItem(row: {
  productId: string;
  quantity: number;
  size: string;
  color: string;
}): CartItem {
  const size = row.size || undefined;
  const color = row.color || undefined;

  return {
    key: cartItemKey(row.productId, size, color),
    productId: row.productId,
    quantity: row.quantity,
    size,
    color,
  };
}

export async function getCart(userId: string): Promise<CartItem[]> {
  const rows = await db().cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toCartItem);
}

/**
 * Replaces the whole cart.
 *
 * The client owns cart state while the page is open and sends the full list
 * after each change; replacing wholesale keeps the two in step without trying to
 * reconcile individual operations, and one transaction means a reader never
 * catches the cart half-written.
 */
export async function replaceCart(userId: string, items: CartItem[]) {
  const rows = items
    .filter((item) => item.productId && item.quantity > 0)
    .map((item) => ({
      userId,
      productId: item.productId,
      quantity: Math.min(10, Math.max(1, Math.round(item.quantity))),
      size: item.size ?? "",
      color: item.color ?? "",
    }));

  await db().$transaction([
    db().cartItem.deleteMany({ where: { userId } }),
    db().cartItem.createMany({ data: rows, skipDuplicates: true }),
  ]);
}

/**
 * Folds a signed-out cart into the account's own on sign-in.
 *
 * Quantities add up rather than overwrite: someone who put two of something in
 * before signing in, and already had one saved, means to have three — and
 * silently losing either is worse than the cap.
 */
export async function mergeCart(userId: string, incoming: CartItem[]) {
  if (incoming.length === 0) return;

  const existing = await getCart(userId);
  const byKey = new Map(existing.map((item) => [item.key, { ...item }]));

  for (const item of incoming) {
    if (!item.productId || item.quantity <= 0) continue;
    const key = cartItemKey(item.productId, item.size, item.color);
    const current = byKey.get(key);

    byKey.set(key, {
      key,
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: Math.min(10, (current?.quantity ?? 0) + item.quantity),
    });
  }

  await replaceCart(userId, [...byKey.values()]);
}

export async function clearCart(userId: string) {
  await db().cartItem.deleteMany({ where: { userId } });
}

/* ----------------------------------------------------------------- wishlist */

export async function getWishlist(userId: string): Promise<string[]> {
  const rows = await db().wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => row.productId);
}

export async function replaceWishlist(userId: string, productIds: string[]) {
  const unique = [...new Set(productIds.filter(Boolean))];

  await db().$transaction([
    db().wishlistItem.deleteMany({ where: { userId } }),
    db().wishlistItem.createMany({
      data: unique.map((productId) => ({ userId, productId })),
      skipDuplicates: true,
    }),
  ]);
}

/** Union rather than replace, for the same reason as the cart. */
export async function mergeWishlist(userId: string, productIds: string[]) {
  if (productIds.length === 0) return;

  const existing = await getWishlist(userId);
  await replaceWishlist(userId, [...new Set([...productIds, ...existing])]);
}
