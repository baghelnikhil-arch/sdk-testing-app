import { NextResponse } from "next/server";
import { peekEndUserId, requireEndUserId } from "@/lib/end-user";
import {
  clearConnection,
  findSheetConflict,
  getConnection,
  patchConnection,
} from "@/lib/integration-store";
import { purposeFromSearch } from "@/lib/purpose";
import {
  ViasocketNotConfiguredError,
  isConfigured,
  revokeConnection,
  setFlowStatus,
} from "@/lib/viasocket";
import { isDatabaseConfigured } from "@/lib/db";
import { clearSheetProducts } from "@/lib/shop-data";
import { revalidatePath } from "next/cache";

/** What the browser is allowed to know: labels and readiness, never the ids. */
export async function GET(request: Request) {
  const purpose = purposeFromSearch(request.url);
  if (!purpose) {
    return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
  }

  const endUserId = await peekEndUserId();
  const storage = isDatabaseConfigured() ? "database" : "none";

  // A missing store is reported, not thrown: the settings page should explain
  // the problem rather than render an error.
  let connection = null;
  let storageError: string | null = null;
  try {
    connection = endUserId ? await getConnection(endUserId, purpose) : null;
  } catch (error) {
    storageError = (error as Error).message;
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
    watching: Boolean(connection?.subscriptionId),
  });
}

/** Stores the spreadsheet and tab the user picked. */
export async function PUT(request: Request) {
  const purpose = purposeFromSearch(request.url);
  if (!purpose) {
    return NextResponse.json({ error: "Unknown purpose" }, { status: 400 });
  }

  const endUserId = await requireEndUserId();
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

  const updated = await patchConnection(endUserId, purpose, {
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

  return NextResponse.json({
    ready: true,
    spreadsheetLabel: updated.spreadsheetLabel,
    sheetLabel: updated.sheetLabel,
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
    const endUserId = await requireEndUserId();
    const connection = await getConnection(endUserId, purpose);
    if (!connection) return NextResponse.json({ connected: false });

    // A trigger subscription is a flow of its own and has to be stopped too.
    if (connection.subscriptionId) {
      await setFlowStatus(endUserId, connection.subscriptionId, 0).catch(() => {});
    }
    await setFlowStatus(endUserId, connection.scriptId, 0).catch(() => {});
    await revokeConnection(endUserId, connection.authId);
    await clearConnection(endUserId, purpose);

    // Imported products came from this sheet; they should not outlive it.
    if (purpose === "catalogue") {
      await clearSheetProducts();
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ connected: false });
  } catch (error) {
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
