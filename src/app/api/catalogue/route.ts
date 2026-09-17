import { NextResponse, after } from "next/server";
import { getCatalogueProducts } from "@/lib/shop-data";
import { autoSyncIfDue } from "@/lib/sync-catalogue";

/**
 * The catalogue, for the browser.
 *
 * The cart and wishlist persist product ids only, and the products now live in
 * the database rather than in the JavaScript bundle, so the client needs a way
 * to resolve them. Public and read-only: this is shop stock, the same thing
 * every visitor sees on the shelves.
 *
 * Every page load calls this, which makes it the shop's heartbeat — so the
 * scheduled re-import is driven from here, after the response, where it costs
 * the visitor nothing and runs at most once per chosen interval.
 */
export async function GET() {
  const products = await getCatalogueProducts();

  after(autoSyncIfDue);

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
