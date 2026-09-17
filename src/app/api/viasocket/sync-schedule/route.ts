import { NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth";
import { getAdminConnection, patchConnection } from "@/lib/integration-store";
import { SYNC_INTERVALS } from "@/lib/sync-intervals";

/**
 * How often the product sheet is re-read.
 *
 * `null` turns the schedule off, leaving the row trigger and the Import button.
 * Only the offered intervals are accepted: an arbitrary number from the browser
 * would let anyone with the admin page open set a one-minute loop against the
 * Google Sheets quota.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const connection = await getAdminConnection(admin, "catalogue");

    if (!connection) {
      return NextResponse.json(
        { error: "Connect a product sheet first." },
        { status: 409 },
      );
    }

    const { minutes } = await request.json();

    if (minutes !== null && !SYNC_INTERVALS.includes(minutes)) {
      return NextResponse.json(
        { error: "Choose one of the offered intervals." },
        { status: 400 },
      );
    }

    await patchConnection(connection.endUserId, "catalogue", {
      syncIntervalMinutes: minutes ?? undefined,
    });

    return NextResponse.json({ syncIntervalMinutes: minutes });
  } catch (error) {
    const denied = authErrorResponse(error);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
