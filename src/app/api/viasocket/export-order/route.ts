import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { getConnection, patchConnection } from "@/lib/integration-store";
import {
  ADD_ROWS_ACTION,
  FIELD_SHEET,
  FIELD_SPREADSHEET,
  ViasocketNotConfiguredError,
  runAction,
} from "@/lib/viasocket";
import { buildOrderRows, newOrderId, rebuildOrder } from "@/lib/order-export";
import { markOrderExported, recordOrder } from "@/lib/order-store";
import { clearCart } from "@/lib/cart-store";

/**
 * Appends the order to the user's chosen Google Sheet, one row per line.
 *
 * Checkout stays a demo: nothing is charged. This is the one real side effect,
 * and it is skipped silently (`exported: false`) when the integration is not set
 * up, so the cart works exactly as before for anyone who has not connected.
 */
export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    const denied = authErrorResponse(error);
    return NextResponse.json(
      { error: denied?.error ?? "Not signed in." },
      { status: denied?.status ?? 401 },
    );
  }

  const { items } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "The cart is empty." }, { status: 400 });
  }

  // Prices come from the catalogue, never from the browser.
  const { lines, totals } = await rebuildOrder(items);
  if (lines.length === 0) {
    return NextResponse.json(
      { error: "No recognisable products in the cart." },
      { status: 400 },
    );
  }

  const reference = newOrderId();

  /*
   * The order is recorded first and the spreadsheet export attempted second.
   * The order is the fact; the export is a copy of it. If Google is down the
   * customer has still placed an order, and the failure is stored on the row
   * rather than losing the sale.
   */
  const order = await recordOrder({
    userId: user.id,
    reference,
    lines,
    totals,
  });
  await clearCart(user.id);

  /*
   * Each shopper exports to their own sheet.
   *
   * The connection is looked up under the person placing the order, so one
   * customer's orders can never be written into another's spreadsheet, and
   * someone who has connected nothing simply gets an order without an export.
   */
  const integration = await getConnection(user.id, "orders");
  if (!integration?.spreadsheetId || !integration?.sheetId) {
    return NextResponse.json({
      ordered: true,
      orderId: reference,
      exported: false,
      reason: "not-configured",
    });
  }

  const rows = buildOrderRows({
    lines,
    totals,
    orderId: reference,
    customer: `${user.name} <${user.email}>`,
  });

  try {
    await runAction(integration.scriptId, ADD_ROWS_ACTION, {
      [FIELD_SPREADSHEET]: integration.spreadsheetId,
      [FIELD_SHEET]: integration.sheetId,
      use_json_rows: true,
      rows_json: JSON.stringify(rows),
    });

    await patchConnection(integration.userId, "orders", {
      lastExportAt: new Date().toISOString(),
    });
    await markOrderExported(order.id, true);

    return NextResponse.json({
      ordered: true,
      exported: true,
      orderId: reference,
      rows: rows.length,
      sheetLabel: integration.sheetLabel ?? null,
    });
  } catch (error) {
    const denied = authErrorResponse(error);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }
    if (error instanceof ViasocketNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    // The order still succeeded for the shopper; only the export failed.
    await markOrderExported(order.id, false, (error as Error).message);
    return NextResponse.json({
      ordered: true,
      orderId: reference,
      exported: false,
      reason: "action-failed",
      error: (error as Error).message,
    });
  }
}
