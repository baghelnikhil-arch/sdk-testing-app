import { NextResponse } from "next/server";
import { getCatalogueProducts } from "@/lib/shop-data";

/**
 * The catalogue, for the browser.
 *
 * The cart and wishlist persist product ids only, and the products now live in
 * the database rather than in the JavaScript bundle, so the client needs a way
 * to resolve them. Public and read-only: this is shop stock, the same thing
 * every visitor sees on the shelves.
 */
export async function GET() {
  const products = await getCatalogueProducts();
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
