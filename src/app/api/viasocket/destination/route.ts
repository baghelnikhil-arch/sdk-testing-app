import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authErrorResponse, getCurrentUser, requireUser } from "@/lib/auth";
import {
  clearConnection,
  getConnection,
  sheetTakenBy,
  patchConnection,
} from "@/lib/integration-store";
import {
  ViasocketNotConfiguredError,
  isConfigured,
  isFlowActive,
  revokeConnection,
  setFlowStatus,
} from "@/lib/viasocket";
import { isDatabaseConfigured } from "@/lib/db";
import { syncCatalogue } from "@/lib/sync-catalogue";

/**
 * One person's Google Sheets connection.
 *
 * There is no purpose to pass: a connection belongs to whoever is signed in,
 * and what it is used for follows from their role — an administrator's sheet is
 * the shop's catalogue, anybody else's is their own order log.
 */

/** What the browser is allowed to know: labels and readiness, never the ids. */
export async function GET() {
  const user = await getCurrentUser();
  const storage = isDatabaseConfigured() ? "database" : "none";

  // A missing store is reported, not thrown: the page should explain the
  // problem rather than render an error.
  let connection = null;
  let storageError: string | null = null;
  try {
    connection = user ? await getConnection(user.id) : null;
  } catch (error) {
    storageError = (error as Error).message;
  }

  /*
   * "Live updates on" used to mean nothing more than a non-empty column, which
   * is how this shop sat for days believing it was subscribed while viaSocket
   * had long since replaced the flow and stopped delivering. The claim is now
   * checked against viaSocket, and a subscription that has gone is forgotten so
   * the switch reads off and can be turned back on.
   */
  let watching = Boolean(connection?.subscriptionId);
  if (connection?.subscriptionId) {
    try {
      watching = await isFlowActive(
        connection.endUserId,
        connection.subscriptionId,
      );
      if (!watching) {
        await patchConnection(connection.userId, {
          subscriptionId: undefined,
          webhookToken: undefined,
        });
      }
    } catch {
      // viaSocket being unreachable is not evidence either way; say nothing
      // changed rather than reporting a working subscription as dead.
    }
  }

  return NextResponse.json({
    configured: isConfigured(),
    signedIn: Boolean(user),
    admin: user?.role === "admin",
    storage,
    storageError,
    connected: Boolean(connection),
    spreadsheetLabel: connection?.spreadsheetLabel ?? null,
    sheetLabel: connection?.sheetLabel ?? null,
    ready: Boolean(connection?.spreadsheetId && connection?.sheetId),
    lastExportAt: connection?.lastExportAt ?? null,
    lastSyncAt: connection?.lastSyncAt ?? null,
    lastSyncCount: connection?.lastSyncCount ?? null,
    syncIntervalMinutes: connection?.syncIntervalMinutes ?? null,
    watching,
  });
}

/** Stores the spreadsheet and tab the user picked. */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const existing = await getConnection(user.id);
    const { spreadsheetId, spreadsheetLabel, sheetId, sheetLabel } =
      await request.json();

    if (typeof spreadsheetId !== "string" || typeof sheetId !== "string") {
      return NextResponse.json(
        { error: "Pick both a spreadsheet and a tab." },
        { status: 400 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Google Sheets is not connected yet." },
        { status: 409 },
      );
    }

    // One sheet, one owner — see `sheetTakenBy`. Sharing one is how a shop
    // ends up selling its own order log, or losing its catalogue to it.
    const taken = await sheetTakenBy(spreadsheetId, sheetId, user.id);
    if (taken) {
      return NextResponse.json(
        {
          error: taken.admin
            ? "That sheet is where this shop reads its products from. Writing orders into it would corrupt the catalogue — pick a different sheet."
            : "Somebody else is already using that sheet. Pick one of your own.",
        },
        { status: 409 },
      );
    }

    const updated = await patchConnection(user.id, {
      spreadsheetId,
      spreadsheetLabel: String(spreadsheetLabel ?? spreadsheetId),
      sheetId,
      sheetLabel: String(sheetLabel ?? sheetId),
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Google Sheets is not connected yet." },
        { status: 409 },
      );
    }

    /*
     * An administrator choosing a sheet is choosing what the shop sells, so it
     * is imported straight away. Without this the shop sits empty between
     * saving the sheet and remembering to press Import, which reads as "my
     * products disappeared". A failure is reported but does not fail the save.
     */
    let imported: number | null = null;
    let syncError: string | null = null;

    if (user.role === "admin") {
      try {
        imported = (await syncCatalogue(updated)).imported;
      } catch (error) {
        syncError = (error as Error).message;
      }
    }

    return NextResponse.json({
      ready: true,
      spreadsheetLabel: updated.spreadsheetLabel,
      sheetLabel: updated.sheetLabel,
      imported,
      syncError,
    });
  } catch (error) {
    const denied = authErrorResponse(error);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Disconnects. Flows are disabled *before* the authentication is revoked —
 * revoking first would leave flows pointing at an auth that no longer exists.
 */
export async function DELETE() {
  try {
    const user = await requireUser();
    const connection = await getConnection(user.id);
    if (!connection) return NextResponse.json({ connected: false });

    const { endUserId } = connection;

    // A trigger subscription is a flow of its own and has to be stopped too.
    if (connection.subscriptionId) {
      await setFlowStatus(endUserId, connection.subscriptionId, 0).catch(() => {});
    }
    await setFlowStatus(endUserId, connection.scriptId, 0).catch(() => {});
    await revokeConnection(endUserId, connection.authId);
    await clearConnection(user.id);

    /*
     * Imported products stay.
     *
     * They were deleted here once, on the reasoning that they came from this
     * sheet and should not outlive it. In practice that made disconnecting —
     * or reconnecting under a different Google account — silently empty the
     * shop, and the operator had no way back except to reconnect and import
     * again. The catalogue is the shop's own data now; the sheet is only where
     * it was typed.
     */
    revalidatePath("/", "layout");

    return NextResponse.json({ connected: false });
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
