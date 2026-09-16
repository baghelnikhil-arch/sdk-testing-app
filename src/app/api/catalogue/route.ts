import { NextResponse } from "next/server";
import { getImportedProducts } from "@/lib/catalogue";

/**
 * The imported products, for the browser.
 *
 * The cart and wishlist store only product ids, so they need to resolve
 * sheet-imported products the seed data does not contain. Public and read-only:
 * this is shop stock, the same thing every visitor sees on the shelves.
 */
export async function GET() {
  const products = await getImportedProducts();
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
