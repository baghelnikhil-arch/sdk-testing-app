import { revalidatePath } from "next/cache";
import {
  findSheetConflict,
  getConnection,
  patchConnection,
} from "./integration-store";
import { countSheetProducts, replaceSheetProducts } from "./shop-data";
import { extractRows, mapRowsToProducts, usesFallbackImage } from "./catalogue";
import { FIELDS, LIST_ROWS_ACTION, runAction } from "./viasocket";

/** Guards against a runaway sheet turning into a 10,000-product storefront. */
const MAX_PRODUCTS = 500;

export type SyncResult = {
  imported: number;
  skipped: { row: number; reason: string }[];
  truncated: boolean;
  /** Imported, but showing the placeholder because the sheet had no image URL. */
  withoutImages: number;
  /** Set when an empty result was refused to protect a stocked shop. */
  keptExisting?: number;
};

/**
 * Pulls the whole product sheet and replaces the imported catalogue with it.
 *
 * Replacing rather than appending is deliberate: a full read is idempotent, so
 * running it twice is harmless, and rows deleted in the sheet disappear from the
 * shop. It also means the webhook can simply re-sync instead of trying to apply
 * a single row event — which matters because the event payload has no published
 * schema.
 */
export async function syncCatalogue(endUserId: string): Promise<SyncResult> {
  const connection = await getConnection(endUserId, "catalogue");

  if (!connection?.spreadsheetId || !connection?.sheetId) {
    throw new Error("No product sheet is selected.");
  }

  /*
   * Checked here as well as when the sheet is chosen: a pairing saved before
   * this rule existed would otherwise keep firing, and the webhook path never
   * passes through the save screen at all.
   */
  const conflict = await findSheetConflict(
    "catalogue",
    connection.spreadsheetId,
    connection.sheetId,
  );
  if (conflict) {
    throw new Error(
      `"${connection.spreadsheetLabel ?? "That sheet"}" is where this shop writes its orders. Reading products from the order log would replace your catalogue with order rows, so the import was stopped. Point the product catalogue at a different sheet.`,
    );
  }

  const payload = await runAction(connection.scriptId, LIST_ROWS_ACTION, {
    [FIELDS.listRows.spreadsheet]: connection.spreadsheetId,
    [FIELDS.listRows.sheet]: connection.sheetId,
    // Undocumented in the API reference; this is what makes rows come back keyed
    // by their header text rather than by column letter.
    column_key: true,
  });

  const rows = extractRows(payload);
  const mapped = mapRowsToProducts(rows);

  const products = mapped
    .filter((entry): entry is Extract<typeof entry, { ok: true }> => entry.ok)
    .map((entry) => entry.product);

  // Blank trailing rows are padding, not errors — they are never reported.
  const skipped = mapped
    .filter((entry): entry is Extract<typeof entry, { ok: false }> => !entry.ok)
    .filter((entry) => !entry.blank)
    .map(({ row, reason }) => ({ row, reason }));

  const truncated = products.length > MAX_PRODUCTS;
  const kept = products.slice(0, MAX_PRODUCTS);

  /*
   * Never let an empty result delete a stocked shop.
   *
   * An import that yields nothing is a misconfiguration — the wrong tab, a
   * renamed header — far more often than a deliberate "remove every product".
   * A webhook can fire one of these without anybody pressing a button, so this
   * check has to happen BEFORE the write, not after it. Emptying the shop
   * deliberately is still possible: disconnect the catalogue connection.
   */
  if (kept.length === 0) {
    const existing = await countSheetProducts();
    if (existing > 0) {
      return {
        imported: 0,
        skipped,
        truncated: false,
        withoutImages: 0,
        keptExisting: existing,
      };
    }
  }

  await replaceSheetProducts(kept, {
    spreadsheet: connection.spreadsheetLabel ?? connection.spreadsheetId,
    sheet: connection.sheetLabel ?? connection.sheetId,
  });

  await patchConnection(endUserId, "catalogue", {
    lastSyncAt: new Date().toISOString(),
    lastSyncCount: kept.length,
  });

  // Product pages are cached; without this a new row would not appear until the
  // next deploy.
  revalidatePath("/", "layout");

  return {
    imported: kept.length,
    skipped,
    truncated,
    withoutImages: kept.filter(usesFallbackImage).length,
  };

}
