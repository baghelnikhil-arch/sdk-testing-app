import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { getConnection } from "@/lib/integration-store";
import { syncCatalogue } from "@/lib/sync-catalogue";
import { ViasocketNotConfiguredError } from "@/lib/viasocket";

/** Manual "Import now" — also the backfill, since the trigger only sees new rows. */
export async function POST() {
  try {
    const admin = await requireAdmin();
    const connection = await getConnection(admin.id, "catalogue");

    if (!connection) {
      return NextResponse.json(
        { error: "Google Sheets is not connected yet." },
        { status: 409 },
      );
    }

    const result = await syncCatalogue(connection);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const denied = authErrorResponse(error);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
