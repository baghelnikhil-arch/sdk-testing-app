import { NextResponse } from "next/server";
import { requireEndUserId } from "@/lib/end-user";
import { getConnection, patchConnection } from "@/lib/integration-store";
import {
  ADD_ROWS_ACTION,
  FIELD_SHEET,
  FIELD_SPREADSHEET,
  ViasocketNotConfiguredError,
  runAction,
} from "@/lib/viasocket";
import { buildOrderRows, newOrderId, rebuildOrder } from "@/lib/order-export";

/**
 * Appends the order to the user's chosen Google Sheet, one row per line.
 *
 * Checkout stays a demo: nothing is charged. This is the one real side effect,
 * and it is skipped silently (`exported: false`) when the integration is not set
 * up, so the cart works exactly as before for anyone who has not connected.
 */
export async function POST(request: Request) {
  const endUserId = await requireEndUserId();
  const integration = await getConnection(endUserId, "orders");

  if (!integration?.spreadsheetId || !integration?.sheetId) {
    return NextResponse.json({
      exported: false,
      reason: "not-configured",
    });
  }

  const { items, customer } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "The cart is empty." }, { status: 400 });
  }

  // Prices come from the catalogue, never from the browser.
  const { lines, totals } = rebuildOrder(items);
  if (lines.length === 0) {
    return NextResponse.json(
      { error: "No recognisable products in the cart." },
      { status: 400 },
    );
  }

  const orderId = newOrderId();
  const rows = buildOrderRows({
    lines,
    totals,
    orderId,
    customer: typeof customer === "string" && customer ? customer : undefined,
  });

  try {
    await runAction(integration.scriptId, ADD_ROWS_ACTION, {
      [FIELD_SPREADSHEET]: integration.spreadsheetId,
      [FIELD_SHEET]: integration.sheetId,
      use_json_rows: true,
      rows_json: JSON.stringify(rows),
    });

    await patchConnection(endUserId, "orders", {
      lastExportAt: new Date().toISOString(),
    });

    return NextResponse.json({
      exported: true,
      orderId,
      rows: rows.length,
      sheetLabel: integration.sheetLabel ?? null,
    });
  } catch (error) {
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    // The order still "succeeded" for the shopper; only the export failed.
    return NextResponse.json(
      { exported: false, reason: "action-failed", error: (error as Error).message },
      { status: 502 },
    );
  }
}
