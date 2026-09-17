import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCart, mergeCart, replaceCart } from "@/lib/cart-store";

/**
 * The signed-in user's cart.
 *
 * Every handler resolves the user from the session and passes that id to the
 * store — the browser never says whose cart it wants, so it cannot ask for
 * somebody else's.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: null, signedIn: false });

  return NextResponse.json({ items: await getCart(user.id), signedIn: true });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { items } = await request.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array." }, { status: 400 });
  }

  await replaceCart(user.id, items);
  return NextResponse.json({ items: await getCart(user.id) });
}

/** Called once after signing in, to adopt whatever was in the browser. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { items } = await request.json();
  if (Array.isArray(items)) await mergeCart(user.id, items);

  return NextResponse.json({ items: await getCart(user.id) });
}
