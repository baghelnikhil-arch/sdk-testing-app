import { NextResponse } from "next/server";
import { authErrorResponse, getCurrentUser, requireAdmin } from "@/lib/auth";
import {
  clearConnection,
  findSheetConflict,
  getAdminConnection,
  patchConnection,
} from "@/lib/integration-store";
import { purposeFromSearch } from "@/lib/purpose";
import {
  ViasocketNotConfiguredError,
  isConfigured,
  isFlowActive,
  revokeConnection,
  setFlowStatus,
} from "@/lib/viasocket";
import { isDatabaseConfigured } from "@/lib/db";
import { syncCatalogue } from "@/lib/sync-catalogue";
import { revalidatePath } from "next/cache";

/** What the browser is allowed to know: labels and readiness, never the ids. */
export async function GET(request: Request) {
  const purpose = purposeFromSearch(request.url);
  if (!purpose) {
    return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const storage = isDatabaseConfigured() ? "database" : "none";

  // A missing store is reported, not thrown: the settings page should explain
  // the problem rather than render an error.
  let connection = null;
  let storageError: string | null = null;
  try {
    connection =
      user?.role === "admin" ? await getAdminConnection(user, purpose) : null;
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
        await patchConnection(connection.endUserId, purpose, {
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
  const purpose = purposeFromSearch(request.url);
  if (!purpose) {
    return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
  }

  const admin = await requireAdmin();
  const existing = await getAdminConnection(admin, purpose);
  const { spreadsheetId, spreadsheetLabel, sheetId, sheetLabel } =
    await request.json();

  if (typeof spreadsheetId !== "string" || typeof sheetId !== "string") {
    return NextResponse.json(
      { error: "Pick both a spreadsheet and a tab." },
      { status: 400 },
    );
  }

  const conflict = await findSheetConflict(purpose, spreadsheetId, sheetId);
  if (conflict) {
    return NextResponse.json(
      {
        error:
          purpose === "catalogue"
            ? "That sheet is already where orders are written. Reading products from the order log would re-import your orders as products. Pick a different sheet."
            : "That sheet is already the product source. Writing orders into it would corrupt your catalogue. Pick a different sheet.",
      },
      { status: 409 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "Google Sheets is not connected yet." },
      { status: 409 },
    );
  }

  const updated = await patchConnection(existing.endUserId, purpose, {
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
   * Choosing a product sheet imports it straight away.
   *
   * Without this the shop sits empty between saving the sheet and remembering
   * to press Import, which reads as "my products disappeared" — especially
   * after a reconnect, where disconnecting has just removed them. A failure
   * here is reported but does not fail the save: the sheet is chosen either
   * way, and Import now is still there to retry.
   */
  let imported: number | null = null;
  let syncError: string | null = null;

  if (purpose === "catalogue") {
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
}

/**
 * Disconnects. Flows are disabled *before* the authentication is revoked —
 * revoking first would leave flows pointing at an auth that no longer exists.
 *
 * The other purpose's connection is untouched, even when both use the same
 * Google account: they are independent from the operator's point of view.
 */
export async function DELETE(request: Request) {
  const purpose = purposeFromSearch(request.url);
  if (!purpose) {
    return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
  }

  try {
    const admin = await requireAdmin();
    const connection = await getAdminConnection(admin, purpose);
    if (!connection) return NextResponse.json({ connected: false });
    const endUserId = connection.endUserId;

    // A trigger subscription is a flow of its own and has to be stopped too.
    if (connection.subscriptionId) {
      await setFlowStatus(endUserId, connection.subscriptionId, 0).catch(() => {});
    }
    await setFlowStatus(endUserId, connection.scriptId, 0).catch(() => {});
    await revokeConnection(endUserId, connection.authId);
    await clearConnection(endUserId, purpose);

    /*
     * Imported products stay.
     *
     * They were deleted here once, on the reasoning that they came from this
     * sheet and should not outlive it. In practice that made disconnecting —
     * or reconnecting under a different Google account — silently empty the
     * shop, and the operator had no way back except to reconnect and import
     * again. The catalogue is the shop's own data now; the sheet is only where
     * it was typed. Replacing them is what an import is for, and Disconnect
     * only stops new ones arriving.
     */
    if (purpose === "catalogue") {
      revalidatePath("/", "layout");
    }

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
