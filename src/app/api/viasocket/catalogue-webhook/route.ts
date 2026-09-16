import { NextResponse } from "next/server";
import { findByWebhookToken } from "@/lib/integration-store";
import { syncCatalogue } from "@/lib/sync-catalogue";

/**
 * Receives "Row Added Or Updated" events.
 *
 * viaSocket does not sign its webhook deliveries, so authenticity rests entirely
 * on the unguessable token in this URL — which is generated per connection and
 * only ever shared with viaSocket. Treat the request body as untrusted: it is
 * used as a signal that something changed, never as data. The sheet is then
 * re-read through the authenticated action, which is the only source we trust.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const match = await findByWebhookToken(token);

  // Deliberately vague: a caller with a bad token learns nothing.
  if (!match) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const result = await syncCatalogue(match.endUserId);
    return NextResponse.json({ ok: true, imported: result.imported });
  } catch (error) {
    // Returning 200 would tell viaSocket the delivery succeeded.
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
