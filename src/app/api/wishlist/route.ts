import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWishlist, mergeWishlist, replaceWishlist } from "@/lib/cart-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ids: null, signedIn: false });

  return NextResponse.json({ ids: await getWishlist(user.id), signedIn: true });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ids } = await request.json();
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids must be an array." }, { status: 400 });
  }

  await replaceWishlist(user.id, ids);
  return NextResponse.json({ ids: await getWishlist(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ids } = await request.json();
  if (Array.isArray(ids)) await mergeWishlist(user.id, ids);

  return NextResponse.json({ ids: await getWishlist(user.id) });
}
