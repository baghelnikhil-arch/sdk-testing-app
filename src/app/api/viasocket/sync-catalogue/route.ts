import { NextResponse } from "next/server";
import { requireEndUserId } from "@/lib/end-user";
import { syncCatalogue } from "@/lib/sync-catalogue";
import { ViasocketNotConfiguredError } from "@/lib/viasocket";

/** Manual "Sync now" — also the backfill, since the trigger only sees new rows. */
export async function POST() {
  try {
    const endUserId = await requireEndUserId();
    const result = await syncCatalogue(endUserId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
