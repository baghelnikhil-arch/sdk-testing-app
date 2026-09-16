import { NextResponse } from "next/server";
import { requireEndUserId } from "@/lib/end-user";
import { ViasocketNotConfiguredError, embedToken } from "@/lib/viasocket";

/**
 * Signs the embed token for the signed-in user.
 *
 * This is the one token the browser is allowed to hold, and only for the
 * duration of the connect popup. The signing secret never leaves the server.
 */
export async function GET() {
  try {
    const endUserId = await requireEndUserId();
    return new NextResponse(embedToken(endUserId), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
